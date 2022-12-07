import { FileMetadata } from '../pod/types'
import { assertAccount } from '../account/utils'
import { assertPodName, META_VERSION } from '../pod/utils'
import { getUnixTimestamp } from '../utils/time'
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
import { downloadData } from './handler'
import { blocksToManifest, getFileMetadataRawBytes, rawFileMetadataToFileMetadata } from './adapter'
import { Blocks, DataUploadOptions, FileReceiveOptions, FileShareInfo } from './types'
import { addEntryToDirectory, removeEntryFromDirectory } from '../content-items/handler'
import { Data, Reference } from '@ethersphere/bee-js'
import { getRawMetadata } from '../content-items/utils'
import { assertRawFileMetadata, combine } from '../directory/utils'
import { assertEncryptedReference, EncryptedReference } from '../utils/hex'
import { PodEnvironment } from '../pod/PodEnvironment'

/**
 * Files management class
 */
export class File {
  podEnvironment: PodEnvironment = {} as PodEnvironment

  public readonly defaultUploadOptions: DataUploadOptions = {
    blockSize: 1000000,
    contentType: '',
  }

  constructor(private accountData: AccountData) {}
  setPodEnvironment(podEnvironment: PodEnvironment) {
    this.podEnvironment = podEnvironment
  }
  /**
   * Downloads file content
   *
   * @param podName pod where file is stored
   * @param fullPath full path of the file
   */
  async downloadData(podName: string, fullPath: string): Promise<Data> {
    assertAccount(this.accountData)
    assertPodName(podName)
    assertFullPathWithName(fullPath)
    assertPodName(podName)

    return downloadData(
      this.accountData.connection.bee,
      fullPath,
      this.podEnvironment.podAddress,
      this.podEnvironment.pod.password,
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
    assertAccount(this.accountData)
    assertPodName(podName)
    assertFullPathWithName(fullPath)
    assertPodName(podName)
    data = typeof data === 'string' ? stringToBytes(data) : data
    const connection = this.accountData.connection

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
    }

    const { podWallet, pod } = this.podEnvironment
    await addEntryToDirectory(connection, podWallet, pod.password, pathInfo.path, pathInfo.filename, true)
    await writeFeedData(connection, fullPath, getFileMetadataRawBytes(meta), podWallet.privateKey, pod.password)

    return meta
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

    const { podWallet, pod } = this.podEnvironment
    const pathInfo = extractPathInfo(fullPath)
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


    const { podAddress, pod } = this.podEnvironment
    const connection = this.accountData.connection
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

    const { podWallet, pod } = this.podEnvironment
    let meta = rawFileMetadataToFileMetadata(sharedInfo.meta)
    const fileName = options?.name ?? sharedInfo.meta.fileName
    meta = updateFileMetadata(meta, parentPath, fileName)
    const fullPath = combine(parentPath, fileName)
    await addEntryToDirectory(connection, podWallet, pod.password, parentPath, fileName, true)
    await writeFeedData(connection, fullPath, getFileMetadataRawBytes(meta), podWallet.privateKey, pod.password)

    return meta
  }
}
