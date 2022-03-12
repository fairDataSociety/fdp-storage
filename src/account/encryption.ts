import CryptoJS from 'crypto-js'
import { keccak256, Message } from 'js-sha3'
import { Bytes } from '@ethersphere/bee-js/dist/src/utils/bytes'

export const IV_LENGTH = 16

export function keccak256Hash(...messages: Message[]): Bytes<32> {
  const hasher = keccak256.create()

  messages.forEach(bytes => hasher.update(bytes))

  return Uint8Array.from(hasher.digest()) as Bytes<32>
}

/**
 * Decrypt text with password
 *
 * @param password
 * @param text
 */
export function decrypt(password: string, text: string): string {
  const wordSize = 4
  const key = CryptoJS.SHA256(password)
  const contents = CryptoJS.enc.Base64.parse(text)
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
 * @param password
 * @param text
 */
export function encrypt(password: string, text: string): string {
  const iv = CryptoJS.lib.WordArray.random(IV_LENGTH)
  const key = CryptoJS.SHA256(password)

  const cipherParams = CryptoJS.AES.encrypt(text, key, {
    iv,
    mode: CryptoJS.mode.CFB,
    padding: CryptoJS.pad.NoPadding,
  })

  return iv.concat(cipherParams.ciphertext).toString(CryptoJS.enc.Base64)
}
