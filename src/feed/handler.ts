import { Utils } from '@ethersphere/bee-js'
import { makeContentAddressedChunk } from '../chunk/cac'
import { Epoch } from './lookup/epoch'

const TOPIC_LENGTH = 32

export function getId(topic: Uint8Array, time = 0, level = 31): Utils.Bytes<32> {
  const bufId = new Uint8Array(40)
  let cursor = 0
  for (let i = 0; i < TOPIC_LENGTH; i++) {
    bufId[cursor] = topic[cursor]
    cursor++
  }

  const epoch = new Epoch(level, time)
  const eid = epoch.id()
  for (let i = 0; i < eid.length; i++) {
    bufId[cursor + i] = eid[i]
  }

  return makeContentAddressedChunk(bufId).address()
}
