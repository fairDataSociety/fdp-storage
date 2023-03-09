import { Bee } from '@ethersphere/bee-js'
import { getFeedData } from '../feed/api'
import { POD_TOPIC } from './personal-storage'
import { WritablePodInfo, extractPods, PodsInfo } from './utils'
import { prepareEthAddress, privateKeyToBytes } from '../utils/wallet'
import { utils } from 'ethers'
import { DownloadOptions } from '../content-items/types'
import { getWalletByIndex } from '../utils/cache/wallet'
import { getPodsList as getPodsListCached } from './cache/api'

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
  let lookupAnswer
  try {
    lookupAnswer = await getFeedData(
      bee,
      POD_TOPIC,
      prepareEthAddress(userWallet.address),
      downloadOptions?.requestOptions,
    )
    // eslint-disable-next-line no-empty
  } catch (e) {}

  if (!lookupAnswer) {
    throw new Error('Pods data can not be found')
  }

  const podsList = extractPods(lookupAnswer.data.chunkContent(), privateKeyToBytes(userWallet.privateKey))

  return {
    podsList,
    epoch: lookupAnswer.epoch,
  }
}
