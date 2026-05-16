import { watchFile as fsWatchFile, unwatchFile, readFileSync } from 'node:fs'

export async function watchFile(filePath, callback) {
  fsWatchFile(filePath, { interval: 100 }, async () => {
    try {
      const content = readFileSync(filePath, 'utf8')
      await callback(content)
    } catch (err) {
      console.error(`[heimdall] Failed to read or render ${filePath}: ${err.message}`)
    }
  })

  return () => unwatchFile(filePath)
}
