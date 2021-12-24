import crypto from 'crypto'
import {keccak256, Message} from 'js-sha3'
import {Bytes} from './bytes'

const algorithm = 'aes-256-cfb'

export function keccak256Hash(...messages: Message[]): Bytes<32> {
  const hasher = keccak256.create()

  messages.forEach(bytes => hasher.update(bytes))

  return Uint8Array.from(hasher.digest()) as Bytes<32>
}

export function decrypt(keyStr: string, text: string) {
  const hash = crypto.createHash('sha256')
  hash.update(keyStr)
  const keyBytes = hash.digest()

  const contents = Buffer.from(text, 'base64')
  const iv = contents.slice(0, 16)
  const textBytes = contents.slice(16)
  const decipher = crypto.createDecipheriv(algorithm, keyBytes, iv)
  let res = decipher.update(textBytes, '', 'utf8')
  res += decipher.final('utf8')

  return res
}

export function encrypt(keyStr: string, text: string) {
  const hash = crypto.createHash('sha256')
  hash.update(keyStr)
  const keyBytes = hash.digest()

  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, keyBytes, iv)
  const enc = [iv, cipher.update(text, 'utf8')]
  enc.push(cipher.final())

  return Buffer.concat(enc).toString('base64')
}
