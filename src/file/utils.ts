import { Connection } from '../connection/connection'
import { Bee, Reference, BeeRequestOptions, UploadResult } from '@ethersphere/bee-js'
import { PathInfo } from '../pod/utils'
import {
  Blocks,
  DataUploadOptions,
  FileShareInfo,
  RawBlock,
  RawBlocks,
  ProgressBlockData,
  UploadProgressType,
  DataDownloadOptions,
  DownloadProgressType,
  ExternalDataBlock,
  Block,
} from './types'
import { rawBlocksToBlocks } from './adapter'
import CryptoJS from 'crypto-js'
import { assertArray, assertNumber, assertString, isNumber, isObject, isString } from '../utils/type'
import { FileMetadata, RawFileMetadata } from '../pod/types'
import { EncryptedReference } from '../utils/hex'
import { isRawFileMetadata, splitPath } from '../directory/utils'
import { getUnixTimestamp } from '../utils/time'
import { jsonParse } from '../utils/json'
import { assertReference } from '../utils/string'
import { stringToBytes } from '../utils/bytes'

/**
 * Default file permission in octal format
 */
export const DEFAULT_FILE_PERMISSIONS = 0o600

/**
 * File indication in octal format
 */
export const FILE_MODE = 0o100000

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

  const exploded = splitPath(value)

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
  const exploded = splitPath(fullPath)
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
 * Get basename from a path
 */
export function getBaseName(path: string): string | undefined {
  const exploded = splitPath(path)

  return exploded.pop()
}

/**
 * Downloads raw FairOS blocks and convert it to FDS blocks
 *
 * @param bee Bee client
 * @param reference blocks Swarm reference
 * @param downloadOptions download options
 */
export async function downloadBlocksManifest(
  bee: Bee,
  reference: Reference,
  downloadOptions?: BeeRequestOptions,
): Promise<Blocks> {
  const data = (await bee.downloadData(reference, downloadOptions)).text()
  const rawBlocks = jsonParse(data, 'blocks manifest')
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

  return isObject(value) && isNumber(data.size) && isNumber(data.compressedSize) && isString(data.reference?.swarm)
}

/**
 * Asserts that file raw blocks are correct
 */
export function assertRawBlocks(value: unknown): asserts value is RawBlocks {
  const data = value as RawBlocks
  assertArray(data.blocks)
  for (const block of data.blocks) {
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
 * @param filePath parent path of file
 * @param fileName file name
 */
export function updateFileMetadata(meta: FileMetadata, filePath: string, fileName: string): FileMetadata {
  const now = getUnixTimestamp()

  return {
    ...meta,
    filePath,
    fileName,
    accessTime: now,
    modificationTime: now,
    creationTime: now,
  }
}

/**
 * Reads file content in a browser
 */
export async function readBrowserFileAsBytes(file: File): Promise<Uint8Array> {
  const arrayBuffer = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })

  return new Uint8Array(arrayBuffer as ArrayBuffer)
}

/**
 * Calculates file mode
 */
export function getFileMode(mode: number): number {
  return FILE_MODE | mode
}

/**
 * Updates upload progress
 * @param options upload options
 * @param progressType progress type
 * @param data progress data
 */
export function updateUploadProgress(
  options: DataUploadOptions,
  progressType: UploadProgressType,
  data?: ProgressBlockData,
): void {
  if (!options.progressCallback) {
    return
  }

  options.progressCallback({ progressType, data })
}

/**
 * Updates download progress
 * @param options download options
 * @param progressType progress type
 * @param data progress data
 */
export function updateDownloadProgress(
  options: DataDownloadOptions,
  progressType: DownloadProgressType,
  data?: ProgressBlockData,
): void {
  if (!options.progressCallback) {
    return
  }

  options.progressCallback({ progressType, data })
}

/**
 * Calculates upload block percentage
 * @param blockId block id started from 0
 * @param totalBlocks total blocks
 */
export function calcUploadBlockPercentage(blockId: number, totalBlocks: number): number {
  if (totalBlocks <= 0 || blockId < 0) {
    return 0
  }

  return Math.round(((blockId + 1) / totalBlocks) * 100)
}

/**
 * Asserts that a given value is an ExternalDataBlock
 * @param value The value to assert
 */
export function assertExternalDataBlock(value: unknown): asserts value is ExternalDataBlock {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Expected an object for ExternalDataBlock')
  }

  const block = value as ExternalDataBlock

  assertNumber(block.size, 'Expected "size" to be a number')
  assertNumber(block.compressedSize, 'Expected "compressedSize" to be a number')
  assertReference(block.reference)
  assertNumber(block.index, 'Expected "index" to be a number')
}

/**
 * Checks if the given value is an ExternalDataBlock
 * @param value The value to check
 */
export function isExternalDataBlock(value: unknown): boolean {
  try {
    assertExternalDataBlock(value)

    return true
  } catch (e) {
    return false
  }
}

/**
 * Asserts that a given value is an array of ExternalDataBlock
 * @param value The value to assert
 */
export function assertExternalDataBlocks(value: unknown): asserts value is ExternalDataBlock[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected an array for ExternalDataBlocks')
  }

  for (const block of value) {
    assertExternalDataBlock(block)
  }
}

/**
 * Checks if the given value is an array of ExternalDataBlock
 * @param value The value to check
 */
export function isExternalDataBlocks(value: unknown): value is ExternalDataBlock[] {
  try {
    assertExternalDataBlocks(value)

    return true
  } catch (e) {
    return false
  }
}

/**
 * Converts ExternalDataBlock[] to Block[]
 * @param externalDataBlocks The ExternalDataBlock[] to convert
 */
export function externalDataBlocksToBlocks(externalDataBlocks: ExternalDataBlock[]): Block[] {
  return externalDataBlocks.map(block => ({
    size: block.size,
    compressedSize: block.compressedSize,
    reference: block.reference,
  }))
}

/**
 * Checks if the sequence of ExternalDataBlocks is correctly indexed and sorted.
 * @param externalDataBlocks The array of ExternalDataBlocks to check.
 */
export function isSequenceOfExternalDataBlocksCorrect(externalDataBlocks: ExternalDataBlock[]): boolean {
  for (let i = 0; i < externalDataBlocks.length; i++) {
    if (externalDataBlocks[i].index !== i) {
      return false
    }
  }

  return true
}

/**
 * Asserts that the sequence of ExternalDataBlocks is correctly indexed.
 * @param externalDataBlocks The array of ExternalDataBlocks to assert.
 */
export function assertSequenceOfExternalDataBlocksCorrect(externalDataBlocks: ExternalDataBlock[]): void {
  if (!isSequenceOfExternalDataBlocksCorrect(externalDataBlocks)) {
    throw new Error('The sequence of `ExternalDataBlock` is not correctly indexed.')
  }
}

/**
 * Gets data block by index from data
 * @param data Data
 * @param blockSize Size of block
 * @param blockIndex Index of block
 */
export function getDataBlock(data: string | Uint8Array, blockSize: number, blockIndex: number): Uint8Array {
  data = typeof data === 'string' ? stringToBytes(data) : data

  return data.slice(blockIndex * blockSize, (blockIndex + 1) * blockSize)
}
