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
