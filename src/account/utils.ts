import { Data, Utils } from '@ethersphere/bee-js'
import { bmtHash } from '../chunk/bmt'
import { makeSpan, stringToBytes, wrapBytesWithHelpers } from '../utils/bytes'
import { AccountData } from './account-data'
import { isValidMnemonic } from 'ethers/lib/utils'
import CryptoJS from 'crypto-js'
import { replaceAll } from '../utils/string'
import { assertString } from '../utils/type'

export const MNEMONIC_LENGTH = 12
export const MAX_CHUNK_LENGTH = 4096
export const AUTH_VERSION = 'FDP-login-v1.0'
export const CHUNK_SIZE = 4096
export const SEED_SIZE = 64
export const HD_PATH = `m/44'/60'/0'/0/0`
export const CHUNK_ALREADY_EXISTS_ERROR = 'chunk already exists'

/**
 * Encode input data to Base64Url with Go lang compatible paddings
 *
 * @param data input data to encode
 */
export function encodeBase64Url(data: CryptoJS.lib.WordArray): string {
  const base64url = data.toString(CryptoJS.enc.Base64url)
  const paddingNumber = base64url.length % 4
  let padding = ''

  if (paddingNumber === 2) {
    padding = '=='
  } else if (paddingNumber === 3) {
    padding = '='
  }

  return base64url + padding
}

/**
 * Decode input Base64Url data to string
 *
 * @param data Base64Url data
 */
export function decodeBase64Url(data: string): CryptoJS.lib.WordArray {
  return CryptoJS.enc.Base64url.parse(replaceAll(data, '=', ''))
}

/**
 * Extracts only content from chunk data
 *
 * @param data full chunk data
 */
export function extractChunkContent(data: Data): Data {
  // length of feed (32) + signature length (65) + span length (8)
  const chunkContentPosition = 105

  if (data.length < chunkContentPosition) {
    throw new Error('Incorrect chunk size')
  }

  return wrapBytesWithHelpers(data.slice(chunkContentPosition))
}

/**
 * Calculate a Binary Merkle Tree hash for a string
 *
 * @returns the keccak256 hash in a byte array
 */
export function bmtHashString(stringData: string): Utils.Bytes<32> {
  const payload = stringToBytes(stringData)

  return bmtHashBytes(payload)
}

/**
 * Calculate a Binary Merkle Tree hash for a bytes array
 *
 * @returns the keccak256 hash in a byte array
 */
export function bmtHashBytes(payload: Uint8Array): Utils.Bytes<32> {
  if (payload.length > MAX_CHUNK_LENGTH) {
    throw new Error(`Chunk is larger than the maximum allowed size - ${MAX_CHUNK_LENGTH} bytes`)
  }

  const span = makeSpan(payload.length)
  const data = new Uint8Array([...span, ...payload])

  return bmtHash(data)
}

/**
 * Asserts whether non-empty username passed
 *
 * @param value FDP username
 */
export function assertUsername(value: unknown): asserts value is string {
  assertString(value)

  if (!value) {
    throw new Error('Incorrect username')
  }
}

/**
 * Asserts whether non-empty password passed
 *
 * @param value password
 */
export function assertPassword(value: unknown): asserts value is string {
  assertString(value)

  if (!value) {
    throw new Error('Incorrect password')
  }
}

/**
 * Asserts whether a valid mnemonic phrase has been passed
 *
 * @param value mnemonic phrase
 */
export function assertMnemonic(value: unknown): asserts value is string {
  assertString(value)
  const words = value.split(' ')

  if (!(words.length === MNEMONIC_LENGTH && isValidMnemonic(value))) {
    throw new Error('Incorrect mnemonic')
  }
}

/**
 * Asserts whether an account is defined
 *
 * @param value instance of AccountData to check
 */
export function assertAccount(value: unknown): asserts value is AccountData {
  const data = value as AccountData

  if (!data.wallet) {
    throw new Error('Account wallet not found')
  }

  if (!data.seed) {
    throw new Error('Account seed not found')
  }

  if (!data.publicKey) {
    throw new Error('Public key is empty')
  }
}

/**
 * Asserts whether string is not empty
 */
export function assertNotEmptyString(value: unknown): asserts value is string {
  assertString(value)

  if (value.length === 0) {
    throw new Error('String is empty')
  }
}

/**
 * Asserts whether Base64Url encoded string is passed
 */
export function assertBase64UrlData(value: unknown): asserts value is string {
  assertString(value)
  assertNotEmptyString(value)

  if (!/^[-A-Za-z0-9_]+[=]{0,2}$/.test(value)) {
    throw new Error('Incorrect symbols in Base64Url data')
  }
}

/**
 * Removes 0x from hex string
 */
export function removeZeroFromHex(value: string): string {
  return value.replace('0x', '')
}

/**
 * Creates topic for storing private key using username and password
 */
export function createCredentialsTopic(username: string, password: string): Utils.Bytes<32> {
  const topic = AUTH_VERSION + username + password

  return bmtHashString(topic)
}

/**
 * Asserts whether a valid chunk size is passed
 */
export function assertChunkSizeLength(value: unknown): asserts value is number {
  const data = value as number

  if (data !== CHUNK_SIZE) {
    throw new Error('Chunk size is not correct')
  }
}
