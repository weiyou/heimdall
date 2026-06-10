# heimdall

Lightweight live markdown preview for terminal editors. Point it at any `.md` file and the page opens in your browser automatically, updating every time you save — no manual refresh, no browser extension. Rendering closely matches GitHub (syntax highlighting via Shiki + official GitHub themes, accurate line widths, and `github-markdown-css`).

## Features

- GitHub-flavored markdown rendered with `marked`
- Live updates via SSE (~100 ms after save)
- **Syntax highlighting** powered by Shiki using GitHub's official `github-light` / `github-dark` themes (always enabled for accurate GitHub matching)
- Heading anchors (`id=""`) so in-page links and `#fragment` URLs work like GitHub
- Browser opens automatically on startup (disable with `--no-open`)
- Works fully offline — the GitHub stylesheet is bundled and served locally, not loaded from a CDN
- Dark mode toggle (☀️/🌙) with `prefers-color-scheme` support and `localStorage` persistence
- Sticky header showing filename + "Last updated" timestamp — stays visible while you scroll
- Timestamp pulses on each update, so you can confirm a save was picked up even if the change is off-screen
- Background-tab marker: the tab title shows `●` when the document updates while you're elsewhere
- Scroll position preserved across live content updates
- Reconnection status banner when the SSE connection drops, with a clear "server stopped" state after repeated failures
- Render errors are shown in-page (the last good content is kept) instead of failing silently
- Configurable port via `--port` / `-p` or `PORT` environment variable, with a friendly message if the port is in use
- Clear startup error if the watched file is missing or unreadable
- Responsive design for mobile and small screens
- Keyboard shortcuts for common actions (`-h` / `--help` for CLI usage)

> **Note:** rendered HTML is not sanitized. heimdall is a local tool for previewing your own files — don't point it at untrusted markdown.

## Quick start

```bash
npm install
node src/server.js path/to/file.md
# or with a custom port:
node src/server.js path/to/file.md --port 8080
# or via environment variable:
PORT=9000 node src/server.js path/to/file.md
# → Preview → http://localhost:7474 (or your chosen port)
```

The browser opens automatically. Edit the file in any editor — the preview updates within ~100ms of each save. The page header shows the filename and a live "Last updated" timestamp. A dark mode toggle is available in the top-right of the header.

## Commands

| Command | What it does |
|---|---|
| `npm test` | Run the full test suite (single pass) |
| `npm run test:watch` | Run tests in watch mode |
| `node src/server.js <file.md>` | Start preview (defaults to port 7474) |
| `node src/server.js <file.md> --port 8080` | Start on a specific port (`-p 8080` also works) |
| `node src/server.js <file.md> --no-open` | Start without opening the browser |
| `node src/server.js --help` | Show CLI usage (`-h` also works) |
| `PORT=8080 node src/server.js <file.md>` | Start using the `PORT` environment variable |

The server can also be used programmatically:

```js
import { createPreviewServer } from './src/server.js'
const { server, stop } = await createPreviewServer('./notes.md', 0) // port 0 = random
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `t` | Toggle dark / light mode |
| `?` or `/` | Show / hide help overlay |
| `Esc` | Close help overlay |

## How live reload works

The browser opens a persistent `EventSource` connection to `/events`. When the watched file changes, the server reads it, renders it to HTML with `marked` + Shiki (for GitHub-accurate syntax highlighting), and pushes a `data:` event over that stream. The page replaces the article content in-place.

Each SSE frame is a small JSON envelope (`{ "type": "content" | "error", ... }`) so the page can tell a successful render apart from a render failure. A periodic comment ping keeps the connection alive through idle-timeout proxies.

Additional UX details:
- A sticky header bar shows the current filename and a live "Last updated" timestamp, and stays visible while you scroll.
- The timestamp pulses briefly on every update; if the tab is in the background, the tab title is marked with `●`.
- Dark mode toggle (🌙/☀️) in the top-right of the header.
- Scroll position is preserved on every update (you won't lose your place in long documents).
- A reconnection banner appears if the SSE connection drops, escalating to a "server stopped" message after repeated failures.
- Render errors appear in-page; the last successfully rendered content stays on screen.
- The server fails fast with a clear error message if the target file does not exist or the port is already in use.

File watching uses Node's built-in `fs.watchFile` (polling, default 100 ms interval, no native FSEvents dependency). The watcher has several deliberate characteristics:

- No initial fire — the callback only runs on *changes* after the watcher is attached.
- Content deduplication — identical file contents (including no-op saves, formatter round-trips, and pure metadata updates) are suppressed after the first delivery.
- Natural coalescing — very rapid successive saves within a single poll interval are collapsed; the callback receives the final state.
- Read errors during atomic saves (common with editors) are logged only once per failure episode; the watcher recovers automatically when the file reappears.
- Fully configurable polling interval and `persistent` flag via the internal `watchFile` utility (advanced / testing use).

## Stack

- **[marked](https://marked.js.org)** — GFM markdown rendering
- **[marked-gfm-heading-id](https://github.com/markedjs/marked-gfm-heading-id)** — GitHub-style heading anchors
- **[github-markdown-css](https://github.com/sindresorhus/github-markdown-css)** — stylesheet (bundled, served locally)
- **[Shiki](https://shiki.style)** — syntax highlighting using GitHub's official themes (server-side)
- **[Vitest](https://vitest.dev)** — test runner
- Node.js built-ins for HTTP, file watching, and SSE

## Tests

Built with strict TDD. 41 tests across four files cover the render function, watcher behaviour, page builder output, HTTP/SSE responses, and error handling.

```
tests/
  render.test.js   — GFM headers + anchors, lists, code blocks, fallback, tables, empty input
  watcher.test.js  — change fires, no initial fire, successive saves, content dedup,
                     metadata-only skips, read-error throttling, recovery after delete,
                     callback error containment, coalescing, custom interval/persistent
  page.test.js     — HTML structure, local CSS, sticky header, single SSE handler
  server.test.js   — HTTP status codes, content-types, SSE frames, CSS/favicon routes, EADDRINUSE
```
