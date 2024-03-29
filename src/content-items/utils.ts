import { Bee, Reference, BeeRequestOptions, Data } from '@ethersphere/bee-js'
import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types'
import { DELETE_FEED_MAGIC_WORD, getFeedData, writeFeedData } from '../feed/api'
import { combine, isRawDirectoryMetadata, isRawFileMetadata, splitPath } from '../directory/utils'
import { DirectoryItem, FileItem, PathInformation, RawMetadataWithEpoch } from './types'
import { decryptJson, PodPasswordBytes } from '../utils/encryption'
import CryptoJS from 'crypto-js'
import { isObject } from '../utils/type'
import { Connection } from '../connection/connection'
import { utils, Wallet } from 'ethers'
import { Epoch } from '../feed/lookup/epoch'
import { stringToBytes } from '../utils/bytes'
import { INDEX_ITEM_NAME } from '../file/handler'
import { EthAddress } from '../utils/eth'

/**
 * Extracts metadata from encrypted source data using a pod password
 *
 * @param {Data} sourceData - The encrypted source data from which to extract metadata.
 * @param {PodPasswordBytes} podPassword - The pod password used to decrypt the source data.
 * @throws {Error} If the metadata is invalid.
 * @returns {RawDirectoryMetadata | RawFileMetadata} The extracted metadata.
 */
export function extractMetadata(
  sourceData: Data,
  podPassword: PodPasswordBytes,
): RawDirectoryMetadata | RawFileMetadata {
  const data = decryptJson(podPassword, sourceData)
  let metadata

  if (isRawDirectoryMetadata(data)) {
    metadata = data as RawDirectoryMetadata
  } else if (isRawFileMetadata(data)) {
    metadata = data as RawFileMetadata
  } else {
    throw new Error('Invalid metadata')
  }

  return metadata
}

/**
 * Get raw metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address Ethereum address of the pod which owns the path
 * @param podPassword bytes for data encryption from pod metadata
 * @param requestOptions options for downloading
 */
export async function getRawMetadata(
  bee: Bee,
  path: string,
  address: EthAddress,
  podPassword: PodPasswordBytes,
  requestOptions?: BeeRequestOptions,
): Promise<RawMetadataWithEpoch> {
  const feedData = await getFeedData(bee, path, address, requestOptions)

  return {
    epoch: feedData.epoch,
    metadata: extractMetadata(feedData.data.chunkContent(), podPassword),
  }
}

/**
 * Converts FairOS directory metadata to a `DirectoryItem`
 *
 * @param item raw directory metadata from FairOS
 */
export function rawDirectoryMetadataToDirectoryItem(item: RawDirectoryMetadata): DirectoryItem {
  return {
    name: item.meta.name,
    directories: [],
    files: [],
    raw: item,
  }
}

/**
 * Converts FairOS file metadata to a `FileItem`
 *
 * @param item raw file metadata from FairOS
 */
export function rawFileMetadataToFileItem(item: RawFileMetadata): FileItem {
  let reference: Reference | undefined

  if (item.fileInodeReference) {
    reference = CryptoJS.enc.Base64.parse(item.fileInodeReference).toString(CryptoJS.enc.Hex) as Reference
  }

  return {
    name: item.fileName,
    raw: item,
    size: Number(item.fileSize),
    reference,
  }
}

/**
 * Gets `PathInformation` under the path
 */
export async function getPathInfo(
  bee: Bee,
  path: string,
  address: EthAddress,
  requestOptions?: BeeRequestOptions,
): Promise<PathInformation> {
  const lookupAnswer = await getFeedData(bee, path, address, requestOptions)

  return {
    isDeleted: lookupAnswer.data.text() === DELETE_FEED_MAGIC_WORD,
    lookupAnswer,
  }
}

/**
 * Asserts that metadata marked as deleted with the magic word
 */
export function assertItemDeleted(value: PathInformation, path: string): asserts value is PathInformation {
  const data = value as PathInformation

  if (!(isObject(data) && data.isDeleted)) {
    throw new Error(`Item under the path "${path}" is not deleted`)
  }
}

/**
 * Gets `PathInformation` for creation and uploading metadata purposes
 *
 * In case metadata is available for uploading under the path, the method will return `PathInformation`.
 * In other case it will return `undefined`.
 */
export async function getCreationPathInfo(
  bee: Bee,
  fullPath: string,
  address: EthAddress,
  requestOptions?: BeeRequestOptions,
): Promise<PathInformation | undefined> {
  // check that if directory uploaded - than it should be marked as deleted
  let pathInfo
  try {
    pathInfo = await getPathInfo(bee, fullPath, address, requestOptions)
    assertItemDeleted(pathInfo, fullPath)
    // eslint-disable-next-line no-empty
  } catch (e) {}

  return pathInfo
}

/**
 * Deletes feed data for `topic` using owner's `wallet`
 */
export async function deleteFeedData(
  connection: Connection,
  topic: string,
  wallet: utils.HDNode | Wallet,
  podPassword: PodPasswordBytes,
  epoch?: Epoch,
): Promise<Reference> {
  return writeFeedData(connection, topic, stringToBytes(DELETE_FEED_MAGIC_WORD), wallet.privateKey, podPassword, epoch)
}

/**
 * Returns the index file path for a given path.
 *
 * @param {string} path - The path for which the index file path is needed.
 * @return {string} - The index file path for the given path.
 */
export function getIndexFilePath(path: string): string {
  return combine(...splitPath(path), INDEX_ITEM_NAME)
}
