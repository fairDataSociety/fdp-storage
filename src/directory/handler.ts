import { BeeRequestOptions, Reference, Signer } from '@ethersphere/bee-js'
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
import { DIRECTORY_TOKEN, FILE_TOKEN, getIndexFileContent, uploadData } from '../file/handler'
import { getUnixTimestamp } from '../utils/time'
import { createRawDirectoryMetadata, META_VERSION } from '../pod/utils'
import { Connection } from '../connection/connection'
import { utils } from 'ethers'
import { addEntryToDirectory, DEFAULT_UPLOAD_OPTIONS } from '../content-items/handler'
import {
  getCreationPathInfo,
  getIndexFilePath,
  getRawMetadata,
  rawDirectoryMetadataToDirectoryItem,
  rawFileMetadataToFileItem,
} from '../content-items/utils'
import { PodPasswordBytes } from '../utils/encryption'
import { Compression, DataUploadOptions } from '../file/types'
import { DirectoryItem } from '../content-items/types'
import { prepareEthAddress } from '../utils/wallet'
import { AccountData } from '../account/account-data'
import { FileMetadataWithLookupAnswer, RawDirectoryMetadata } from '../pod/types'
import { writeFeedData } from '../feed/api'
import { Epoch } from '../feed/lookup/epoch'
import { getNextEpoch } from '../feed/lookup/utils'
import { EthAddress } from '../utils/eth'

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
 * @param {AccountData} accountData AccountData instace
 * @param podName pod name
 * @param path path to start searching from
 * @param address Ethereum address of the pod which owns the path
 * @param podPassword bytes for data encryption from pod metadata
 * @param isRecursive search with recursion or not
 * @param downloadOptions options for downloading
 */
export async function readDirectory(
  accountData: AccountData,
  podName: string,
  path: string,
  address: EthAddress,
  podPassword: PodPasswordBytes,
  isRecursive?: boolean,
  downloadOptions?: BeeRequestOptions,
): Promise<DirectoryItem> {
  let parentRawDirectoryMetadata: RawDirectoryMetadata | undefined
  try {
    parentRawDirectoryMetadata = await getIndexFileContent(accountData, podName, path, downloadOptions)
  } catch (e) {
    // it means the data is not available in V2 OR it is V1
  }

  if (!parentRawDirectoryMetadata) {
    throw new Error('Index content file not found')
  }

  const bee = accountData.connection.bee
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
      try {
        const data = await getIndexFileContent(accountData, podName, item, downloadOptions)
        assertRawDirectoryMetadata(data)
        const currentMetadata = rawDirectoryMetadataToDirectoryItem(data)
        resultDirectoryItem.directories.push(currentMetadata)
        const allItems = data.fileOrDirNames ? data.fileOrDirNames : []

        if (isRecursive && allItems.length > 0) {
          const content = await readDirectory(
            accountData,
            podName,
            item,
            address,
            podPassword,
            isRecursive,
            downloadOptions,
          )
          currentMetadata.files = content.files
          currentMetadata.directories = content.directories
        }
      } catch (e) {
        /* empty */
      }
    }
  }

  return resultDirectoryItem
}

/**
 * Creates directory metadata for a given directory path and upload it to the network
 *
 * @param connection Bee connection
 * @param socSigner feed owner's signer
 * @param path parent path
 * @param name name of the directory
 * @param encryptionPassword bytes for data encryption from pod metadata
 * @param epoch feed epoch
 */
async function createDirectoryInfo(
  connection: Connection,
  socSigner: string | Uint8Array | Signer,
  path: string,
  name: string,
  encryptionPassword: PodPasswordBytes,
  epoch?: Epoch,
): Promise<Reference> {
  const now = getUnixTimestamp()
  const metadata = createRawDirectoryMetadata(META_VERSION, path, name, now, now, now)
  const fullPath = combine(...splitPath(path), name)

  return writeFeedData(connection, fullPath, metadata, socSigner, encryptionPassword, epoch)
}

/**
 * Creates root directory for the pod that tied to the private key
 *
 * @param connection Bee connection
 * @param encryptionPassword data encryption password
 * @param wallet feed owner's wallet
 */
export async function createRootDirectory(
  connection: Connection,
  encryptionPassword: PodPasswordBytes,
  wallet: utils.HDNode,
): Promise<FileMetadataWithLookupAnswer> {
  return createDirectoryIndexFile(connection, '', '/', encryptionPassword, wallet)
}

/**
 * Creates a directory index file and uploads it to the specified path.
 *
 * @param {Connection} connection - The connection object.
 * @param {string} path - The path of the directory where the index file will be created.
 * @param {string} name - The name of the directory to be created.
 * @param {PodPasswordBytes} encryptionPassword - The encryption password for the data.
 * @param {utils.HDNode} wallet - The wallet object used for signing the requests.
 *
 * @returns {Promise<FileMetadataWithLookupAnswer>} - A promise that resolves to the uploaded file's metadata and lookup answer.
 */
export async function createDirectoryIndexFile(
  connection: Connection,
  path: string,
  name: string,
  encryptionPassword: PodPasswordBytes,
  wallet: utils.HDNode,
): Promise<FileMetadataWithLookupAnswer> {
  const fullPath = combine(...splitPath(path), name)
  const socOwnerAddress = prepareEthAddress(wallet.address)
  const socSigner = wallet.privateKey
  const pathInfo = await getCreationPathInfo(
    connection.bee,
    fullPath,
    socOwnerAddress,
    connection.options?.requestOptions,
  )
  await createDirectoryInfo(
    connection,
    socSigner,
    path,
    name,
    encryptionPassword,
    getNextEpoch(pathInfo?.lookupAnswer.epoch),
  )
  const now = getUnixTimestamp()
  const data = createRawDirectoryMetadata(META_VERSION, path, name, now, now, now)
  const indexFilePath = getIndexFilePath(fullPath)

  return uploadData(connection, socOwnerAddress, socSigner, encryptionPassword, indexFilePath, data, {
    compression: Compression.GZIP,
  })
}

/**
 * Creates directory under the pod
 *
 * @param {AccountData} accountData account data
 * @param fullPath path to the directory
 * @param podWallet pod wallet
 * @param podPassword bytes for decrypting pod content
 * @param downloadOptions options for downloading
 */
export async function createDirectory(
  accountData: AccountData,
  fullPath: string,
  podWallet: utils.HDNode,
  podPassword: PodPasswordBytes,
  downloadOptions?: BeeRequestOptions,
): Promise<void> {
  const parts = getPathParts(fullPath)
  assertPartsLength(parts)
  const name = parts[parts.length - 1]
  assertDirectoryName(name)

  const parentPath = getPathFromParts(parts, 1)
  const podAddress = prepareEthAddress(podWallet.address)
  // get epoch data in case of the directory previously existed to write on the correct level
  const pathInfo = await getCreationPathInfo(
    accountData.connection.bee,
    fullPath,
    podAddress,
    accountData.connection.options?.requestOptions,
  )

  await addEntryToDirectory(
    accountData,
    podAddress,
    podWallet.privateKey,
    podPassword,
    parentPath,
    name,
    false,
    downloadOptions,
  )

  await createDirectoryInfo(
    accountData.connection,
    podWallet.privateKey,
    fullPath,
    name,
    podPassword,
    // pass calculated epoch to write on correct level in case of the directory previously existed
    getNextEpoch(pathInfo?.lookupAnswer.epoch),
  )

  await createDirectoryIndexFile(accountData.connection, parentPath, name, podPassword, podWallet)
}
