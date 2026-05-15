import { watchFile as fsWatchFile, unwatchFile, readFileSync } from 'node:fs'

export async function watchFile(filePath, callback) {
  fsWatchFile(filePath, { interval: 100 }, () => {
    try {
      callback(readFileSync(filePath, 'utf8'))
    } catch (err) {
      console.error(`[heimdall] Failed to read ${filePath}: ${err.message}`)
    }
  })

  return () => unwatchFile(filePath)
}
