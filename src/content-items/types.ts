import { Epoch } from '../feed/lookup/epoch'
import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types'

/**
 * Metadata of a file or directory with epoch
 */
export interface RawMetadataWithEpoch {
  epoch: Epoch
  metadata: RawDirectoryMetadata | RawFileMetadata
}

/**
 * Description of a file item in a list of content items
 */
export interface FileItem {
  name: string
  raw?: RawFileMetadata | RawDirectoryMetadata
  size?: number
  reference?: string
}

/**
 * Description of a directory item in a list of content items
 */
export interface DirectoryItem {
  name: string
  directories: DirectoryItem[]
  files: FileItem[]
  raw?: RawFileMetadata | RawDirectoryMetadata
  size?: number
  reference?: string
}
