import { Connection } from '../connection/connection'
import { utils, Wallet } from 'ethers'
import { Bee, BeeRequestOptions, Data, Reference, Utils } from '@ethersphere/bee-js'
import { bmtHashString } from '../account/utils'
import { FeedType, LookupAnswer, LookupData, LookupDataWithChunkContent } from './types'

/**
 * Writes data to sequence feed
 *
 * @param connection connection information for data uploading
 * @param topic key for data
 * @param data data to upload
 * @param wallet feed owner's wallet
 */
export async function writeSequenceFeedData(
  connection: Connection,
  topic: string,
  data: Uint8Array,
  wallet: utils.HDNode | Wallet,
): Promise<Reference> {
  const topicHash = bmtHashString(topic)
  const feedWriter = connection.bee.makeFeedWriter(
    FeedType.Sequence,
    topicHash,
    wallet.privateKey,
    connection.options?.requestOptions,
  )

  const dataReference = await connection.bee.uploadData(connection.postageBatchId, data)

  return feedWriter.upload(connection.postageBatchId, dataReference.reference)
}

/**
 * Reads data from sequence feed
 *
 * @param bee Bee instance
 * @param topic topic to read from
 * @param address owner of the feed
 * @param requestOptions Bee request options
 */
export async function getSequenceFeedData(
  bee: Bee,
  topic: Utils.Bytes<32>,
  address: Utils.EthAddress | Uint8Array,
  requestOptions?: BeeRequestOptions,
): Promise<LookupAnswer> {
  const reader = bee.makeFeedReader(FeedType.Sequence, topic, address, requestOptions)
  const downloaded = await reader.download()
  const data: Data = await bee.downloadData(downloaded.reference, requestOptions)

  const lookupData: LookupData = new LookupDataWithChunkContent(data)

  return {
    data: lookupData,
    sequenceInfo: {
      ...downloaded,
    },
  }
}
