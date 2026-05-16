import { watchFile as fsWatchFile, unwatchFile, readFileSync } from 'node:fs'

// Watches a file and invokes `callback(content)` on every change.
// Read failures (common transient state while an editor rewrites the file)
// are logged and skipped. Render failures are the caller's concern — the
// callback should do its own error handling so it can surface them in-page.
export function watchFile(filePath, callback) {
  fsWatchFile(filePath, { interval: 100 }, () => {
    let content
    try {
      content = readFileSync(filePath, 'utf8')
    } catch (err) {
      console.error(`[heimdall] Could not read ${filePath}: ${err.message}`)
      return
    }
    callback(content)
  })

  return () => unwatchFile(filePath)
}
