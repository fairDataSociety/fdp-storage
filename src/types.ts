import { RequestOptions } from '@ethersphere/bee-js'
import { EnsEnvironment } from '@fairdatasociety/fdp-contracts-js'
import { CacheOptions } from './cache/types'

export { DirectoryItem, FileItem } from './content-items/types'

/**
 * Fair Data Protocol options
 */
export interface Options {
  /**
   * Request options
   */
  requestOptions?: RequestOptions
  /**
   * FDP-contracts options
   */
  ensOptions?: Environment
  /**
   * ENS domain for usernames
   */
  ensDomain?: string
  /**
   * Cache options
   */
  cacheOptions?: CacheOptions
}
