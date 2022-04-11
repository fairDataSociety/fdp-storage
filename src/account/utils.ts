import { Data, Utils } from '@ethersphere/bee-js'
import { bmtHash } from '../chunk/bmt'
import { makeSpan, stringToBytes, wrapBytesWithHelpers } from '../utils/bytes'
import { AccountData } from './account-data'
import { isValidMnemonic } from 'ethers/lib/utils'
import CryptoJS from 'crypto-js'

export const MNEMONIC_LENGTH = 12
export const MAX_CHUNK_LENGTH = 4096

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
  return CryptoJS.enc.Base64url.parse(data.replaceAll('=', ''))
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
 * @param stringData
 * @returns the keccak256 hash in a byte array
 */
export function bmtHashString(stringData: string): Utils.Bytes<32> {
  const payload = stringToBytes(stringData)

  return bmtHashBytes(payload)
}

/**
 * Calculate a Binary Merkle Tree hash for a bytes array
 *
 * @param payload
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
 * @param data username
 */
export function assertUsername(data: string): void {
  if (!data) {
    throw new Error('Incorrect username')
  }
}

/**
 * Asserts whether non-empty password passed
 *
 * @param data password
 */
export function assertPassword(data: string): void {
  if (!data) {
    throw new Error('Incorrect password')
  }
}

/**
 * Asserts whether a valid mnemonic phrase has been passed
 *
 * @param data mnemonic phrase
 */
export function assertMnemonic(data: string): void {
  const words = data.split(' ')

  if (!(words.length === MNEMONIC_LENGTH && isValidMnemonic(data))) {
    throw new Error('Incorrect mnemonic')
  }
}

/**
 * Asserts whether an active account is defined
 *
 * @param data instance of AccountData to check
 */
export function assertActiveAccount(data: AccountData): void {
  if (!data.wallet) {
    throw new Error('Active account not found')
  }
}

/**
 * Asserts whether string is not empty
 *
 * @param data
 */
export function assertEmptyString(data: string): void {
  if (data.length === 0) {
    throw new Error('String is empty')
  }
}

/**
 * Asserts whether Base64Url encoded string is passed
 *
 * @param data
 */
export function assertBase64UrlData(data: string): void {
  assertEmptyString(data)

  if (!/^[-A-Za-z0-9_]+[=]{0,2}$/.test(data)) {
    throw new Error('Incorrect symbols in Base64Url data')
  }
}
