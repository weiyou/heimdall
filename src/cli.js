#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createPreviewServer } from './server.js'

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

// Per-platform application names for the browsers we can target explicitly.
// Anything not listed here falls back to the OS default browser.
const BROWSER_APPS = {
  darwin: { safari: 'Safari', brave: 'Brave Browser' },
  win32: { safari: 'Safari', brave: 'Brave' },
  linux: { safari: null, brave: 'brave-browser' },
}

// Build the { cmd, args } needed to open `url`, optionally in a specific
// browser. Pure (takes platform) so it can be unit-tested. Returns null if
// the requested browser is not available on this platform.
export function browserCommand(url, browser, platform = process.platform) {
  const app = browser ? BROWSER_APPS[platform]?.[browser] : undefined

  // Explicit browser requested but not supported on this platform.
  if (browser && !app) return null

  if (platform === 'darwin') {
    return app ? { cmd: 'open', args: ['-a', app, url] } : { cmd: 'open', args: [url] }
  }
  if (platform === 'win32') {
    return app
      ? { cmd: 'cmd', args: ['/c', 'start', '', app, url] }
      : { cmd: 'cmd', args: ['/c', 'start', '', url] }
  }
  // linux / other
  return app ? { cmd: app, args: [url] } : { cmd: 'xdg-open', args: [url] }
}

// Open a URL in a browser (best-effort, non-fatal). `browser` may be
// 'safari', 'brave', or undefined for the OS default.
function openBrowser(url, browser) {
  const command = browserCommand(url, browser)
  if (!command) {
    console.error(`Cannot open ${browser} on ${process.platform}; open manually: ${url}`)
    return
  }
  try {
    spawn(command.cmd, command.args, { stdio: 'ignore', detached: true }).unref()
  } catch {
    // Ignore — the URL is printed to the console as a fallback.
  }
}

async function main() {
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
}

// Only run the CLI when invoked directly (so importing browserCommand for
// tests does not parse argv or start a server).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
