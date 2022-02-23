import { Data } from '@ethersphere/bee-js/dist/src/types'
import { bmtHash } from '../chunk/bmt'
import { makeSpan } from '../chunk/span'
import { Bytes, wrapBytesWithHelpers } from '../utils/bytes'
import AccountData from './account-data'
import { BeeDebug } from '@ethersphere/bee-js'
import { assertPrefixedHexString } from '../utils/hex'
import { assertAddress as typeAssertAddress } from '../utils/type'

export const mnemonicLength = 12

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
  typeAssertAddress(data.replace('0x', ''))
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

  if (words.length !== mnemonicLength) {
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
