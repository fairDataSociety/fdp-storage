import { Connection } from '../connection/connection'
import { utils } from 'ethers'
import { BeeRequestOptions, Signer } from '@ethersphere/bee-js'
import { getUnixTimestamp } from '../utils/time'
import { DIRECTORY_TOKEN, FILE_TOKEN, prepareDataByMeta, uploadData } from '../file/handler'
import { assertRawDirectoryMetadata, assertRawFileMetadata, combine, splitPath } from '../directory/utils'
import { FileMetadataWithLookupAnswer, RawDirectoryMetadata } from '../pod/types'
import { deleteFeedData, getIndexFilePath, getPathInfo, getRawMetadata } from './utils'
import { RawMetadataWithEpoch } from './types'
import { prepareEthAddress } from '../utils/wallet'
import { PodPasswordBytes } from '../utils/encryption'
import { Compression, DataUploadOptions } from '../file/types'
import { rawFileMetadataToFileMetadata } from '../file/adapter'
import { downloadBlocksManifest } from '../file/utils'
import { bytesToString, stringToBytes } from '../utils/bytes'
import { jsonParse } from '../utils/json'
import { AccountData } from '../account/account-data'
import { EthAddress } from '../utils/eth'

/**
 * Minimum block size for uploading data
 */
export const MINIMUM_BLOCK_SIZE = 1000000

export const DEFAULT_UPLOAD_OPTIONS: DataUploadOptions = {
  blockSize: MINIMUM_BLOCK_SIZE,
  contentType: '',
}

/**
 * Adds an entry to a directory.
 *
 * @param {AccountData} accountData - The account data.
 * @param {EthAddress} socOwnerAddress - The address of the owner of the Single Owner Chunk.
 * @param {(string|Uint8Array|Signer)} socSigner - The signer for the Single Owner Chunk.
 * @param {PodPasswordBytes} encryptionPassword - The encryption password.
 * @param {string} parentPath - The parent directory path.
 * @param {string} entryName - The name of the entry to be added.
 * @param {boolean} isFile - Specifies whether the entry is a file (true) or a directory (false).
 * @param {BeeRequestOptions} [downloadOptions] - The download options for retrieving metadata.
 *
 * @returns {Promise<FileMetadataWithLookupAnswer>} - The metadata of the file with lookup answer.
 *
 * @throws {Error} If the parent path is incorrect.
 * @throws {Error} If the entry name is incorrect.
 * @throws {Error} If the parent directory does not exist.
 * @throws {Error} If the item already exists in the parent directory list.
 */
export async function addEntryToDirectory(
  accountData: AccountData,
  socOwnerAddress: EthAddress,
  socSigner: string | Uint8Array | Signer,
  encryptionPassword: PodPasswordBytes,
  parentPath: string,
  entryName: string,
  isFile: boolean,
  downloadOptions?: BeeRequestOptions,
): Promise<FileMetadataWithLookupAnswer> {
  if (!parentPath) {
    throw new Error('Incorrect parent path')
  }

  if (!entryName) {
    throw new Error('Incorrect entry name')
  }

  const bee = accountData.connection.bee
  const itemText = isFile ? 'File' : 'Directory'
  const fullPath = combine(...splitPath(parentPath), entryName)

  let parentData: RawDirectoryMetadata | undefined
  let metadataWithEpoch: RawMetadataWithEpoch | undefined
  const indexFilePath = getIndexFilePath(parentPath)
  try {
    metadataWithEpoch = await getRawMetadata(bee, indexFilePath, socOwnerAddress, encryptionPassword, downloadOptions)
    assertRawFileMetadata(metadataWithEpoch.metadata)
    const fileMeta = rawFileMetadataToFileMetadata(metadataWithEpoch.metadata)
    const blocks = await downloadBlocksManifest(bee, fileMeta.blocksReference, downloadOptions)
    const directoryMeta = jsonParse(
      bytesToString(await prepareDataByMeta(fileMeta, blocks.blocks, bee, downloadOptions)),
      'addEntryToDirectory',
    )
    assertRawDirectoryMetadata(directoryMeta)
    parentData = directoryMeta
  } catch (e) {
    throw new Error('Parent directory does not exist')
  }

  const itemToAdd = (isFile ? FILE_TOKEN : DIRECTORY_TOKEN) + entryName
  parentData.fileOrDirNames = parentData.fileOrDirNames ?? []

  if (parentData.fileOrDirNames.includes(itemToAdd)) {
    throw new Error(`${itemText} "${fullPath}" already listed in the parent directory list`)
  }

  parentData.fileOrDirNames.push(itemToAdd)
  parentData.meta.modificationTime = getUnixTimestamp()

  return uploadData(
    accountData.connection,
    socOwnerAddress,
    socSigner,
    encryptionPassword,
    indexFilePath,
    stringToBytes(JSON.stringify(parentData)),
    {
      compression: Compression.GZIP,
    },
  )
}

