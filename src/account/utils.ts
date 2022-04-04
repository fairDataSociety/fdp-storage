import { Data, Utils } from '@ethersphere/bee-js'
import { bmtHash } from '../chunk/bmt'
import { makeSpan, stringToBytes, wrapBytesWithHelpers } from '../utils/bytes'
import { AccountData } from './account-data'
import { isValidMnemonic } from 'ethers/lib/utils'

export const MNEMONIC_LENGTH = 12

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
