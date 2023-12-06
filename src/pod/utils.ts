import {
  FileMetadataWithLookupAnswer,
  Pod,
  PodName,
  PodPrepared,
  PodShareInfo,
  PodsList,
  PodsListPrepared,
  RawDirectoryMetadata,
  SharedPod,
  SharedPodPrepared,
} from './types'
import { Bee, BeeRequestOptions, Data, Utils } from '@ethersphere/bee-js'
import {
  assertAllowedZeroBytes,
  bytesToString,
  MAX_ZEROS_PERCENTAGE_ALLOWED,
  stringToBytes,
  wordArrayToBytes,
} from '../utils/bytes'
import { utils } from 'ethers'
import { getRawDirectoryMetadataBytes } from '../directory/adapter'
import {
  assertArray,
  assertNumber,
  assertPodPasswordBytes,
  assertString,
  isEthAddress,
  isNotEmptyObject,
  isNumber,
  isObject,
  isPodPassword,
  isString,
} from '../utils/type'
import { bytesToHex, EncryptedReference, isHexEthAddress } from '../utils/hex'
import { getExtendedPodsList } from './api'
import { Epoch, getFirstEpoch } from '../feed/lookup/epoch'
import { getUnixTimestamp } from '../utils/time'
import { getFeedData } from '../feed/api'
import { createRootDirectory } from '../directory/handler'
import { Connection } from '../connection/connection'
import { AccountData } from '../account/account-data'
import { decryptBytes, POD_PASSWORD_LENGTH, PodPasswordBytes } from '../utils/encryption'
import CryptoJS from 'crypto-js'
import { jsonParse } from '../utils/json'
import { assertRawFileMetadata, DEFAULT_DIRECTORY_PERMISSIONS, getDirectoryMode } from '../directory/utils'
import { getCacheKey, setEpochCache } from '../cache/utils'
import { getWalletByIndex } from '../utils/cache/wallet'
import { getPodsList } from './cache/api'
import { LookupAnswer } from '../feed/types'
import { prepareDataByMeta, uploadData } from '../file/handler'
import { Compression } from '../file/types'
import { MINIMUM_BLOCK_SIZE } from '../content-items/handler'
import { downloadBlocksManifest } from '../file/utils'
import { extractMetadata } from '../content-items/utils'
import { rawFileMetadataToFileMetadata } from '../file/adapter'
import { decompress } from '../utils/compression'

export const META_VERSION = 2
export const MAX_PODS_COUNT = 65536
export const MAX_POD_NAME_LENGTH = 64

/**
 * Represents the topic for Pods version 1
 */
export const POD_TOPIC = 'Pods'

/**
 * Represents the topic for Pods version 2
 */
export const POD_TOPIC_V2 = 'PodsV2'

/**
 * Enum representing the version of PODs
 */
export enum PodsVersion {
  /**
   * Version 1
   */
  V1 = 'v1',
  /**
   * Version 2
   */
  V2 = 'v2',
}

/**
 * Answer with LookupAnswer and pods version
 */
export interface PodsLookupAnswer {
  /**
   * Pods version
   */
  podsVersion: PodsVersion
  /**
   * Lookup answer
   */
  lookupAnswer: LookupAnswer
}

/**
 * Information about pods list
 */
export interface PodsInfo {
  podsList: PodsListPrepared
  epoch: Epoch
}

/**
 * Extended information about specific pod
 */
