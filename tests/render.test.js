import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../src/render.js'

describe('renderMarkdown', () => {
  it('renders ATX headers', async () => {
    expect(await renderMarkdown('# Hello')).toContain('<h1>Hello</h1>')
  })

  it('renders unordered lists', async () => {
    const html = await renderMarkdown('- alpha\n- beta')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>alpha</li>')
  })

  it('renders fenced code blocks (Shiki output)', async () => {
    const html = await renderMarkdown('```js\nconsole.log("hi")\n```')
    // Shiki uses github-light/dark themes and produces .shiki wrapper with token spans
    expect(html).toContain('<pre class="shiki shiki-themes')
    expect(html).toContain('console')
    expect(html).toContain('log')
  })

  it('renders GFM tables', async () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |'
    const html = await renderMarkdown(md)
    expect(html).toContain('<table>')
    expect(html).toContain('<th>A</th>')
  })

  it('returns empty string for empty input', async () => {
    expect(await renderMarkdown('')).toBe('')
  })
})
