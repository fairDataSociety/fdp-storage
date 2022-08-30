import crypto from 'crypto'
import { BATCH_ID_HEX_LENGTH, BatchId, BeeDebug, Utils } from '@ethersphere/bee-js'
import { FdpStorage } from '../src'
import { Wallet } from 'ethers'
import { Environments, getEnvironmentConfig } from '@fairdatasociety/fdp-contracts'

export interface TestUser {
  username: string
  password: string
  address: string
  mnemonic: string
}

export const USERNAME_LENGTH = 16
export const PASSWORD_LENGTH = 6
export const GET_FEED_DATA_TIMEOUT = 1000
export const defaultBatchId = '0000000000000000000000000000000000000000000000000000000000000000'

let cachedBatchId = defaultBatchId

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
  const envBatchId = process.env.BEE_BATCH_ID
  const result = envBatchId || cachedBatchId
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
export const fdpOptions = {
  downloadOptions: {
    timeout: GET_FEED_DATA_TIMEOUT,
  },
  ensOptions: {
    ...getEnvironmentConfig(Environments.LOCALHOST),
    performChecks: true,
  },
}

/**
 * Creates FDP instance with default configuration for testing
 */
export function createFdp(): FdpStorage {
  return new FdpStorage(beeUrl(), batchId(), fdpOptions)
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

  return getUsableBatch(beeDebug)
}

/**
 * Sets cached batch id
 */
export function setCachedBatchId(batchId: BatchId): void {
  cachedBatchId = batchId
}

/**
 * Sets cached batch id
 */
export function getCachedBatchId(): BatchId {
  assertBatchId(cachedBatchId)

  return cachedBatchId
}
