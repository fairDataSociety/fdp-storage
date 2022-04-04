import { Utils } from '@ethersphere/bee-js'

/**
 * Converts string to Ethereum address in form of bytes
 *
 * @param address Ethereum address for preparation
 */
export function prepareEthAddress(address: string): Utils.EthAddress {
  return Utils.makeEthAddress(address)
}
