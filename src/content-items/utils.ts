import { FileItem } from './file-item'
import { DirectoryItem } from './directory-item'
import { Bee, RequestOptions } from '@ethersphere/bee-js'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'
import { PodShareInfo, RawDirectoryMetadata, RawFileMetadata } from '../pod/types'
import { getFeedData } from '../feed/api'
import { isRawDirectoryMetadata, isRawFileMetadata } from '../directory/utils'
import { RawMetadataWithEpoch } from './types'
import { isPodShareInfo } from '../pod/utils'
import { FileShareInfo } from '../file/types'
import { isFileShareInfo } from '../file/utils'

/**
 * Directory item guard
 */
export function isDirectoryItem(value: unknown): value is DirectoryItem {
  return value instanceof DirectoryItem
}

/**
 * File item guard
 */
export function isFileItem(value: unknown): value is DirectoryItem {
  return value instanceof FileItem
}

/**
 * Get raw metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address Ethereum address of the pod which owns the path
 * @param downloadOptions options for downloading
 */
export async function getRawMetadata(
  bee: Bee,
  path: string,
  address: EthAddress,
  downloadOptions?: RequestOptions,
): Promise<RawMetadataWithEpoch> {
  const feedData = await getFeedData(bee, path, address, downloadOptions)
  const data = feedData.data.chunkContent().json()
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
 * Gets shared information about pod or file
 *
 * @param bee Bee instance
 * @param reference reference to shared information
 */
export async function getSharedInfo(bee: Bee, reference: string): Promise<PodShareInfo | FileShareInfo> {
  const data = (await bee.downloadData(reference)).json()

  if (!(isPodShareInfo(data) || isFileShareInfo(data))) {
    throw new Error('Invalid shared metadata')
  }

  return data
}
