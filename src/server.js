import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderMarkdown } from './render.js'
import { watchFile } from './watcher.js'
import { buildPage } from './page.js'

export async function createPreviewServer(filePath, port = 0) {
  const clients = new Set()
  const sockets = new Set()

  // Fail fast if the file cannot be read (clear error for CLI and tests)
  try {
    readFileSync(filePath, 'utf8')
  } catch (err) {
    throw new Error(`File not found: ${filePath} (${err.code || err.message})`)
  }

  const stopWatcher = await watchFile(filePath, (content) => {
    const data = `data: ${JSON.stringify(renderMarkdown(content))}\n\n`
    for (const res of clients) res.write(data)
  })

  const server = createServer((req, res) => {
    if (req.url === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })
      res.flushHeaders()
      clients.add(res)
      req.on('close', () => clients.delete(res))

      const html = renderMarkdown(readFileSync(filePath, 'utf8'))
      res.write(`data: ${JSON.stringify(html)}\n\n`)
      return
    }

    if (req.url === '/' || req.url === '/index.html') {
      const html = renderMarkdown(readFileSync(filePath, 'utf8'))
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(buildPage(html, filePath))
      return
    }

    res.writeHead(404).end()
  })

  // Track sockets so stop() can drain immediately in tests
  server.on('connection', s => { sockets.add(s); s.on('close', () => sockets.delete(s)) })

  await new Promise(resolve => server.listen(port, resolve))

  const stop = () => {
    stopWatcher()
    for (const s of sockets) s.destroy()
    return new Promise(resolve => server.close(resolve))
  }

  return { server, stop }
}

// CLI entry
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2)
  let filePath = null
  let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 7474

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--port' || a === '-p') {
      const v = argv[++i]
      if (v && !v.startsWith('-')) port = parseInt(v, 10) || port
    } else if (a.startsWith('--port=')) {
      port = parseInt(a.split('=')[1], 10) || port
    } else if (!a.startsWith('-') && !filePath) {
      filePath = a
    }
  }

  if (!filePath) {
    console.error('Usage: heimdall <file.md> [--port <number> | -p <number>]')
    console.error('       PORT=8080 heimdall <file.md>')
    process.exit(1)
  }

  const { server } = await createPreviewServer(filePath, port)
  const { port: actualPort } = server.address()
  console.log(`Watching  ${filePath}`)
  console.log(`Preview → http://localhost:${actualPort}`)
}
