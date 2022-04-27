import { Connection } from '../connection/connection'
import { Wallet } from 'ethers'
import { Reference, RequestOptions } from '@ethersphere/bee-js'
import { prepareEthAddress } from '../utils/address'
import { getUnixTimestamp } from '../utils/time'
import { getFeedData, writeFeedData } from '../feed/api'
import { getRawDirectoryMetadataBytes } from '../directory/adapter'
import { DIRECTORY_TOKEN, FILE_TOKEN } from '../file/handler'
import { LookupAnswer } from '../feed/types'
import { assertRawDirectoryMetadata, combine } from '../directory/utils'
import { RawDirectoryMetadata } from '../pod/types'

/**
 * Add child file or directory to defined parent directory
 *
 * @param connection current connection
 * @param wallet wallet of the pod
 * @param parentPath parent path
 * @param entryPath entry path
 * @param isFile define if entry is file or directory
 * @param downloadOptions download options
 */
export async function addEntryToDirectory(
  connection: Connection,
  wallet: Wallet,
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

  const itemText = isFile ? 'File' : 'Directory'
  const fullPath = combine(parentPath, entryPath)
  let pathData: LookupAnswer | undefined
  try {
    pathData = await getFeedData(connection.bee, fullPath, prepareEthAddress(wallet.address), downloadOptions)
    // eslint-disable-next-line no-empty
  } catch (e) {}

  if (pathData) {
    throw new Error(`${itemText} "${fullPath}" already uploaded to the network`)
  }

  let parentData: RawDirectoryMetadata | undefined
  let parentLookupAnswer: LookupAnswer | undefined
  try {
    parentLookupAnswer = await getFeedData(
      connection.bee,
      parentPath,
      prepareEthAddress(wallet.address),
      connection.options?.downloadOptions,
    )

    parentData = parentLookupAnswer.data.chunkContent().json() as unknown as RawDirectoryMetadata
    assertRawDirectoryMetadata(parentData)
  } catch (e) {
    throw new Error('Parent directory does not exist')
  }

  const itemToAdd = (isFile ? FILE_TOKEN : DIRECTORY_TOKEN) + entryPath
  parentData.FileOrDirNames = parentData.FileOrDirNames ?? []

  if (parentData.FileOrDirNames.includes(itemToAdd)) {
    throw new Error(`${itemText} already listed in the parent directory list`)
  }

  parentData.FileOrDirNames.push(itemToAdd)
  parentData.Meta.ModificationTime = getUnixTimestamp()

  return await writeFeedData(
    connection,
    parentPath,
    getRawDirectoryMetadataBytes(parentData),
    wallet.privateKey,
    parentLookupAnswer.epoch.getNextEpoch(getUnixTimestamp()),
  )
}
