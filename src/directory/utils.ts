import { MAX_DIRECTORY_NAME_LENGTH, createDirectory, createRootDirectory } from './handler'
import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types'
import { assertString, isNumber, isString } from '../utils/type'
import { replaceAll } from '../utils/string'
import * as fs from 'fs'
import * as nodePath from 'path'
import { isNode } from '../shim/utils'
import { getBaseName } from '../file/utils'
import { Bee, BeeRequestOptions } from '@ethersphere/bee-js'
import { getRawMetadata, rawDirectoryMetadataToDirectoryItem, rawFileMetadataToFileItem } from '../content-items/utils'
import { EthAddress } from '../utils/eth'
import { PodPasswordBytes } from '../utils/encryption'
import { DirectoryItem } from '../types'
import { DIRECTORY_TOKEN, FILE_TOKEN } from '../file/handler'
import { AccountData } from '../account/account-data'
import { HDNode } from 'ethers/lib/utils'
import { prepareEthAddress } from '../utils/wallet'
import { addEntryToDirectory } from '../content-items/handler'

/**
 * Default directory permission in octal format
 */
export const DEFAULT_DIRECTORY_PERMISSIONS = 0o700

/**
 * Directory indication in octal format
 */
export const DIRECTORY_MODE = 0o40000

/**
 * General information about a file
 */
export interface FileInfo {
  // relative path of a file without base path. e.g `file.txt`
  relativePath: string
  // relative path of a file with base path. e.g `/all-files/file.txt`
  relativePathWithBase: string
}

/**
 * Information about browser file
 */
export interface BrowserFileInfo extends FileInfo {
  // original browser file
  browserFile: File
}

/**
 * Information about Node.js file
 */
export interface NodeFileInfo extends FileInfo {
  // full path of the file
  fullPath: string
}

/**
 * Split path
 */
export function splitPath(path: string): string[] {
  return path.split('/')
}

/**
 * Combine passed parts of path to full path
 *
 * @param parts path parts to combine
 */
export function combine(...parts: string[]): string {
  // remove empty items
  parts = parts.filter(item => item !== '')
  // remove slashes if element contains not only slash
  parts = parts.map(part => (part.length > 1 ? replaceAll(part, '/', '') : part))

  // add slash to the start of parts if it is not the first element
  if (parts[0] !== '/') {
    parts.unshift('/')
  }

  return getPathFromParts(parts)
}

/**
 * Splits path to parts
 *
 * @param path absolute path
 */
export function getPathParts(path: string): string[] {
  if (path.length === 0) {
    throw new Error('Path is empty')
  }

  if (!path.startsWith('/')) {
    throw new Error('Incorrect path')
  }

  if (path === '/') {
    return ['/']
  }

  return ['/', ...splitPath(path).slice(1)]
}

/**
 * Join parts to path with removing a certain number of parts from the end
 *
 * @param parts parts of path
 * @param minusParts hom many parts should be removed
 */
export function getPathFromParts(parts: string[], minusParts = 0): string {
  if (parts.length === 0) {
    throw new Error('Parts list is empty')
  }

  if (parts[0] !== '/') {
    throw new Error('Path parts must start with "/"')
  }

  if (parts.length <= minusParts) {
    throw new Error('Incorrect parts count')
  }

  return '/' + parts.slice(1, parts.length - minusParts).join('/')
}

/**
 * Asserts that parts length is correct
 */
export function assertPartsLength(value: unknown): asserts value is string[] {
  const parts = value as string[]

  if (parts.length < 2) {
    throw new Error('Can not create directory for root')
  }
}

/**
 * Asserts that directory name is correct
 */
export function assertDirectoryName(value: unknown): asserts value is string {
  assertString(value)

  if (value.length === 0) {
    throw new Error('Name is empty')
  }

  if (value.includes('/')) {
    throw new Error('Name contains "/" symbol')
  }

  if (value.length > MAX_DIRECTORY_NAME_LENGTH) {
    throw new Error('Directory name is too long')
  }
}

/**
 * Asserts that raw directory metadata is correct
 */
export function assertRawDirectoryMetadata(value: unknown): asserts value is RawDirectoryMetadata {
  if (!isRawDirectoryMetadata(value)) {
    throw new Error('Invalid raw directory metadata')
  }
}

/**
 * Asserts that raw file metadata is correct
 */
export function assertRawFileMetadata(value: unknown): asserts value is RawFileMetadata {
  if (!isRawFileMetadata(value)) {
    throw new Error('Invalid raw file metadata')
  }
}