export interface ExtendedPodInfo {
  pod: PodPrepared
  podWallet: utils.HDNode
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
 * @param data raw data with pod information
 * @param podPassword bytes of pod password
 */
export function extractPodsV1(data: Data, podPassword: PodPasswordBytes): PodsListPrepared {
  return jsonToPodsList(bytesToString(extractPodsBytes(data, podPassword)))
}

/**
 * Extracts and prepares a list of pods from the given V2 data using the provided pod password
 * @param accountData
 * @param {Data} data - The data from which to extract the pods.
 * @param {PodPasswordBytes} podPassword - The password to decrypt the pods.
 * @param downloadOptions
 * @return {PodsListPrepared} - The list of pods that have been extracted and prepared.
 */
export async function extractPodsV2(
  accountData: AccountData,
  data: Data,
  podPassword: PodPasswordBytes,
  downloadOptions?: BeeRequestOptions,
): Promise<PodsListPrepared> {
  const meta = extractMetadata(data, podPassword)
  assertRawFileMetadata(meta)
  const fileMeta = rawFileMetadataToFileMetadata(meta)
  const blocksData = await downloadBlocksManifest(accountData.connection.bee, fileMeta.blocksReference, downloadOptions)
  const preparedData = bytesToString(
    decompress(await prepareDataByMeta(blocksData.blocks, accountData.connection.bee, downloadOptions)),
  )

  return jsonToPodsList(preparedData)
}

/**
 * Decrypts pod information from raw data
 * @param data raw data with pod information
 * @param podPassword bytes of pod password
 */
export function extractPodsBytes(data: Data, podPassword: PodPasswordBytes): Uint8Array {
  return decryptBytes(bytesToHex(podPassword), data)
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
 * Pod name check
 *
 * @param value Pod name
 */
export function isPodName(value: unknown): value is string {
  return isString(value) && value.length > 0 && value.length <= MAX_POD_NAME_LENGTH
}

/**
 * Pod guard
 */
export function isPod(value: unknown): value is PodPrepared {
  const data = value as PodPrepared

  return (
    isNotEmptyObject(value) &&
    isPodNameType(value) &&
    isPodName(data.name) &&
    isNumber(data.index) &&
    data.index >= 0 &&
    isPodPassword(data.password)
  )
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
  const password = wordArrayToBytes(CryptoJS.lib.WordArray.random(POD_PASSWORD_LENGTH)) as PodPasswordBytes
  assertAllowedZeroBytes(password, MAX_ZEROS_PERCENTAGE_ALLOWED)

  return password
}

/**
 * Creates user's pod or add a shared pod to an account
 *
 * @param accountData AccountData instance
 * @param connection Connection instance
 * @param userWallet FDP account wallet
 * @param seed FDP account seed
 * @param pod pod information to create
 */
export async function createPod(
  accountData: AccountData,
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
    podsInfo = await getPodsList(accountData, connection.bee, userWallet, {
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
  await uploadPodDataV2(accountData, allPodsData)

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
 * Uploads pods data using version 2 method
 * @param accountData AccountData instance
 * @param allPodsData pods data
 */
export async function uploadPodDataV2(
  accountData: AccountData,
  allPodsData: Uint8Array,
): Promise<FileMetadataWithLookupAnswer> {
  return uploadData('', POD_TOPIC_V2, allPodsData, accountData, {
    blockSize: MINIMUM_BLOCK_SIZE,
    compression: Compression.GZIP,
  })
}

/**
 * Gets extended information about pods using AccountData instance and pod name
 *
 * @param accountData AccountData instance
 * @param podName pod name
 */
export async function getExtendedPodsListByAccountData(
  accountData: AccountData,
  podName: string,
): Promise<ExtendedPodInfo> {
  return getExtendedPodsList(accountData, accountData.connection.bee, podName, accountData.wallet!, accountData.seed!, {
    requestOptions: accountData.connection.options?.requestOptions,
    cacheInfo: accountData.connection.cacheInfo,
  })
}

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
  const password = Utils.hexToBytes(pod.password) as PodPasswordBytes
  assertPodPasswordBytes(password)

  return { ...pod, password }
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
 * Asserts that a value is a valid SharedPod.
 *
 * @param {unknown} value - The value to assert.
 *
 * @throws {Error} Invalid json shared pod if the value is not a valid SharedPod.
 */
export function assertJsonSharedPod(value: unknown): asserts value is SharedPod {
  if (!isJsonSharedPod(value)) {
    throw new Error(`Invalid json shared pod: ${JSON.stringify(value)}`)
  }
}

/**
 * Converts a SharedPod object from JSON format to a preprocessed SharedPod object.
 *
 * @param {SharedPod} pod - The SharedPod object in JSON format.
 * @return {SharedPodPrepared} - The preprocessed SharedPod object.
 */
export function jsonSharedPodToSharedPod(pod: SharedPod): SharedPodPrepared {
  const password = Utils.hexToBytes(pod.password) as PodPasswordBytes
  const address = Utils.hexToBytes(pod.address) as Utils.EthAddress
  assertPodPasswordBytes(password)

  return { ...pod, password, address }
}

/**
 * Retrieves pods data for a given address.
 *
 * @param {Bee} bee - The bee client object.
 * @param {Utils.EthAddress} address - The address to look up pods data for.
 * @param {BeeRequestOptions} [requestOptions] - The request options.
 * @returns {Promise<PodsLookupAnswer>} The pods data.
 * @throws {Error} If the pods data cannot be found.
 */
export async function getPodsData(
  bee: Bee,
  address: Utils.EthAddress,
  requestOptions?: BeeRequestOptions,
): Promise<PodsLookupAnswer> {
  let podsVersion = PodsVersion.V2
  let lookupAnswer
  try {
    lookupAnswer = await getFeedData(bee, POD_TOPIC_V2, address, requestOptions)
    // eslint-disable-next-line no-empty
  } catch (e) {}

  // if V2 does not exist, try V1
  if (!lookupAnswer) {
    try {
      lookupAnswer = await getFeedData(bee, POD_TOPIC, address, requestOptions)
      podsVersion = PodsVersion.V1
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }

  if (!lookupAnswer) {
    throw new Error('Pods data can not be found')
  }

  return {
    podsVersion,
    lookupAnswer,
  }
}

/**
 * Migrates a pod from version 1 to version 2.
 *
 * @param {AccountData} accountData - The account data.
 * @param {PodsLookupAnswer} podsData - The pods data.
 * @param {PodPasswordBytes} privateKey - The private key used for migration.
 * @return {Promise<PodsLookupAnswer>} - The pods data with the migrated version.
 */
export async function migratePodV1ToV2(
  accountData: AccountData,
  podsData: PodsLookupAnswer,
  privateKey: PodPasswordBytes,
): Promise<PodsLookupAnswer> {
  const podsBytes = extractPodsBytes(podsData.lookupAnswer.data, privateKey)

  return {
    podsVersion: PodsVersion.V2,
    lookupAnswer: (await uploadPodDataV2(accountData, podsBytes)).lookupAnswer,
  }
}
