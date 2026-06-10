#!/usr/bin/env node
import { createPreviewServer } from './server.js'
import { openBrowser } from './browser.js'

function printHelp() {
  console.log(`heimdall — live markdown preview for terminal editors

Usage:
  heimdall <file.md> [options]

Options:
  -p, --port <number>   Port to listen on (default: 7474, or $PORT)
  -b, --browser <name>  Browser to open: safari, brave (default: system default)
      --no-open         Do not open the browser automatically
  -h, --help            Show this help and exit

Environment:
  PORT                  Alternative way to set the port

Examples:
  heimdall notes.md
  heimdall notes.md --port 8080
  heimdall notes.md --browser brave
  PORT=9000 heimdall notes.md --no-open`)
}

const argv = process.argv.slice(2)
let filePath = null
let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 7474
let open = true
let browser

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
  } else if (a === '--browser' || a === '-b') {
    const v = argv[++i]
    if (v && !v.startsWith('-')) browser = v.toLowerCase()
  } else if (a.startsWith('--browser=')) {
    browser = a.split('=')[1].toLowerCase()
  } else if (!a.startsWith('-') && !filePath) {
    filePath = a
  }
}

if (browser && !['safari', 'brave'].includes(browser)) {
  console.error(`Unknown browser: ${browser} (supported: safari, brave)`)
  process.exit(1)
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
if (open) openBrowser(url, browser)
