import { Metadata, Pod } from './types'
import { Bee, Data, RequestOptions } from '@ethersphere/bee-js'
import { stringToBytes } from '../utils/bytes'
import { LookupAnswer } from '../feed/types'
import { getFeedData } from '../feed/api'
import { POD_TOPIC } from './personal-storage'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'

export const metaVersion = 1
export const MAX_PODS_COUNT = 65536

/**
 * Information about pods list
 */
export interface PodsInfo {
  pods: Pod[]
  lookupAnswer: LookupAnswer | undefined
}

/**
 * Extracts pod information from raw data
 *
 * @param data raw data with pod information
 */
export function extractPods(data: Data): Pod[] {
  return data
    .text()
    .split('\n')
    .filter(item => Boolean(item.trim()))
    .map(item => {
      const parts = item.split(',')

      if (parts.length !== 2) {
        throw new Error('Pod information: incorrect length')
      }

      return { name: parts[0], index: Number(parts[1]) } as Pod
    })
}

/**
 * Creates metadata in binary format for pod directory
 */
export function createMetadata(
  version: number,
  path: string,
  name: string,
  creationTime: number,
  modificationTime: number,
  accessTime: number,
): Uint8Array {
  const data = JSON.stringify({
    Version: version,
    Path: path,
    Name: name,
    CreationTime: creationTime,
    ModificationTime: modificationTime,
    AccessTime: accessTime,
  } as Metadata)

  return stringToBytes(data)
}

/**
 * Verifies if pods list length is correct
 *
 * @param length pods list length
 */
export function assertPodsLength(length: number): void {
  if (length > MAX_PODS_COUNT) {
    throw new Error('The maximum number of pods for the account has been reached')
  }
}

/**
 * Verifies that name not exists in pods list
 *
 * @param list list of pods
 * @param name name of pod
 */
export function assertPodNameAvailable(list: Pod[], name: string): void {
  list.forEach(pod => {
    if (pod.name === name) {
      throw new Error(`Pod with name "${name}" already exists`)
    }
  })
}

/**
 * Converts pods list to bytes array
 *
 * @param list list of pods
 */
export function podListToBytes(list: Pod[]): Uint8Array {
  if (list.length === 0) {
    return Buffer.from([0])
  }

  return stringToBytes(list.map(pod => `${pod.name},${pod.index}`).join('\n') + '\n')
}

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
