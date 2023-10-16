import { stringToBytes, wrapBytesWithHelpers } from '../utils/bytes'
import { Bee, Data, BeeRequestOptions } from '@ethersphere/bee-js'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'
import {
  assertFullPathWithName,
  assertSequenceOfExternalDataBlocksCorrect,
  calcUploadBlockPercentage,
  DEFAULT_FILE_PERMISSIONS,
  downloadBlocksManifest,
  externalDataBlocksToBlocks,
  extractPathInfo,
  getDataBlock,
  getFileMode,
  isExternalDataBlocks,
  updateDownloadProgress,
  updateUploadProgress,
  uploadBytes,
} from './utils'
import { FileMetadata } from '../pod/types'
import { blocksToManifest, getFileMetadataRawBytes, rawFileMetadataToFileMetadata } from './adapter'
import { assertRawFileMetadata } from '../directory/utils'
import { getCreationPathInfo, getRawMetadata } from '../content-items/utils'
import { PodPasswordBytes } from '../utils/encryption'
import {
  Block,
  Blocks,
  DataDownloadOptions,
  DataUploadOptions,
  DownloadProgressType,
  ExternalDataBlock,
  FileMetadataWithBlocks,
  UploadProgressType,
} from './types'
import { assertPodName, getExtendedPodsListByAccountData, META_VERSION } from '../pod/utils'
import { getUnixTimestamp } from '../utils/time'
import { addEntryToDirectory, DEFAULT_UPLOAD_OPTIONS } from '../content-items/handler'
import { writeFeedData } from '../feed/api'
import { AccountData } from '../account/account-data'
import { prepareEthAddress } from '../utils/wallet'
import { assertWallet } from '../utils/type'
import { getNextEpoch } from '../feed/lookup/utils'
import { Connection } from '../connection/connection'

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
  downloadOptions?: BeeRequestOptions,
): Promise<FileMetadata> {
  const data = (await getRawMetadata(bee, path, address, podPassword, downloadOptions)).metadata
  assertRawFileMetadata(data)

  return rawFileMetadataToFileMetadata(data)
}

/**
 * Gets file metadata with blocks
 *
 * @param bee Bee
 * @param accountData account data
 * @param podName pod name
 * @param fullPath full path to the file
 * @param downloadOptions download options
 * @param dataDownloadOptions data download options
 */
export async function getFileMetadataWithBlocks(
  bee: Bee,
  accountData: AccountData,
  podName: string,
  fullPath: string,
  downloadOptions?: BeeRequestOptions,
  dataDownloadOptions?: DataDownloadOptions,
): Promise<FileMetadataWithBlocks> {
  dataDownloadOptions = dataDownloadOptions ?? {}
  updateDownloadProgress(dataDownloadOptions, DownloadProgressType.GetPodInfo)
  const { podAddress, pod } = await getExtendedPodsListByAccountData(accountData, podName)
  updateDownloadProgress(dataDownloadOptions, DownloadProgressType.GetPathInfo)
  const fileMetadata = await getFileMetadata(bee, fullPath, podAddress, pod.password, downloadOptions)

  if (fileMetadata.compression) {
    // TODO: implement compression support
    throw new Error('Compressed data is not supported yet')
  }

  updateDownloadProgress(dataDownloadOptions, DownloadProgressType.DownloadBlocksMeta)
  const blocks = await downloadBlocksManifest(bee, fileMetadata.blocksReference, downloadOptions)

  return {
    ...fileMetadata,
    ...blocks,
  }
}

/**
 * Downloads file parts and compile them into Data
 *
 * @param accountData account data
 * @param podName pod name
 * @param fullPath full path to the file
 * @param downloadOptions download options
 * @param dataDownloadOptions data download options
 */
