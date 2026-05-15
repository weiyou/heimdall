import { basename } from 'node:path'

const CSS_LIGHT = 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.6.1/github-markdown.min.css'
const CSS_DARK = 'https://cdn.jsdelivr.net/npm/github-markdown-css@5.6.1/github-markdown-dark.min.css'

export function buildPage(html, filePath = '') {
  const name = filePath ? basename(filePath) : 'Untitled'
  const initialTime = new Date().toLocaleTimeString()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Heimdall — ${name}</title>
  <link rel="stylesheet" href="${CSS_LIGHT}" id="css-light" media="(prefers-color-scheme: light)">
  <link rel="stylesheet" href="${CSS_DARK}" id="css-dark" media="(prefers-color-scheme: dark)">
  <style>
    body { box-sizing: border-box; max-width: 980px; margin: 0 auto; padding: 45px; }
    #meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #eaecef;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      color: #57606a;
    }
    #meta #filename { font-weight: 600; }
    #meta #updated { opacity: 0.8; }
    #theme-toggle {
      background: transparent;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 14px;
      cursor: pointer;
      line-height: 1;
    }
    #theme-toggle:hover { background: #f6f8fa; }

    /* System (auto) dark theme via prefers-color-scheme — applies when no manual choice */
    @media (prefers-color-scheme: dark) {
      body {
        background: #0d1117;
        color: #c9d1d9;
      }
      #meta {
        background: #161b22;
        border-bottom-color: #21262d;
        color: #8b949e;
      }
      #meta #filename,
      #meta #updated {
        color: #c9d1d9;
      }
      #theme-toggle {
        border-color: #30363d;
        color: #c9d1d9;
      }
      #theme-toggle:hover {
        background: #21262d;
      }
    }

    /* Manual dark override (when user clicked the toggle) — takes precedence */
    html.dark body {
      background: #0d1117;
      color: #c9d1d9;
    }
    html.dark #meta {
      background: #161b22;
      border-bottom-color: #21262d;
      color: #8b949e;
    }
    html.dark #meta #filename,
    html.dark #meta #updated {
      color: #c9d1d9;
    }
    html.dark #theme-toggle {
      border-color: #30363d;
      color: #c9d1d9;
    }
    html.dark #theme-toggle:hover {
      background: #21262d;
    }
  </style>
</head>
<body>
  <header id="meta">
    <span id="filename">${name}</span>
    <span id="updated">Last updated: <time id="last-updated">${initialTime}</time></span>
    <button id="theme-toggle" title="Toggle dark mode" aria-label="Toggle theme">🌙</button>
  </header>
  <article class="markdown-body" id="content">${html}</article>
  <script>
    (function () {
      const lightLink = document.getElementById('css-light')
      const darkLink = document.getElementById('css-dark')
      const toggle = document.getElementById('theme-toggle')
      const root = document.documentElement
      const mediaDark = window.matchMedia('(prefers-color-scheme: dark)')

      // Determine if user has made an explicit manual choice
      function hasManualChoice() {
        const saved = localStorage.getItem('heimdall-theme')
        return saved === 'dark' || saved === 'light'
      }

      // Get the effective theme (respect manual choice, otherwise system)
      function getEffectiveTheme() {
        const saved = localStorage.getItem('heimdall-theme')
        if (saved === 'dark' || saved === 'light') return saved
        return mediaDark.matches ? 'dark' : 'light'
      }

      // Apply a forced (manual) theme — removes media attributes so the choice sticks
      function forceTheme(theme) {
        const isDark = theme === 'dark'
        // Remove media attributes so the chosen stylesheet stays active regardless of system
        lightLink.removeAttribute('media')
        darkLink.removeAttribute('media')
        lightLink.disabled = isDark
        darkLink.disabled = !isDark
        root.classList.toggle('dark', isDark)
        toggle.textContent = isDark ? '☀️' : '🌙'
        toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode')
      }

      // Let the browser/media queries handle everything (no manual override active)
      function useSystemTheme() {
        // Restore media attributes so GitHub CSS follows system natively
        lightLink.setAttribute('media', '(prefers-color-scheme: light)')
        darkLink.setAttribute('media', '(prefers-color-scheme: dark)')
        // Do not disable either link — browser decides
        lightLink.disabled = false
        darkLink.disabled = false
        // Remove any previous manual class
        root.classList.remove('dark')
        // Show icon for the *opposite* of current effective system theme
        const effectiveIsDark = mediaDark.matches
        toggle.textContent = effectiveIsDark ? '☀️' : '🌙'
        toggle.setAttribute('aria-label', effectiveIsDark ? 'Switch to light mode' : 'Switch to dark mode')
      }

      // Initialize on load
      if (hasManualChoice()) {
        const saved = localStorage.getItem('heimdall-theme')
        forceTheme(saved)
      } else {
        useSystemTheme()
      }

      // Toggle always creates/saves a manual choice
      toggle.addEventListener('click', () => {
        const newTheme = getEffectiveTheme() === 'dark' ? 'light' : 'dark'
        localStorage.setItem('heimdall-theme', newTheme)
        forceTheme(newTheme)
      })

      // When system preference changes and we are *not* in manual mode,
      // update the toggle icon to reflect the new effective theme.
      mediaDark.addEventListener('change', () => {
        if (!hasManualChoice()) {
          useSystemTheme()
        }
      })
    })()

    const es = new EventSource('/events')
    es.onmessage = e => {
      const y = document.documentElement.scrollTop || document.body.scrollTop
      document.getElementById('content').innerHTML = JSON.parse(e.data)
      const t = document.getElementById('last-updated')
      if (t) t.textContent = new Date().toLocaleTimeString()
      requestAnimationFrame(() => {
        document.documentElement.scrollTop = document.body.scrollTop = y
      })
    }
  </script>
</body>
</html>`
}
