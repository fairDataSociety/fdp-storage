import { BeeRequestOptions } from '@ethersphere/bee-js'
import { EnsEnvironment } from '@fairdatasociety/fdp-contracts-js'
import { CacheOptions } from './cache/types'
import { FeedType } from './feed/types'

export { DirectoryItem, FileItem } from './content-items/types'

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
  /**
   * Feed type
   */
  feedType?: FeedType
}
