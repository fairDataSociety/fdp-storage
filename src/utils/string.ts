import CryptoJS from 'crypto-js'

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
