import Long from 'long'
import { Epoch } from './epoch'
import { Data } from '@ethersphere/bee-js/dist/src/types'

export async function lookup(time: Long, read: (epoch: Epoch, time: Long) => Promise<Data>): Promise<Data> {
  if (time.eqz()) {
    time = Long.fromNumber(Math.round(Date.now() / 1000))
  }

  let previousChunk: Data | undefined
  let level = 31
  while (level > 0) {
    const epoch = new Epoch(level, time)
    try {
      previousChunk = await read(epoch, time)
    } catch (e) {
      time = epoch.base().sub(1)

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
