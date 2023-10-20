import { BeeRequestOptions } from '@ethersphere/bee-js'
import { EnsEnvironment } from '@fairdatasociety/fdp-contracts-js'
import { CacheOptions } from './cache/types'

export { DirectoryItem, FileItem } from './content-items/types'
export {
  UploadProgressType,
  DownloadProgressType,
  ProgressBlockData,
  UploadProgressInfo,
  DownloadProgressInfo,
  DataUploadOptions,
  DataDownloadOptions,
  Block,
  ExternalDataBlock,
  FileMetadataWithBlocks,
} from './file/types'
export {
  calcUploadBlockPercentage,
  assertExternalDataBlock,
  isExternalDataBlock,
  assertExternalDataBlocks,
  isExternalDataBlocks,
  externalDataBlocksToBlocks,
  getDataBlock,
} from './file/utils'
export { MAX_POD_NAME_LENGTH, MAX_PODS_COUNT } from './pod/utils'
export { MAX_DIRECTORY_NAME_LENGTH } from './directory/handler'
export * as PodTypes from './pod/types'
export * as Encryption from './utils/encryption'
export * as Bytes from './utils/bytes'

/**
 * Fair Data Protocol options
 */
export interface Options {
  /**
   * Request options
   */
  requestOptions?: BeeRequestOptions
  /**
   * FDP-contracts options
   */
  ensOptions?: EnsEnvironment
  /**
   * ENS domain for usernames
   */
  ensDomain?: string
  /**
   * Cache options
   */
  cacheOptions?: CacheOptions
}
