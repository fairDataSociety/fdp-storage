import { Data } from '@ethersphere/bee-js/dist/src/types'
import { bmtHash } from '../chunk/bmt'
import { makeSpan } from '../chunk/span'
import { Bytes, wrapBytesWithHelpers } from '../utils/bytes'

export function extractEncryptedMnemonic(data: Data): Data {
  // todo what is first 105 bytes?

  return wrapBytesWithHelpers(data.slice(105))
}

export function bmtHashString(stringData: string): Bytes<32> {
  const enc = new TextEncoder()
  const payload = enc.encode(stringData)
  const span = makeSpan(payload.length)
  const data = new Uint8Array([...span, ...payload])

  return bmtHash(data)
}
