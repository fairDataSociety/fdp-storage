import { stringToBytes, wrapBytesWithHelpers } from '../utils/bytes'
import { Bee, Data, RequestOptions } from '@ethersphere/bee-js'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'
import {
  assertFullPathWithName,
  DEFAULT_FILE_PERMISSIONS,
  downloadBlocksManifest,
  extractPathInfo,
  getFileMode,
  uploadBytes,
} from './utils'
import { FileMetadata } from '../pod/types'
import { blocksToManifest, getFileMetadataRawBytes, rawFileMetadataToFileMetadata } from './adapter'
import { assertRawFileMetadata } from '../directory/utils'
import { getRawMetadata } from '../content-items/utils'
import { PodPasswordBytes } from '../utils/encryption'
import { Blocks, DataUploadOptions } from './types'
import { assertPodName, getExtendedPodsListByAccountData, META_VERSION } from '../pod/utils'
import { getUnixTimestamp } from '../utils/time'
import { addEntryToDirectory } from '../content-items/handler'
import { writeFeedData } from '../feed/api'
import { AccountData } from '../account/account-data'

/**
 * File prefix
 */
export const FILE_TOKEN = '_F_'
/**
 * Directory prefix
 */
export const DIRECTORY_TOKEN = '_D_'

/**
 * Get converted metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address Ethereum address of the pod which contains the path
 * @param podPassword bytes for data encryption from pod metadata
 * @param downloadOptions options for downloading
 */
export async function getFileMetadata(
  bee: Bee,
  path: string,
  address: EthAddress,
  podPassword: PodPasswordBytes,
  downloadOptions?: RequestOptions,
): Promise<FileMetadata> {
  const data = (await getRawMetadata(bee, path, address, podPassword, downloadOptions)).metadata
  assertRawFileMetadata(data)

  return rawFileMetadataToFileMetadata(data)
}

/**
 * Downloads file parts and compile them into Data
 *
 * @param bee Bee client
 * @param fullPath full path to the file
 * @param address address of the pod
 * @param podPassword bytes for data encryption from pod metadata
 * @param downloadOptions download options
 */
export async function downloadData(
  bee: Bee,
  fullPath: string,
  address: EthAddress,
  podPassword: PodPasswordBytes,
  downloadOptions?: RequestOptions,
): Promise<Data> {
  const fileMetadata = await getFileMetadata(bee, fullPath, address, podPassword, downloadOptions)

  if (fileMetadata.compression) {
    // TODO: implement compression support
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
    const data = await bee.downloadData(block.reference, downloadOptions)
    result.set(data, offset)
    offset += data.length
  }

  return wrapBytesWithHelpers(result)
}

/**
 * Generate block name by block number
 */
export function generateBlockName(blockNumber: number): string {
  return 'block-' + blockNumber.toString().padStart(5, '0')
}

/**
 * Uploads file content
 *
 * @param podName pod where file is stored
 * @param fullPath full path of the file
 * @param data file content
 * @param accountData account data
 * @param options upload options
 */
export async function uploadData(
  podName: string,
  fullPath: string,
  data: Uint8Array | string,
  accountData: AccountData,
  options: DataUploadOptions,
): Promise<FileMetadata> {
  assertPodName(podName)
  assertFullPathWithName(fullPath)
  assertPodName(podName)

  data = typeof data === 'string' ? stringToBytes(data) : data
  const connection = accountData.connection
  const { podWallet, pod } = await getExtendedPodsListByAccountData(accountData, podName)
  const pathInfo = extractPathInfo(fullPath)
  const now = getUnixTimestamp()
  const blocksCount = Math.ceil(data.length / options.blockSize)
  const blocks: Blocks = { blocks: [] }
  for (let i = 0; i < blocksCount; i++) {
    const currentBlock = data.slice(i * options.blockSize, (i + 1) * options.blockSize)
    const result = await uploadBytes(connection, currentBlock)
    blocks.blocks.push({
      size: currentBlock.length,
      compressedSize: currentBlock.length,
      reference: result.reference,
    })
  }

  const manifestBytes = stringToBytes(blocksToManifest(blocks))
  const blocksReference = (await uploadBytes(connection, manifestBytes)).reference
  const meta: FileMetadata = {
    version: META_VERSION,
    filePath: pathInfo.path,
    fileName: pathInfo.filename,
    fileSize: data.length,
    blockSize: options.blockSize,
    contentType: options.contentType,
    compression: '',
    creationTime: now,
    accessTime: now,
    modificationTime: now,
    blocksReference,
    mode: getFileMode(DEFAULT_FILE_PERMISSIONS),
  }

  await addEntryToDirectory(connection, podWallet, pod.password, pathInfo.path, pathInfo.filename, true)
  await writeFeedData(connection, fullPath, getFileMetadataRawBytes(meta), podWallet.privateKey, pod.password)

  return meta
}
