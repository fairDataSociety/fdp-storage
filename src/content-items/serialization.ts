import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types'

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
