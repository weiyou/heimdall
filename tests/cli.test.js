import { describe, it, expect, afterEach } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const CLI = fileURLToPath(new URL('../src/cli.js', import.meta.url))

// Run the CLI and resolve with { stdout, stderr, code } regardless of exit code.
function runNode(scriptPath, args = []) {
  return execFileAsync(process.execPath, [scriptPath, ...args])
    .then(({ stdout, stderr }) => ({ stdout, stderr, code: 0 }))
    .catch((err) => ({ stdout: err.stdout ?? '', stderr: err.stderr ?? '', code: err.code }))
}

describe('cli entry point', () => {
  const dirs = []

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  // Regression: a global install exposes `heimdall` as a symlink, which makes
  // process.argv[1] differ from import.meta.url. The CLI must still run when
  // invoked through a symlink (previously main() was guarded and never fired).
  it('runs when invoked through a symlink (global-install scenario)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-cli-'))
    dirs.push(dir)
    const link = join(dir, 'heimdall')
    symlinkSync(CLI, link)

    // No file argument → prints help and exits non-zero. The point is that it
    // produces output at all; before the fix the symlinked command did nothing.
    const { stdout, code } = await runNode(link)
    expect(stdout).toContain('live markdown preview')
    expect(code).toBe(1)
  })

  it('prints help and exits 0 for --help (through a symlink)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'heimdall-cli-'))
    dirs.push(dir)
    const link = join(dir, 'heimdall')
    symlinkSync(CLI, link)

    const { stdout, code } = await runNode(link, ['--help'])
    expect(stdout).toContain('Usage:')
    expect(code).toBe(0)
  })
})
