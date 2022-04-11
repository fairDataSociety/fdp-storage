import CryptoJS from 'crypto-js'
import { decodeBase64Url, encodeBase64Url } from './utils'

export const IV_LENGTH = 16

/**
 * Decrypt text with password
 *
 * @param password string to decrypt text
 * @param text text to be decrypted
 */
export function decrypt(password: string, text: string): string {
  const wordSize = 4
  const key = CryptoJS.SHA256(password)
  const contents = decodeBase64Url(text)
  const iv = CryptoJS.lib.WordArray.create(contents.words.slice(0, IV_LENGTH), IV_LENGTH)
  const textBytes = CryptoJS.lib.WordArray.create(
    contents.words.slice(IV_LENGTH / wordSize),
    contents.sigBytes - IV_LENGTH,
  )
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: textBytes,
  })

  return CryptoJS.AES.decrypt(cipherParams, key, {
    iv,
    mode: CryptoJS.mode.CFB,
    padding: CryptoJS.pad.NoPadding,
  }).toString(CryptoJS.enc.Utf8)
}

/**
 * Encrypt text with password
 *
 * @param password string to encrypt text
 * @param text text to be encrypted
 * @param customIv initial vector for AES. In case of absence, a random vector will be created
 */
export function encrypt(password: string, text: string, customIv?: CryptoJS.lib.WordArray): string {
  const iv = customIv || CryptoJS.lib.WordArray.random(IV_LENGTH)
  const key = CryptoJS.SHA256(password)

  const cipherParams = CryptoJS.AES.encrypt(text, key, {
    iv,
    mode: CryptoJS.mode.CFB,
    padding: CryptoJS.pad.NoPadding,
  })

  const out = iv.concat(cipherParams.ciphertext)

  return encodeBase64Url(out)
}
