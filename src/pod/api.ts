import { Bee, RequestOptions } from '@ethersphere/bee-js'
import { LookupAnswer } from '../feed/types'
import { getFeedData } from '../feed/api'
import { POD_TOPIC } from './personal-storage'
import { ExtendedPodInfo, extractPods, PodsInfo } from './utils'
import { getWalletByIndex, prepareEthAddress, privateKeyToBytes } from '../utils/wallet'
import { utils } from 'ethers'
import { PodsListPrepared } from './types'

/**
 * Gets pods list with lookup answer
 *
 * @param bee Bee instance
 * @param userWallet root wallet for downloading and decrypting data
 * @param options request options
 */
export async function getPodsList(bee: Bee, userWallet: utils.HDNode, options?: RequestOptions): Promise<PodsInfo> {
  let lookupAnswer: LookupAnswer | undefined
  let podsList: PodsListPrepared = { pods: [], sharedPods: [] }

  try {
    lookupAnswer = await getFeedData(bee, POD_TOPIC, prepareEthAddress(userWallet.address), options)
    podsList = extractPods(lookupAnswer.data.chunkContent(), privateKeyToBytes(userWallet.privateKey))
    // eslint-disable-next-line no-empty
  } catch (e) {}

  return {
    podsList,
    lookupAnswer,
  }
}

/**
 * Gets pods list with lookup answer and extended info about pod
 *
 * @param bee Bee instance
 * @param podName pod to find
 * @param userWallet root wallet for downloading and decrypting data
 * @param seed seed of wallet owns the FDP account
 * @param downloadOptions request options
 */
export async function getExtendedPodsList(
  bee: Bee,
  podName: string,
  userWallet: utils.HDNode,
  seed: Uint8Array,
  downloadOptions?: RequestOptions,
): Promise<ExtendedPodInfo> {
  const podsInfo = await getPodsList(bee, userWallet, downloadOptions)
  const pod = podsInfo.podsList.pods.find(item => item.name === podName)

  if (!pod) {
    throw new Error(`Pod "${podName}" does not exist`)
  }

  const podWallet = getWalletByIndex(seed, pod.index)

  return {
    pod,
    podAddress: prepareEthAddress(podWallet.address),
    podWallet,
    lookupAnswer: podsInfo.lookupAnswer,
  }
}
