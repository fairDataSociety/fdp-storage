import { Connection } from '../connection/connection'
import { Bee, Reference, RequestOptions, UploadResult, Utils } from '@fairdatasociety/bee-js'
import { PathInfo } from '../pod/utils'
import { Blocks, FileShareInfo, RawBlock, RawBlocks } from './types'
import { rawBlocksToBlocks } from './adapter'
import CryptoJS from 'crypto-js'
import { assertArray, assertString, isNumber, isObject, isString } from '../utils/type'
import { FileMetadata, RawFileMetadata } from '../pod/types'
import { EncryptedReference } from '../utils/hex'
import { isRawFileMetadata } from '../directory/utils'
import { getUnixTimestamp } from '../utils/time'
import { decryptJson, PodPasswordBytes } from '../utils/encryption'

/**
 * Asserts that full path string is correct
 *
 * @param value full path string
 */
export function assertFullPathWithName(value: unknown): asserts value is string {
  assertString(value)

  if (value.length === 0) {
    throw new Error('Path is empty')
  }

  if (value.trim().length !== value.length) {
    throw new Error('Path to contain characters that can be truncated')
  }

  if (value[0] !== '/') {
    throw new Error('Path must start with "/"')
  }

  const exploded = value.split('/')

  if (exploded.length < 2) {
    throw new Error('Path must contain at least one file or directory name')
  }

  exploded.shift()

  const name = exploded.pop()

  if (!name) {
    throw new Error('File or directory name is empty')
  }
}

/**
 * Uploads data to swarm with specific FairOS configuration
 *
 * @param connection Bee connection
 * @param data data to upload
 */
export async function uploadBytes(connection: Connection, data: Uint8Array): Promise<UploadResult> {
  return connection.bee.uploadData(connection.postageBatchId, data, {
    pin: true,
    encrypt: true,
  })
}

/**
 * Extracts filename and path from full path
 *
 * @param fullPath full absolute path with filename
 */
export function extractPathInfo(fullPath: string): PathInfo {
  assertFullPathWithName(fullPath)
  const exploded = fullPath.split('/')
  const filename = exploded.pop()

  if (!filename) {
    throw new Error('Path must contain a file')
  }

  const path = exploded.join('/')

  return {
    filename,
    path: path ? path : '/',
  }
}

/**
 * Downloads raw FairOS blocks and convert it to FDS blocks
 *
 * @param bee Bee client
 * @param podPassword bytes for data encryption from pod metadata
 * @param reference blocks Swarm reference
 * @param downloadOptions download options
 */
export async function downloadBlocksManifest(
  bee: Bee,
  podPassword: PodPasswordBytes,
  reference: Reference,
  downloadOptions?: RequestOptions,
): Promise<Blocks> {
  const encryptedData = await bee.downloadData(reference, downloadOptions)
  const rawBlocks = decryptJson(podPassword, encryptedData)
  assertRawBlocks(rawBlocks)

  return rawBlocksToBlocks(rawBlocks)
}

/**
 * Converts Base64 string to Swarm Reference
 *
 * @param base64 Reference encoded to Base64
 */
export function base64toReference(base64: string): Reference {
  return CryptoJS.enc.Base64.parse(base64).toString(CryptoJS.enc.Hex) as Reference
}

/**
 * Converts Swarm Reference to Base64
 *
 * @param reference Swarm Reference
 */
export function referenceToBase64(reference: Reference): string {
  return CryptoJS.enc.Hex.parse(reference).toString(CryptoJS.enc.Base64)
}

/**
 * Creates file share information structure
 */
export function createFileShareInfo(meta: RawFileMetadata): FileShareInfo {
  return {
    meta,
  }
}

/**
 * Checks that value is file share info
 */
export function isFileShareInfo(value: unknown): value is FileShareInfo {
  const data = value as FileShareInfo

  return isObject(value) && isRawFileMetadata(data.meta)
}

/**
 * Checks that value is file raw block
 */
export function isRawBlock(value: unknown): value is RawBlock {
  const data = value as RawBlock

  return (
    isObject(value) &&
    isString(data.Name) &&
    isNumber(data.Size) &&
    isNumber(data.CompressedSize) &&
    isString(data.Reference?.R)
  )
}

/**
 * Asserts that file raw blocks are correct
 */
export function assertRawBlocks(value: unknown): asserts value is RawBlocks {
  const data = value as RawBlocks
  assertArray(data.Blocks)
  for (const block of data.Blocks) {
    if (!isRawBlock(block)) {
      throw new Error('Incorrect file raw block')
    }
  }
}

/**
 * Verifies if file share info is correct
 */
export function assertFileShareInfo(value: unknown): asserts value is FileShareInfo {
  if (!isFileShareInfo(value)) {
    throw new Error('Incorrect file share info')
  }
}

/**
 * Gets shared information about file
 *
 * @param bee Bee instance
 * @param reference reference to shared information
 */
export async function getSharedFileInfo(bee: Bee, reference: EncryptedReference): Promise<FileShareInfo> {
  const data = (await bee.downloadData(reference)).json()

  assertFileShareInfo(data)

  return data
}

/**
 * Updates shared metadata with new params
 *
 * @param meta shared metadata
 * @param podName pod name
 * @param filePath parent path of file
 * @param fileName file name
 * @param podAddress pod address
 */
export function updateFileMetadata(
  meta: FileMetadata,
  podName: string,
  filePath: string,
  fileName: string,
  podAddress: Utils.EthAddress,
): FileMetadata {
  const now = getUnixTimestamp()

  return {
    ...meta,
    podName,
    filePath,
    fileName,
    podAddress,
    accessTime: now,
    modificationTime: now,
    creationTime: now,
  }
}
