import {
  Pod,
  PodPrepared,
  PodName,
  PodShareInfo,
  RawDirectoryMetadata,
  SharedPod,
  SharedPodPrepared,
  PodsListPrepared,
  PodsList,
} from './types'
import { Bee, Data, Utils } from '@ethersphere/bee-js'
import { bytesToString, stringToBytes, wordArrayToBytes } from '../utils/bytes'
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
import { Epoch, getFirstEpoch } from '../feed/lookup/epoch'
import { getUnixTimestamp } from '../utils/time'
import { writeFeedData } from '../feed/api'
import { prepareEthAddress, preparePrivateKey } from '../utils/wallet'
import { createRootDirectory } from '../directory/handler'
import { POD_TOPIC } from './personal-storage'
import { Connection } from '../connection/connection'
import { AccountData } from '../account/account-data'
import { decryptBytes, POD_PASSWORD_LENGTH, PodPasswordBytes } from '../utils/encryption'
import CryptoJS from 'crypto-js'
import { jsonParse } from '../utils/json'
import { DEFAULT_DIRECTORY_PERMISSIONS, getDirectoryMode } from '../directory/utils'
import { getCacheKey, setEpochCache } from '../cache/utils'
import { getWalletByIndex } from '../utils/cache/wallet'
import { getPodsList as getPodsListCached, getPodsList } from './cache/api'

export const META_VERSION = 2
export const MAX_PODS_COUNT = 65536
export const MAX_POD_NAME_LENGTH = 64

/**
 * Information about a list of pods
 */
export interface PodsInfo {
  podsList: PodsListPrepared
  epoch: Epoch
}

/**
 * Extended information about a specific pod
 */
export interface WritablePodInfo {
  pod: PodPrepared
  podWallet: utils.HDNode
  podAddress: Utils.EthAddress
  epoch: Epoch
}

/**
 * Simplified information about a specific pod
 */
