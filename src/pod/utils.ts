import { Pod, PodShareInfo, RawDirectoryMetadata, SharedPod } from './types'
import { Bee, Data, Utils } from '@ethersphere/bee-js'
import { stringToBytes } from '../utils/bytes'
import { LookupAnswer } from '../feed/types'
import { utils } from 'ethers'
import { getRawDirectoryMetadataBytes } from '../directory/adapter'
import { assertNumber, assertString, isEthAddress, isNumber, isObject, isString } from '../utils/type'
import { assertHexEthAddress, bytesToHex, EncryptedReference } from '../utils/hex'
import { List } from './list'
import { prepareEthAddress } from '../utils/address'
import { getExtendedPodsList, getPodsList } from './api'
import { Epoch, getFirstEpoch } from '../feed/lookup/epoch'
import { getUnixTimestamp } from '../utils/time'
import { writeFeedData } from '../feed/api'
import { getWalletByIndex } from '../utils/wallet'
import { createRootDirectory } from '../directory/handler'
import { POD_TOPIC } from './personal-storage'
import { Connection } from '../connection/connection'
import { AccountData } from '../account/account-data'

export const META_VERSION = 1
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
 * Converts pods list to bytes array
 */
export function podListToBytes(pods: Pod[], sharedPods: SharedPod[]): Uint8Array {
  assertPods(pods)
  assertSharedPods(sharedPods)

  if (pods.length === 0 && sharedPods.length === 0) {
    return new Uint8Array([0])
  }

  const allPods =
    [...pods, ...sharedPods]
      .map(pod => {
        if (isPod(pod)) {
          return `${pod.name},${pod.index}`
        } else if (isSharedPod(pod)) {
          return `${pod.name},${bytesToHex(pod.address)}`
        }
      })
      .join('\n') + '\n'

  return stringToBytes(allPods)
}

/**
 * Pod guard
 */
export function isPod(value: unknown): value is Pod {
  const { name, index } = value as Pod

  return typeof value === 'object' && value !== null && isString(name) && isNumber(index)
}

/**
 * Shared pod guard
 */
export function isSharedPod(value: unknown): value is SharedPod {
  const { name, address } = value as SharedPod

  return typeof value === 'object' && value !== null && isString(name) && isEthAddress(bytesToHex(address))
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
 * Asserts that shared pod is correct
 */
export function assertSharedPod(value: unknown): asserts value is SharedPod {
  if (!isSharedPod(value)) {
    throw new Error('Invalid shared pod')
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
 * Asserts that shared pods are correct
 */
export function assertSharedPods(value: unknown): asserts value is SharedPod[] {
  for (const pod of value as SharedPod[]) {
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
  pod: Pod | SharedPod,
): Promise<Pod | SharedPod> {
  pod.name = pod.name.trim()
  assertPodName(pod.name)

  const isSimplePod = isPod(pod)
  const userAddress = prepareEthAddress(userWallet.address)
  const podsInfo = await getPodsList(bee, userAddress, connection.options?.downloadOptions)

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

  if (isSimplePod) {
    pod.index = nextIndex
    pods.push(pod)
  } else {
    sharedPods.push(pod)
  }

  const allPodsData = podListToBytes(pods, sharedPods)
  await writeFeedData(connection, POD_TOPIC, allPodsData, userWallet.privateKey, epoch)

  if (isSimplePod) {
    const podWallet = getWalletByIndex(seed, nextIndex)
    await createRootDirectory(connection, podWallet.privateKey)
  }

  return pod
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
  return getExtendedPodsList(
    accountData.connection.bee,
    podName,
    prepareEthAddress(accountData.wallet!.address),
    accountData.seed!,
    accountData.connection.options?.downloadOptions,
  )
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
