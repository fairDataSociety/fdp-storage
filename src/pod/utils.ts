import { DirectoryMetadata, Pod } from './types'
import { Data } from '@ethersphere/bee-js'
import { stringToBytes } from '../utils/bytes'
import { LookupAnswer } from '../feed/types'
import { Wallet } from 'ethers'

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
 * Extended information about pods list and specific pod
 */
export interface ExtendedPodsInfo extends PodsInfo {
  foundPod: Pod
  foundPodWallet: Wallet
  pods: Pod[]
  lookupAnswer: LookupAnswer | undefined
}

/*
 * Information about path with filename and path
 */
export interface PathInfo {
  filename: string
  path: string
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
  fileOrDirNames?: string[],
): Uint8Array {
  const data = JSON.stringify({
    Meta: {
      Version: version,
      Path: path,
      Name: name,
      CreationTime: creationTime,
      ModificationTime: modificationTime,
      AccessTime: accessTime,
    },
    FileOrDirNames: fileOrDirNames ?? null,
  } as DirectoryMetadata)

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
    return new Uint8Array([0])
  }

  return stringToBytes(list.map(pod => `${pod.name},${pod.index}`).join('\n') + '\n')
}
