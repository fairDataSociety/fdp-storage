import { Data } from '@ethersphere/bee-js/dist/src/types'
import { bmtHash } from '../chunk/bmt'
import { makeSpan } from '../chunk/span'
import { Bytes, wrapBytesWithHelpers } from '../utils/bytes'
import AccountData from './account-data'

export function extractChunkData(data: Data): Data {
  return wrapBytesWithHelpers(data.slice(105))
}

export function bmtHashString(stringData: string): Bytes<32> {
  const enc = new TextEncoder()
  const payload = enc.encode(stringData)
  const span = makeSpan(payload.length)
  const data = new Uint8Array([...span, ...payload])

  return bmtHash(data)
}

export function validateUsername(data: string): void {
  if (!data) {
    throw new Error('Incorrect username')
  }
}

export function validatePassword(data: string): void {
  if (!data) {
    throw new Error('Incorrect password')
  }
}

export function validateMnemonic(data: string): void {
  if (!data) {
    throw new Error('Incorrect mnemonic')
  }
}

export function validateAddress(data: string): void {
  if (!data) {
    throw new Error('Incorrect address')
  }
}

export function validateActiveAccount(data: AccountData): void {
  if (!data.wallet) {
    throw new Error('Active account not found')
  }
}
