import { basename } from 'node:path'

// GitHub stylesheets are served locally by the server (see server.js) so the
// preview renders correctly even with no internet connection.
const CSS_LIGHT = '/css/github-markdown-light.css'
const CSS_DARK = '/css/github-markdown-dark.css'

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
    /* Match GitHub repository README rendering when sidebars are visible.
       908px max-width + 45px side padding reproduces GitHub's effective
       content width (the package's 980px is wider than the real repo view). */
    body { box-sizing: border-box; max-width: 908px; margin: 0 auto; padding: 0 45px 45px; }

    /* Sticky header — stays visible so the live "Last updated" time and the
       theme toggle remain reachable while scrolling long documents. The body
       has no top padding; the header's own padding-top supplies the gap and
       keeps an opaque background covering content scrolling underneath. */
    #meta {
      position: sticky;
      top: 0;
      z-index: 50;
      background: #ffffff;
      display: flex;
      align-items: center;
      padding-top: 14px;
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

    /* Brief pulse on the timestamp confirms a save was picked up, even when
       the changed content itself is scrolled off-screen. */
    #last-updated.flash { animation: heimdall-flash 0.7s ease-out; }
    @keyframes heimdall-flash {
      0%   { color: #2da44e; font-weight: 600; }
      100% { color: inherit; font-weight: inherit; }
    }

    .meta-controls {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 5px;
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

    /* Status banner — connection state and render errors. Colour by data-type. */
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
    .status[data-type="success"] { background: #d1e7dd; color: #0a3622; border-color: #a3cfbb; }
    .status[data-type="error"]   { background: #ffebe9; color: #82071e; border-color: #ffaba8; }
    @media (prefers-color-scheme: dark) {
      .status { background: #3d2a00; color: #f0c36b; border-color: #664d03; }
      .status[data-type="success"] { background: #0f2e1d; color: #6fce9a; border-color: #1d5a38; }
      .status[data-type="error"]   { background: #3a0d10; color: #ff9492; border-color: #6e2528; }
    }
    html.dark .status { background: #3d2a00; color: #f0c36b; border-color: #664d03; }
    html.dark .status[data-type="success"] { background: #0f2e1d; color: #6fce9a; border-color: #1d5a38; }
    html.dark .status[data-type="error"]   { background: #3a0d10; color: #ff9492; border-color: #6e2528; }

    /* Render error shown inside the article when the document itself is invalid. */
    .render-error {
      padding: 12px 16px;
      border-radius: 6px;
      background: #ffebe9;
      color: #82071e;
      border: 1px solid #ffaba8;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
    }
    @media (prefers-color-scheme: dark) {
      .render-error { background: #3a0d10; color: #ff9492; border-color: #6e2528; }
    }
    html.dark .render-error { background: #3a0d10; color: #ff9492; border-color: #6e2528; }

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
        padding: 0 16px 16px;
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
        padding: 0 10px 10px;
      }
      #meta {
        font-size: 10px;
      }
    }

    .help {
      position: fixed;
      top: 60px;
      right: 16px;
      z-index: 100;
      background: white;
      border: 1px solid #d0d7de;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      padding: 10px 14px;
      font-size: 12px;
      line-height: 1.6;
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
      <strong>Keyboard shortcuts</strong><br>
      <kbd>t</kbd> — Toggle dark / light theme<br>
      <kbd>?</kbd> or <kbd>/</kbd> — Toggle this help<br>
      <kbd>Esc</kbd> — Close this help
    </div>
  </div>
  <article class="markdown-body" id="content">${html}</article>
  <script>
    // ----- Theme handling -----
    (function () {
      const lightLink = document.getElementById('css-light')
      const darkLink = document.getElementById('css-dark')
      const toggle = document.getElementById('theme-toggle')
      const root = document.documentElement
      const mediaDark = window.matchMedia('(prefers-color-scheme: dark)')

      function hasManualChoice() {
        const saved = localStorage.getItem('heimdall-theme')
        return saved === 'dark' || saved === 'light'
      }

      function getEffectiveTheme() {
        const saved = localStorage.getItem('heimdall-theme')
        if (saved === 'dark' || saved === 'light') return saved
        return mediaDark.matches ? 'dark' : 'light'
      }

      // Apply a forced (manual) theme — removes media attributes so the choice sticks
      function forceTheme(theme) {
        const isDark = theme === 'dark'
        lightLink.removeAttribute('media')
        darkLink.removeAttribute('media')
        lightLink.disabled = isDark
        darkLink.disabled = !isDark
        root.classList.toggle('dark', isDark)
        toggle.textContent = isDark ? '☀️' : '🌙'
        toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode')
      }

      // Let the browser/media queries decide (no manual override active)
      function useSystemTheme() {
        lightLink.setAttribute('media', '(prefers-color-scheme: light)')
        darkLink.setAttribute('media', '(prefers-color-scheme: dark)')
        lightLink.disabled = false
        darkLink.disabled = false
        root.classList.remove('dark')
        const effectiveIsDark = mediaDark.matches
        toggle.textContent = effectiveIsDark ? '☀️' : '🌙'
        toggle.setAttribute('aria-label', effectiveIsDark ? 'Switch to light mode' : 'Switch to dark mode')
      }

      if (hasManualChoice()) {
        forceTheme(localStorage.getItem('heimdall-theme'))
      } else {
        useSystemTheme()
      }

      toggle.addEventListener('click', () => {
        const newTheme = getEffectiveTheme() === 'dark' ? 'light' : 'dark'
        localStorage.setItem('heimdall-theme', newTheme)
        forceTheme(newTheme)
      })

      mediaDark.addEventListener('change', () => {
        if (!hasManualChoice()) useSystemTheme()
      })
    })()

    // ----- Live updates over SSE -----
    const statusEl = document.getElementById('status')
    const contentEl = document.getElementById('content')
    const updatedEl = document.getElementById('last-updated')
    const baseTitle = document.title
    let failures = 0

    function showStatus(msg, type) {
      statusEl.hidden = false
      statusEl.textContent = msg
      statusEl.dataset.type = type || 'warning'
    }
    function hideStatus() {
      statusEl.hidden = true
      statusEl.removeAttribute('data-type')
    }
    function flashTimestamp() {
      updatedEl.classList.remove('flash')
      void updatedEl.offsetWidth   // force reflow so the animation restarts
      updatedEl.classList.add('flash')
    }

    // Clear the background-tab marker once the user looks at the page again
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) document.title = baseTitle
    })

    const es = new EventSource('/events')

    es.onopen = () => {
      if (failures > 0) {
        showStatus('Reconnected', 'success')
        setTimeout(() => { if (statusEl.dataset.type === 'success') hideStatus() }, 1200)
      }
      failures = 0
    }

    es.onerror = () => {
      failures++
      if (failures >= 5) {
        showStatus('Server stopped — restart heimdall to resume live updates.', 'error')
      } else {
        showStatus('Connection lost — reconnecting…', 'warning')
      }
    }

    es.onmessage = (e) => {
      const msg = JSON.parse(e.data)

      // A render failure: keep the last good content, surface the error.
      if (msg.type === 'error') {
        showStatus('⚠ Render error: ' + msg.message, 'error')
        return
      }

      // Successful render — clear any stale render-error banner.
      if (statusEl.dataset.type === 'error') hideStatus()

      const y = document.documentElement.scrollTop || document.body.scrollTop
      contentEl.innerHTML = msg.html
      updatedEl.textContent = new Date().toLocaleTimeString()
      flashTimestamp()
      if (document.hidden) document.title = '● ' + baseTitle
      requestAnimationFrame(() => {
        document.documentElement.scrollTop = document.body.scrollTop = y
      })
    }

    // ----- Keyboard shortcuts -----
    const helpEl = document.getElementById('help')
    const themeBtn = document.getElementById('theme-toggle')

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea')) return
      if (e.key.toLowerCase() === 't') {
        e.preventDefault()
        if (themeBtn) themeBtn.click()
      } else if (e.key === '?' || e.key === '/') {
        e.preventDefault()
        helpEl.hidden = !helpEl.hidden
      } else if (e.key === 'Escape' && !helpEl.hidden) {
        helpEl.hidden = true
      }
    })
  </script>
</body>
</html>`
}
