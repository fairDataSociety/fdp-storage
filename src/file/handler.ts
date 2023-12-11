import { assertMinLength, stringToBytes, wrapBytesWithHelpers } from '../utils/bytes'
import { Bee, BeeRequestOptions, Data } from '@ethersphere/bee-js'
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
import { FileMetadata, FileMetadataWithLookupAnswer } from '../pod/types'
import { blocksToManifest, getFileMetadataRawBytes, rawFileMetadataToFileMetadata } from './adapter'
import { assertRawFileMetadata } from '../directory/utils'
import { getCreationPathInfo, getRawMetadata } from '../content-items/utils'
import { PodPasswordBytes } from '../utils/encryption'
import {
  Block,
  Blocks,
  Compression,
  DataDownloadOptions,
  DataUploadOptions,
  DownloadProgressType,
  ExternalDataBlock,
  FileMetadataWithBlocks,
  UploadProgressType,
} from './types'
import { assertPodName, getExtendedPodsListByAccountData, META_VERSION } from '../pod/utils'
import { getUnixTimestamp } from '../utils/time'
import { addEntryToDirectory, DEFAULT_UPLOAD_OPTIONS, MINIMUM_BLOCK_SIZE } from '../content-items/handler'
import { prepareEpoch, writeFeedData } from '../feed/api'
import { AccountData } from '../account/account-data'
import { prepareEthAddress, preparePrivateKey } from '../utils/wallet'
import { assertWallet } from '../utils/type'
import { getNextEpoch } from '../feed/lookup/utils'
import { Connection } from '../connection/connection'
import { compress, decompress } from '../utils/compression'
import { wrapChunkHelper } from '../feed/utils'

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
 * Downloads entire data using metadata.
 *
 * @param {FileMetadata} meta - The metadata of the file to download.
 * @param {Block[]} blocks - The array of blocks to download.
 * @param {Bee} bee - The Bee object to use for downloading.
 * @param {BeeRequestOptions} [downloadOptions] - The options to be passed to the bee.downloadData() method.
 * @param {DataDownloadOptions} [dataDownloadOptions] - The options for tracking progress during downloading.
 * @returns {Promise<Data>} - A promise that resolves with the downloaded data.
 */
export async function prepareDataByMeta(
  meta: FileMetadata,
  blocks: Block[],
  bee: Bee,
  downloadOptions?: BeeRequestOptions,
  dataDownloadOptions?: DataDownloadOptions,
): Promise<Data> {
  dataDownloadOptions = dataDownloadOptions ?? {}
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
    let data = (await bee.downloadData(block.reference, downloadOptions)) as Uint8Array

    if (meta.compression === Compression.GZIP) {
      data = decompress(data)
    }

    updateDownloadProgress(dataDownloadOptions, DownloadProgressType.DownloadBlockEnd, blockData)
    result.set(data, offset)
    offset += data.length
  }

  updateDownloadProgress(dataDownloadOptions, DownloadProgressType.Done)

  return wrapBytesWithHelpers(result)
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
  const fileMeta = await getFileMetadataWithBlocks(
    bee,
    accountData,
    podName,
    fullPath,
    downloadOptions,
    dataDownloadOptions,
  )

  return prepareDataByMeta(fileMeta, fileMeta.blocks, bee, downloadOptions, dataDownloadOptions)
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
): Promise<FileMetadataWithLookupAnswer> {
  // empty pod name is acceptable in case of uploading the list of pods
  const isPodUploading = podName === ''

  if (podName) {
    assertPodName(podName)
    assertFullPathWithName(fullPath)
  }

  assertWallet(accountData.wallet)

  const blockSize = options.blockSize ?? Number(DEFAULT_UPLOAD_OPTIONS!.blockSize)
  assertMinLength(blockSize, MINIMUM_BLOCK_SIZE, `Block size is too small. Minimum is ${MINIMUM_BLOCK_SIZE} bytes.`)
  const contentType = options.contentType ?? String(DEFAULT_UPLOAD_OPTIONS!.contentType)
  const connection = accountData.connection
  updateUploadProgress(options, UploadProgressType.GetPodInfo)

  let podWallet
  let pod

  // if pod name is empty, we use root wallet which is for pods management
  if (podName) {
    ;({ podWallet, pod } = await getExtendedPodsListByAccountData(accountData, podName))
  } else if (!podName && accountData.wallet) {
    podWallet = accountData.wallet
  } else {
    throw new Error('Pod name or root wallet is required')
  }

  updateUploadProgress(options, UploadProgressType.GetPathInfo)
  const fullPathInfo = await getCreationPathInfo(
    connection.bee,
    fullPath,
    prepareEthAddress(podWallet.address),
    connection.options?.requestOptions,
  )
  const pathInfo = extractPathInfo(fullPath, isPodUploading)
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
      let currentBlock = getDataBlock(data, blockSize, i)
      const originalSize = currentBlock.length

      if (options.compression === Compression.GZIP) {
        currentBlock = compress(currentBlock)
      }

      blocks.blocks.push(await uploadDataBlock(connection, currentBlock, originalSize))
      updateUploadProgress(options, UploadProgressType.UploadBlockEnd, blockData)
    }
  }

  updateUploadProgress(options, UploadProgressType.UploadBlocksMeta)
  const manifestBytes = stringToBytes(blocksToManifest(blocks))
  const blocksReference = (await uploadBytes(connection, manifestBytes)).reference
  const meta: FileMetadata = {
    version: META_VERSION,
    filePath: isPodUploading ? '/' : pathInfo.path,
    fileName: pathInfo.filename,
    fileSize,
    blockSize,
    contentType,
    compression: options.compression ?? '',
    creationTime: now,
    accessTime: now,
    modificationTime: now,
    blocksReference,
    mode: getFileMode(DEFAULT_FILE_PERMISSIONS),
  }

  updateUploadProgress(options, UploadProgressType.WriteDirectoryInfo)

  // add entry to the directory only if pod provided, if not pod provided it means we are uploading pods list
  if (pod) {
    await addEntryToDirectory(connection, podWallet, pod.password, pathInfo.path, pathInfo.filename, true)
  }

  updateUploadProgress(options, UploadProgressType.WriteFileInfo)
  const nextEpoch = prepareEpoch(getNextEpoch(fullPathInfo?.lookupAnswer.epoch))
  const fileMetadataRawBytes = getFileMetadataRawBytes(meta)
  await writeFeedData(
    connection,
    fullPath,
    fileMetadataRawBytes,
    podWallet,
    pod ? pod.password : preparePrivateKey(podWallet.privateKey),
    nextEpoch,
  )

  updateUploadProgress(options, UploadProgressType.Done)

  return {
    lookupAnswer: { data: wrapChunkHelper(wrapBytesWithHelpers(fileMetadataRawBytes)), epoch: nextEpoch },
    meta,
  }
}

/**
 * Upload data block
 * @param connection connection
 * @param block block to upload
 * @param originalSize original size of the block
 */
export async function uploadDataBlock(connection: Connection, block: Uint8Array, originalSize: number): Promise<Block> {
  return {
    size: originalSize,
    compressedSize: block.length,
    reference: (await uploadBytes(connection, block)).reference,
  }
}
