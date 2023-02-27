import { Bee } from '@ethersphere/bee-js'
import { utils } from 'ethers'
import { DownloadOptions } from '../../content-items/types'
import { jsonToPodsList, podListToJSON, PodsInfo } from '../utils'
import { CacheEpochData } from '../../cache/types'
import { getCacheKey, processCacheData } from '../../cache/utils'
import { getPodsList as getPodsNoCache } from '../api'

/**
 * Gets pods list with lookup answer
 *
 * @param bee Bee instance
 * @param userWallet root wallet for downloading and decrypting data
 * @param downloadOptions request download
 */
export async function getPodsList(
  bee: Bee,
  userWallet: utils.HDNode,
  downloadOptions?: DownloadOptions,
): Promise<PodsInfo> {
  return processCacheData({
    key: getCacheKey(userWallet.address),
    onGetData: async (): Promise<CacheEpochData> => {
      const data = await getPodsNoCache(bee, userWallet, downloadOptions)

      return {
        epoch: data.epoch,
        data: podListToJSON(data.podsList.pods, data.podsList.sharedPods),
      }
    },
    onRecoverData: async (data): Promise<PodsInfo> => {
      if (!(data.data && data.epoch)) {
        throw new Error('Incorrect recovered cache data for pods list')
      }

      return {
        podsList: jsonToPodsList(data.data),
        epoch: data.epoch,
      }
    },
    cacheInfo: downloadOptions?.cacheInfo,
  })
}