/**
 * Uploads magic word data on the next epoch's level
 *
 * Magic word should be uploaded if data is not found (in case of data pruning) or not deleted
 */
export async function deleteItem(
  connection: Connection,
  itemMetaPath: string,
  wallet: utils.HDNode,
  podPassword: PodPasswordBytes,
): Promise<void> {
  let pathInfo
  try {
    pathInfo = await getPathInfo(
      connection.bee,
      itemMetaPath,
      prepareEthAddress(wallet.address),
      connection.options?.requestOptions,
    )
    // eslint-disable-next-line no-empty
  } catch (e) {}

  // if the item already deleted - do nothing
  if (pathInfo?.isDeleted) {
    return
  }

  let metaPathEpoch

  // if information is stored under the path, calculate the next level of epoch
  if (pathInfo) {
    pathInfo.lookupAnswer.epoch.level = pathInfo.lookupAnswer.epoch.getNextLevel(pathInfo.lookupAnswer.epoch.time)
    metaPathEpoch = pathInfo.lookupAnswer.epoch
  }

  await deleteFeedData(connection, itemMetaPath, wallet, podPassword, metaPathEpoch)
}

/**
 * Removes file or directory from the parent directory
 *
 * @param connection connection information for data management
 * @param wallet wallet of the pod for downloading and uploading metadata
 * @param encryptionPassword bytes for data encryption from pod metadata
 * @param parentPath parent path of the entry
 * @param entryPath full path of the entry
 * @param isFile define if entry is file or directory
 * @param downloadOptions download options
 */
export async function removeEntryFromDirectory(
  connection: Connection,
  wallet: utils.HDNode,
  encryptionPassword: PodPasswordBytes,
  parentPath: string,
  entryPath: string,
  isFile: boolean,
  downloadOptions?: BeeRequestOptions,
): Promise<FileMetadataWithLookupAnswer> {
  const indexFilePath = getIndexFilePath(parentPath)
  const metadataWithEpoch = await getRawMetadata(
    connection.bee,
    indexFilePath,
    prepareEthAddress(wallet.address),
    encryptionPassword,
    downloadOptions,
  )
  const indexFileMeta = metadataWithEpoch.metadata
  assertRawFileMetadata(indexFileMeta)
  const fileMeta = rawFileMetadataToFileMetadata(indexFileMeta)
  const blocks = await downloadBlocksManifest(connection.bee, fileMeta.blocksReference, downloadOptions)
  const directoryMeta = jsonParse(
    bytesToString(await prepareDataByMeta(fileMeta, blocks.blocks, connection.bee, downloadOptions)),
    'removeEntryFromDirectory',
  )
  assertRawDirectoryMetadata(directoryMeta)
  const parentData = directoryMeta
  const itemToRemove = (isFile ? FILE_TOKEN : DIRECTORY_TOKEN) + entryPath
  const fileOrDirNames = parentData.fileOrDirNames || []
  const fullPath = combine(parentPath, entryPath)

  if (!fileOrDirNames.includes(itemToRemove)) {
    throw new Error(`Item "${fullPath}" not found in the list of items`)
  }

  parentData.fileOrDirNames = fileOrDirNames.filter(name => name !== itemToRemove)
  await deleteItem(connection, fullPath, wallet, encryptionPassword)

  return uploadData(
    connection,
    prepareEthAddress(wallet.address),
    wallet.privateKey,
    encryptionPassword,
    indexFilePath,
    stringToBytes(JSON.stringify(parentData)),
    {
      compression: Compression.GZIP,
    },
  )
}
