import CryptoJS from 'crypto-js'
import { PrivateKeyBytes, Utils } from '@ethersphere/bee-js'
import { ec as EC } from 'elliptic'
import { utils } from 'ethers'
import { bytesToHex } from './hex'
import { bytesToString, bytesToWordArray, wordArrayToBytes } from './bytes'
import { isArrayBufferView, isString } from './type'
import { jsonParse } from './json'

export const IV_LENGTH = 16
export const POD_PASSWORD_LENGTH = 32
/**
 * Bytes for encryption pod data
 */
export declare type PodPasswordBytes = Utils.Bytes<32>

/**
 * Decrypts WordsArray with password
 *
 * @param password string to decrypt bytes
 * @param data WordsArray to be decrypted
 */
export function decrypt(
  password: string | CryptoJS.lib.WordArray,
  data: CryptoJS.lib.WordArray,
): CryptoJS.lib.WordArray {
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

/**
 * Decrypt bytes with bytes password
 */
export function decryptWithBytes(password: Uint8Array, data: Uint8Array): Uint8Array {
  return wordArrayToBytes(decrypt(bytesToWordArray(password), bytesToWordArray(data)))
}

/**
 * Decrypt data and converts it from JSON string to object
 *
 * @param password password in form of string or bytes
 * @param data array of bytes for decrypting
 */
export function decryptJson(password: string | Uint8Array, data: Uint8Array): unknown {
  let passwordString

  if (isArrayBufferView(password)) {
    passwordString = bytesToHex(password)
  } else if (isString(password)) {
    passwordString = password
  } else {
    throw new Error('Incorrect password type')
  }

  return jsonParse(bytesToString(decryptBytes(passwordString, data)), 'decrypted json')
}

/**
 * Derives shared secret using private and public keys from different pairs
 * @param privateKey Private key as a hex string
 * @param publicKey Public key as a hex string
 * @returns secret
 */
export function deriveSecretFromKeys(privateKey: string, publicKey: string): Uint8Array {
  const ec = new EC('secp256k1')

  const privateKeyPair = ec.keyFromPrivate(utils.arrayify(privateKey), 'bytes')
  const publicKeyPair = ec.keyFromPublic(publicKey.substring(2), 'hex')

  const derivedHex = '0x' + privateKeyPair.derive(publicKeyPair.getPublic()).toString(16)

  return wordArrayToBytes(CryptoJS.SHA256(bytesToWordArray(utils.arrayify(derivedHex))))
}
