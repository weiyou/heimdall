import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../src/render.js'

describe('renderMarkdown', () => {
  it('renders ATX headers', () => {
    expect(renderMarkdown('# Hello')).toContain('<h1>Hello</h1>')
  })

  it('renders unordered lists', () => {
    const html = renderMarkdown('- alpha\n- beta')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>alpha</li>')
  })

  it('renders fenced code blocks with language class', () => {
    const html = renderMarkdown('```js\nconsole.log("hi")\n```')
    expect(html).toContain('<code class="language-js">')
  })

  it('renders GFM tables', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |'
    const html = renderMarkdown(md)
    expect(html).toContain('<table>')
    expect(html).toContain('<th>A</th>')
  })

  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('')
  })
})
