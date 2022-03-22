import { Utils } from '@ethersphere/bee-js'
import { makeContentAddressedChunk } from '../chunk/cac'
import { longToByteArray } from '../utils/bytes'

const TOPIC_LENGTH = 32

export function epochId(time: number, level: number): Utils.Bytes<8> {
  const base = time & (Number.MAX_SAFE_INTEGER << level)
  const result = longToByteArray(base)
  result[7] = level

  return result
}

export function getId(topic: Uint8Array, time = 0, level = 31): Utils.Bytes<32> {
  const bufId = new Uint8Array(40)
  let cursor = 0
  for (let i = 0; i < TOPIC_LENGTH; i++) {
    bufId[cursor] = topic[cursor]
    cursor++
  }
  const eid = epochId(time, level)
  for (let i = 0; i < eid.length; i++) {
    bufId[cursor + i] = eid[i]
  }

  return makeContentAddressedChunk(bufId).address()
}
