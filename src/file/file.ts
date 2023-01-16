import { FileMetadata } from '../pod/types'
import { assertAccount } from '../account/utils'
import { assertPodName, getExtendedPodsListByAccountData, META_VERSION } from '../pod/utils'
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
import { Bee, BeeError, Data, KyRequestOptions, Reference, RequestOptions } from '@ethersphere/bee-js'
import { getRawMetadata } from '../content-items/utils'
import { assertRawFileMetadata, combine } from '../directory/utils'
import { assertEncryptedReference, EncryptedReference } from '../utils/hex'

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
    assertAccount(this.accountData)
    assertPodName(podName)
    assertFullPathWithName(fullPath)
    assertPodName(podName)
    const { podAddress, pod } = await getExtendedPodsListByAccountData(this.accountData, podName)

    return downloadData(
      this.accountData.connection.bee,
      fullPath,
      podAddress,
      pod.password,
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
    // @ts-ignore
    const cloneGetKy = Bee.prototype.getKy

    // @ts-ignore
    Bee.prototype.getKy = this.fetchPolyfill(this.accountData.connection.bee.url)

    options = { ...this.defaultUploadOptions, ...options }
    assertAccount(this.accountData)
    assertPodName(podName)
    assertFullPathWithName(fullPath)
    assertPodName(podName)
    data = typeof data === 'string' ? stringToBytes(data) : data
    const connection = this.accountData.connection
    const { podWallet, pod } = await getExtendedPodsListByAccountData(this.accountData, podName)

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

    await addEntryToDirectory(connection, podWallet, pod.password, pathInfo.path, pathInfo.filename, true)
    await writeFeedData(connection, fullPath, getFileMetadataRawBytes(meta), podWallet.privateKey, pod.password)

    // @ts-ignore
    Bee.prototype.getKy = cloneGetKy
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
    const fullPath = combine(parentPath, fileName)
    await addEntryToDirectory(connection, podWallet, pod.password, parentPath, fileName, true)
    await writeFeedData(connection, fullPath, getFileMetadataRawBytes(meta), podWallet.privateKey, pod.password)

    return meta
  }

  /**
   * fetch polyfill for ky and bee-js
   * @param options Options that affects the request behavior
   */
  fetchPolyfill(beeUrl: string) {
    return (options: RequestOptions = {}): any => {
      return async (url: any, kyOpts: KyRequestOptions): Promise<any> => {
        const _url = `${beeUrl}/${url}`
        const res = await fetch(_url, {
          ...kyOpts,
          ...options,
          headers: Object(kyOpts.headers),
        })
        return {
          data: undefined,
          ...res,
        } // KyResponse type
      }
    }
  }
}
