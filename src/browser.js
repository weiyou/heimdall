import { spawn } from 'node:child_process'

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
export function openBrowser(url, browser) {
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
