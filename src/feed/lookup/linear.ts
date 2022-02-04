import Long from 'long'
import { Epoch } from './epoch'
import { Data } from '@ethersphere/bee-js/dist/src/types'
import { Lookup } from './lookup'

export async function lookup(time: Long, hint: Epoch, read: (epoch: Epoch, time: Long) => Promise<Data>) {
  const lookup = new Lookup()

  if (time.eqz()) {
    time = Long.fromNumber(Math.round(Date.now() / 1000))
  }

  let previousChunk
  let level = 31
  for (;;) {
    let epoch = new Epoch(level, time)

    console.log('1 epoch', epoch, 'level', level, 'time', time, 'is not ok, update time base')
    try {
      previousChunk = await read(epoch, time)
    } catch (e) {
      time = epoch.base()

      console.log('2 epoch', epoch, 'level', level, 'time', time, 'is not ok, update time base')
      // epoch = lookup.getNextEpoch(epoch, time)

      try {
        previousChunk = await read(epoch, time)
      } catch (e) {
        console.log(epoch, level, 'is not ok, break')
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
