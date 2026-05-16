# heimdall

Lightweight live markdown preview for terminal editors. Point it at any `.md` file, open the URL in a browser, and the page updates automatically every time you save — no manual refresh, no browser extension. Rendering closely matches GitHub (syntax highlighting via Shiki + official GitHub themes, accurate line widths, and `github-markdown-css`).

## Features

- GitHub-flavored markdown rendered with `marked`
- Live updates via SSE (~100 ms after save)
- **Syntax highlighting** powered by Shiki using GitHub's official `github-light` / `github-dark` themes (always enabled for accurate GitHub matching)
- Dark mode toggle (☀️/🌙) with `prefers-color-scheme` support and `localStorage` persistence
- Always-visible header showing filename + "Last updated" timestamp (refreshes on every change)
- Scroll position preserved across live content updates
- Reconnection status banner when the SSE connection drops
- Configurable port via `--port` / `-p` or `PORT` environment variable
- Clear startup error if the watched file is missing or unreadable
- Responsive design for mobile and small screens
- Keyboard shortcuts for common actions

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

Open the URL, then edit the file in any editor. The preview updates within ~100ms of each save. The page header shows the filename and a live "Last updated" timestamp. A dark mode toggle is available in the top-right of the header.

## Commands

| Command | What it does |
|---|---|
| `npm test` | Run the full test suite (single pass) |
| `npm run test:watch` | Run tests in watch mode |
| `node src/server.js <file.md>` | Start preview (defaults to port 7474) |
| `node src/server.js <file.md> --port 8080` | Start on a specific port (`-p 8080` also works) |
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

Additional UX details:
- A small header bar always shows the current filename and a live "Last updated" timestamp (centered).
- Dark mode toggle (🌙/☀️) in the top-right of the header.
- Scroll position is preserved on every update (you won't lose your place in long documents).
- Reconnection status banner appears if the SSE connection is lost.
- The server fails fast with a clear error message if the target file does not exist.

File watching uses Node's built-in `fs.watchFile` at 100ms polling; no native FSEvents dependency.

## Stack

- **[marked](https://marked.js.org)** — GFM markdown rendering
- **[github-markdown-css](https://github.com/sindresorhus/github-markdown-css)** — stylesheet (CDN)
- **[Shiki](https://shiki.style)** — syntax highlighting using GitHub's official themes (server-side)
- **[Vitest](https://vitest.dev)** — test runner
- Node.js built-ins for HTTP, file watching, and SSE

## Tests

Built with strict TDD: every module has a failing test written before any implementation. 19 tests across four files cover the render function, watcher behaviour, page builder output, HTTP/SSE responses, and error handling.

```
tests/
  render.test.js   — GFM headers, lists, code blocks, tables, empty input
  watcher.test.js  — change fires, no initial fire, multiple successive saves
  page.test.js     — HTML structure, CSS link, EventSource wiring
  server.test.js   — HTTP status codes, content-types, SSE initial push
```
