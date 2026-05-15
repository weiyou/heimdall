# heimdall

Lightweight live markdown preview for terminal editors. Point it at any `.md` file, open the URL in a browser, and the page updates automatically every time you save — no manual refresh, no browser extension. Rendering matches GitHub's style via `marked` and `github-markdown-css`.

## Quick start

```bash
npm install
node src/server.js path/to/file.md
# → Preview → http://localhost:7474
```

Open the URL, then edit the file in any editor. The preview updates within ~100ms of each save.

## Commands

| Command | What it does |
|---|---|
| `npm test` | Run the full test suite (single pass) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run dev` | Start the server (requires a file argument, see above) |

## How live reload works

The browser opens a persistent `EventSource` connection to `/events`. When the watched file changes, the server reads it, renders it to HTML with `marked`, and pushes a `data:` event over that stream. The page replaces its content `innerHTML` in-place — no full navigation, no scroll reset.

File watching uses Node's built-in `fs.watchFile` at 100ms polling; no native FSEvents dependency.

## Stack

- **[marked](https://marked.js.org)** — GFM markdown rendering
- **[github-markdown-css](https://github.com/sindresorhus/github-markdown-css)** — stylesheet (CDN)
- **[Vitest](https://vitest.dev)** — test runner
- Node.js built-ins for HTTP, file watching, and SSE

## Tests

Built with strict TDD: every module has a failing test written before any implementation. 18 tests across four files cover the render function, watcher behaviour, page builder output, and HTTP/SSE responses.

```
tests/
  render.test.js   — GFM headers, lists, code blocks, tables, empty input
  watcher.test.js  — change fires, no initial fire, multiple successive saves
  page.test.js     — HTML structure, CSS link, EventSource wiring
  server.test.js   — HTTP status codes, content-types, SSE initial push
```
