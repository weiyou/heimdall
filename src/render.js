import { marked } from 'marked'

export function renderMarkdown(markdown) {
  if (!markdown) return ''
  return marked.parse(markdown)
}
