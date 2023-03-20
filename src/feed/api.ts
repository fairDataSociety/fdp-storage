import { Bee, Data, Reference, RequestOptions, Utils } from '@ethersphere/bee-js'
import { getId } from './handler'
import { lookup } from './lookup/linear'
import { Epoch, HIGHEST_LEVEL } from './lookup/epoch'
import { bytesToHex } from '../utils/hex'
import { getUnixTimestamp } from '../utils/time'
import { LookupAnswer } from './types'
import { Connection } from '../connection/connection'
import { encryptBytes, keccak256Hash, PodPasswordBytes } from '../utils/encryption'
import { utils, Wallet } from 'ethers'

/**
 * Magic word for replacing content after deletion
 */
export const DELETE_FEED_MAGIC_WORD = '__Fair__'

/**
 * Finds and downloads the latest feed content
 *
 * @param bee Bee client
 * @param topic topic for calculation swarm chunk
 * @param address Ethereum address for calculation swarm chunk
 * @param requestOptions download chunk requestOptions
 */
export async function getFeedData(
  bee: Bee,
  topic: string,
  address: Utils.EthAddress | Uint8Array,
  requestOptions?: RequestOptions,
): Promise<LookupAnswer> {
  const topicHash = keccak256Hash(topic)

  return lookup(0, async (epoch: Epoch, time: number): Promise<Data> => {
    const tempId = getId(topicHash, time, epoch.level)
    const chunkReference = bytesToHex(keccak256Hash(tempId.buffer, address.buffer))

    return bee.downloadChunk(chunkReference, requestOptions)
  })
}

/**
 * Writes data with encryption to feed using `topic` and `epoch` as a key and signed data with `privateKey` as a value
 *
 * @param connection connection information for data uploading
 * @param topic key for data
 * @param data data to upload
 * @param wallet feed owner's wallet
 * @param podPassword bytes for data encryption from pod metadata
 * @param epoch feed epoch
 */
export async function writeFeedData(
  connection: Connection,
  topic: string,
  data: Uint8Array,
  wallet: utils.HDNode | Wallet,
  podPassword: PodPasswordBytes,
  epoch?: Epoch,
): Promise<Reference> {
  data = encryptBytes(podPassword, data)

  return writeFeedDataRaw(connection, topic, data, wallet, epoch)
}

/**
 * Writes data without encryption to feed using `topic` and `epoch` as a key and signed data with `privateKey` as a value
 *
 * @deprecated required for deprecated methods
 *
 * @param connection connection information for data uploading
 * @param topic key for data
 * @param data data to upload
 * @param wallet feed owner's wallet
 * @param epoch feed epoch
 */
export async function writeFeedDataRaw(
  connection: Connection,
  topic: string,
  data: Uint8Array,
  wallet: utils.HDNode | Wallet,
  epoch?: Epoch,
): Promise<Reference> {
  if (!epoch) {
    epoch = new Epoch(HIGHEST_LEVEL, getUnixTimestamp())
  }

  const topicHash = keccak256Hash(topic)
  const id = getId(topicHash, epoch.time, epoch.level)
  const socWriter = connection.bee.makeSOCWriter(wallet.privateKey)

  return socWriter.upload(connection.postageBatchId, id, data)
}
