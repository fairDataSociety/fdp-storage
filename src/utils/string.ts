import CryptoJS from 'crypto-js'
import { ENCRYPTED_REFERENCE_HEX_LENGTH, Reference, REFERENCE_HEX_LENGTH, Utils } from '@ethersphere/bee-js'

/**
 * Replace all occurrences of a string with another string
 *
 * @param data input string
 * @param search string to search for
 * @param replacement string to replace with
 */
export function replaceAll(data: string, search: string, replacement: string): string {
  return data.replace(new RegExp(search, 'g'), replacement)
}

/**
 * Generate random base64 string with passed length
 */
export function generateRandomBase64String(length = 10): string {
  return CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Base64).substring(0, length)
}

/**
 * Asserts that the given value is a Reference
 * @param value value to assert
 */
export function assertReference(value: unknown): asserts value is Reference {
  try {
    Utils.assertHexString(value, REFERENCE_HEX_LENGTH)
  } catch (e) {
    Utils.assertHexString(value, ENCRYPTED_REFERENCE_HEX_LENGTH)
  }
}
