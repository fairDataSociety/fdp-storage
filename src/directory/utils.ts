import { MAX_DIRECTORY_NAME_LENGTH } from './handler'
import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types'
import { assertString, isNumber, isString } from '../utils/type'
import { replaceAll } from '../utils/string'

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

  return ['/', ...path.split('/').slice(1)]
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
    typeof data.Meta === 'object' &&
    isString(data.Meta.Name) &&
    isString(data.Meta.Path) &&
    isNumber(data.Meta.AccessTime) &&
    isNumber(data.Meta.ModificationTime) &&
    isNumber(data.Meta.CreationTime) &&
    isNumber(data.Meta.Version) &&
    (data.FileOrDirNames === null || Array.isArray(data.FileOrDirNames))
  )
}

/**
 * Raw file metadata guard
 */
export function isRawFileMetadata(value: unknown): value is RawFileMetadata {
  const {
    version,
    user_address,
    pod_name,
    file_path,
    file_name,
    file_size,
    block_size,
    content_type,
    compression,
    creation_time,
    access_time,
    modification_time,
    file_inode_reference,
  } = value as RawFileMetadata

  return (
    isNumber(version) &&
    Array.isArray(user_address) &&
    isString(pod_name) &&
    isString(file_path) &&
    isString(file_name) &&
    isNumber(file_size) &&
    isNumber(block_size) &&
    isString(content_type) &&
    isString(compression) &&
    isNumber(creation_time) &&
    isNumber(access_time) &&
    isNumber(modification_time) &&
    isString(file_inode_reference)
  )
}
