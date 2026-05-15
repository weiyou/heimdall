import { describe, it, expect, vi, afterEach } from 'vitest'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { watchFile } from '../src/watcher.js'

describe('watchFile', () => {
  const dirs = []
  const stoppers = []

  afterEach(async () => {
    for (const stop of stoppers.splice(0)) await stop()
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  it('calls callback with file content when the file changes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'test.md')
    writeFileSync(file, '# Initial')

    const cb = vi.fn()
    stoppers.push(await watchFile(file, cb))

    writeFileSync(file, '# Updated')
    await new Promise(r => setTimeout(r, 500))

    expect(cb).toHaveBeenCalledWith('# Updated')
  })

  it('does not fire for the initial read, only on changes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'no-initial.md')
    writeFileSync(file, '# Start')

    const cb = vi.fn()
    stoppers.push(await watchFile(file, cb))

    await new Promise(r => setTimeout(r, 250))
    expect(cb).not.toHaveBeenCalled()
  })

  it('fires multiple times on successive saves', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    dirs.push(dir)
    const file = join(dir, 'multi.md')
    writeFileSync(file, '# v1')

    const cb = vi.fn()
    stoppers.push(await watchFile(file, cb))

    writeFileSync(file, '# v2')
    await new Promise(r => setTimeout(r, 500))
    writeFileSync(file, '# v3')
    await new Promise(r => setTimeout(r, 500))

    expect(cb).toHaveBeenCalledTimes(2)
    expect(cb).toHaveBeenLastCalledWith('# v3')
  })
})
