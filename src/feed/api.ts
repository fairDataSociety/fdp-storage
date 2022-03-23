import { Bee, Utils, Data } from '@ethersphere/bee-js'
import { bmtHashString, extractChunkContent } from '../account/utils'
import { getId } from './handler'
import { lookup } from './lookup/linear'
import { Epoch } from './lookup/epoch'
import { bytesToHex } from '../utils/hex'

const DOWNLOAD_TIMEOUT = 1000

/**
 * Finds and downloads the latest feed content
 *
 * @param bee Bee client
 * @param topic topic for calculation swarm chunk
 * @param address Ethereum address for calculation swarm chunk
 */
export async function getFeedData(bee: Bee, topic: string, address: string): Promise<Data> {
  const addressBytes = Utils.makeEthAddress(address)
  const topicHash = bmtHashString(topic)
  const chunk = await lookup(0, async (epoch: Epoch, time: number): Promise<Data> => {
    const tempId = getId(topicHash, time, epoch.level)
    const chunkReference = bytesToHex(Utils.keccak256Hash(tempId, addressBytes))

    return await bee.downloadChunk(chunkReference, { timeout: DOWNLOAD_TIMEOUT })
  })

  return extractChunkContent(chunk)
}
