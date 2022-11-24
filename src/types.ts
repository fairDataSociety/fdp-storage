import { RequestOptions } from '@fairdatasociety/bee-js'
import { Environment } from '@fairdatasociety/fdp-contracts'

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
