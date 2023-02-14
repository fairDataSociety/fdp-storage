import { RequestOptions } from '@ethersphere/bee-js'
import { Environment } from '@fairdatasociety/fdp-contracts-js'

export { DirectoryItem, FileItem } from './content-items/types'

/**
 * Fair Data Protocol options
 */
export interface Options {
  /**
   * Downloads options for requests
   */
  downloadOptions?: RequestOptions
  /**
   * FDP-contracts options
   */
  ensOptions?: Environment
  /**
   * ENS domain for usernames
   */
  ensDomain?: string
}
