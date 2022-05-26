import { getFeedData, writeFeedData } from '../feed/api'
import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types'
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
  isRawDirectoryMetadata,
  isRawFileMetadata,
} from './utils'
import { DIRECTORY_TOKEN, FILE_TOKEN } from '../file/handler'
import { getUnixTimestamp } from '../utils/time'
import { createRawDirectoryMetadata, META_VERSION } from '../pod/utils'
import { Connection } from '../connection/connection'
import { utils } from 'ethers'
import { addEntryToDirectory } from '../content-items/handler'
import { DirectoryItem } from '../content-items/directory-item'
import { FileItem } from '../content-items/file-item'

export const MAX_DIRECTORY_NAME_LENGTH = 100

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
): Promise<RawDirectoryMetadata | RawFileMetadata> {
  const data = (await getFeedData(bee, path, address, downloadOptions)).data.chunkContent().json()

  if (isRawDirectoryMetadata(data)) {
    return data as RawDirectoryMetadata
  } else if (isRawFileMetadata(data)) {
    return data as RawFileMetadata
  } else {
    throw new Error('Invalid metadata')
  }
}

/**
 * Get files and directories under path with recursion or not
 *
 * @param bee Bee instance
 * @param path path to start searching from
 * @param address Ethereum address of the pod which owns the path
 * @param isRecursive search with recursion or not
 * @param downloadOptions options for downloading
 */
export async function readDirectory(
  bee: Bee,
  path: string,
  address: EthAddress,
  isRecursive?: boolean,
  downloadOptions?: RequestOptions,
): Promise<DirectoryItem> {
  const parentRawDirectoryMetadata = await getRawMetadata(bee, path, address)
  assertRawDirectoryMetadata(parentRawDirectoryMetadata)
  const resultDirectoryItem = DirectoryItem.fromRawDirectoryMetadata(parentRawDirectoryMetadata)

  if (!parentRawDirectoryMetadata.FileOrDirNames) {
    return resultDirectoryItem
  }

  for (let item of parentRawDirectoryMetadata.FileOrDirNames) {
    const isFile = item.startsWith(FILE_TOKEN)
    const isDirectory = item.startsWith(DIRECTORY_TOKEN)

    if (isFile) {
      item = combine(path, item.substring(FILE_TOKEN.length))
      const data = await getRawMetadata(bee, item, address, downloadOptions)
      assertRawFileMetadata(data)
      resultDirectoryItem.content.push(FileItem.fromRawFileMetadata(data))
    } else if (isDirectory) {
      item = combine(path, item.substring(DIRECTORY_TOKEN.length))
      const data = await getRawMetadata(bee, item, address, downloadOptions)
      assertRawDirectoryMetadata(data)
      const currentMetadata = DirectoryItem.fromRawDirectoryMetadata(data)

      if (isRecursive) {
        currentMetadata.content = (await readDirectory(bee, item, address, isRecursive)).content
      }

      resultDirectoryItem.content.push(currentMetadata)
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
 * @param privateKey private key of the pod
 */
async function createDirectoryInfo(
  connection: Connection,
  path: string,
  name: string,
  privateKey: string | Uint8Array,
): Promise<Reference> {
  const now = getUnixTimestamp()
  const metadata = createRawDirectoryMetadata(META_VERSION, path, name, now, now, now)

  return writeFeedData(connection, combine(path, name), metadata, privateKey)
}

/**
 * Creates root directory for the pod that tied to the private key
 *
 * @param connection Bee connection
 * @param privateKey private key of the pod
 */
export async function createRootDirectory(connection: Connection, privateKey: string | Uint8Array): Promise<Reference> {
  return createDirectoryInfo(connection, '', '/', privateKey)
}

/**
 * Creates directory under the pod
 *
 * @param connection Bee connection
 * @param fullPath path to the directory
 * @param podWallet pod wallet
 * @param downloadOptions options for downloading
 */
export async function createDirectory(
  connection: Connection,
  fullPath: string,
  podWallet: utils.HDNode,
  downloadOptions?: RequestOptions,
): Promise<void> {
  const parts = getPathParts(fullPath)
  assertPartsLength(parts)
  const name = parts[parts.length - 1]
  assertDirectoryName(name)

  const parentPath = getPathFromParts(parts, 1)
  await addEntryToDirectory(connection, podWallet, parentPath, name, false, downloadOptions)
  await createDirectoryInfo(connection, parentPath, name, podWallet.privateKey)
}
