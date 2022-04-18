import { getFileMetadata, getRawDirectoryMetadata } from '../directory/handler'
import { getFeedData, writeFeedData } from '../feed/api'
import { Connection } from '../connection/connection'
import { wrapBytesWithHelpers } from '../utils/bytes'
import { getUnixTimestamp } from '../utils/time'
import { Wallet } from 'ethers'
import { prepareEthAddress } from '../utils/address'
import { Bee, Data, Reference, RequestOptions } from '@ethersphere/bee-js'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'
import { downloadBlocksManifest } from './utils'
import { getRawDirectoryMetadataBytes } from './adapter'

/**
 * File prefix
 */
export const FILE_TOKEN = '_F_'
/**
 * Directory prefix
 */
export const DIRECTORY_TOKEN = '_D_'

/**
 * Downloads file parts and compile them into Data
 *
 * @param bee Bee client
 * @param fullPath full path to the file
 * @param address address of the pod
 * @param downloadOptions download options
 */
export async function downloadData(
  bee: Bee,
  fullPath: string,
  address: EthAddress,
  downloadOptions?: RequestOptions,
): Promise<Data> {
  const fileMetadata = await getFileMetadata(bee, fullPath, address, downloadOptions)

  if (fileMetadata.compression) {
    throw new Error('Compressed data is not supported yet')
  }

  const blocks = await downloadBlocksManifest(bee, fileMetadata.blocksReference, downloadOptions)

  let totalLength = 0
  for (const block of blocks.blocks) {
    totalLength += block.size
  }

  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const block of blocks.blocks) {
    const data = (await bee.downloadData(block.reference, downloadOptions)) as Uint8Array
    result.set(data, offset)
    offset += data.length
  }

  return wrapBytesWithHelpers(result)
}

/**
 * Add child file or directory to defined parent directory
 *
 * @param connection current connection
 * @param wallet wallet of the pod
 * @param parentPath parent path
 * @param entryPath entry path
 * @param isFile define if entry is file or directory
 */
export async function addEntryToDirectory(
  connection: Connection,
  wallet: Wallet,
  parentPath: string,
  entryPath: string,
  isFile: boolean,
): Promise<Reference> {
  if (!parentPath) {
    throw new Error('Incorrect parent path')
  }

  if (!entryPath) {
    throw new Error('Incorrect entry path')
  }

  const parentData = await getRawDirectoryMetadata(
    connection.bee,
    parentPath,
    prepareEthAddress(wallet.address),
    connection.options?.downloadOptions,
  )
  const itemToAdd = (isFile ? FILE_TOKEN : DIRECTORY_TOKEN) + entryPath

  if (!parentData.FileOrDirNames) {
    parentData.FileOrDirNames = []
  }

  parentData.FileOrDirNames.push(itemToAdd)
  parentData.Meta.ModificationTime = getUnixTimestamp()

  const lookupAnswer = await getFeedData(
    connection.bee,
    parentPath,
    prepareEthAddress(wallet.address),
    connection.options?.downloadOptions,
  )

  return await writeFeedData(
    connection,
    parentPath,
    getRawDirectoryMetadataBytes(parentData),
    wallet.privateKey,
    lookupAnswer.epoch.getNextEpoch(getUnixTimestamp()),
  )
}

/**
 * Generate block name by block number
 *
 * @param blockNumber
 */
export function generateBlockName(blockNumber: number): string {
  return 'block-' + blockNumber.toString().padStart(5, '0')
}