export async function downloadData(
  accountData: AccountData,
  podName: string,
  fullPath: string,
  downloadOptions?: BeeRequestOptions,
  dataDownloadOptions?: DataDownloadOptions,
): Promise<Data> {
  dataDownloadOptions = dataDownloadOptions ?? {}
  const bee = accountData.connection.bee
  const { blocks } = await getFileMetadataWithBlocks(
    bee,
    accountData,
    podName,
    fullPath,
    downloadOptions,
    dataDownloadOptions,
  )

  let totalLength = 0
  for (const block of blocks) {
    totalLength += block.size
  }

  const result = new Uint8Array(totalLength)
  let offset = 0
  const totalBlocks = blocks.length
  for (const [currentBlockId, block] of blocks.entries()) {
    const blockData = {
      totalBlocks,
      currentBlockId,
      percentage: calcUploadBlockPercentage(currentBlockId, totalBlocks),
    }
    updateDownloadProgress(dataDownloadOptions, DownloadProgressType.DownloadBlockStart, blockData)
    const data = await bee.downloadData(block.reference, downloadOptions)
    updateDownloadProgress(dataDownloadOptions, DownloadProgressType.DownloadBlockEnd, blockData)
    result.set(data, offset)
    offset += data.length
  }

  updateDownloadProgress(dataDownloadOptions, DownloadProgressType.Done)

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
  data: Uint8Array | string | ExternalDataBlock[],
  accountData: AccountData,
  options: DataUploadOptions,
): Promise<FileMetadata> {
  assertPodName(podName)
  assertFullPathWithName(fullPath)
  assertWallet(accountData.wallet)

  const blockSize = options.blockSize ?? Number(DEFAULT_UPLOAD_OPTIONS!.blockSize)
  const contentType = options.contentType ?? String(DEFAULT_UPLOAD_OPTIONS!.contentType)
  const connection = accountData.connection
  updateUploadProgress(options, UploadProgressType.GetPodInfo)
  const { podWallet, pod } = await getExtendedPodsListByAccountData(accountData, podName)

  updateUploadProgress(options, UploadProgressType.GetPathInfo)
  const fullPathInfo = await getCreationPathInfo(
    connection.bee,
    fullPath,
    prepareEthAddress(podWallet.address),
    connection.options?.requestOptions,
  )
  const pathInfo = extractPathInfo(fullPath)
  const now = getUnixTimestamp()

  const blocks: Blocks = { blocks: [] }
  let fileSize = data.length

  if (isExternalDataBlocks(data)) {
    assertSequenceOfExternalDataBlocksCorrect(data)
    blocks.blocks = externalDataBlocksToBlocks(data)
    fileSize = data.reduce((acc, block) => acc + block.size, 0)
  } else {
    data = typeof data === 'string' ? stringToBytes(data) : data
    const totalBlocks = Math.ceil(data.length / blockSize)
    for (let i = 0; i < totalBlocks; i++) {
      const blockData = {
        totalBlocks,
        currentBlockId: i,
        percentage: calcUploadBlockPercentage(i, totalBlocks),
      }
      updateUploadProgress(options, UploadProgressType.UploadBlockStart, blockData)
      const currentBlock = getDataBlock(data, blockSize, i)
      blocks.blocks.push(await uploadDataBlock(connection, currentBlock))
      updateUploadProgress(options, UploadProgressType.UploadBlockEnd, blockData)
    }
  }

  updateUploadProgress(options, UploadProgressType.UploadBlocksMeta)
  const manifestBytes = stringToBytes(blocksToManifest(blocks))
  const blocksReference = (await uploadBytes(connection, manifestBytes)).reference
  const meta: FileMetadata = {
    version: META_VERSION,
    filePath: pathInfo.path,
    fileName: pathInfo.filename,
    fileSize,
    blockSize,
    contentType,
    compression: '',
    creationTime: now,
    accessTime: now,
    modificationTime: now,
    blocksReference,
    mode: getFileMode(DEFAULT_FILE_PERMISSIONS),
  }

  updateUploadProgress(options, UploadProgressType.WriteDirectoryInfo)
  await addEntryToDirectory(connection, podWallet, pod.password, pathInfo.path, pathInfo.filename, true)
  updateUploadProgress(options, UploadProgressType.WriteFileInfo)
  await writeFeedData(
    connection,
    fullPath,
    getFileMetadataRawBytes(meta),
    podWallet,
    pod.password,
    getNextEpoch(fullPathInfo?.lookupAnswer.epoch),
  )

  updateUploadProgress(options, UploadProgressType.Done)

  return meta
}

/**
 * Upload data block
 * @param connection connection
 * @param block block to upload
 */
export async function uploadDataBlock(connection: Connection, block: Uint8Array): Promise<Block> {
  return {
    size: block.length,
    compressedSize: block.length,
    reference: (await uploadBytes(connection, block)).reference,
  }
}
