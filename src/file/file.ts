import { FileMetadata } from '../pod/types'
import { assertActiveAccount } from '../account/utils'
import { META_VERSION } from '../pod/utils'
import { getExtendedPodsList } from '../pod/api'
import { getUnixTimestamp } from '../utils/time'
import { stringToBytes } from '../utils/bytes'
import { AccountData } from '../account/account-data'
import { extractPathInfo, uploadBytes, assertFullPathWithName } from './utils'
import { writeFeedData } from '../feed/api'
import { downloadData, generateBlockName } from './handler'
import { blocksToManifest, getFileMetadataRawBytes } from './adapter'
import { Blocks, DataUploadOptions } from './types'
import { Data } from '@ethersphere/bee-js'
import { addEntryToDirectory } from '../content-items/handler'

/**
 * Files management class
 */
export class File {
  public readonly defaultUploadOptions: DataUploadOptions = {
    blockSize: 1000000,
    contentType: '',
  }

  constructor(private accountData: AccountData) {}

  /**
   * Downloads file content
   *
   * @param podName pod where file is stored
   * @param fullPath full path of the file
   */
  async downloadData(podName: string, fullPath: string): Promise<Data> {
    assertActiveAccount(this.accountData)
    assertFullPathWithName(fullPath)
    const extendedInfo = await getExtendedPodsList(
      this.accountData.connection.bee,
      podName,
      this.accountData.wallet!,
      this.accountData.connection.options?.downloadOptions,
    )

    return downloadData(
      this.accountData.connection.bee,
      fullPath,
      extendedInfo.podAddress,
      this.accountData.connection.options?.downloadOptions,
    )
  }

  /**
   * Uploads file content
   *
   * @param podName pod where file is stored
   * @param fullPath full path of the file
   * @param data file content
   * @param options upload options
   */
  async uploadData(
    podName: string,
    fullPath: string,
    data: Uint8Array | string,
    options?: DataUploadOptions,
  ): Promise<FileMetadata> {
    options = { ...this.defaultUploadOptions, ...options }
    assertActiveAccount(this.accountData)
    assertFullPathWithName(fullPath)
    data = typeof data === 'string' ? stringToBytes(data) : data
    const connection = this.accountData.connection
    const extendedInfo = await getExtendedPodsList(
      connection.bee,
      podName,
      this.accountData.wallet!,
      connection.options?.downloadOptions,
    )

    const pathInfo = extractPathInfo(fullPath)
    const now = getUnixTimestamp()
    const blocksCount = Math.ceil(data.length / options.blockSize)
    const blocks: Blocks = { blocks: [] }
    for (let i = 0; i < blocksCount; i++) {
      const currentBlock = data.slice(i * options.blockSize, (i + 1) * options.blockSize)
      const result = await uploadBytes(connection, currentBlock)
      blocks.blocks.push({
        name: generateBlockName(i),
        size: currentBlock.length,
        compressedSize: currentBlock.length,
        reference: result.reference,
      })
    }

    const manifestBytes = stringToBytes(blocksToManifest(blocks))
    const blocksReference = (await uploadBytes(connection, manifestBytes)).reference
    const meta: FileMetadata = {
      version: META_VERSION,
      userAddress: extendedInfo.podAddress,
      podName,
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
    }

    await addEntryToDirectory(connection, extendedInfo.podWallet, pathInfo.path, pathInfo.filename, true)
    await writeFeedData(connection, fullPath, getFileMetadataRawBytes(meta), extendedInfo.podWallet.privateKey)

    return meta
  }
}
