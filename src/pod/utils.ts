import { RawDirectoryMetadata, Pod } from './types'
import { Data } from '@ethersphere/bee-js'
import { stringToBytes } from '../utils/bytes'
import { LookupAnswer } from '../feed/types'
import { Wallet } from 'ethers'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'
import { getRawDirectoryMetadataBytes } from '../file/adapter'

export const META_VERSION = 1
export const MAX_PODS_COUNT = 65536
export const MAX_POD_NAME_LENGTH = 25

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
  pod: Pod
  podWallet: Wallet
  podAddress: EthAddress
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
 * Creates metadata in bytes format for pod directory
 */
export function createRawDirectoryMetadata(
  version: number,
  path: string,
  name: string,
  creationTime: number,
  modificationTime: number,
  accessTime: number,
  fileOrDirNames?: string[],
): Uint8Array {
  const data: RawDirectoryMetadata = {
    Meta: {
      Version: version,
      Path: path,
      Name: name,
      CreationTime: creationTime,
      ModificationTime: modificationTime,
      AccessTime: accessTime,
    },
    FileOrDirNames: fileOrDirNames ?? null,
  }

  return getRawDirectoryMetadataBytes(data)
}

/**
 * Verifies if pods list length is correct
 *
 * @param value pods list length
 */
export function assertPodsLength(value: unknown): asserts value is number {
  const length = value as number

  if (length > MAX_PODS_COUNT) {
    throw new Error('The maximum number of pods for the account has been reached')
  }
}

/**
 * Verifies that name not exists in pods list
 *
 * @param value list of pods
 * @param name name of pod
 */
export function assertPodNameAvailable(value: unknown, name: string): asserts value is Pod[] {
  const list = value as Pod[]
  list.forEach(pod => {
    if (pod.name === name) {
      throw new Error(`Pod with name "${name}" already exists`)
    }
  })
}

/**
 * Asserts that pod name is correct
 */
export function assertPodName(value: unknown): asserts value is string {
  const name = value as string

  if (name.length === 0) {
    throw new Error('Pod name is too short')
  }

  // because FairOS pod info stored as "podname,index" and does not handle comma shielding
  if (name.includes(',')) {
    throw new Error('Pod name cannot contain commas')
  }

  if (name.length > MAX_POD_NAME_LENGTH) {
    throw new Error('Pod name is too long')
  }
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
