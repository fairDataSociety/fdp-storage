import { Epoch } from './epoch'
import { Data } from '@ethersphere/bee-js'

export async function lookup(time: number, read: (epoch: Epoch, time: number) => Promise<Data>): Promise<Data> {
  if (time === 0) {
    time = Math.round(Date.now() / 1000)
  }

  let previousChunk: Data | undefined
  let level = 31
  while (level > 0) {
    const epoch = new Epoch(level, time)
    try {
      previousChunk = await read(epoch, time)
    } catch (e) {
      time = epoch.base() - 1

      try {
        previousChunk = await read(epoch, time)
      } catch (e) {
        break
      }
    }

    level--
  }

  if (!previousChunk) {
    throw new Error('Data not found')
  }

  return previousChunk
}