/**
 * Raw directory metadata guard
 */
export function isRawDirectoryMetadata(value: unknown): value is RawDirectoryMetadata {
  const data = value as RawDirectoryMetadata

  return (
    typeof data.meta === 'object' &&
    isString(data.meta.name) &&
    isString(data.meta.path) &&
    isNumber(data.meta.accessTime) &&
    isNumber(data.meta.modificationTime) &&
    isNumber(data.meta.creationTime) &&
    isNumber(data.meta.version) &&
    (data.fileOrDirNames === null || Array.isArray(data.fileOrDirNames))
  )
}

/**
 * Raw file metadata guard
 */
export function isRawFileMetadata(value: unknown): value is RawFileMetadata {
  const {
    version,
    filePath,
    fileName,
    fileSize,
    blockSize,
    contentType,
    compression,
    creationTime,
    accessTime,
    modificationTime,
    fileInodeReference,
  } = value as RawFileMetadata

  return (
    isNumber(version) &&
    isString(filePath) &&
    isString(fileName) &&
    isNumber(fileSize) &&
    isNumber(blockSize) &&
    isString(contentType) &&
    isString(compression) &&
    isNumber(creationTime) &&
    isNumber(accessTime) &&
    isNumber(modificationTime) &&
    isString(fileInodeReference)
  )
}

/**
 * Gets a list of paths by a path
 */
export async function getNodePaths(path: string, recursive = false): Promise<string[]> {
  if (!fs.existsSync(path)) {
    throw new Error(`Directory does not exist: "${path}"`)
  }

  const filePaths: string[] = []
  const entries = await fs.promises.readdir(path, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = nodePath.join(path, entry.name)

    if (entry.isDirectory() && recursive) {
      filePaths.push(...(await getNodePaths(entryPath, true)))
    } else if (entry.isFile()) {
      filePaths.push(entryPath)
    }
  }

  return filePaths
}

/**
 * Gets a list of directories that should be created before files uploading
 */
export function getDirectoriesToCreate(paths: string[]): string[] {
  const directories = new Set()

  paths.forEach(path => {
    const pathDirectories = splitPath(path).slice(0, -1)
    let currentDirectory = ''
    pathDirectories.forEach(directory => {
      currentDirectory += '/' + directory
      directories.add(currentDirectory)
    })
  })

  return [...directories] as string[]
}

/**
 * Converts browser's `FileList` to `BrowserFileInfo` array
 */
export function browserFileListToFileInfoList(files: FileList): BrowserFileInfo[] {
  if (files.length === 0) {
    return []
  }

  const testFilePath = files[0]?.webkitRelativePath
  assertString(testFilePath, '"webkitRelativePath" property should be a string')
  const parts = splitPath(testFilePath)

  // `webkitRelativePath` always contains base file path
  if (parts.length < 2) {
    throw new Error(`"webkitRelativePath" does not contain base path part: "${testFilePath}"`)
  }

  return Array.from(files).map(file => {
    const relativePath = file.webkitRelativePath.substring(parts[0].length + 1)

    return {
      relativePath,
      relativePathWithBase: file.webkitRelativePath,
      browserFile: file,
    }
  })
}

/**
 * Gets files list with base path like in a browser's `File` object
 */
export async function getNodeFileInfoList(path: string, recursive: boolean): Promise<NodeFileInfo[]> {
  const paths = await getNodePaths(path, recursive)
  const pathLength = path.length + 1
  const basePath = nodePath.basename(path)

  return paths.map(fullPath => {
    const relativePath = fullPath.substring(pathLength)
    const relativePathWithBase = nodePath.join(basePath, relativePath)

    return {
      fullPath,
      relativePath,
      relativePathWithBase,
    }
  })
}

/**
 * Assert that `FileList` instance from browser contains `webkitRelativePath`
 */
export function assertBrowserFilesWithPath(value: unknown): asserts value is FileList {
  if (isNode()) {
    throw new Error('`FileList` info asserting is available only in browser')
  }

  if (!(value instanceof FileList)) {
    throw new Error('Browser files is not `FileList`')
  }

  const data = Array.from(value)
  for (const item of data) {
    if (!(item instanceof File)) {
      throw new Error('Item of browser files is not a `File` instance')
    }

    if (!('webkitRelativePath' in item)) {
      throw new Error(`${(item as File).name} does not contain "webkitRelativePath"`)
    }
  }
}

/**
 * Filters FileInfo items where filename starts with dot
 */
