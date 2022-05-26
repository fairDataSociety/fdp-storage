import { Bee, RequestOptions } from '@ethersphere/bee-js'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'
import { LookupAnswer } from '../feed/types'
import { Pod } from './types'
import { getFeedData } from '../feed/api'
import { POD_TOPIC } from './personal-storage'
import { ExtendedPodInfo, extractPods, PodsInfo } from './utils'
import { Wallet } from 'ethers'
import { prepareEthAddress } from '../utils/address'
import { getWalletByIndex } from '../utils/wallet'

/**
 * Gets pods list with lookup answer
 *
 * @param bee Bee instance
 * @param address Ethereum address
 * @param options request options
 */
export async function getPodsList(bee: Bee, address: EthAddress, options?: RequestOptions): Promise<PodsInfo> {
  let lookupAnswer: LookupAnswer | undefined
  let pods: Pod[]

  try {
    lookupAnswer = await getFeedData(bee, POD_TOPIC, address, options)
    pods = extractPods(lookupAnswer.data.chunkContent())
  } catch (e) {
    pods = []
  }

  return {
    pods,
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
  wallet: Wallet,
  downloadOptions?: RequestOptions,
): Promise<ExtendedPodInfo> {
  const podsInfo = await getPodsList(bee, prepareEthAddress(wallet.address), downloadOptions)
  const pod = podsInfo.pods.find(item => item.name === podName)

  if (!pod) {
    throw new Error(`Pod "${podName}" does not exist`)
  }

  const podWallet = getWalletByIndex(wallet.privateKey, pod.index)

  return {
    pod,
    podAddress: prepareEthAddress(podWallet.address),
    podWallet,
    lookupAnswer: podsInfo.lookupAnswer,
  }
}
