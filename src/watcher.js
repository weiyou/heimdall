import { watchFile as fsWatchFile, unwatchFile, readFileSync } from 'node:fs'

export async function watchFile(filePath, callback) {
  fsWatchFile(filePath, { interval: 100 }, () => {
    callback(readFileSync(filePath, 'utf8'))
  })

  return () => unwatchFile(filePath)
}
