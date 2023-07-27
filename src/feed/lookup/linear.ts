import { Epoch, HIGHEST_LEVEL } from '../epoch'
import { Bee, BeeRequestOptions, Data, Utils } from '@ethersphere/bee-js'
import { getUnixTimestamp } from '../../utils/time'
import { wrapChunkHelper } from '../utils'
import { LookupAnswer } from '../types'
import { assertUnixTimestamp } from '../../utils/time'
import { getId } from '../handler'
import { bytesToHex } from '../../utils/hex'

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
  let epoch = new Epoch(level, time)
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

export async function lookupWithEpoch(
  bee: Bee,
  topicHash: Utils.Bytes<32>,
  address: Utils.EthAddress | Uint8Array,
  requestOptions?: BeeRequestOptions,
): Promise<LookupAnswer> {
  return lookup(0, async (epoch: Epoch, time: number): Promise<Data> => {
    const tempId = getId(topicHash, time, epoch.level)
    const chunkReference = bytesToHex(Utils.keccak256Hash(tempId.buffer, address.buffer))

    return bee.downloadChunk(chunkReference, requestOptions)
  })
}
