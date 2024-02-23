import { Bee, Data, Reference, BeeRequestOptions, Utils, Signer } from '@ethersphere/bee-js'
import { bmtHashString } from '../account/utils'
import { getId } from './handler'
import { lookup } from './lookup/linear'
import { Epoch, getFirstEpoch } from './lookup/epoch'
import { bytesToHex } from '../utils/hex'
import { getUnixTimestamp } from '../utils/time'
import { LookupAnswer } from './types'
import { Connection } from '../connection/connection'
import { encryptBytes, PodPasswordBytes } from '../utils/encryption'
import { EthAddress } from '../utils/eth'

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
  address: EthAddress | Uint8Array,
  requestOptions?: BeeRequestOptions,
): Promise<LookupAnswer> {
  const topicHash = bmtHashString(topic)

  return lookup(0, async (epoch: Epoch, time: number): Promise<Data> => {
    const tempId = getId(topicHash, time, epoch.level)
    const chunkReference = bytesToHex(Utils.keccak256Hash(tempId.buffer, address.buffer))

    return bee.downloadChunk(chunkReference, requestOptions)
  })
}

/**
 * Writes data with encryption to feed using `topic` and `epoch` as a key and signed data with `privateKey` as a value
 *
 * @param connection connection information for data uploading
 * @param topic key for data
 * @param data data to upload
 * @param socSigner feed owner's signer
 * @param encryptionPassword data encryption password
 * @param epoch feed epoch
 */
export async function writeFeedData(
  connection: Connection,
  topic: string,
  data: Uint8Array,
  socSigner: string | Uint8Array | Signer,
  encryptionPassword: PodPasswordBytes,
  epoch?: Epoch,
): Promise<Reference> {
  epoch = prepareEpoch(epoch)
  data = encryptBytes(encryptionPassword, data)
  const topicHash = bmtHashString(topic)
  const id = getId(topicHash, epoch.time, epoch.level)
  const socWriter = connection.bee.makeSOCWriter(socSigner)

  return socWriter.upload(connection.postageBatchId, id, data)
}

/**
 * Prepares an epoch for further processing.
 *
 * @param {Epoch} [epoch] - The epoch to prepare. If not provided, a new epoch will be created.
 *
 * @return {Epoch} The prepared epoch.
 */
export function prepareEpoch(epoch?: Epoch): Epoch {
  return epoch ?? getFirstEpoch(getUnixTimestamp())
}
