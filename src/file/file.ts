import { FileMetadata } from '../pod/types'
import { assertAccount } from '../account/utils'
import { assertPodName, getExtendedPodsListByAccountData } from '../pod/utils'
import { stringToBytes } from '../utils/bytes'
import { AccountData } from '../account/account-data'
import {
  assertFullPathWithName,
  createFileShareInfo,
  extractPathInfo,
  getSharedFileInfo,
  updateFileMetadata,
  uploadBytes,
} from './utils'
import { writeFeedData } from '../feed/api'
import { downloadData, getFileMetadataWithBlocks, uploadData, uploadDataBlock } from './handler'
import { getFileMetadataRawBytes, rawFileMetadataToFileMetadata } from './adapter'
import {
  DataDownloadOptions,
  DataUploadOptions,
  ExternalDataBlock,
  FileMetadataWithBlocks,
  FileReceiveOptions,
  FileShareInfo,
} from './types'
import { addEntryToDirectory, DEFAULT_UPLOAD_OPTIONS, removeEntryFromDirectory } from '../content-items/handler'
import { BeeRequestOptions, Reference } from '@ethersphere/bee-js'
import { getRawMetadata } from '../content-items/utils'
import { assertRawFileMetadata, combine, splitPath } from '../directory/utils'
import { assertEncryptedReference, EncryptedReference } from '../utils/hex'

/**
 * Files management class
 */
export class File {
  constructor(private accountData: AccountData) {}

  /**
   * Downloads file content
   *
   * @param podName pod where file is stored
   * @param fullPath full path of the file
   * @param options download options
   */
  async downloadData(podName: string, fullPath: string, options?: DataDownloadOptions): Promise<Uint8Array> {
    assertAccount(this.accountData)
    assertPodName(podName)
    assertFullPathWithName(fullPath)

    return downloadData(
      this.accountData,
      podName,
      fullPath,
      this.accountData.connection.options?.requestOptions,
      options,
    )
  }

  /**
   * Uploads file content
   *
   * @param podName pod where file is stored
   * @param fullPath full path of the file
   * @param data file content or ExternalDataBlock[] indexed in ascending order
   * @param options upload options
   */
  async uploadData(
    podName: string,
    fullPath: string,
    data: Uint8Array | string | ExternalDataBlock[],
    options?: DataUploadOptions,
  ): Promise<FileMetadata> {
    options = { ...DEFAULT_UPLOAD_OPTIONS, ...options }
    assertAccount(this.accountData)
    assertPodName(podName)

    return uploadData(podName, fullPath, data, this.accountData, options)
  }

  /**
   * Deletes a file
   *
   * @param podName pod where file is located
   * @param fullPath full path of the file
   */
  async delete(podName: string, fullPath: string): Promise<void> {
    assertAccount(this.accountData)
    assertFullPathWithName(fullPath)
    assertPodName(podName)
    const pathInfo = extractPathInfo(fullPath)
    const { podWallet, pod } = await getExtendedPodsListByAccountData(this.accountData, podName)
    await removeEntryFromDirectory(
      this.accountData.connection,
      podWallet,
      pod.password,
      pathInfo.path,
      pathInfo.filename,
      true,
    )
  }

  /**
   * Shares file information
   *
   * @param podName pod where file is stored
   * @param fullPath full path of the file
   */
  async share(podName: string, fullPath: string): Promise<Reference> {
    assertAccount(this.accountData)
    assertFullPathWithName(fullPath)
    assertPodName(podName)

    const connection = this.accountData.connection
    const { podAddress, pod } = await getExtendedPodsListByAccountData(this.accountData, podName)
    const meta = (await getRawMetadata(connection.bee, fullPath, podAddress, pod.password)).metadata
    assertRawFileMetadata(meta)
    const data = JSON.stringify(createFileShareInfo(meta))

    return (await uploadBytes(connection, stringToBytes(data))).reference
  }

  /**
   * Gets shared file information
   *
   * @param reference swarm reference with shared file information
   *
   * @returns shared file information
   */
  async getSharedInfo(reference: string | EncryptedReference): Promise<FileShareInfo> {
    assertAccount(this.accountData)
    assertEncryptedReference(reference)

    return getSharedFileInfo(this.accountData.connection.bee, reference)
  }

  /**
   * Saves shared file to a personal account
   *
   * @param podName pod where file is stored
   * @param parentPath the path to the file to save
   * @param reference swarm reference with shared file information
   * @param options save options
   *
   * @returns saved file metadata
   */
  async saveShared(
    podName: string,
    parentPath: string,
    reference: string | EncryptedReference,
    options?: FileReceiveOptions,
  ): Promise<FileMetadata> {
    assertPodName(podName)
    const sharedInfo = await this.getSharedInfo(reference)
    const connection = this.accountData.connection
    const { podWallet, pod } = await getExtendedPodsListByAccountData(this.accountData, podName)
    let meta = rawFileMetadataToFileMetadata(sharedInfo.meta)
    const fileName = options?.name ?? sharedInfo.meta.fileName
    meta = updateFileMetadata(meta, parentPath, fileName)
    const fullPath = combine(...splitPath(parentPath), fileName)
    await addEntryToDirectory(connection, podWallet, pod.password, parentPath, fileName, true)
    await writeFeedData(connection, fullPath, getFileMetadataRawBytes(meta), podWallet, pod.password)

    return meta
  }

  /**
   * Uploads a data block without constructing a file metadata
   *
   * @param block block data
   * @param blockIndex block index
   */
  async uploadDataBlock(block: Uint8Array, blockIndex: number): Promise<ExternalDataBlock> {
    return {
      ...(await uploadDataBlock(this.accountData.connection, block)),
      index: blockIndex,
    }
  }

  /**
   * Downloads file metadata with blocks data
   *
   * @param podName pod where file is stored
   * @param fullPath full path of the file
   * @param downloadOptions bee download options
   * @param options data download options
   */
  async getMetadata(
    podName: string,
    fullPath: string,
    downloadOptions?: BeeRequestOptions,
    options?: DataDownloadOptions,
  ): Promise<FileMetadataWithBlocks> {
    assertAccount(this.accountData)
    assertPodName(podName)
    assertFullPathWithName(fullPath)

    return getFileMetadataWithBlocks(
      this.accountData.connection.bee,
      this.accountData,
      podName,
      fullPath,
      downloadOptions,
      options,
    )
  }

  /**
   * Downloads data block using file metadata
   *
   * @param meta file metadata
   * @param blockIndex block index
   * @param downloadOptions bee download options
   */
  async downloadDataBlock(
    meta: FileMetadataWithBlocks,
    blockIndex: number,
    downloadOptions?: BeeRequestOptions,
  ): Promise<Uint8Array> {
    if (blockIndex < 0 || blockIndex >= meta.blocks.length) {
      throw new Error('"blockIndex" is out of bounds')
    }

    return this.accountData.connection.bee.downloadData(meta.blocks[blockIndex].reference, downloadOptions)
  }
}
