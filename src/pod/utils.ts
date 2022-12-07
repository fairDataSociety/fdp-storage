import {
  JsonPod,
  Pod,
  PodName,
  PodShareInfo,
  PodsMetadata,
  RawDirectoryMetadata,
  JsonSharedPod,
  SharedPod,
} from './types'
import { Bee, Data, Utils } from '@ethersphere/bee-js'
import { bytesToString, stringToBytes, wordArrayToBytes } from '../utils/bytes'
import { LookupAnswer } from '../feed/types'
import { utils } from 'ethers'
import { getRawDirectoryMetadataBytes } from '../directory/adapter'
import {
  assertArray,
  assertNumber,
  assertPodPasswordBytes,
  assertString,
  isEthAddress,
  isNumber,
  isObject,
  isPodPassword,
  isString,
} from '../utils/type'
import { bytesToHex, EncryptedReference, isHexEthAddress } from '../utils/hex'
import { List } from './list'
import { getPodsList } from './api'
import { Epoch, getFirstEpoch } from '../feed/lookup/epoch'
import { getUnixTimestamp } from '../utils/time'
import { writeFeedData } from '../feed/api'
import { getWalletByIndex, preparePrivateKey } from '../utils/wallet'
import { createRootDirectory } from '../directory/handler'
import { POD_TOPIC } from './personal-storage'
import { Connection } from '../connection/connection'
import { AccountData } from '../account/account-data'
import { decryptBytes, POD_PASSWORD_LENGTH, PodPasswordBytes } from '../utils/encryption'
import CryptoJS from 'crypto-js'

export const META_VERSION = 2
export const MAX_PODS_COUNT = 65536
export const MAX_POD_NAME_LENGTH = 64

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
 * @param podPassword bytes of pod password
 */
