import { FileMetadata } from '../pod/types'
import { assertAccount } from '../account/utils'
import {
  assertPodName,
  getWritablePodInfo,
  getPodShareInfo,
  hexToPodPasswordBytes,
  getReadablePodInfo,
} from '../pod/utils'
import { stringToBytes, wrapBytesWithHelpers } from '../utils/bytes'
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
import { downloadData, uploadData } from './handler'
import { getFileMetadataRawBytes, rawFileMetadataToFileMetadata } from './adapter'
import { DataUploadOptions, FileReceiveOptions, FileShareInfo } from './types'
import { addEntryToDirectory, DEFAULT_UPLOAD_OPTIONS, removeEntryFromDirectory } from '../content-items/handler'
import { Data, Reference } from '@ethersphere/bee-js'
import { getRawMetadata } from '../content-items/utils'
import { assertRawFileMetadata, combine, splitPath } from '../directory/utils'
import { assertEncryptedReference, EncryptedReference } from '../utils/hex'
import { prepareEthAddress } from '../utils/wallet'

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
   */
  async downloadData(podName: string, fullPath: string): Promise<Uint8Array> {
    assertAccount(this.accountData)
    assertPodName(podName)
    assertFullPathWithName(fullPath)
    assertPodName(podName)
    const { podAddress, podPassword } = await getReadablePodInfo(this.accountData, podName)

    return downloadData(
      this.accountData.connection.bee,
      fullPath,
      podAddress,
      podPassword,
      this.accountData.connection.options?.requestOptions,
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
    options = { ...DEFAULT_UPLOAD_OPTIONS, ...options }
    assertAccount(this.accountData)

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
    const { podWallet, pod } = await getWritablePodInfo(this.accountData, podName)
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
    const { podAddress, podPassword } = await getReadablePodInfo(this.accountData, podName)
    const meta = (await getRawMetadata(connection.bee, fullPath, podAddress, podPassword)).metadata
    assertRawFileMetadata(meta)
    const data = JSON.stringify(createFileShareInfo(meta))

    return (await uploadBytes(connection, stringToBytes(data))).reference
  }

  /**
   * Gets shared file information
   *
   * Can be executed without authentication
   *
   * @param reference encrypted swarm reference with shared file information
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
   * @param podName pod where file is stored
   * @param parentPath the path to the file to save
   * @param reference encrypted swarm reference with shared file information
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
    const { podWallet, pod } = await getWritablePodInfo(this.accountData, podName)
    let meta = rawFileMetadataToFileMetadata(sharedInfo.meta)
    const fileName = options?.name ?? sharedInfo.meta.fileName
    meta = updateFileMetadata(meta, parentPath, fileName)
    const fullPath = combine(...splitPath(parentPath), fileName)
    await addEntryToDirectory(connection, podWallet, pod.password, parentPath, fileName, true)
    await writeFeedData(connection, fullPath, getFileMetadataRawBytes(meta), podWallet, pod.password)

    return meta
  }

  /**
   * Downloads shared file
   *
   * Can be executed without authentication
   *
   * @param fileReference encrypted swarm reference with shared file information
   */
  // async downloadShared(fileReference: string | EncryptedReference): Promise<Data> {
  //   const info = await this.getSharedInfo(fileReference)
  //   const data = await downloadData(
  //     this.accountData.connection.bee,
  //     combine(info.meta.filePath, info.meta.fileName),
  //     prepareEthAddress(info.source_address),
  //     this.accountData.connection.options?.requestOptions,
  //   )
  //
  //   return data
  // }

  /**
   * Downloads a file from a shared pod
   *
   * Can be executed without authentication
   *
   * @param podReference encrypted swarm reference with shared pod information
   * @param fullPath full path of the file to download
   */
  async downloadFromSharedPod(podReference: string | EncryptedReference, fullPath: string): Promise<Data> {
    assertEncryptedReference(podReference)
    const info = await getPodShareInfo(this.accountData.connection.bee, podReference)
    const data = await downloadData(
      this.accountData.connection.bee,
      fullPath,
      prepareEthAddress(info.podAddress),
      hexToPodPasswordBytes(info.password),
      this.accountData.connection.options?.requestOptions,
    )

    return wrapBytesWithHelpers(data)
  }
}
