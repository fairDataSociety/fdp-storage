import { Metadata, Pod } from './types'
import { Data } from '@ethersphere/bee-js'
import { stringToBytes } from '../utils/bytes'

export const metaVersion = 1
export const MAX_PODS_COUNT = 65536

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
 * @param list list of pods
 */
export function assertPodsLength(list: Pod[]): void {
  if (list.length >= MAX_PODS_COUNT) {
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
