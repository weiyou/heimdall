import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createPreviewServer } from '../src/server.js'

describe('preview server', () => {
  let tmpDir, filePath, server, port, stop

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'heimdall-'))
    filePath = join(tmpDir, 'test.md')
    writeFileSync(filePath, '# Hello\n\nWorld')
    ;({ server, stop } = await createPreviewServer(filePath))
    port = server.address().port
  })

  afterEach(async () => {
    await stop()
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('GET / returns 200 with text/html content-type', async () => {
    const res = await fetch(`http://localhost:${port}/`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
  })

  it('GET / body contains the rendered markdown', async () => {
    const body = await fetch(`http://localhost:${port}/`).then(r => r.text())
    expect(body).toContain('<h1>Hello</h1>')
    expect(body).toContain('<!DOCTYPE html>')
  })

  it('GET /events returns text/event-stream content-type', async () => {
    const controller = new AbortController()
    try {
      const res = await fetch(`http://localhost:${port}/events`, { signal: controller.signal })
      expect(res.headers.get('content-type')).toContain('text/event-stream')
    } finally {
      controller.abort()
    }
  })

  it('GET /events immediately streams current content as first SSE message', async () => {
    const controller = new AbortController()
    try {
      const res = await fetch(`http://localhost:${port}/events`, { signal: controller.signal })
      const reader = res.body.getReader()
      const { value } = await reader.read()
      const text = new TextDecoder().decode(value)
      expect(text).toMatch(/^data:/)
      expect(text).toContain('<h1>Hello</h1>')
    } finally {
      controller.abort()
    }
  })

  it('GET /unknown returns 404', async () => {
    const res = await fetch(`http://localhost:${port}/unknown`)
    expect(res.status).toBe(404)
  })
})

describe('preview server error handling', () => {
  it('rejects when the watched file does not exist at startup', async () => {
    const badPath = join(tmpdir(), 'heimdall-nonexistent-' + Date.now() + '.md')
    await expect(createPreviewServer(badPath)).rejects.toThrow(/not found|ENOENT/i)
  })
})
