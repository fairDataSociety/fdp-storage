import { DirectoryItem } from './directory-item'
import { FileItem } from './file-item'
import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types'
import { isDirectoryItem, isFileItem } from './utils'

/**
 * Serializable `FileItem`
 */
export interface FileItemSerializable {
  name: string
  raw?: RawFileMetadata | RawDirectoryMetadata
  size?: number
  reference?: string
}

/**
 * Serializable `DirectoryItem`
 */
export interface DirectoryItemSerializable {
  name: string
  directories: DirectoryItemSerializable[]
  files: FileItemSerializable[]
  raw?: RawFileMetadata | RawDirectoryMetadata
  size?: number
  reference?: string
}

/**
 * Converts `FileItem` to `FileItemSerializable`
 */
export function fileItemToFileItemSerializable(fileItem: FileItem): FileItemSerializable {
  const { name, raw, size, reference } = fileItem

  return {
    name,
    raw,
    size,
    reference,
  }
}

/**
 * Converts `DirectoryItem` to `DirectoryItemSerializable`
 */
export function directoryItemToDirectoryItemSerializable(directoryItem: DirectoryItem): DirectoryItemSerializable {
  return {
    name: directoryItem.name,
    directories: directoryItem.content.filter(isDirectoryItem).map(directoryItemToDirectoryItemSerializable),
    files: directoryItem.content.filter(isFileItem).map(fileItemToFileItemSerializable),
    raw: directoryItem.raw,
    size: directoryItem.size,
    reference: directoryItem.reference,
  }
}
