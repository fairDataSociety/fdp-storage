import crypto from 'crypto'
import { BATCH_ID_HEX_LENGTH, BatchId, Bee, BeeDebug, Utils } from '@ethersphere/bee-js'
import { FdpStorage, Options } from '../src'
import { utils, Wallet } from 'ethers'
import { Environments, getEnsEnvironmentConfig } from '@fairdatasociety/fdp-contracts-js'
import axios from 'axios'
import { CacheOptions } from '../src/cache/types'
import { DEFAULT_UPLOAD_OPTIONS } from '../src/content-items/handler'

/**
 * Options for FDP initialization
 */
export interface CreateFdpOptions {
  /**
   * Options for FDP initialization
   */
  batchId?: BatchId
}

/**
 * File content with information for testing
 */
export interface TestFileContent {
  /**
   * Size of file in bytes
   */
  size: number
  /**
   * Size of block in bytes
   */
  blockSize: number
  /**
   * Count of blocks
   */
  blocksCount: number
  /**
   * File content
   */
  content: string
  /**
   * File name
   */
  filename: string
  /**
   * Full path of file
   */
  fullPath: string
}

export interface TestUser {
  username: string
  password: string
  address: string
  mnemonic: string
}

export const USERNAME_LENGTH = 16
export const PASSWORD_LENGTH = 6
export const GET_FEED_DATA_TIMEOUT = 1000

/**
 * Generate new user info
 *
 * @returns TestUser
 */
export function generateUser(fdp?: FdpStorage): TestUser {
  const wallet = fdp ? fdp.account.createWallet() : Wallet.createRandom()

  return {
    username: crypto.randomBytes(USERNAME_LENGTH).toString('hex'),
    password: crypto.randomBytes(PASSWORD_LENGTH).toString('hex'),
    mnemonic: wallet.mnemonic.phrase,
    address: wallet.address,
  }
}

/**
 * Generate random hex string with passed length
 *
 * @param length Length of output string
 */
export function generateRandomHexString(length = 10): string {
  return crypto.randomBytes(length).toString('hex').substring(0, length)
}

/**
 * Returns an url for testing the Bee public API
 */
export function beeUrl(): string {
  return process.env.BEE_API_URL || 'http://127.0.0.1:1633'
}

/**
 * Returns an url for testing the Bee Debug API
 */
export function beeDebugUrl(): string {
  return process.env.BEE_DEBUG_API_URL || 'http://127.0.0.1:1635'
}

/**
 * Gets Bee instance
 */
export function getBee(): Bee {
  return new Bee(beeUrl())
}

/**
 * Asserts whether batch id passed
 */
export function assertBatchId(value: unknown): asserts value is BatchId {
  const name = 'batchId'

  if (!Utils.isHexString(value, BATCH_ID_HEX_LENGTH)) {
    throw new Error(`Incorrect hex string: ${name}`)
  }
}

/**
 * Returns an url for testing the Bee Debug API
 */
export function batchId(): BatchId {
  const result = process.env.BEE_BATCH_ID || process.env.CACHED_BEE_BATCH_ID
  assertBatchId(result)

  return result
}

/**
 * Convert 32 bytes array of numbers to Utils.Bytes<32>
 */
export function numbersToSegment(numbers: number[]): Utils.Bytes<32> {
  if (numbers.length !== 32) {
    throw new Error('Numbers length must be equal to 32')
  }

  return new Uint8Array(numbers) as Utils.Bytes<32>
}

/**
 * Options for FDP initialization
 */
export const fdpOptions: Options = {
  requestOptions: {
    timeout: GET_FEED_DATA_TIMEOUT,
  },
  ensOptions: {
    ...getEnsEnvironmentConfig(Environments.LOCALHOST),
    performChecks: true,
  },
  cacheOptions: {
    isUseCache: false,
  },
}

/**
 * Creates FDP instance with default configuration for testing
 */
export function createFdp(cacheOptions?: CacheOptions, options?: CreateFdpOptions): FdpStorage {
  return new FdpStorage(beeUrl(), options?.batchId ?? batchId(), {
    ...fdpOptions,
    ...(cacheOptions ? { cacheOptions } : undefined),
  })
}

/**
 * Sleeps for passed time in milliseconds
 */
export async function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

/**
 * Gets usable batch id
 */
export async function getUsableBatch(beeDebug?: BeeDebug): Promise<BatchId> {
  beeDebug = beeDebug ? beeDebug : new BeeDebug(beeDebugUrl())
  const allBatch = await beeDebug.getAllPostageBatch()

  const result = allBatch.find(item => item.usable)

  if (!result) {
    throw new Error('Usable batch not found')
  }

  return result.batchID
}

/**
 * Checks if usable batch is present
 */
export async function isUsableBatchExists(beeDebug?: BeeDebug): Promise<boolean> {
  try {
    return Boolean(await getUsableBatch(beeDebug))
  } catch (e) {
    return false
  }
}

/**
 * Creates and awaits for a usable batch
 */
export async function createUsableBatch(): Promise<BatchId> {
  const beeDebug = new BeeDebug(beeDebugUrl())

  if (await isUsableBatchExists()) {
    return getUsableBatch(beeDebug)
  }

  await beeDebug.createPostageBatch('10000000', 24)
  for (let i = 0; i < 100; i++) {
    if (await isUsableBatchExists()) {
      break
    }

    await sleep(3000)
  }

  sleep(90000)

  return getUsableBatch(beeDebug)
}

/**
 * Returns FairOS API URL
 */
export function fairOSUrl(): string {
  return process.env.FAIROS_API_URL || 'http://127.0.0.1:9090'
}

/**
 * Waits until FairOS API return message about readiness
 */
export async function waitFairOS(): Promise<void> {
  const url = fairOSUrl()
  for (let i = 0; i <= 100; i++) {
    let status
    try {
      status = (await axios.get(url)).status
      // eslint-disable-next-line no-empty
    } catch (e) {}

    if (status === 200) {
      return
    } else if (status) {
      throw new Error('Incorrect FairOS API answer')
    }

    await sleep(1000)
  }

  throw new Error('FairOS API is not ready')
}

/**
 * Top up balance for address in fdp instance
 */
export async function topUpFdp(fdp: FdpStorage): Promise<void> {
  if (!fdp.account.wallet?.address) {
    throw new Error('Address is not defined')
  }

  await topUpAddress(fdp.account.wallet?.address)
}

/**
 * Top up balance for address
 */
export async function topUpAddress(address: string, amountInEther = '0.01'): Promise<void> {
  const ens = new FdpStorage(beeUrl(), batchId()).ens
  const account = (await ens.provider.listAccounts())[0]
  const txHash = await ens.provider.send('eth_sendTransaction', [
    {
      from: account,
      to: address,
      value: utils.hexlify(utils.parseEther(amountInEther)),
    },
  ])

  await ens.provider.waitForTransaction(txHash)
}

/**
 * Make `FileList` from `File` array
 */
export function makeFileList(files: File[]): FileList {
  return files as unknown as FileList
}

/**
 * Make file content with file info
 * @param size Size of file in bytes
 */
export function makeFileContent(size: number): TestFileContent {
  const blockSize = DEFAULT_UPLOAD_OPTIONS.blockSize!
  const blocksCount = Math.ceil(size / blockSize)
  const content = generateRandomHexString(size)
  const filename = generateRandomHexString() + '.txt'
  const fullPath = '/' + filename

  return {
    size,
    blockSize,
    blocksCount,
    content,
    filename,
    fullPath,
  }
}
