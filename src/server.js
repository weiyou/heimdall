import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { renderMarkdown } from './render.js'
import { watchFile } from './watcher.js'
import { buildPage } from './page.js'

const require = createRequire(import.meta.url)

// GitHub stylesheets are bundled (npm dependency) and served locally so the
// preview works offline. Loaded once at module init.
const CSS = {
  '/css/github-markdown-light.css': readFileSync(require.resolve('github-markdown-css/github-markdown-light.css'), 'utf8'),
  '/css/github-markdown-dark.css': readFileSync(require.resolve('github-markdown-css/github-markdown-dark.css'), 'utf8'),
}

const escapeHtml = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

// One SSE frame. `type` is 'content' or 'error' so the client can react.
function sseFrame(type, payload) {
  return `data: ${JSON.stringify({ type, ...payload })}\n\n`
}

// Render markdown into an SSE frame, turning render failures into an error
// frame instead of crashing the stream.
async function renderFrame(content) {
  try {
    return sseFrame('content', { html: await renderMarkdown(content) })
  } catch (err) {
    return sseFrame('error', { message: err.message })
  }
}

export async function createPreviewServer(filePath, port = 0) {
  const clients = new Set()
  const sockets = new Set()

  // Fail fast if the file cannot be read (clear error for CLI and tests)
  try {
    readFileSync(filePath, 'utf8')
  } catch (err) {
    throw new Error(`File not found: ${filePath} (${err.code || err.message})`)
  }

  const stopWatcher = watchFile(filePath, async (content) => {
    const frame = await renderFrame(content)
    for (const res of clients) res.write(frame)
  })

  // Keep SSE connections alive through idle-timeout proxies / sleeping tabs.
  const heartbeat = setInterval(() => {
    for (const res of clients) res.write(': ping\n\n')
  }, 30000)
  if (heartbeat.unref) heartbeat.unref()

  const server = createServer(async (req, res) => {
    const path = req.url.split('?')[0]

    if (path === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })
      res.flushHeaders()
      clients.add(res)
      req.on('close', () => clients.delete(res))

      res.write(await renderFrame(readFileSync(filePath, 'utf8')))
      return
    }

    if (path === '/' || path === '/index.html') {
      let content
      try {
        content = await renderMarkdown(readFileSync(filePath, 'utf8'))
      } catch (err) {
        content = `<div class="render-error">Render error: ${escapeHtml(err.message)}</div>`
      }
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(buildPage(content, filePath))
      return
    }

    if (CSS[path]) {
      res.writeHead(200, { 'Content-Type': 'text/css', 'Cache-Control': 'max-age=86400' })
      res.end(CSS[path])
      return
    }

    // Browsers always request a favicon — answer quietly instead of logging 404s.
    if (path === '/favicon.ico') {
      res.writeHead(204).end()
      return
    }

    res.writeHead(404).end()
  })

  // Track sockets so stop() can drain immediately in tests
  server.on('connection', s => { sockets.add(s); s.on('close', () => sockets.delete(s)) })

  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(port, () => { server.off('error', reject); resolve() })
    })
  } catch (err) {
    // Listen failed (e.g. EADDRINUSE) — undo the setup we already did.
    clearInterval(heartbeat)
    stopWatcher()
    throw err
  }

  const stop = () => {
    clearInterval(heartbeat)
    stopWatcher()
    for (const s of sockets) s.destroy()
    return new Promise(resolve => server.close(resolve))
  }

  return { server, stop }
}

function printHelp() {
  console.log(`heimdall — live markdown preview for terminal editors

Usage:
  heimdall <file.md> [options]

Options:
  -p, --port <number>   Port to listen on (default: 7474, or $PORT)
      --no-open         Do not open the browser automatically
  -h, --help            Show this help and exit

Environment:
  PORT                  Alternative way to set the port

Examples:
  heimdall notes.md
  heimdall notes.md --port 8080
  PORT=9000 heimdall notes.md --no-open`)
}

// Open a URL in the user's default browser (best-effort, non-fatal).
function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'cmd'
    : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).unref()
  } catch {
    // Ignore — the URL is printed to the console as a fallback.
  }
}

// CLI entry
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2)
  let filePath = null
  let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 7474
  let open = true

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') {
      printHelp()
      process.exit(0)
    } else if (a === '--no-open') {
      open = false
    } else if (a === '--port' || a === '-p') {
      const v = argv[++i]
      if (v && !v.startsWith('-')) port = parseInt(v, 10) || port
    } else if (a.startsWith('--port=')) {
      port = parseInt(a.split('=')[1], 10) || port
    } else if (!a.startsWith('-') && !filePath) {
      filePath = a
    }
  }

  if (!filePath) {
    printHelp()
    process.exit(1)
  }

  let server
  try {
    ;({ server } = await createPreviewServer(filePath, port))
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use.`)
      console.error(`Try another port:  heimdall ${filePath} --port ${port + 1}`)
    } else {
      console.error(err.message)
    }
    process.exit(1)
  }

  const { port: actualPort } = server.address()
  const url = `http://localhost:${actualPort}`
  console.log(`Watching  ${filePath}`)
  console.log(`Preview → ${url}`)
  if (open) openBrowser(url)
}
