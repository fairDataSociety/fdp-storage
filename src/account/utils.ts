import { Data } from '@ethersphere/bee-js/dist/src/types'
import { Bytes, wrapBytesWithHelpers } from '../utils/bytes'
import { makeSpan } from '../chunk/span'
import { bmtHash } from '../chunk/bmt'

export function extractChunkData(data: Data) {
  // todo what is first 105 bytes?

  return wrapBytesWithHelpers(data.slice(105))
}

export function bmtHashString(stringData: string): Bytes<32> {
  const enc = new TextEncoder()
  const stringBytes = enc.encode(stringData)
  const payload = new Uint8Array(stringBytes)
  const span = makeSpan(payload.length)
  const data = new Uint8Array([...span, ...payload])

  return bmtHash(data)
}
