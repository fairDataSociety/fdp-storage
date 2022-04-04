import { Bee, Data, Reference, Utils } from '@ethersphere/bee-js'
import { bmtHashString } from '../account/utils'
import { getId } from './handler'
import { lookup } from './lookup/linear'
import { Epoch, HIGHEST_LEVEL } from './lookup/epoch'
import { bytesToHex } from '../utils/hex'
import { getBatchId } from '../utils/batch'
import { getUnixTimestamp } from '../utils/time'
import { LookupAnswer } from './types'
import { Connection } from '../connection/connection'

/**
 * Finds and downloads the latest feed content
 *
 * @param bee Bee client
 * @param topic topic for calculation swarm chunk
 * @param address Ethereum address for calculation swarm chunk
 * @param timeout download timeout during finding
 */
export async function getFeedData(
  bee: Bee,
  topic: string,
  address: Utils.EthAddress,
  timeout = 5000,
): Promise<LookupAnswer> {
  const topicHash = bmtHashString(topic)

  return lookup(0, async (epoch: Epoch, time: number): Promise<Data> => {
    const tempId = getId(topicHash, time, epoch.level)
    const chunkReference = bytesToHex(Utils.keccak256Hash(tempId.buffer, address.buffer))

    return await bee.downloadChunk(chunkReference, { timeout })
  })
}

/**
 * Writes data to feed using `topic` and `epoch` as a key and signed data with `privateKey` as a value
 *
 * @param connection connection information for data uploading
 * @param topic key for data
 * @param data data to upload
 * @param privateKey private key to sign data
 * @param epoch feed epoch
 */
export async function writeFeedData(
  connection: Connection,
  topic: string,
  data: Uint8Array,
  privateKey: string,
  epoch?: Epoch,
): Promise<Reference> {
  if (!epoch) {
    epoch = new Epoch(HIGHEST_LEVEL, getUnixTimestamp())
  }

  const topicHash = bmtHashString(topic)
  const id = getId(topicHash, epoch.time, epoch.level)
  const socWriter = connection.bee.makeSOCWriter(privateKey)

  return socWriter.upload(await getBatchId(connection.beeDebug), id, data)
}
