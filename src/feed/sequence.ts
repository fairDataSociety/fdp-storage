import { Connection } from '../connection/connection'
import { utils, Wallet } from 'ethers'
import { Reference } from '@ethersphere/bee-js'
import { bmtHashString } from '../account/utils'
import { FeedType } from './types'

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
    FeedType.Epoch,
    topicHash,
    wallet.privateKey,
    connection.options?.requestOptions,
  )

  const dataReference = await connection.bee.uploadData(connection.postageBatchId, data)

  return feedWriter.upload(connection.postageBatchId, dataReference.reference)
}
