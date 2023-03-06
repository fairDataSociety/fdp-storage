import { writeFeedData } from '../feed/api'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'
import { Bee, Reference, RequestOptions } from '@ethersphere/bee-js'
import {
  assertDirectoryName,
  assertPartsLength,
  assertRawDirectoryMetadata,
  assertRawFileMetadata,
  combine,
  getPathFromParts,
  getPathParts,
  splitPath,
} from './utils'
import { DIRECTORY_TOKEN, FILE_TOKEN } from '../file/handler'
import { getUnixTimestamp } from '../utils/time'
import { createRawDirectoryMetadata, META_VERSION } from '../pod/utils'
import { Connection } from '../connection/connection'
import { utils } from 'ethers'
import { addEntryToDirectory, DEFAULT_UPLOAD_OPTIONS } from '../content-items/handler'
import {
  rawDirectoryMetadataToDirectoryItem,
  rawFileMetadataToFileItem,
  getRawMetadata,
  getCreationPathInfo,
} from '../content-items/utils'
import { PodPasswordBytes } from '../utils/encryption'
import { DataUploadOptions } from '../file/types'
import { DirectoryItem } from '../content-items/types'
import { prepareEthAddress } from '../utils/wallet'
import { Epoch } from '../feed/lookup/epoch'
import { getNextEpoch } from '../feed/lookup/utils'

/**
 * Options for uploading a directory
 */
export interface UploadDirectoryOptions {
  uploadOptions?: DataUploadOptions
  // find files recursively in nested directories
  isRecursive?: boolean
  // hide files that started with dots
  excludeDotFiles?: boolean
  // create a directory with a name like the source directory
  isIncludeDirectoryName?: boolean
  // uploading progress callback
  onProgress?: (processingPath: string, processingFileNumber: number, filesCount: number) => void
}

export const MAX_DIRECTORY_NAME_LENGTH = 100
export const DEFAULT_UPLOAD_DIRECTORY_OPTIONS: UploadDirectoryOptions = {
  uploadOptions: DEFAULT_UPLOAD_OPTIONS,
  isRecursive: true,
  excludeDotFiles: false,
  isIncludeDirectoryName: true,
}

/**
 * Get files and directories under path with recursion or not
 *
 * @param bee Bee instance
 * @param path path to start searching from
 * @param address Ethereum address of the pod which owns the path
 * @param podPassword bytes for data encryption from pod metadata
 * @param isRecursive search with recursion or not
 * @param downloadOptions options for downloading
 */
export async function readDirectory(
  bee: Bee,
  path: string,
  address: EthAddress,
  podPassword: PodPasswordBytes,
  isRecursive?: boolean,
  downloadOptions?: RequestOptions,
): Promise<DirectoryItem> {
  const parentRawDirectoryMetadata = (await getRawMetadata(bee, path, address, podPassword, downloadOptions)).metadata
  assertRawDirectoryMetadata(parentRawDirectoryMetadata)
  const resultDirectoryItem = rawDirectoryMetadataToDirectoryItem(parentRawDirectoryMetadata)

  if (!parentRawDirectoryMetadata.fileOrDirNames) {
    return resultDirectoryItem
  }

  for (let item of parentRawDirectoryMetadata.fileOrDirNames) {
    const isFile = item.startsWith(FILE_TOKEN)
    const isDirectory = item.startsWith(DIRECTORY_TOKEN)

    if (isFile) {
      item = combine(...splitPath(path), item.substring(FILE_TOKEN.length))
      const data = (await getRawMetadata(bee, item, address, podPassword, downloadOptions)).metadata
      assertRawFileMetadata(data)
      resultDirectoryItem.files.push(rawFileMetadataToFileItem(data))
    } else if (isDirectory) {
      item = combine(...splitPath(path), item.substring(DIRECTORY_TOKEN.length))
      const data = (await getRawMetadata(bee, item, address, podPassword, downloadOptions)).metadata
      assertRawDirectoryMetadata(data)
      const currentMetadata = rawDirectoryMetadataToDirectoryItem(data)

      if (isRecursive) {
        const content = await readDirectory(bee, item, address, podPassword, isRecursive, downloadOptions)
        currentMetadata.files = content.files
        currentMetadata.directories = content.directories
      }

      resultDirectoryItem.directories.push(currentMetadata)
    }
  }

  return resultDirectoryItem
}

/**
 * Creates directory metadata for a given directory path and upload it to the network
 *
 * @param connection Bee connection
 * @param path parent path
 * @param name name of the directory
 * @param podPassword bytes for data encryption from pod metadata
 * @param wallet feed owner's wallet
 * @param epoch epoch where directory info should be uploaded
 */
async function createDirectoryInfo(
  connection: Connection,
  path: string,
  name: string,
  podPassword: PodPasswordBytes,
  wallet: utils.HDNode,
  epoch?: Epoch,
): Promise<Reference> {
  const now = getUnixTimestamp()
  const metadata = createRawDirectoryMetadata(META_VERSION, path, name, now, now, now)

  return writeFeedData(connection, combine(...splitPath(path), name), metadata, wallet, podPassword, epoch)
}

/**
 * Creates root directory for the pod that tied to the private key
 *
 * @param connection Bee connection
 * @param podPassword bytes for data encryption
 * @param wallet feed owner's wallet
 */
export async function createRootDirectory(
  connection: Connection,
  podPassword: PodPasswordBytes,
  wallet: utils.HDNode,
): Promise<Reference> {
  return createDirectoryInfo(connection, '', '/', podPassword, wallet)
}

/**
 * Creates directory under the pod
 *
 * @param connection Bee connection
 * @param fullPath path to the directory
 * @param podWallet pod wallet
 * @param podPassword bytes for decrypting pod content
 * @param downloadOptions options for downloading
 */
export async function createDirectory(
  connection: Connection,
  fullPath: string,
  podWallet: utils.HDNode,
  podPassword: PodPasswordBytes,
  downloadOptions?: RequestOptions,
): Promise<void> {
  const parts = getPathParts(fullPath)
  assertPartsLength(parts)
  const name = parts[parts.length - 1]
  assertDirectoryName(name)

  const parentPath = getPathFromParts(parts, 1)
  const pathInfo = await getCreationPathInfo(
    connection.bee,
    fullPath,
    prepareEthAddress(podWallet.address),
    connection.options?.requestOptions,
  )
  await addEntryToDirectory(connection, podWallet, podPassword, parentPath, name, false, downloadOptions)
  await createDirectoryInfo(
    connection,
    parentPath,
    name,
    podPassword,
    podWallet,
    getNextEpoch(pathInfo?.lookupAnswer.epoch),
  )
}
