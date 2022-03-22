import { BeeDebug, Data, Utils } from '@ethersphere/bee-js'
import { bmtHash } from '../chunk/bmt'
import { makeSpan, wrapBytesWithHelpers } from '../utils/bytes'
import AccountData from './account-data'
import { assertHexString, assertPrefixedHexString } from '../utils/hex'

export const MNEMONIC_LENGTH = 12
export const ADDRESS_LENGTH = 40

export function extractChunkData(data: Data): Data {
  return wrapBytesWithHelpers(data.slice(105))
}

export function bmtHashString(stringData: string): Utils.Bytes<32> {
  const enc = new TextEncoder()
  const payload = enc.encode(stringData)
  const span = makeSpan(payload.length)
  const data = new Uint8Array([...span, ...payload])

  return bmtHash(data)
}

export function assertAddress(data: string): void {
  assertPrefixedHexString(data, 'Address')
  assertHexString(data.replace('0x', ''), ADDRESS_LENGTH, 'Address')
}

export function assertUsername(data: string): void {
  if (!data) {
    throw new Error('Incorrect username')
  }
}

export function assertPassword(data: string): void {
  if (!data) {
    throw new Error('Incorrect password')
  }
}

export function assertMnemonic(data: string): void {
  const words = data.split(' ')

  if (words.length !== MNEMONIC_LENGTH) {
    throw new Error('Incorrect mnemonic')
  }
}

export function assertActiveAccount(data: AccountData): void {
  if (!data.wallet) {
    throw new Error('Active account not found')
  }
}
