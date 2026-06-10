import { watchFile as fsWatchFile, unwatchFile, readFileSync } from 'node:fs'

/**
 * Watches a single file using Node's fs.watchFile (polling) and invokes
 * `callback(content)` only when the file's *content* actually changes.
 *
 * Signature:
 *   watchFile(filePath, callback)
 *   watchFile(filePath, callback, options)
 *
 * Options (all optional):
 *   interval   — polling interval in ms (default: 100). Lower values give
 *                faster reaction at the cost of more CPU.
 *   persistent — whether the underlying poller keeps the Node process alive
 *                (default: true). Set to false for short-lived test watchers.
 *
 * Behaviour:
 * - No callback on initial attachment (only on subsequent changes).
 * - Content deduplication: identical bytes (including no-op saves and pure
 *   metadata changes like utimes) do not trigger the callback after the
 *   first delivery for that content.
 * - Read errors are logged only once per failure "episode" and the watcher
 *   auto-recovers when the file reappears.
 * - The callback is always invoked safely (throws and promise rejections
 *   are contained so they cannot break the poller).
 * - Rapid saves are naturally coalesced by the polling interval; the
 *   callback receives the final content.
 *
 * The returned function stops watching when called.
 */
export function watchFile(filePath, callback, options = {}) {
  const interval = options.interval ?? 100
  const persistent = options.persistent ?? true

  let lastContent
  let lastReadError = null
  let lastSize = -1
  let lastMtimeMs = -1

  function safeInvoke(cb, content) {
    try {
      const result = cb(content)
      if (result && typeof result.then === 'function') {
        result.catch(() => {
          // Swallow — caller (e.g. server) is responsible for surfacing render errors
        })
      }
    } catch {
      // Contain synchronous throws from the user callback
    }
  }

  fsWatchFile(
    filePath,
    { interval, persistent },
    (curr, prev) => {
      // Cheap pre-read filter using the Stats objects we receive for free.
      // If size and mtime are identical to the last content we delivered,
      // this is almost certainly a pure metadata change (atime/ctime/permissions)
      // for content we've already processed → skip the read entirely.
      if (
        curr.size === lastSize &&
        curr.mtimeMs === lastMtimeMs
      ) {
        return
      }

      let content
      try {
        content = readFileSync(filePath, 'utf8')
      } catch (err) {
        const msg = err.message
        if (msg !== lastReadError) {
          console.error(`[heimdall] Could not read ${filePath}: ${msg}`)
          lastReadError = msg
        }
        return
      }

      // Successful read — reset error tracking for future deletions
      lastReadError = null

      // Update our last-seen stat signature for the fast-path filter above
      lastSize = curr.size
      lastMtimeMs = curr.mtimeMs

      // Content-level deduplication (catches cases where size/mtime changed
      // but the actual bytes are identical, e.g. some editor "save" actions)
      if (content === lastContent) return

      lastContent = content
      safeInvoke(callback, content)
    }
  )

  return () => unwatchFile(filePath)
}
