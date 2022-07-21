import crypto from 'crypto'
import { BeeDebug, Utils } from '@ethersphere/bee-js'
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
    rpcUrl: 'http://127.0.0.1:9545/',
    contractAddresses: {
      ensRegistry: `0x7414e38377D6DAf6045626EC8a8ABB8a1BC4B97a`,
      fdsRegistrar: `0xB9bdBAEc07751F6d54d19A6B9995708873F3DE18`,
      publicResolver: `0x4339316e04CFfB5961D1c41fEF8E44bfA2A7fBd1`,
    },
    performChecks: false,
}
}
/**
 * Creates FDP instance with default configuration for testing
 */
export function createFdp(): FdpStorage {
  return new FdpStorage(beeUrl(), beeDebugUrl(), fdpOptions)
}

/**
 * Sleeps for passed time in milliseconds
 */
export async function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

/**
 * Checks if usable batch is present
 */
export async function isUsableBatchExists(beeDebug?: BeeDebug): Promise<boolean> {
  beeDebug = beeDebug ? beeDebug : new BeeDebug(beeDebugUrl())
  const allBatch = await beeDebug.getAllPostageBatch()

  return Boolean(allBatch.find(item => item.usable))
}

/**
 * Creates and awaits for a usable batch
 */
export async function createUsableBatch(): Promise<void> {
  if (await isUsableBatchExists()) {
    return
  }

  const beeDebug = new BeeDebug(beeDebugUrl())
  await beeDebug.createPostageBatch('10000000', 24)
  for (let i = 0; i < 100; i++) {
    if (await isUsableBatchExists()) {
      break
    }

    await sleep(3000)
  }
}
