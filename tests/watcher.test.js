import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { writeFileSync, mkdtempSync, rmSync, utimesSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { watchFile } from '../src/watcher.js'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// 180–200ms is reliable for a 100ms poll + scheduler jitter on this machine.
// Use 120ms for "should not have fired" negative checks.
const WAIT = 200
const SHORT_WAIT = 120

describe('watchFile', () => {
  const dirs = []
  const stoppers = []

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Stoppers are synchronous; do not await them (previous tests did this incorrectly)
    for (const stop of stoppers.splice(0)) {
      try { stop() } catch {}
    }
    for (const dir of dirs.splice(0)) {
      try { rmSync(dir, { recursive: true, force: true }) } catch {}
    }
    vi.restoreAllMocks()
  })

  it('calls callback with file content when the file changes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'change.md')
    writeFileSync(file, '# Initial')

    const cb = vi.fn()
    stoppers.push(watchFile(file, cb))

    writeFileSync(file, '# Updated')
    await delay(WAIT)

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith('# Updated')
  })

  it('does not fire for the initial read, only on changes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'no-initial.md')
    writeFileSync(file, '# Start')

    const cb = vi.fn()
    stoppers.push(watchFile(file, cb))

    await delay(SHORT_WAIT)
    expect(cb).not.toHaveBeenCalled()
  })

  it('fires multiple times on successive distinct saves', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'successive.md')
    writeFileSync(file, '# v1')

    const cb = vi.fn()
    stoppers.push(watchFile(file, cb))

    writeFileSync(file, '# v2')
    await delay(WAIT)
    writeFileSync(file, '# v3')
    await delay(WAIT)

    expect(cb).toHaveBeenCalledTimes(2)
    expect(cb).toHaveBeenLastCalledWith('# v3')
  })

  it('stopper function actually stops watching (no more callbacks after stop)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'stop.md')
    writeFileSync(file, '# start')

    const cb = vi.fn()
    const stop = watchFile(file, cb)
    stoppers.push(stop) // still track for cleanup, but we call it explicitly below

    writeFileSync(file, '# first')
    await delay(WAIT)
    expect(cb).toHaveBeenCalledTimes(1)

    stop() // explicit stop
    // remove from array so afterEach doesn't double-call
    const idx = stoppers.indexOf(stop)
    if (idx !== -1) stoppers.splice(idx, 1)

    writeFileSync(file, '# after-stop')
    await delay(WAIT)
    // Should still be only the one call from before the stop
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenLastCalledWith('# first')
  })

  it('does not fire for writes that produce identical content (deduplication)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'dedup-identical.md')
    writeFileSync(file, '# same')

    const cb = vi.fn()
    stoppers.push(watchFile(file, cb))

    // First real change
    writeFileSync(file, '# changed')
    await delay(WAIT)
    expect(cb).toHaveBeenCalledTimes(1)

    // Now write the exact same bytes again (common with formatters or manual no-op saves)
    writeFileSync(file, '# changed')
    await delay(WAIT)
    expect(cb).toHaveBeenCalledTimes(1) // no extra call

    // Another identical write
    writeFileSync(file, '# changed')
    await delay(WAIT)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('does not fire for metadata-only changes when content is unchanged (utimes)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'metadata.md')
    writeFileSync(file, '# content')

    const cb = vi.fn()
    stoppers.push(watchFile(file, cb))

    // Establish a baseline with a real content change first
    writeFileSync(file, '# content-v2')
    await delay(WAIT)
    expect(cb).toHaveBeenCalledTimes(1)

    // Pure metadata updates (no bytes changed) must not trigger additional callbacks
    const now = new Date(Date.now() + 5000)
    utimesSync(file, now, now)
    await delay(WAIT)
    expect(cb).toHaveBeenCalledTimes(1)

    utimesSync(file, new Date(), new Date())
    await delay(WAIT)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('does not fire when writeFileSync writes identical bytes (different mtime)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'same-bytes.md')
    writeFileSync(file, '# exact')

    const cb = vi.fn()
    stoppers.push(watchFile(file, cb))

    // Establish baseline
    writeFileSync(file, '# exact-v2')
    await delay(WAIT)
    expect(cb).toHaveBeenCalledTimes(1)

    // Re-writing the exact same bytes (different mtime) must not fire again
    writeFileSync(file, '# exact-v2')
    await delay(WAIT)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('logs a read error only once per failure episode when file is deleted', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'will-delete.md')
    writeFileSync(file, '# to-be-deleted')

    const cb = vi.fn()
    const stop = watchFile(file, cb)
    stoppers.push(stop)

    // Delete the file
    rmSync(file)

    await delay(WAIT)
    expect(cb).not.toHaveBeenCalled()

    // Should have logged exactly once
    const errorCalls = console.error.mock.calls.filter((c) =>
      c[0]?.includes('Could not read')
    )
    expect(errorCalls.length).toBe(1)

    // Further polls should not produce additional logs
    await delay(WAIT * 2)
    const errorCalls2 = console.error.mock.calls.filter((c) =>
      c[0]?.includes('Could not read')
    )
    expect(errorCalls2.length).toBe(1)

    // Stopper must still be callable without throwing
    stop()
  })

  it('recovers and resumes firing after a deletion when the file is recreated with new content', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'recreate.md')
    writeFileSync(file, '# v1')

    const cb = vi.fn()
    stoppers.push(watchFile(file, cb))

    // Delete
    rmSync(file)
    await delay(WAIT)
    expect(cb).not.toHaveBeenCalled()

    // Recreate with *different* content — should resume
    writeFileSync(file, '# v2-after-recreate')
    await delay(WAIT)

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenLastCalledWith('# v2-after-recreate')
  })

  it('contains synchronous throws from the callback and keeps the watcher alive', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'throw-sync.md')
    writeFileSync(file, '# start')

    const goodCb = vi.fn()
    let shouldThrow = true
    const throwingCb = vi.fn((c) => {
      if (shouldThrow) {
        shouldThrow = false
        throw new Error('sync throw from user callback')
      }
      goodCb(c)
    })

    stoppers.push(watchFile(file, throwingCb))

    // First change triggers the throw (contained)
    writeFileSync(file, '# trigger-throw')
    await delay(WAIT)

    // Second change should still be delivered (poller survived)
    writeFileSync(file, '# after-throw')
    await delay(WAIT)

    expect(throwingCb).toHaveBeenCalledTimes(2)
    expect(goodCb).toHaveBeenCalledTimes(1)
    expect(goodCb).toHaveBeenCalledWith('# after-throw')
  })

  it('contains promise rejections from async callbacks and keeps the watcher alive', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'reject-async.md')
    writeFileSync(file, '# start')

    const goodCb = vi.fn()
    let shouldReject = true
    const rejectingCb = vi.fn(async (c) => {
      if (shouldReject) {
        shouldReject = false
        await delay(5)
        throw new Error('async rejection from user callback')
      }
      goodCb(c)
    })

    stoppers.push(watchFile(file, rejectingCb))

    writeFileSync(file, '# trigger-reject')
    await delay(WAIT + 80)

    writeFileSync(file, '# after-reject')
    await delay(WAIT + 80)

    expect(rejectingCb).toHaveBeenCalledTimes(2)
    expect(goodCb).toHaveBeenCalledTimes(1)
    expect(goodCb).toHaveBeenCalledWith('# after-reject')
  })

  it('error containment on one event does not prevent subsequent successful deliveries on the same watcher', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'containment.md')
    writeFileSync(file, '# v0')

    const results = []
    const cb = vi.fn(async (c) => {
      if (c.includes('boom')) {
        throw new Error('boom')
      }
      results.push(c)
    })

    stoppers.push(watchFile(file, cb))

    writeFileSync(file, '# boom-1')
    await delay(WAIT)

    writeFileSync(file, '# good-1')
    await delay(WAIT)

    writeFileSync(file, '# boom-2')
    await delay(WAIT)

    writeFileSync(file, '# good-2')
    await delay(WAIT)

    expect(cb).toHaveBeenCalledTimes(4)
    expect(results).toEqual(['# good-1', '# good-2'])
  })

  it('handles a burst of rapid writes (coalescing is allowed, last content wins)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'burst.md')
    writeFileSync(file, '# v0')

    const cb = vi.fn()
    stoppers.push(watchFile(file, cb))

    // Many writes in quick succession
    for (let i = 1; i <= 6; i++) {
      writeFileSync(file, `# v${i}`)
    }

    await delay(WAIT * 1.5)

    // At least one callback must have occurred, and the last one must be a late value
    expect(cb).toHaveBeenCalled()
    const last = cb.mock.lastCall?.[0]
    expect(last).toMatch(/^# v[3-6]$/) // not the very first ones due to coalescing
  })

  it('can be stopped and a fresh watcher started on the same path (independent state)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'restart.md')
    writeFileSync(file, '# initial')

    const cb1 = vi.fn()
    const stop1 = watchFile(file, cb1)
    writeFileSync(file, '# first-watch')
    await delay(WAIT)
    stop1()
    expect(cb1).toHaveBeenCalledTimes(1)

    // Fresh watcher gets its own independent lastContent state
    const cb2 = vi.fn()
    const stop2 = watchFile(file, cb2)
    stoppers.push(stop2)

    // First write after attaching cb2 establishes its baseline
    writeFileSync(file, '# cb2-baseline')
    await delay(WAIT)
    expect(cb2).toHaveBeenCalledTimes(1)

    // Re-writing the exact same content for this watcher must not produce extra callbacks
    writeFileSync(file, '# cb2-baseline')
    await delay(WAIT)
    expect(cb2).toHaveBeenCalledTimes(1)

    // A genuinely new value for this watcher does fire
    writeFileSync(file, '# second-watch')
    await delay(WAIT)
    expect(cb2).toHaveBeenCalledTimes(2)
    expect(cb2).toHaveBeenLastCalledWith('# second-watch')
  })

  it('accepts and respects a custom polling interval', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'fast-interval.md')
    writeFileSync(file, '# v0')

    const cb = vi.fn()
    // Very low interval so we can use a short wait and still observe the change
    stoppers.push(watchFile(file, cb, { interval: 20 }))

    writeFileSync(file, '# fast')
    await delay(80) // much shorter than normal WAIT because we asked for fast polling

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith('# fast')
  })

  it('accepts persistent: false (and the stopper still works)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'non-persistent.md')
    writeFileSync(file, '# start')

    const cb = vi.fn()
    const stop = watchFile(file, cb, { persistent: false })
    stoppers.push(stop)

    writeFileSync(file, '# changed')
    await delay(WAIT)

    expect(cb).toHaveBeenCalledTimes(1)
    // Explicit stop must still be safe
    stop()
  })

  it('preserves exact backward compatibility for the classic 2-argument call', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'classic-call.md')
    writeFileSync(file, '# classic')

    const cb = vi.fn()
    // Intentionally the original 2-arg form used everywhere before Tier 2
    stoppers.push(watchFile(file, cb))

    writeFileSync(file, '# still-works')
    await delay(WAIT)

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith('# still-works')
  })
})
