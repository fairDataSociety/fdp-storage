import { CacheInfo } from '../../cache/types'
import { HDNodeWallet } from 'ethers'
import { getCacheKey, processCacheData } from '../../cache/utils'
import { bytesToHex } from '../hex'
import { getWalletByIndex as getWallet } from '../wallet'

/**
 * Asserts that value is HDNodeWallet
 * @param value value to check
 */
export function assertHDNodeWallet(value: unknown): asserts value is HDNodeWallet {
  if (!(value instanceof HDNodeWallet)) {
    throw new Error('Expected an HDNodeWallet')
  }
}

/**
 * Get Hierarchical Deterministic Wallet from seed by index with caching
 *
 * @param seed data for wallet creation
 * @param index wallet index
 * @param cacheInfo cache info
 */
export async function getWalletByIndex(seed: Uint8Array, index: number, cacheInfo?: CacheInfo): Promise<HDNodeWallet> {
  return processCacheData({
    key: getCacheKey(bytesToHex(seed), index.toString()),
    onGetData: async () => ({ data: getWallet(seed, index).extendedKey }),
    onRecoverData: async data => {
      if (!data.data) {
        throw new Error(`Incorrect recovered cache data for the wallet by index ${index}`)
      }

      const wallet = HDNodeWallet.fromExtendedKey(data.data)
      assertHDNodeWallet(wallet)

      return wallet
    },
    cacheInfo,
  })
}
