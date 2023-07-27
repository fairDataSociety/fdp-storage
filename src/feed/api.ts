import { Bee, BeeRequestOptions, Reference, Utils } from '@ethersphere/bee-js'
import { bmtHashString } from '../account/utils'
import { writeEpochFeedDataRaw } from './epoch'
import { assertWriteFeedOptions, FeedType, LookupAnswer, WriteFeedOptions } from './types'
import { Connection } from '../connection/connection'
import { encryptBytes, PodPasswordBytes } from '../utils/encryption'
import { utils, Wallet } from 'ethers'
import { getSequenceFeedData, writeSequenceFeedData } from './sequence'
import { lookupWithEpoch } from './lookup/linear'
import { getNextEpoch } from './lookup/utils'

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
 * @param feedType feed type
 * @param requestOptions download chunk requestOptions
 */
export async function getFeedData(
  bee: Bee,
  topic: string,
  address: Utils.EthAddress | Uint8Array,
  feedType: FeedType,
  requestOptions?: BeeRequestOptions,
): Promise<LookupAnswer> {
  const topicHash = bmtHashString(topic)

  if (feedType === FeedType.Epoch) {
    return lookupWithEpoch(bee, topicHash, address, requestOptions)
  } else if (feedType === FeedType.Sequence) {
    return getSequenceFeedData(bee, topicHash, address, requestOptions)
  } else {
    throw new Error('Unknown feed type')
  }
}

/**
 * Writes data with encryption to feed using `topic` and `epoch` as a key and signed data with `privateKey` as a value
 *
 * @param connection connection information for data uploading
 * @param topic key for data
 * @param data data to upload
 * @param wallet feed owner's wallet
 * @param podPassword bytes for data encryption from pod metadata
 * @param options write feed options
 */
export async function writeFeedData(
  connection: Connection,
  topic: string,
  data: Uint8Array,
  wallet: utils.HDNode | Wallet,
  podPassword: PodPasswordBytes,
  options: WriteFeedOptions,
): Promise<Reference> {
  assertWriteFeedOptions(options)
  data = encryptBytes(podPassword, data)

  let epoch = options.epochOptions?.epoch

  if (options.feedType === FeedType.Epoch && epoch) {
    if (options.epochOptions?.isGetNextEpoch) {
      epoch = getNextEpoch(epoch)
    }

    if (options.epochOptions?.isGetNextLevel) {
      epoch.level = epoch.getNextLevel(epoch.time)
    }
  }

  if (options.feedType === FeedType.Epoch) {
    return writeEpochFeedDataRaw(connection, topic, data, wallet, epoch)
  } else if (options.feedType === FeedType.Sequence) {
    return writeSequenceFeedData(connection, topic, data, wallet)
  } else {
    throw new Error('Unknown feed type')
  }
}