export function extractPods(data: Data, podPassword: PodPasswordBytes): List {
  return List.fromJSON(bytesToString(decryptBytes(bytesToHex(podPassword), data)))
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
    meta: {
      version,
      path,
      name,
      creationTime,
      modificationTime,
      accessTime,
    },
    fileOrDirNames: fileOrDirNames ?? null,
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
export function assertPodNameAvailable(name: string, value: unknown): asserts value is Pod[] {
  assertPods(value)

  value.forEach(pod => {
    if (pod.name === name) {
      throw new Error(`Pod with name "${name}" already exists`)
    }
  })
}

/**
 * Verifies that name not exists in shared pods list
 *
 * @param value list of shared pods
 * @param name name of pod
 */
export function assertSharedPodNameAvailable(name: string, value: unknown): asserts value is SharedPod[] {
  assertSharedPods(value)

  value.forEach(pod => {
    if (pod.name === name) {
      throw new Error(`Shared pod with name "${name}" already exists`)
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
 * Converts Pod to JsonPod
 */
export function podToJsonPod(pod: Pod): JsonPod {
  return { ...pod, password: bytesToHex(pod.password) }
}

/**
 * Converts SharedPod to JsonSharedPod
 */
export function sharedPodToJsonSharedPod(pod: SharedPod): JsonSharedPod {
  return { ...pod, password: bytesToHex(pod.password), address: bytesToHex(pod.address) }
}

/**
 * Converts JsonPod to Pod
 */
export function jsonPodToPod(pod: JsonPod): Pod {
  const password = Utils.hexToBytes(pod.password) as PodPasswordBytes
  assertPodPasswordBytes(password)

  return { ...pod, password }
}

/**
 * Converts JsonSharedPod to SharedPod
 */
export function jsonSharedPodToSharedPod(pod: JsonSharedPod): SharedPod {
  const password = Utils.hexToBytes(pod.password) as PodPasswordBytes
  const address = Utils.hexToBytes(pod.address) as Utils.EthAddress
  assertPodPasswordBytes(password)

  return { ...pod, password, address }
}

/**
 * Converts pods list to bytes array
 */
export function podListToBytes(pods: Pod[], sharedPods: SharedPod[]): Uint8Array {
  assertPods(pods)
  assertSharedPods(sharedPods)

  if (pods.length === 0 && sharedPods.length === 0) {
    return new Uint8Array([0])
  }

  return stringToBytes(
    JSON.stringify({
      pods: pods.map(item => podToJsonPod(item)),
      sharedPods: sharedPods.map(item => sharedPodToJsonSharedPod(item)),
    }),
  )
}

/**
 * Pod name guard
 */
export function isPodName(value: unknown): value is PodName {
  const { name } = value as PodName

  return typeof value === 'object' && value !== null && isString(name)
}

/**
 * Pod guard
 */
export function isPod(value: unknown): value is Pod {
  const { name, index, password } = value as Pod

  return typeof value === 'object' && value !== null && isString(name) && isNumber(index) && isPodPassword(password)
}

/**
 * Json pod guard
 */
export function isJsonPod(value: unknown): value is JsonPod {
  const { index, password } = value as JsonPod

  return typeof value === 'object' && value !== null && isNumber(index) && Utils.isHexString(password)
}

/**
 * Shared pod guard
 */
export function isSharedPod(value: unknown): value is SharedPod {
  const { name, address, password } = value as SharedPod

  return (
    typeof value === 'object' &&
    typeof address === 'object' &&
    value !== null &&
    isString(name) &&
    isEthAddress(bytesToHex(address)) &&
    isPodPassword(password)
  )
}

/**
 * Json shared pod guard
 */
export function isJsonSharedPod(value: unknown): value is JsonSharedPod {
  const { address, password } = value as JsonSharedPod

  return typeof value === 'object' && value !== null && isEthAddress(address) && Utils.isHexString(password)
}

/**
 * Asserts that pod name type is correct
 */
export function assertPodNameType(value: unknown): asserts value is PodName {
  if (!isPodName(value)) {
    throw new Error('Invalid pod name type')
  }
}

/**
 * Asserts that pod is correct
 */
export function assertPod(value: unknown): asserts value is Pod {
  if (!isPod(value)) {
    throw new Error(`Invalid pod: ${JSON.stringify(value)}`)
  }
}

/**
 * Asserts that json pod is correct
 */
export function assertJsonPod(value: unknown): asserts value is JsonPod {
  if (!isJsonPod(value)) {
    throw new Error(`Invalid json pod: ${JSON.stringify(value)}`)
  }
}

/**
 * Asserts that shared pod is correct
 */
export function assertSharedPod(value: unknown): asserts value is SharedPod {
  if (!isSharedPod(value)) {
    throw new Error(`Invalid shared pod: ${JSON.stringify(value)}`)
  }
}

/**
 * Asserts that json shared pod is correct
 */
export function assertJsonSharedPod(value: unknown): asserts value is JsonSharedPod {
  if (!isJsonSharedPod(value)) {
    throw new Error(`Invalid json shared pod: ${JSON.stringify(value)}`)
  }
}

/**
 * Asserts that pods are correct
 */
export function assertPodsMetadata(value: unknown): asserts value is PodsMetadata {
  const data = value as PodsMetadata
  assertJsonPods(data.pods)
  assertJsonSharedPods(data.sharedPods)
}

/**
 * Asserts that pods are correct
 */
export function assertPods(value: unknown): asserts value is Pod[] {
  assertArray(value)
  for (const pod of value as Pod[]) {
    assertPod(pod)
  }
}

/**
 * Asserts that json pods are correct
 */
export function assertJsonPods(value: unknown): asserts value is JsonPod[] {
  assertArray(value)
  for (const pod of value as JsonPod[]) {
    assertJsonPod(pod)
  }
}

/**
 * Asserts that shared pods are correct
 */
export function assertSharedPods(value: unknown): asserts value is SharedPod[] {
  assertArray(value)
  for (const pod of value as SharedPod[]) {
    assertSharedPod(pod)
  }
}

/**
 * Asserts that json shared pods are correct
 */
export function assertJsonSharedPods(value: unknown): asserts value is JsonSharedPod[] {
  assertArray(value)
  for (const pod of value as JsonSharedPod[]) {
    assertJsonSharedPod(pod)
  }
}

/**
 * Creates information for pod sharing
 */
export function createPodShareInfo(
  podName: string,
  podAddress: Utils.EthAddress,
  userAddress: Utils.EthAddress,
  password: PodPasswordBytes,
): PodShareInfo {
  return {
    podName: podName,
    podAddress: bytesToHex(podAddress),
    userAddress: bytesToHex(userAddress),
    password: bytesToHex(password),
  }
}

/**
 * Checks that value is pod share info
 */
export function isPodShareInfo(value: unknown): value is PodShareInfo {
  const data = value as PodShareInfo

  return (
    isObject(value) && isString(data.podName) && isHexEthAddress(data.podAddress) && isHexEthAddress(data.userAddress)
  )
}

/**
 * Verifies if pod share info is correct
 */
export function assertPodShareInfo(value: unknown): asserts value is PodShareInfo {
  if (!isPodShareInfo(value)) {
    throw new Error(`Incorrect pod share info: ${JSON.stringify(value)}`)
  }
}

/**
 * Generates random password for a pod
 */
export function getRandomPodPassword(): PodPasswordBytes {
  return wordArrayToBytes(CryptoJS.lib.WordArray.random(POD_PASSWORD_LENGTH)) as PodPasswordBytes
}

/**
 * Creates user's pod or add a shared pod to an account
 *
 * @param bee Bee instance
 * @param connection Connection instance
 * @param userWallet FDP account wallet
 * @param seed FDP account seed
 * @param pod pod information to create
 */
export async function createPod(
  bee: Bee,
  connection: Connection,
  userWallet: utils.HDNode,
  seed: Uint8Array,
  pod: PodName | SharedPod,
): Promise<Pod | SharedPod> {
  assertPodNameType(pod)
  pod.name = pod.name.trim()
  assertPodName(pod.name)

  const podsInfo = await getPodsList(bee, userWallet, connection.options?.downloadOptions)
  const nextIndex = podsInfo.podsList.getPods().length + 1
  assertPodsLength(nextIndex)
  const pods = podsInfo.podsList.getPods()
  const sharedPods = podsInfo.podsList.getSharedPods()
  assertPodNameAvailable(pod.name, pods)
  assertSharedPodNameAvailable(pod.name, sharedPods)

  let epoch: Epoch
  const currentTime = getUnixTimestamp()

  if (podsInfo.lookupAnswer) {
    epoch = podsInfo.lookupAnswer.epoch.getNextEpoch(currentTime)
  } else {
    epoch = getFirstEpoch(currentTime)
  }

  let realPod: Pod | SharedPod

  if (isSharedPod(pod)) {
    realPod = pod
    sharedPods.push(realPod)
  } else {
    realPod = {
      name: pod.name,
      index: nextIndex,
      password: getRandomPodPassword(),
    }
    pods.push(realPod)
  }

  const allPodsData = podListToBytes(pods, sharedPods)
  await writeFeedData(
    connection,
    POD_TOPIC,
    allPodsData,
    userWallet.privateKey,
    preparePrivateKey(userWallet.privateKey),
    epoch,
  )

  if (isPod(realPod)) {
    const podWallet = getWalletByIndex(seed, nextIndex)
    await createRootDirectory(connection, realPod.password, preparePrivateKey(podWallet.privateKey))
  }

  return realPod
}

// /**
//  * Gets extended information about pods using AccountData instance and pod name
//  *
//  * @param accountData AccountData instance
//  * @param podName pod name
//  */
// export async function getExtendedPodsListByAccountData(
//   accountData: AccountData,
//   podName: string,
// ): Promise<ExtendedPodInfo> {
//   return getExtendedPodsList(
//     accountData.connection.bee,
//     podName,
//     accountData.wallet!,
//     accountData.seed!,
//     accountData.connection.options?.downloadOptions,
//   )
// }

/**
 * Gets shared information about pod
 *
 * @param bee Bee instance
 * @param reference reference to shared information
 */
export async function getSharedPodInfo(bee: Bee, reference: EncryptedReference): Promise<PodShareInfo> {
  const data = (await bee.downloadData(reference)).json()

  assertPodShareInfo(data)

  return data
}
