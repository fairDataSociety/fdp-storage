import { RawDirectoryMetadata, Pod, PodShareInfo, SharedPod } from './types'
import { Bee, Data, ENCRYPTED_REFERENCE_HEX_LENGTH, Reference, Utils } from '@ethersphere/bee-js'
import { stringToBytes } from '../utils/bytes'
import { LookupAnswer } from '../feed/types'
import { utils } from 'ethers'
import { getRawDirectoryMetadataBytes } from '../directory/adapter'
import { assertNumber, assertString, isNumber, isObject, isString } from '../utils/type'
import { assertHexEthAddress, bytesToHex, EncryptedReference } from '../utils/hex'
import { List } from './list'
import { prepareEthAddress } from '../utils/address'

export const META_VERSION = 1
export const MAX_PODS_COUNT = 65536
export const MAX_POD_NAME_LENGTH = 25

/**
 * Information about pods list
 */
export interface PodsInfo {
  podsList: List
  lookupAnswer: LookupAnswer | undefined
}

/**
 * Extended information about specific pod
 */
export interface ExtendedPodInfo {
  pod: Pod
  podWallet: utils.HDNode
  podAddress: Utils.EthAddress
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
export function extractPods(data: Data): List {
  const pods: Pod[] = []
  const sharedPods: SharedPod[] = []

  data
    .text()
    .split('\n')
    .filter(item => Boolean(item.trim()))
    .map(item => {
      const parts = item.split(',')

      if (parts.length !== 2) {
        throw new Error('Pod information: incorrect length')
      }

      const isShared = Number.isNaN(Number(parts[1]))
      const name = parts[0]
      assertPodName(name)

      if (isShared) {
        const address = parts[1]
        assertHexEthAddress(address)
        sharedPods.push({
          name,
          address: prepareEthAddress(address),
        })
      } else {
        const index = Number(parts[1])
        assertNumber(index)
        pods.push({
          name,
          index,
        })
      }
    })

  return new List(pods, sharedPods)
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
  assertNumber(value)

  if (value > MAX_PODS_COUNT) {
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
  assertPods(value)

  value.forEach(pod => {
    if (pod.name === name) {
      throw new Error(`Pod with name "${name}" already exists`)
    }
  })
}

/**
 * Asserts that pod name is correct
 */
export function assertPodName(value: unknown): asserts value is string {
  assertString(value)

  if (value.length === 0) {
    throw new Error('Pod name is too short')
  }

  // because FairOS pod info stored as "podname,index" and does not handle comma shielding
  if (value.includes(',')) {
    throw new Error('Pod name cannot contain commas')
  }

  if (value.length > MAX_POD_NAME_LENGTH) {
    throw new Error('Pod name is too long')
  }
}

/**
 * Converts pods list to bytes array
 *
 * @param list list of pods
 */
export function podListToBytes(list: Pod[]): Uint8Array {
  assertPods(list)

  if (list.length === 0) {
    return new Uint8Array([0])
  }

  return stringToBytes(list.map(pod => `${pod.name},${pod.index}`).join('\n') + '\n')
}

/**
 * Pod guard
 */
export function isPod(value: unknown): value is Pod {
  const { name, index } = value as Pod

  return typeof value === 'object' && value !== null && isString(name) && isNumber(index)
}

/**
 * Asserts that pod is correct
 */
export function assertPod(value: unknown): asserts value is Pod {
  if (!isPod(value)) {
    throw new Error('Invalid pod')
  }
}

/**
 * Asserts that pods are correct
 */
export function assertPods(value: unknown): asserts value is Pod[] {
  for (const pod of value as Pod[]) {
    assertPod(pod)
  }
}

/**
 * Creates information for pod sharing
 */
export function createPodShareInfo(
  podName: string,
  podAddress: Utils.EthAddress,
  userAddress: Utils.EthAddress,
): PodShareInfo {
  return {
    pod_name: podName,
    pod_address: bytesToHex(podAddress),
    user_address: bytesToHex(userAddress),
  }
}

/**
 * Checks that value is pod share info
 */
export function isPodShareInfo(value: unknown): value is PodShareInfo {
  const data = value as PodShareInfo

  return (
    isObject(value) &&
    isString(data.pod_name) &&
    Utils.isHexEthAddress(data.pod_address) &&
    Utils.isHexEthAddress(data.user_address)
  )
}

/**
 * Verifies if pod share info is correct
 */
export function assertPodShareInfo(value: unknown): asserts value is PodShareInfo {
  if (!isPodShareInfo(value)) {
    throw new Error('Incorrect pod share info')
  }
}

export async function getSharedInfo(bee: Bee, reference: string): Promise<PodShareInfo> {
  const data = (await bee.downloadData(reference)).json()
  assertPodShareInfo(data)

  return data
}

/**
 * Verifies if encrypted reference is correct
 */
export function assertEncryptedReference(value: unknown): asserts value is EncryptedReference {
  const data = value as Reference

  if (!(data.length === ENCRYPTED_REFERENCE_HEX_LENGTH && Utils.isHexString(data))) {
    throw new Error('Incorrect encrypted reference')
  }
}
