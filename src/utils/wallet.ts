import { utils } from 'ethers'

/**
 * Get Hierarchal Deterministic Wallet from private key by index
 *
 * @param privateKey private key of Ethereum wallet
 * @param index wallet index
 */
export function getWalletByIndex(privateKey: string, index: number): utils.HDNode {
  const node = utils.HDNode.fromSeed(privateKey)

  return node.derivePath(`m/44'/60'/0'/0/${index}`)
}
