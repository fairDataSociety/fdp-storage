import { utils } from 'ethers'

/**
 * Get Hierarchal Deterministic Wallet from private key by index
 *
 * @param seed data for wallet creation
 * @param index wallet index
 */
export function getWalletByIndex(seed: Uint8Array, index: number): utils.HDNode {
  const node = utils.HDNode.fromSeed(seed)

  return node.derivePath(`m/44'/60'/0'/0/${index}`)
}
