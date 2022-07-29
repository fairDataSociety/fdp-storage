import { Bee, RequestOptions } from '@ethersphere/bee-js'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'
import { LookupAnswer } from '../feed/types'
import { getFeedData } from '../feed/api'
import { POD_TOPIC } from './personal-storage'
import { ExtendedPodInfo, extractPods, PodsInfo } from './utils'
import { prepareEthAddress } from '../utils/address'
import { getWalletByIndex } from '../utils/wallet'
import { List } from './list'
import { utils } from 'ethers'

/**
 * Gets pods list with lookup answer
 *
 * @param bee Bee instance
 * @param address Ethereum address
 * @param options request options
 */
export async function getPodsList(bee: Bee, address: EthAddress, options?: RequestOptions): Promise<PodsInfo> {
  let lookupAnswer: LookupAnswer | undefined
  let podsList = new List([], [])

  try {
    lookupAnswer = await getFeedData(bee, POD_TOPIC, address, options)
    podsList = extractPods(lookupAnswer.data.chunkContent())
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
 * @param wallet Ethereum wallet owns the FDP account
 * @param downloadOptions request options
 */
export async function getExtendedPodsList(
  bee: Bee,
  podName: string,
  address: EthAddress,
  seed: Uint8Array,
  downloadOptions?: RequestOptions,
): Promise<ExtendedPodInfo> {
  const podsInfo = await getPodsList(bee, prepareEthAddress(wallet.address), downloadOptions)
  const pod = podsInfo.podsList.getPods().find(item => item.name === podName)

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
