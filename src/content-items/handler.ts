import { Connection } from '../connection/connection'
import { utils } from 'ethers'
import { BeeRequestOptions, Reference } from '@ethersphere/bee-js'
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
import { FeedType, WriteFeedOptions } from '../feed/types'

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
 * @param feedType feed type
 * @param downloadOptions download options
 */
export async function addEntryToDirectory(
  connection: Connection,
  wallet: utils.HDNode,
  podPassword: PodPasswordBytes,
  parentPath: string,
  entryPath: string,
  isFile: boolean,
  feedType: FeedType,
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
    metadataWithEpoch = await getRawMetadata(
      connection.bee,
      parentPath,
      address,
      podPassword,
      connection.options?.feedType ?? FeedType.Epoch,
      downloadOptions,
    )
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

  const epoch = metadataWithEpoch.epoch
  const writeFeedOptions: WriteFeedOptions = {
    feedType,
    ...(feedType === FeedType.Epoch && epoch ? { epochOptions: { epoch, isGetNextEpoch: true } } : {}),
  }

  return writeFeedData(
    connection,
    parentPath,
    getRawDirectoryMetadataBytes(parentData),
    wallet,
    podPassword,
    writeFeedOptions,
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
  writeFeedOptions: WriteFeedOptions,
): Promise<void> {
  let pathInfo
  try {
    pathInfo = await getPathInfo(
      connection.bee,
      itemMetaPath,
      prepareEthAddress(wallet.address),
      connection.options?.feedType ?? FeedType.Epoch,
      connection.options?.requestOptions,
    )
    // eslint-disable-next-line no-empty
  } catch (e) {}

  // if the item already deleted - do nothing
  if (pathInfo?.isDeleted) {
    return
  }

  // for epoch feed additionally calculate the next epoch level
  if (writeFeedOptions.feedType === FeedType.Epoch) {
    // if information is stored under the path, calculate the next level of epoch
    if (pathInfo) {
      if (!pathInfo.lookupAnswer.epoch) {
        throw new Error('Epoch is not defined')
      }

      if (!writeFeedOptions.epochOptions) {
        writeFeedOptions.epochOptions = {}
      }

      writeFeedOptions.epochOptions.epoch = pathInfo.lookupAnswer.epoch
      writeFeedOptions.epochOptions.isGetNextLevel = true
    }
  }

  await deleteFeedData(connection, itemMetaPath, wallet, podPassword, writeFeedOptions)
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
  const feedType = connection.options?.feedType ?? FeedType.Epoch
  const metadataWithEpoch = await getRawMetadata(
    connection.bee,
    parentPath,
    prepareEthAddress(wallet.address),
    podPassword,
    connection.options?.feedType ?? FeedType.Epoch,
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
  await deleteItem(connection, fullPath, wallet, podPassword, {
    feedType,
  })

  return writeFeedData(connection, parentPath, getRawDirectoryMetadataBytes(parentData), wallet, podPassword, {
    feedType,
    epochOptions: {
      epoch: metadataWithEpoch.epoch,
      isGetNextEpoch: true,
    },
  })
}
