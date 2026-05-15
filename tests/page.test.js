import { describe, it, expect } from 'vitest'
import { buildPage } from '../src/page.js'

describe('buildPage', () => {
  it('returns a valid HTML document', () => {
    const out = buildPage('<h1>Test</h1>')
    expect(out).toContain('<!DOCTYPE html>')
    expect(out).toContain('<h1>Test</h1>')
  })

  it('wraps content in a markdown-body article', () => {
    const out = buildPage('<p>hi</p>')
    expect(out).toContain('class="markdown-body"')
    expect(out).toContain('<p>hi</p>')
  })

  it('includes the github-markdown-css stylesheet', () => {
    expect(buildPage('')).toContain('github-markdown')
  })

  it('includes an EventSource wired to /events', () => {
    const out = buildPage('')
    expect(out).toContain('EventSource')
    expect(out).toContain('/events')
  })

  it('reconnects the innerHTML on each SSE message', () => {
    expect(buildPage('')).toContain('innerHTML')
  })
})
