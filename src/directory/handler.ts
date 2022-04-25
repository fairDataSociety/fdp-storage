import { getFeedData, writeFeedData } from '../feed/api'
import { FileMetadata, RawDirectoryMetadata, RawFileMetadata } from '../pod/types'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'
import { Bee, Reference, RequestOptions } from '@ethersphere/bee-js'
import { assertDirectoryName, assertPartsLength, combine, getPathFromParts, getPathParts } from './utils'
import { DirectoryItem } from './directory-item'
import { DIRECTORY_TOKEN, FILE_TOKEN } from '../file/handler'
import { getRawDirectoryMetadataBytes, rawFileMetadataToFileMetadata } from '../file/adapter'
import { getUnixTimestamp } from '../utils/time'
import { createRawDirectoryMetadata, META_VERSION } from '../pod/utils'
import { Connection } from '../connection/connection'
import { LookupAnswer } from '../feed/types'
import { Wallet } from 'ethers'
import { prepareEthAddress } from '../utils/address'

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
): Promise<unknown> {
  return (await getFeedData(bee, path, address, downloadOptions)).data.chunkContent().json()
}

/**
 * Get directory metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address pod address
 * @param downloadOptions options for downloading
 */
export async function getRawDirectoryMetadata(
  bee: Bee,
  path: string,
  address: EthAddress,
  downloadOptions?: RequestOptions,
): Promise<RawDirectoryMetadata> {
  return (await getRawMetadata(bee, path, address, downloadOptions)) as Promise<RawDirectoryMetadata>
}

/**
 * Get FairOS metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address Ethereum address of the pod which owns the path
 * @param downloadOptions options for downloading
 */
export async function getRawFileMetadata(
  bee: Bee,
  path: string,
  address: EthAddress,
  downloadOptions?: RequestOptions,
): Promise<RawFileMetadata> {
  return (await getRawMetadata(bee, path, address, downloadOptions)) as Promise<RawFileMetadata>
}

/**
 * Get converted metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address Ethereum address of the pod which owns the path
 * @param downloadOptions options for downloading
 */
export async function getFileMetadata(
  bee: Bee,
  path: string,
  address: EthAddress,
  downloadOptions?: RequestOptions,
): Promise<FileMetadata> {
  return rawFileMetadataToFileMetadata(await getRawFileMetadata(bee, path, address, downloadOptions))
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
  const parentRawDirectoryMetadata = await getRawDirectoryMetadata(bee, path, address)
  const resultDirectoryItem = DirectoryItem.fromRawDirectoryMetadata(parentRawDirectoryMetadata)

  if (!parentRawDirectoryMetadata.FileOrDirNames) {
    return resultDirectoryItem
  }

  for (let item of parentRawDirectoryMetadata.FileOrDirNames) {
    const isFile = item.startsWith(FILE_TOKEN)
    const isDirectory = item.startsWith(DIRECTORY_TOKEN)

    if (isFile) {
      item = combine(path, item.substring(FILE_TOKEN.length))
      resultDirectoryItem.content.push(
        DirectoryItem.fromRawFileMetadata(await getRawFileMetadata(bee, item, address, downloadOptions)),
      )
    } else if (isDirectory) {
      item = combine(path, item.substring(DIRECTORY_TOKEN.length))
      const currentMetadata = DirectoryItem.fromRawDirectoryMetadata(
        await getRawDirectoryMetadata(bee, item, address, downloadOptions),
      )

      if (isRecursive) {
        currentMetadata.content = (await readDirectory(bee, item, address, isRecursive)).content
      }

      resultDirectoryItem.content.push(currentMetadata)
    }
  }

  return resultDirectoryItem
}

/**
 * Writes directory metadata for a given directory path
 *
 * @param connection Bee connection
 * @param path parent path
 * @param name name of the directory
 * @param privateKey private key of the pod
 */
export async function writeDirectoryInfo(
  connection: Connection,
  path: string,
  name: string,
  privateKey: string | Uint8Array,
): Promise<Reference> {
  const now = getUnixTimestamp()
  const metadata = createRawDirectoryMetadata(META_VERSION, path, name, now, now, now)

  return await writeFeedData(connection, combine(path, name), metadata, privateKey)
}

/**
 * Creates root directory for the pod that tied to the private key
 *
 * @param connection Bee connection
 * @param privateKey private key of the pod
 */
export async function createRootDirectory(connection: Connection, privateKey: string | Uint8Array): Promise<Reference> {
  return writeDirectoryInfo(connection, '', '/', privateKey)
}

/**
 * Creates directory under the pod
 *
 * @param connection Bee connection
 * @param path path to the directory
 * @param podWallet pod wallet
 * @param downloadOptions options for downloading
 */
export async function createDirectory(
  connection: Connection,
  path: string,
  podWallet: Wallet,
  downloadOptions?: RequestOptions,
): Promise<void> {
  const parts = getPathParts(path)
  assertPartsLength(parts)
  const name = parts[parts.length - 1]
  assertDirectoryName(name)

  const address = prepareEthAddress(podWallet.address)
  let pathData: LookupAnswer | undefined
  try {
    pathData = await getFeedData(connection.bee, path, address, downloadOptions)
    // eslint-disable-next-line no-empty
  } catch (e) {}

  if (pathData) {
    throw new Error(`Directory "${path}" already exists`)
  }

  const parentPath = getPathFromParts(parts, 1)
  let parentMeta: RawDirectoryMetadata | undefined
  let parentData: LookupAnswer | undefined
  try {
    parentData = await getFeedData(connection.bee, parentPath, address, downloadOptions)
    parentMeta = parentData.data.chunkContent().json() as unknown as RawDirectoryMetadata
  } catch (e) {
    throw new Error('Parent directory does not exist')
  }

  const addDirectoryName = DIRECTORY_TOKEN + name
  parentMeta.FileOrDirNames = parentMeta.FileOrDirNames ?? []

  if (parentMeta.FileOrDirNames.includes(addDirectoryName)) {
    throw new Error('Directory already exists')
  } else {
    parentMeta.FileOrDirNames.push(addDirectoryName)
  }

  parentMeta.Meta.ModificationTime = getUnixTimestamp()
  await writeDirectoryInfo(connection, parentPath, name, podWallet.privateKey)
  // write info to parent
  await writeFeedData(
    connection,
    parentPath,
    getRawDirectoryMetadataBytes(parentMeta),
    podWallet.privateKey,
    parentData.epoch.getNextEpoch(getUnixTimestamp()),
  )
}
