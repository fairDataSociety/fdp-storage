import { Bee, Utils } from '@ethersphere/bee-js'
import { Data } from '@ethersphere/bee-js/dist/src/types'
import { bmtHashString, extractChunkData } from '../account/utils'
import { getId } from './handler'
import { bytesToHex } from '../utils/hex'
import { keccak256Hash } from '../account/encryption'

export async function getFeedData(bee: Bee, topic: string, address: string): Promise<Data> {
  const addressBytes = Utils.makeEthAddress(address)
  const topicHash = bmtHashString(topic)
  const id = getId(topicHash)
  const chunkReference = bytesToHex(keccak256Hash(id, addressBytes))
  const chunk = await bee.downloadChunk(chunkReference)

  return extractChunkData(chunk)
}