export interface ReadablePodInfo {
  podPassword: PodPasswordBytes
  podAddress: Utils.EthAddress
  epoch: Epoch
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
export function extractPods(data: Data, podPassword: PodPasswordBytes): PodsListPrepared {
  return jsonToPodsList(bytesToString(decryptBytes(bytesToHex(podPassword), data)))
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
      mode: getDirectoryMode(DEFAULT_DIRECTORY_PERMISSIONS),
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
export function assertPodNameAvailable(name: string, value: unknown): asserts value is PodPrepared[] {
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
export function assertSharedPodNameAvailable(name: string, value: unknown): asserts value is SharedPodPrepared[] {
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
 * Converts internal `PodPrepared` to serializable `Pod`
 */
export function podPreparedToPod(pod: PodPrepared): Pod {
  return { ...pod, password: bytesToHex(pod.password) }
}

/**
 * Converts internal `SharedPod` to serializable `SharedPod`
 */
export function sharedPodPreparedToSharedPod(pod: SharedPodPrepared): SharedPod {
  return { ...pod, password: bytesToHex(pod.password), address: bytesToHex(pod.address) }
}

/**
 * Converts pods list to JSON string
 */
export function podListToJSON(pods: PodPrepared[], sharedPods: SharedPodPrepared[]): string {
  assertPods(pods)
  assertSharedPods(sharedPods)

  return JSON.stringify({
    pods: pods.map(item => podPreparedToPod(item)),
    sharedPods: sharedPods.map(item => sharedPodPreparedToSharedPod(item)),
  })
}

/**
 * Converts pods list to bytes array
 */
export function podListToBytes(pods: PodPrepared[], sharedPods: SharedPodPrepared[]): Uint8Array {
  if (pods.length === 0 && sharedPods.length === 0) {
    return new Uint8Array()
  }

  return stringToBytes(podListToJSON(pods, sharedPods))
}

/**
 * Pod name type guard
 */
export function isPodNameType(value: unknown): value is PodName {
  const { name } = value as PodName

  return typeof value === 'object' && value !== null && isString(name)
}

/**
 * Pod guard
 */
export function isPod(value: unknown): value is PodPrepared {
  const { index, password } = value as PodPrepared

  return typeof isPodNameType(value) && isNumber(index) && isPodPassword(password)
}

/**
 * Json pod guard
 */
export function isJsonPod(value: unknown): value is Pod {
  const { index, password } = value as Pod

  return isPodNameType(value) && isNumber(index) && Utils.isHexString(password)
}

/**
 * Shared pod guard
 */
export function isSharedPod(value: unknown): value is SharedPodPrepared {
  const { address, password } = value as SharedPodPrepared

  return isPodNameType(value) && isObject(address) && isEthAddress(bytesToHex(address)) && isPodPassword(password)
}

/**
 * Json shared pod guard
 */
export function isJsonSharedPod(value: unknown): value is SharedPod {
  const { address, password } = value as SharedPod

  return isPodNameType(value) && isEthAddress(address) && Utils.isHexString(password)
}

/**
 * Asserts that pod name type is correct
 */
export function assertPodNameType(value: unknown): asserts value is PodName {
  if (!isPodNameType(value)) {
    throw new Error('Invalid pod name type')
  }
}

/**
 * Asserts that pod is correct
 */
export function assertPod(value: unknown): asserts value is PodPrepared {
  if (!isPod(value)) {
    throw new Error(`Invalid pod: ${JSON.stringify(value)}`)
  }
}

/**
 * Asserts that shared pod is correct
 */
export function assertSharedPod(value: unknown): asserts value is SharedPodPrepared {
  if (!isSharedPod(value)) {
    throw new Error(`Invalid shared pod: ${JSON.stringify(value)}`)
  }
}

/**
 * Asserts that pods are correct
 */
export function assertPods(value: unknown): asserts value is PodPrepared[] {
  assertArray(value)
  for (const pod of value as PodPrepared[]) {
    assertPod(pod)
  }
}

/**
 * Asserts that shared pods are correct
 */
export function assertSharedPods(value: unknown): asserts value is SharedPodPrepared[] {
  assertArray(value)
  for (const pod of value as SharedPodPrepared[]) {
    assertSharedPod(pod)
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
  pod: PodName | SharedPodPrepared,
): Promise<PodPrepared | SharedPodPrepared> {
  assertPodNameType(pod)
  pod.name = pod.name.trim()
  assertPodName(pod.name)

  const { cacheInfo } = connection
  let podsList: PodsListPrepared = { pods: [], sharedPods: [] }
  let podsInfo
  try {
    podsInfo = await getPodsList(bee, userWallet, {
      requestOptions: connection.options?.requestOptions,
      cacheInfo,
    })
    podsList = podsInfo.podsList
    // eslint-disable-next-line no-empty
  } catch (e) {}
  const nextIndex = podsList.pods.length + 1
  assertPodsLength(nextIndex)
  const pods = podsList.pods
  const sharedPods = podsList.sharedPods
  assertPodNameAvailable(pod.name, pods)
  assertSharedPodNameAvailable(pod.name, sharedPods)

  const currentTime = getUnixTimestamp()
  const epoch = podsInfo ? podsInfo.epoch.getNextEpoch(currentTime) : getFirstEpoch(currentTime)
  let realPod: PodPrepared | SharedPodPrepared

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
  await writeFeedData(connection, POD_TOPIC, allPodsData, userWallet, preparePrivateKey(userWallet.privateKey), epoch)

  if (isPod(realPod)) {
    const podWallet = await getWalletByIndex(seed, nextIndex, cacheInfo)
    await createRootDirectory(connection, realPod.password, podWallet)
  }

  await setEpochCache(cacheInfo, getCacheKey(userWallet.address), {
    epoch,
    data: podListToJSON(pods, sharedPods),
  })

  return realPod
}

/**
 * Gets information about a pod to make write operations
 *
 * The method differs from `getReadablePodInfo` in that it looks for a pod only in the list
 * of pods that were created by the user and return more extended information about a pod
 *
 * @param accountData `AccountData` instance
 * @param podName pod name
 */
export async function getWritablePodInfo(accountData: AccountData, podName: string): Promise<WritablePodInfo> {
  const {
    connection: { bee },
    wallet,
    seed,
  } = accountData
  const downloadOptions = {
    requestOptions: accountData.connection.options?.requestOptions,
    cacheInfo: accountData.connection.cacheInfo,
  }

  const { podsList, epoch } = await getPodsListCached(bee, wallet!, downloadOptions)
  const pod = podsList.pods.find(item => item.name === podName)

  if (!pod) {
    throw new Error(`Pod for writing "${podName}" does not exist`)
  }

  const podWallet = await getWalletByIndex(seed!, pod.index, downloadOptions?.cacheInfo)

  return {
    pod,
    podAddress: prepareEthAddress(podWallet.address),
    podWallet,
    epoch,
  }
}

/**
 * Gets information about a pod to make read operations
 *
 * The method differs from `getWritablePodInfo` in that it looks for a pod in the shared list
 * of pods and pods that were created by the user and return simplified information about a pod
 *
 * @param accountData `AccountData` instance
 * @param podName pod name
 */
export async function getReadablePodInfo(accountData: AccountData, podName: string): Promise<ReadablePodInfo> {
  const downloadOptions = {
    requestOptions: accountData.connection.options?.requestOptions,
    cacheInfo: accountData.connection.cacheInfo,
  }
  const {
    connection: { bee },
    wallet,
    seed,
  } = accountData
  const { podsList, epoch } = await getPodsListCached(bee, wallet!, downloadOptions)
  const pod = [...podsList.pods, ...podsList.sharedPods].find(pod => pod.name === podName)

  if (!pod) {
    throw new Error(`Pod for reading "${podName}" does not exist`)
  }

  const podAddress = isPod(pod)
    ? (await getWalletByIndex(seed!, pod.index, downloadOptions.cacheInfo)).address
    : pod.address

  return {
    podPassword: pod.password,
    podAddress: prepareEthAddress(podAddress),
    epoch,
  }
}

/**
 * Gets shared information about pod
 *
 * @param bee Bee instance
 * @param reference reference to shared information
 */
export async function getPodShareInfo(bee: Bee, reference: EncryptedReference): Promise<PodShareInfo> {
  const data = (await bee.downloadData(reference)).json()

  assertPodShareInfo(data)

  return data
}

/**
 * Converts internal `PodsListPrepared` to serializable `PodsList`
 */
export function podsListPreparedToPodsList(podsList: PodsListPrepared): PodsList {
  return {
    pods: podsList.pods.map(item => podPreparedToPod(item)),
    sharedPods: podsList.sharedPods.map(item => sharedPodPreparedToSharedPod(item)),
  }
}

/**
 * Converts JSON to `PodsListPrepared`
 */
export function jsonToPodsList(json: string): PodsListPrepared {
  const object = jsonParse(json, 'pod list')
  assertPodsMetadata(object)
  const pods = object.pods.map((item: Pod) => jsonPodToPod(item))
  const sharedPods = object.sharedPods.map((item: SharedPod) => jsonSharedPodToSharedPod(item))
  assertPods(pods)
  assertSharedPods(sharedPods)

  return { pods, sharedPods }
}

/**
 * Converts `Pod` to `PodPrepared`
 */
export function jsonPodToPod(pod: Pod): PodPrepared {
  const password = hexToPodPasswordBytes(pod.password)
  assertPodPasswordBytes(password)

  return { ...pod, password }
}

/**
 * Converts hex password to `PodPasswordBytes`
 */
export function hexToPodPasswordBytes(hexPassword: string): PodPasswordBytes {
  return Utils.hexToBytes(hexPassword) as PodPasswordBytes
}

/**
 * Asserts that pods are correct
 */
export function assertPodsMetadata(value: unknown): asserts value is PodsList {
  const data = value as PodsList
  assertJsonPods(data.pods)
  assertJsonSharedPods(data.sharedPods)
}

/**
 * Asserts that json pods are correct
 */
export function assertJsonPods(value: unknown): asserts value is Pod[] {
  assertArray(value)
  for (const pod of value as Pod[]) {
    assertJsonPod(pod)
  }
}

/**
 * Asserts that json shared pods are correct
 */
export function assertJsonSharedPods(value: unknown): asserts value is SharedPod[] {
  assertArray(value)
  for (const pod of value as SharedPod[]) {
    assertJsonSharedPod(pod)
  }
}

/**
 * Asserts that json pod is correct
 */
export function assertJsonPod(value: unknown): asserts value is Pod {
  if (!isJsonPod(value)) {
    throw new Error(`Invalid json pod: ${JSON.stringify(value)}`)
  }
}

/**
 * Asserts that json shared pod is correct
 */
export function assertJsonSharedPod(value: unknown): asserts value is SharedPod {
  if (!isJsonSharedPod(value)) {
    throw new Error(`Invalid json shared pod: ${JSON.stringify(value)}`)
  }
}

/**
 * Converts JsonSharedPod to SharedPod
 */
export function jsonSharedPodToSharedPod(pod: SharedPod): SharedPodPrepared {
  const password = hexToPodPasswordBytes(pod.password)
  const address = Utils.hexToBytes(pod.address) as Utils.EthAddress
  assertPodPasswordBytes(password)

  return { ...pod, password, address }
}
