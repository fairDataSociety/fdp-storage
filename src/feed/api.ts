import { Bee, Utils } from '@ethersphere/bee-js'
import { Data } from '@ethersphere/bee-js/dist/src/types'
import { bmtHashString, extractChunkData } from '../account/utils'
import { getId } from './handler'
import { bytesToHex } from '../utils/hex'
import { keccak256Hash } from '../account/encryption'
import { lookup } from './lookup/linear'
import { Epoch } from './lookup/epoch'
import Long from 'long'
import { NoClue } from './lookup/lookup'

const downloadTimeout = 1000

export async function getFeedData(bee: Bee, topic: string, address: string): Promise<Data> {
  const addressBytes = Utils.makeEthAddress(address)
  const topicHash = bmtHashString(topic)
  const chunk = await lookup(Long.fromNumber(0), NoClue, async (epoch: Epoch, time: Long): Promise<Data> => {
    const tempId = getId(topicHash, time.toNumber(), epoch.level)
    const chunkReference = bytesToHex(keccak256Hash(tempId, addressBytes))

    return await bee.downloadChunk(chunkReference, { timeout: downloadTimeout })
  })

  return extractChunkData(chunk)
}