export function filterDotFiles<T extends FileInfo>(files: T[]): T[] {
  return files.filter(item => {
    const basename = getBaseName(item.relativePath)

    return !basename || !basename.startsWith('.')
  })
}

/**
 * Filters extra files found recursively which browser adds by default
 */
export function filterBrowserRecursiveFiles(files: BrowserFileInfo[]): BrowserFileInfo[] {
  return files.filter(item => !item.relativePath.includes('/'))
}

/**
 * Gets files content in Node.js environment
 */
export function getNodeFileContent(fullPath: string): Uint8Array {
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File does not exist: "${fullPath}"`)
  }

  return fs.readFileSync(fullPath)
}

/**
 * Gets target absolute upload path
 */
export function getUploadPath(fileInfo: FileInfo, isIncludeDirectoryName: boolean): string {
  return `/${isIncludeDirectoryName ? fileInfo.relativePathWithBase : fileInfo.relativePath}`
}

/**
 * Calculates directory mode
 */
export function getDirectoryMode(mode: number): number {
  return DIRECTORY_MODE | mode
}

/**
 * Depricated, used for migration only
 * Get files and directories under path with recursion or not
 *
 * @param bee Bee instance
 * @param path path to start searching from
 * @param address Ethereum address of the pod which owns the path
 * @param podPassword bytes for data encryption from pod metadata
 * @param isRecursive search with recursion or not
 * @param downloadOptions options for downloading
 */
export async function readDirectoryV1(
  bee: Bee,
  path: string,
  address: EthAddress,
  podPassword: PodPasswordBytes,
  isRecursive?: boolean,
  downloadOptions?: BeeRequestOptions,
): Promise<DirectoryItem> {
  const parentRawDirectoryMetadata = (await getRawMetadata(bee, path, address, podPassword, downloadOptions)).metadata
  assertRawDirectoryMetadata(parentRawDirectoryMetadata)
  const resultDirectoryItem = rawDirectoryMetadataToDirectoryItem(parentRawDirectoryMetadata)

  if (!parentRawDirectoryMetadata.fileOrDirNames) {
    return resultDirectoryItem
  }

  for (let item of parentRawDirectoryMetadata.fileOrDirNames) {
    const isFile = item.startsWith(FILE_TOKEN)
    const isDirectory = item.startsWith(DIRECTORY_TOKEN)

    if (isFile) {
      item = combine(...splitPath(path), item.substring(FILE_TOKEN.length))
      const data = (await getRawMetadata(bee, item, address, podPassword, downloadOptions)).metadata
      assertRawFileMetadata(data)
      resultDirectoryItem.files.push(rawFileMetadataToFileItem(data))
    } else if (isDirectory) {
      item = combine(...splitPath(path), item.substring(DIRECTORY_TOKEN.length))
      const data = (await getRawMetadata(bee, item, address, podPassword, downloadOptions)).metadata
      assertRawDirectoryMetadata(data)
      const currentMetadata = rawDirectoryMetadataToDirectoryItem(data)

      if (isRecursive) {
        const content = await readDirectoryV1(bee, item, address, podPassword, isRecursive, downloadOptions)
        currentMetadata.files = content.files
        currentMetadata.directories = content.directories
      }

      resultDirectoryItem.directories.push(currentMetadata)
    }
  }

  return resultDirectoryItem
}

export async function migrateDirectoryV1ToV2(
  accountData: AccountData,
  path: string,
  address: EthAddress,
  podPassword: PodPasswordBytes,
  podWallet: HDNode,
  isRecursive?: boolean,
  downloadOptions?: BeeRequestOptions,
): Promise<DirectoryItem> {
  const directoryItem = await readDirectoryV1(
    accountData.connection.bee,
    path,
    address,
    podPassword,
    isRecursive,
    downloadOptions,
  )

  if (path === '/') {
    await createRootDirectory(accountData.connection, podPassword, podWallet)
  } else {
    await createDirectory(accountData, path, podWallet, podPassword, downloadOptions, false)
  }

  const socOwnerAddress = prepareEthAddress(podWallet.address)

  for (const directory of directoryItem.directories) {
    await addEntryToDirectory(
      accountData,
      socOwnerAddress,
      podWallet.privateKey,
      podPassword,
      path,
      directory.name,
      false,
    )
  }

  for (const file of directoryItem.files) {
    await addEntryToDirectory(accountData, socOwnerAddress, podWallet.privateKey, podPassword, path, file.name, true)
  }

  return directoryItem
}
