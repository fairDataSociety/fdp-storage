import { Connection } from '../connection/connection'
import { utils } from 'ethers'
import { Reference, RequestOptions } from '@ethersphere/bee-js'
import { getUnixTimestamp } from '../utils/time'
import { deleteFeedData, writeFeedData } from '../feed/api'
import { getRawDirectoryMetadataBytes } from '../directory/adapter'
import { DIRECTORY_TOKEN, FILE_TOKEN } from '../file/handler'
import { assertRawDirectoryMetadata, combine, splitPath } from '../directory/utils'
import { RawDirectoryMetadata } from '../pod/types'
import { assertItemIsNotExists, getRawMetadata } from './utils'
import { RawMetadataWithEpoch } from './types'
import { prepareEthAddress } from '../utils/wallet'
import { PodPasswordBytes } from '../utils/encryption'
import { DataUploadOptions } from '../file/types'

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
  downloadOptions?: RequestOptions,
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
  await assertItemIsNotExists(itemText, connection.bee, fullPath, address, downloadOptions)

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
    metadataWithEpoch.epoch.getNextEpoch(getUnixTimestamp()),
  )
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
  downloadOptions?: RequestOptions,
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

  if (parentData.fileOrDirNames) {
    parentData.fileOrDirNames = parentData.fileOrDirNames.filter(name => name !== itemToRemove)
  }

  const nextEpoch = metadataWithEpoch.epoch.getNextEpoch(getUnixTimestamp())
  await deleteFeedData(connection, entryPath, wallet, podPassword, nextEpoch)

  return writeFeedData(connection, parentPath, getRawDirectoryMetadataBytes(parentData), wallet, podPassword, nextEpoch)
}
