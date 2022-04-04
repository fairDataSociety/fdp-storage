import { Epoch, HIGHEST_LEVEL } from './epoch'
import { Data } from '@ethersphere/bee-js'
import { getUnixTimestamp } from '../../utils/time'
import { wrapChunkHelper } from '../utils'
import { LookupAnswer } from '../types'
import { assertUnixTimestamp } from '../../utils/time'

/**
 * Searches feed content with linear way
 *
 * @param time search start time point
 * @param read async function for downloading data using Epoch and time
 */
export async function lookup(time: number, read: (epoch: Epoch, time: number) => Promise<Data>): Promise<LookupAnswer> {
  if (time === 0) {
    time = getUnixTimestamp()
  }

  assertUnixTimestamp(time)
  let previousChunk: Data | undefined
  let level = HIGHEST_LEVEL
  let previousEpoch: Epoch | undefined
  let epoch: Epoch | undefined
  while (level > 0) {
    previousEpoch = epoch
    epoch = new Epoch(level, time)
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

  if (!epoch) {
    throw new Error('Incorrect epoch')
  }

  return { data: wrapChunkHelper(previousChunk), epoch: previousEpoch ? previousEpoch : epoch }
}
