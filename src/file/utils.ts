import { Connection } from '../connection/connection'
import { Bee, Reference, RequestOptions, UploadResult } from '@ethersphere/bee-js'
import { PathInfo } from '../pod/utils'
import { Blocks, FileShareInfo, RawBlock, RawBlocks } from './types'
import { rawBlocksToBlocks } from './adapter'
import CryptoJS from 'crypto-js'
import { assertArray, assertString, isNumber, isObject, isString } from '../utils/type'
import { FileMetadata, RawFileMetadata } from '../pod/types'
import { EncryptedReference } from '../utils/hex'
import { isRawFileMetadata, splitPath } from '../directory/utils'
import { getUnixTimestamp } from '../utils/time'
import { bytesToString } from '../utils/bytes'

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
  downloadOptions?: RequestOptions,
): Promise<Blocks> {
  const data = await bee.downloadData(reference, downloadOptions)
  const rawBlocks = JSON.parse(bytesToString(data))
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
