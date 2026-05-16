import { Marked } from 'marked'
import markedShiki from 'marked-shiki'
import { gfmHeadingId } from 'marked-gfm-heading-id'
import { createHighlighter } from 'shiki'

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Preload Shiki with GitHub themes (exact match to GitHub.com rendering)
const highlighter = await createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: ['javascript', 'typescript', 'json', 'bash', 'python', 'markdown', 'diff']
})

const marked = new Marked().use(
  // Add GitHub-style id="" anchors to headings so links/#fragments work
  gfmHeadingId(),
  markedShiki({
    async highlight(code, lang = 'text') {
      // Try to load unknown languages on demand for maximum compatibility
      if (lang !== 'text' && !highlighter.getLoadedLanguages().includes(lang)) {
        try {
          await highlighter.loadLanguage(lang)
        } catch {
          // Unsupported language — graceful fallback. Keep the .shiki class so
          // the block still gets GitHub's shaded background from page.js CSS.
          return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`
        }
      }

      return highlighter.codeToHtml(code, {
        lang,
        themes: {
          light: 'github-light',
          dark: 'github-dark'
        },
        defaultColor: false   // let CSS control background so we can match GitHub's shaded code blocks
      })
    }
  })
)

export async function renderMarkdown(markdown) {
  if (!markdown) return ''
  return marked.parse(markdown)
}
