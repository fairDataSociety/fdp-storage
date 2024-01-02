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
import { assertBatchId } from '../utils/string'
import { prepareEthAddress } from '../utils/wallet'

/**
 * Files management class
 */
export class File {
  constructor(private accountData: AccountData) {}

  /**
   * Downloads file content
   *
   * Account is required, postage batch id is not required
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
   * Account and postage batch id are required
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
    assertAccount(this.accountData, { writeRequired: true })
    assertPodName(podName)

    const { podWallet, pod } = await getExtendedPodsListByAccountData(this.accountData, podName)
    const socOwnerAddress = prepareEthAddress(podWallet.address)
    const meta = (
      await uploadData(
        this.accountData.connection,
        socOwnerAddress,
        podWallet.privateKey,
        pod.password,
        fullPath,
        data,
        options,
      )
    ).meta
    const pathInfo = extractPathInfo(fullPath)
    await addEntryToDirectory(
      this.accountData,
      socOwnerAddress,
      podWallet.privateKey,
      pod.password,
      pathInfo.path,
      pathInfo.filename,
      true,
    )

    return meta
  }

  /**
   * Deletes a file
   *
   * Account and postage batch id are required
   *
   * @param podName pod where file is located
   * @param fullPath full path of the file
   */
  async delete(podName: string, fullPath: string): Promise<void> {
    assertAccount(this.accountData, { writeRequired: true })
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
   * Account and postage batch id are required
   *
   * @param podName pod where file is stored
   * @param fullPath full path of the file
   */
  async share(podName: string, fullPath: string): Promise<Reference> {
    assertAccount(this.accountData, { writeRequired: true })
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
   * Account and postage batch id are not required
   *
   * @param reference swarm reference with shared file information
   *
   * @returns shared file information
   */
  async getSharedInfo(reference: string | EncryptedReference): Promise<FileShareInfo> {
    assertEncryptedReference(reference)

    return getSharedFileInfo(this.accountData.connection.bee, reference)
  }

  /**
   * Saves shared file to a personal account
   *
   * Account and postage batch id are required
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
    assertAccount(this.accountData, { writeRequired: true })
    assertPodName(podName)
    const sharedInfo = await this.getSharedInfo(reference)
    const connection = this.accountData.connection
    const { podWallet, pod } = await getExtendedPodsListByAccountData(this.accountData, podName)
    const socOwnerAddress = prepareEthAddress(podWallet.address)
    let meta = rawFileMetadataToFileMetadata(sharedInfo.meta)
    const fileName = options?.name ?? sharedInfo.meta.fileName
    meta = updateFileMetadata(meta, parentPath, fileName)
    const fullPath = combine(...splitPath(parentPath), fileName)
    await addEntryToDirectory(
      this.accountData,
      socOwnerAddress,
      podWallet.privateKey,
      pod.password,
      parentPath,
      fileName,
      true,
    )
    await writeFeedData(connection, fullPath, getFileMetadataRawBytes(meta), podWallet.privateKey, pod.password)

    return meta
  }

  /**
   * Uploads a data block without constructing a file metadata
   *
   * Account is not required, postage batch id is required
   *
   * @param block block data
   * @param blockIndex block index
   * @param originalSize original size of the block
   */
  async uploadDataBlock(block: Uint8Array, blockIndex: number, originalSize: number): Promise<ExternalDataBlock> {
    assertBatchId(this.accountData.connection.postageBatchId)

    return {
      ...(await uploadDataBlock(this.accountData.connection, block, originalSize)),
      index: blockIndex,
    }
  }

  /**
   * Downloads file metadata with blocks data
   *
   * Account is required, postage batch id is not required
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
   * No account or postage batch id is required
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
