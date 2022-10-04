import CryptoJS from 'crypto-js'
import { decodeBase64Url, encodeBase64Url } from '../account/utils'
import { PrivateKeyBytes, Utils } from '@ethersphere/bee-js'
import { bytesToHex } from './hex'
import { bytesToWordArray, wordArrayToBytes } from './bytes'

export const IV_LENGTH = 16
export const POD_PASSWORD_LENGTH = 32
/**
 * Bytes for encryption pod data
 */
export declare type PodPasswordBytes = Utils.Bytes<32>

/**
 * Decrypts text with password
 *
 * @deprecated method for v1 accounts
 *
 * @param password string to decrypt text
 * @param text text to be decrypted
 */
export function decryptText(password: string, text: string): string {
  return decrypt(password, decodeBase64Url(text)).toString(CryptoJS.enc.Utf8)
}

/**
 * Decrypts WordsArray with password
 *
 * @param password string to decrypt bytes
 * @param data WordsArray to be decrypted
 */
export function decrypt(password: string, data: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray {
  const wordSize = 4
  const key = CryptoJS.SHA256(password)
  const iv = CryptoJS.lib.WordArray.create(data.words.slice(0, IV_LENGTH), IV_LENGTH)
  const textBytes = CryptoJS.lib.WordArray.create(data.words.slice(IV_LENGTH / wordSize), data.sigBytes - IV_LENGTH)
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: textBytes,
  })

  return CryptoJS.AES.decrypt(cipherParams, key, {
    iv,
    mode: CryptoJS.mode.CFB,
    padding: CryptoJS.pad.NoPadding,
  })
}

/**
 * Encrypts text with password
 *
 * @deprecated method for v1 accounts
 *
 * @param password string to encrypt text
 * @param text text to be encrypted
 * @param customIv initial vector for AES. In case of absence, a random vector will be created
 */
export function encryptText(password: string, text: string, customIv?: CryptoJS.lib.WordArray): string {
  return encodeBase64Url(encrypt(password, text, customIv))
}

/**
 * Encrypt WordArray with password
 *
 * @param password string for text encryption
 * @param data WordArray to be encrypted
 * @param customIv initial vector for AES. In case of absence, a random vector will be created
 */
export function encrypt(
  password: string,
  data: CryptoJS.lib.WordArray | string,
  customIv?: CryptoJS.lib.WordArray,
): CryptoJS.lib.WordArray {
  const iv = customIv || CryptoJS.lib.WordArray.random(IV_LENGTH)
  const key = CryptoJS.SHA256(password)

  const cipherParams = CryptoJS.AES.encrypt(data, key, {
    iv,
    mode: CryptoJS.mode.CFB,
    padding: CryptoJS.pad.NoPadding,
  })

  return iv.concat(cipherParams.ciphertext)
}

/**
 * Encrypt bytes with password
 */
export function encryptBytes(password: PrivateKeyBytes | string, data: Uint8Array, customIv?: Uint8Array): Uint8Array {
  return wordArrayToBytes(
    encrypt(
      typeof password === 'string' ? password : bytesToHex(password),
      bytesToWordArray(data),
      customIv ? bytesToWordArray(customIv) : customIv,
    ),
  )
}

/**
 * Decrypt bytes with password
 */
export function decryptBytes(password: string, data: Uint8Array): Uint8Array {
  return wordArrayToBytes(decrypt(password, bytesToWordArray(data)))
}
