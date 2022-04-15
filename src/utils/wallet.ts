import { Wallet } from 'ethers'

/**
 * Get wallet from mnemonic phrase by index
 *
 * @param mnemonic Ethereum mnemonic phrase
 * @param index wallet index
 */
export function getWalletByIndex(mnemonic: string, index: number): Wallet {
  return Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${index}`)
}
