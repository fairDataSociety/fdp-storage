import { CacheInfo } from '../../cache/types'
import { utils } from 'ethers'
import { getCacheKey, processCacheData } from '../../cache/utils'
import { bytesToHex } from '../hex'
import { getWalletByIndex as getWallet } from '../wallet'

/**
 * Get Hierarchical Deterministic Wallet from seed by index with caching
 *
 * @param seed data for wallet creation
 * @param index wallet index
 * @param cacheInfo cache info
 */
export async function getWalletByIndex(seed: Uint8Array, index: number, cacheInfo?: CacheInfo): Promise<utils.HDNode> {
  return processCacheData({
    key: getCacheKey(bytesToHex(seed), index.toString()),
    onGetData: async () => ({ data: getWallet(seed, index).extendedKey }),
    onRecoverData: async data => {
      if (!data.data) {
        throw new Error(`Incorrect recovered cache data for the wallet by index ${index}`)
      }

      return utils.HDNode.fromExtendedKey(data.data)
    },
    cacheInfo,
  })
}
