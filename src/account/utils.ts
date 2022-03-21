import { BeeDebug, Data } from '@ethersphere/bee-js'
import { bmtHash } from '../chunk/bmt'
import { makeSpan, wrapBytesWithHelpers } from '../utils/bytes'
import { Bytes } from '@ethersphere/bee-js/dist/types/utils/bytes'
import AccountData from './account-data'
import { assertHexString, assertPrefixedHexString } from '../utils/hex'

export const MNEMONIC_LENGTH = 12
export const ADDRESS_LENGTH = 40

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

export async function getBatchId(beeDebug: BeeDebug): Promise<string> {
  const batches = await beeDebug.getAllPostageBatch()

  if (batches.length === 0) {
    throw new Error('Postage batch not exists')
  }

  const batchId = batches.pop()?.batchID

  if (!batchId) {
    throw new Error('Incorrect batch id found')
  }

  return batchId
}
