import { Connection } from '../connection/connection'
import { utils } from 'ethers'
import { Reference, BeeRequestOptions } from '@ethersphere/bee-js'
import { getUnixTimestamp } from '../utils/time'
import { writeFeedData } from '../feed/api'
import { getRawDirectoryMetadataBytes } from '../directory/adapter'
import { DIRECTORY_TOKEN, FILE_TOKEN } from '../file/handler'
import { assertRawDirectoryMetadata, combine, splitPath } from '../directory/utils'
import { RawDirectoryMetadata } from '../pod/types'
import { deleteFeedData, getPathInfo, getRawMetadata } from './utils'
import { RawMetadataWithEpoch } from './types'
import { prepareEthAddress } from '../utils/wallet'
import { PodPasswordBytes } from '../utils/encryption'
import { DataUploadOptions } from '../file/types'
import { getNextEpoch } from '../feed/lookup/utils'

export const DEFAULT_UPLOAD_OPTIONS: DataUploadOptions = {
  blockSize: 1000000,
  contentType: '',
}

/**
 * Add child file or directory to a defined parent directory
 *
 * @param connection connection information for data management
 * @param wallet wallet of the pod
 * @param podPassword bytes for data encryption from pod metadata
 * @param parentPath parent path
 * @param entryPath entry path
 * @param isFile define if entry is file or directory
 * @param downloadOptions download options
 */
export async function addEntryToDirectory(
  connection: Connection,
  wallet: utils.HDNode,
  podPassword: PodPasswordBytes,
  parentPath: string,
  entryPath: string,
  isFile: boolean,
  downloadOptions?: BeeRequestOptions,
): Promise<Reference> {
  if (!parentPath) {
    throw new Error('Incorrect parent path')
  }

  if (!entryPath) {
    throw new Error('Incorrect entry path')
  }

  const address = prepareEthAddress(wallet.address)
  const itemText = isFile ? 'File' : 'Directory'
  const fullPath = combine(...splitPath(parentPath), entryPath)

  let parentData: RawDirectoryMetadata | undefined
  let metadataWithEpoch: RawMetadataWithEpoch | undefined
  try {
    metadataWithEpoch = await getRawMetadata(connection.bee, parentPath, address, podPassword, downloadOptions)
    assertRawDirectoryMetadata(metadataWithEpoch.metadata)
    parentData = metadataWithEpoch.metadata
  } catch (e) {
    throw new Error('Parent directory does not exist')
  }

  const itemToAdd = (isFile ? FILE_TOKEN : DIRECTORY_TOKEN) + entryPath
  parentData.fileOrDirNames = parentData.fileOrDirNames ?? []

  if (parentData.fileOrDirNames.includes(itemToAdd)) {
    throw new Error(`${itemText} "${fullPath}" already listed in the parent directory list`)
  }

  parentData.fileOrDirNames.push(itemToAdd)
  parentData.meta.modificationTime = getUnixTimestamp()

  return writeFeedData(
    connection,
    parentPath,
    getRawDirectoryMetadataBytes(parentData),
    wallet,
    podPassword,
    getNextEpoch(metadataWithEpoch.epoch),
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
 * @param podPassword bytes for data encryption from pod metadata
 * @param parentPath parent path of the entry
 * @param entryPath full path of the entry
 * @param isFile define if entry is file or directory
 * @param downloadOptions download options
 */
export async function removeEntryFromDirectory(
  connection: Connection,
  wallet: utils.HDNode,
  podPassword: PodPasswordBytes,
  parentPath: string,
  entryPath: string,
  isFile: boolean,
  downloadOptions?: BeeRequestOptions,
): Promise<Reference> {
  const metadataWithEpoch = await getRawMetadata(
    connection.bee,
    parentPath,
    prepareEthAddress(wallet.address),
    podPassword,
    downloadOptions,
  )
  const parentData = metadataWithEpoch.metadata
  assertRawDirectoryMetadata(parentData)
  const itemToRemove = (isFile ? FILE_TOKEN : DIRECTORY_TOKEN) + entryPath
  const fileOrDirNames = parentData.fileOrDirNames || []

  const fullPath = combine(parentPath, entryPath)

  if (!fileOrDirNames.includes(itemToRemove)) {
    throw new Error(`Item "${fullPath}" not found in the list of items`)
  }

  parentData.fileOrDirNames = fileOrDirNames.filter(name => name !== itemToRemove)
  await deleteItem(connection, fullPath, wallet, podPassword)

  return writeFeedData(
    connection,
    parentPath,
    getRawDirectoryMetadataBytes(parentData),
    wallet,
    podPassword,
    getNextEpoch(metadataWithEpoch.epoch),
  )
}
