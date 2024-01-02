import { assertMinLength, stringToBytes, wrapBytesWithHelpers } from '../utils/bytes'
import { Bee, BeeRequestOptions, Data, Signer } from '@ethersphere/bee-js'
import {
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
import { FileMetadata, FileMetadataWithLookupAnswer, RawDirectoryMetadata } from '../pod/types'
import { blocksToManifest, getFileMetadataRawBytes, rawFileMetadataToFileMetadata } from './adapter'
import { assertRawDirectoryMetadata, assertRawFileMetadata } from '../directory/utils'
import { getCreationPathInfo, getIndexFilePath, getRawMetadata } from '../content-items/utils'
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
import { getExtendedPodsListByAccountData, META_VERSION } from '../pod/utils'
import { getUnixTimestamp } from '../utils/time'
import { DEFAULT_UPLOAD_OPTIONS, MINIMUM_BLOCK_SIZE } from '../content-items/handler'
import { prepareEpoch, writeFeedData } from '../feed/api'
import { AccountData } from '../account/account-data'
import { getNextEpoch } from '../feed/lookup/utils'
import { Connection } from '../connection/connection'
import { compress, decompress } from '../utils/compression'
import { wrapChunkHelper } from '../feed/utils'
import { jsonParse } from '../utils/json'
import { EthAddress } from '../utils/eth'

/**
 * File prefix
 */
export const FILE_TOKEN = '_F_'
/**
 * Directory prefix
 */
export const DIRECTORY_TOKEN = '_D_'

/**
 * Index item for storing data with files and directories items
 * https://github.com/fairDataSociety/FIPs/pull/75
 */
export const INDEX_ITEM_NAME = 'index.dfs'

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
  updateDownloadProgress(dataDownloadOptions, DownloadProgressType.DownloadBlocksMeta)
  const blocks = await downloadBlocksManifest(bee, fileMetadata.blocksReference, downloadOptions)
  await prepareDataByMeta(fileMetadata, blocks.blocks, accountData.connection.bee, downloadOptions)

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
 * Interface representing information about blocks.
 * @interface
 */
export interface BlocksInfo {
  /**
   * Blocks
   */
  blocks: Blocks
  /**
   * File size
   */
  fileSize: number
}

/**
 * Uploads data blocks to a connection using the specified options.
 *
 * @param {Connection} connection - The connection to upload the data blocks to.
 * @param {Uint8Array | string | ExternalDataBlock[]} data - The data to be uploaded. It can be either a Uint8Array, a string, or an array of ExternalDataBlocks.
 * @param {DataUploadOptions} options - The options for the data upload.
 * @returns {Promise<BlocksInfo>} - A promise that resolves to an object containing the BlocksInfo.
 */
export async function uploadBlocks(
  connection: Connection,
  data: Uint8Array | string | ExternalDataBlock[],
  options: DataUploadOptions,
): Promise<BlocksInfo> {
  const blockSize = options.blockSize ?? Number(DEFAULT_UPLOAD_OPTIONS!.blockSize)
  assertMinLength(blockSize, MINIMUM_BLOCK_SIZE, `Block size is too small. Minimum is ${MINIMUM_BLOCK_SIZE} bytes.`)
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

  return {
    blocks,
    fileSize,
  }
}

/**
 * Uploads the metadata of blocks.
 *
 * @param {Connection} connection - The connection to upload the metadata to.
 * @param {Blocks} blocks - The blocks to generate the metadata from.
 * @param {string} filePath - The path of the file.
 * @param {string} fileName - The name of the file.
 * @param {number} fileSize - The size of the file in bytes.
 * @param {number} blockSize - The size of each block in bytes.
 * @param {string} contentType - The content type of the file.
 * @param {string} compression - The compression algorithm used.
 * @param {number} time - The Unix timestamp for the creation, access, and modification time of the file. Defaults to the current Unix timestamp.
 *
 * @returns {Promise<FileMetadata>} - The metadata of the uploaded blocks.
 */
export async function uploadBlocksMeta(
  connection: Connection,
  blocks: Blocks,
  filePath: string,
  fileName: string,
  fileSize: number,
  blockSize: number,
  contentType: string,
  compression: string,
  time = getUnixTimestamp(),
): Promise<FileMetadata> {
  const manifestBytes = stringToBytes(blocksToManifest(blocks))
  const blocksReference = (await uploadBytes(connection, manifestBytes)).reference

  return {
    version: META_VERSION,
    filePath,
    fileName,
    fileSize,
    blockSize,
    contentType,
    compression,
    creationTime: time,
    accessTime: time,
    modificationTime: time,
    blocksReference,
    mode: getFileMode(DEFAULT_FILE_PERMISSIONS),
  }
}

/**
 * Uploads file content
 *
 * @param connection connection information for data management
 * @param socOwnerAddress owner address of the Single Owner Chunk
 * @param socSigner signer of the Single Owner Chunk
 * @param encryptionPassword data encryption password
 * @param fullPath full path of the file
 * @param data file content
 * @param options upload options
 */
export async function uploadData(
  connection: Connection,
  socOwnerAddress: EthAddress,
  socSigner: string | Uint8Array | Signer,
  encryptionPassword: PodPasswordBytes,
  fullPath: string,
  data: Uint8Array | string | ExternalDataBlock[],
  options: DataUploadOptions,
): Promise<FileMetadataWithLookupAnswer> {
  // empty pod name is acceptable in case of uploading the list of pods
  const isPodUploading = fullPath === ''

  const blockSize = options.blockSize ?? Number(DEFAULT_UPLOAD_OPTIONS!.blockSize)
  assertMinLength(blockSize, MINIMUM_BLOCK_SIZE, `Block size is too small. Minimum is ${MINIMUM_BLOCK_SIZE} bytes.`)
  const contentType = options.contentType ?? String(DEFAULT_UPLOAD_OPTIONS!.contentType)
  updateUploadProgress(options, UploadProgressType.GetPathInfo)
  const fullPathInfo = await getCreationPathInfo(
    connection.bee,
    fullPath,
    socOwnerAddress,
    connection.options?.requestOptions,
  )
  const pathInfo =
    fullPath === '/'
      ? {
          path: '/',
          filename: '',
        }
      : extractPathInfo(fullPath, isPodUploading)
  const { blocks, fileSize } = await uploadBlocks(connection, data, options)

  updateUploadProgress(options, UploadProgressType.UploadBlocksMeta)
  const meta = await uploadBlocksMeta(
    connection,
    blocks,
    isPodUploading ? '/' : pathInfo.path,
    pathInfo.filename,
    fileSize,
    blockSize,
    contentType,
    options.compression ?? '',
  )
  updateUploadProgress(options, UploadProgressType.WriteFileInfo)
  const nextEpoch = prepareEpoch(getNextEpoch(fullPathInfo?.lookupAnswer.epoch))
  const fileMetadataRawBytes = getFileMetadataRawBytes(meta)
  await writeFeedData(connection, fullPath, fileMetadataRawBytes, socSigner, encryptionPassword, nextEpoch)
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

/**
 * Retrieves the content of an index file about the directory.
 *
 * @param {AccountData} accountData - The account data.
 * @param {string} podName - The name of the pod.
 * @param {string} path - The path to the index file.
 * @param {BeeRequestOptions} [downloadOptions] - The download options.
 * @param {DataDownloadOptions} [dataDownloadOptions] - The data download options.
 *
 * @returns {Promise<RawDirectoryMetadata>} - A promise that resolves with the content of the index file.
 */
export async function getIndexFileContent(
  accountData: AccountData,
  podName: string,
  path: string,
  downloadOptions?: BeeRequestOptions,
  dataDownloadOptions?: DataDownloadOptions,
): Promise<RawDirectoryMetadata> {
  const combinedPath = getIndexFilePath(path)
  const data = jsonParse(
    (await downloadData(accountData, podName, combinedPath, downloadOptions, dataDownloadOptions)).text(),
    'getIndexFileContent',
  )
  assertRawDirectoryMetadata(data)

  return data
}
