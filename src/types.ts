import { RequestOptions } from '@ethersphere/bee-js'
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
  /**
   * Minimum account balance in ETH on registration
   */
  minimumAccountBalanceEth?: string
}
