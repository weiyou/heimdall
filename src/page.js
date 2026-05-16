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
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #eaecef;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      color: #57606a;
    }

    #filename {
      flex: 0 0 auto;
      font-weight: 600;
    }

    #updated {
      flex: 1 1 auto;
      text-align: center;
      opacity: 0.8;
    }

    .meta-controls {
      flex: 0 0 auto;
    }

    /* GitHub-style code blocks with Shiki (dual themes + custom background).
       defaultColor:false in Shiki removes inline colors, so we drive everything via CSS vars. */
    .markdown-body .shiki,
    .markdown-body .shiki span {
      color: var(--shiki-light);
    }
    .markdown-body .shiki {
      background-color: #f6f8fa;
    }

    @media (prefers-color-scheme: dark) {
      .markdown-body .shiki,
      .markdown-body .shiki span {
        color: var(--shiki-dark) !important;
      }
      .markdown-body .shiki {
        background-color: #161b22;
      }
    }
    html.dark .markdown-body .shiki,
    html.dark .markdown-body .shiki span {
      color: var(--shiki-dark) !important;
    }
    html.dark .markdown-body .shiki {
      background-color: #161b22;
    }

    .status {
      margin: -0.5rem 0 1rem;
      padding: 6px 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      border-radius: 6px;
      background: #fff3cd;
      color: #664d03;
      border: 1px solid #ffe69c;
    }
    @media (prefers-color-scheme: dark) {
      .status {
        background: #3d2a00;
        color: #f0c36b;
        border-color: #664d03;
      }
    }
    html.dark .status {
      background: #3d2a00;
      color: #f0c36b;
      border-color: #664d03;
    }

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
    .meta-controls {
      display: flex;
      align-items: center;
      gap: 5px;                    /* ~ quarter button width separation */
    }

    #theme-toggle {
      width: 26px;
      height: 26px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      line-height: 1;
      background: transparent;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      cursor: pointer;
    }
    #theme-toggle:hover { background: #f6f8fa; }

    html.dark #theme-toggle {
      border-color: #30363d;
      color: #c9d1d9;
    }
    html.dark #theme-toggle:hover { background: #21262d; }

    /* Responsive / mobile-friendly styles */
    @media (max-width: 700px) {
      body {
        padding: 16px;
      }
      #meta {
        flex-wrap: wrap;
        gap: 4px 12px;
        font-size: 11px;
      }
      #meta #filename {
        flex: 1 1 100%;
        margin-bottom: 2px;
      }
      .status {
        margin-top: 4px;
        font-size: 11px;
      }
    }

    @media (max-width: 400px) {
      body {
        padding: 10px;
      }
      #meta {
        font-size: 10px;
      }
    }

    .help {
      position: absolute;
      top: 60px;
      right: 16px;
      z-index: 100;
      background: white;
      border: 1px solid #d0d7de;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      padding: 10px 14px;
      font-size: 12px;
      line-height: 1.5;
      color: #24292f;
    }
    @media (prefers-color-scheme: dark) {
      .help {
        background: #161b22;
        border-color: #30363d;
        color: #c9d1d9;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      }
    }
    html.dark .help {
      background: #161b22;
      border-color: #30363d;
      color: #c9d1d9;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }
    .help kbd {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 4px;
      padding: 1px 5px;
      font-size: 11px;
    }
    @media (prefers-color-scheme: dark) {
      .help kbd { background: #21262d; border-color: #30363d; }
    }
    html.dark .help kbd { background: #21262d; border-color: #30363d; }
    .help-note { opacity: 0.6; font-size: 11px; }
  </style>
</head>
<body>
  <header id="meta">
    <span id="filename">${name}</span>
    <span id="updated">Last updated: <time id="last-updated">${initialTime}</time></span>
    <div class="meta-controls">
      <button id="theme-toggle" title="Toggle dark mode (t)" aria-label="Toggle theme">🌙</button>
    </div>
  </header>
  <div id="status" class="status" hidden></div>
  <div id="help" class="help" hidden>
    <div class="help-content">
      <strong>Shortcuts</strong><br>
      <kbd>t</kbd> — Toggle theme<br>
      <kbd>?</kbd> — Toggle this help
    </div>
  </div>
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

    const statusEl = document.getElementById('status')
    const es = new EventSource('/events')

    function showStatus(msg, type = 'warning') {
      statusEl.hidden = false
      statusEl.textContent = msg
      if (type === 'success') {
        statusEl.style.background = '#d1e7dd'
        statusEl.style.color = '#0a3622'
        statusEl.style.borderColor = '#a3cfbb'
      } else {
        statusEl.style.background = ''
        statusEl.style.color = ''
        statusEl.style.borderColor = ''
      }
    }

    function hideStatus() {
      statusEl.hidden = true
    }

    es.onopen = () => {
      // Successful (re)connection
      if (!statusEl.hidden) {
        showStatus('Reconnected', 'success')
        setTimeout(hideStatus, 1200)
      }
    }

    es.onerror = () => {
      showStatus('Connection lost — reconnecting…')
    }

    es.onmessage = e => {
      const y = document.documentElement.scrollTop || document.body.scrollTop
      document.getElementById('content').innerHTML = JSON.parse(e.data)
      const t = document.getElementById('last-updated')
      if (t) t.textContent = new Date().toLocaleTimeString()
      requestAnimationFrame(() => {
        document.documentElement.scrollTop = document.body.scrollTop = y
      })
    }

    // Keyboard shortcuts
    const helpEl = document.getElementById('help')
    const themeBtn = document.getElementById('theme-toggle')

    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 't' && !e.target.matches('input, textarea')) {
        e.preventDefault()
        if (themeBtn) themeBtn.click()
      }
      if ((e.key === '?' || e.key === '/') && !e.target.matches('input, textarea')) {
        e.preventDefault()
        helpEl.hidden = !helpEl.hidden
      }
      if (e.key === 'Escape' && !helpEl.hidden) {
        helpEl.hidden = true
      }
    })

    // Server now delivers fully highlighted HTML (via Shiki + GitHub themes).
    // No client-side highlighting or toggle needed — content updates are simple.
    es.onmessage = (e) => {
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
