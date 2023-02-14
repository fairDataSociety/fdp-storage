import { Bee, Reference, RequestOptions } from '@ethersphere/bee-js'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'
import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types'
import { getFeedData } from '../feed/api'
import { isRawDirectoryMetadata, isRawFileMetadata } from '../directory/utils'
import { DirectoryItem, FileItem, RawMetadataWithEpoch } from './types'
import { decryptJson, PodPasswordBytes } from '../utils/encryption'
import CryptoJS from 'crypto-js'

/**
 * Get raw metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address Ethereum address of the pod which owns the path
 * @param podPassword bytes for data encryption from pod metadata
 * @param downloadOptions options for downloading
 */
export async function getRawMetadata(
  bee: Bee,
  path: string,
  address: EthAddress,
  podPassword: PodPasswordBytes,
  downloadOptions?: RequestOptions,
): Promise<RawMetadataWithEpoch> {
  const feedData = await getFeedData(bee, path, address, downloadOptions)
  const data = decryptJson(podPassword, feedData.data.chunkContent())
  let metadata

  if (isRawDirectoryMetadata(data)) {
    metadata = data as RawDirectoryMetadata
  } else if (isRawFileMetadata(data)) {
    metadata = data as RawFileMetadata
  } else {
    throw new Error('Invalid metadata')
  }

  return {
    epoch: feedData.epoch,
    metadata,
  }
}

/**
 * Checks if file or directory exists at the specified path
 *
 * @param bee Bee instance
 * @param fullPath full path to the item
 * @param address uploader address
 * @param downloadOptions options for downloading
 */
export async function isItemExists(
  bee: Bee,
  fullPath: string,
  address: EthAddress,
  downloadOptions: RequestOptions | undefined,
): Promise<boolean> {
  try {
    await getFeedData(bee, fullPath, address, downloadOptions)

    return true
  } catch (e) {
    return false
  }
}

/**
 * Asserts whether item is not exists
 *
 * @param contentType human readable content type explanation
 * @param bee Bee instance
 * @param fullPath full path to the item
 * @param address uploader address
 * @param downloadOptions options for downloading
 */
export async function assertItemIsNotExists(
  contentType: string,
  bee: Bee,
  fullPath: string,
  address: EthAddress,
  downloadOptions: RequestOptions | undefined,
): Promise<void> {
  if (await isItemExists(bee, fullPath, address, downloadOptions)) {
    throw new Error(`${contentType} "${fullPath}" already uploaded to the network`)
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
