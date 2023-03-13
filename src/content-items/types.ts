import { Epoch } from '../feed/lookup/epoch'
import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types'
import { RequestOptions } from '@ethersphere/bee-js'
import { CacheInfo } from '../cache/types'
import { LookupAnswer } from '../feed/types'

/**
 * Information with the deletion status of the path
 */
export interface PathInformation {
  // if the data under the path is the deletion magic word
  isDeleted: boolean
  // data `LookupAnswer`
  lookupAnswer: LookupAnswer
}

/**
 * Download data options
 */
export interface DownloadOptions {
  requestOptions?: RequestOptions
  cacheInfo?: CacheInfo
}

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
