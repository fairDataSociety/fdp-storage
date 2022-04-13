import { Bee, RequestOptions } from '@ethersphere/bee-js'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'
import { LookupAnswer } from '../feed/types'
import { Pod } from './types'
import { getFeedData } from '../feed/api'
import { POD_TOPIC } from './personal-storage'
import { extractPods, PodsInfo } from './utils'

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
