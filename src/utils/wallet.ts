import { utils } from 'ethers'
import { PrivateKeyBytes, Utils } from '@fairdatasociety/bee-js'
import { removeZeroFromHex } from '../account/utils'

/**
 * Get Hierarchal Deterministic Wallet from seed by index
 *
 * @param seed data for wallet creation
 * @param index wallet index
 */
export function getWalletByIndex(seed: Uint8Array, index: number): utils.HDNode {
  const node = utils.HDNode.fromSeed(seed)

  return node.derivePath(`m/44'/60'/0'/0/${index}`)
}

/**
 * Converts string representation of private key to bytes representation
 *
 * @param privateKey string representation of private key
 */
export function privateKeyToBytes(privateKey: string): PrivateKeyBytes {
  return Utils.hexToBytes(removeZeroFromHex(privateKey))
}

/**
 * Converts mnemonic to seed bytes
 *
 * @param mnemonic mnemonic phrase
 */
export function mnemonicToSeed(mnemonic: string): Uint8Array {
  return Utils.hexToBytes(removeZeroFromHex(utils.mnemonicToSeed(mnemonic)))
}

/**
 * Converts string to Ethereum address in form of bytes
 *
 * @param address Ethereum address for preparation
 */
export function prepareEthAddress(address: string | Uint8Array): Utils.EthAddress {
  return Utils.makeEthAddress(address)
}

/**
 * Converts private key from to bytes
 *
 * @param privateKey string representation of private key
 */
export function preparePrivateKey(privateKey: string): PrivateKeyBytes {
  return Utils.hexToBytes(removeZeroFromHex(privateKey))
}
