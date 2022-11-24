import { Utils } from '@fairdatasociety/bee-js'
import { makeContentAddressedChunk } from '../chunk/cac'
import { Epoch, HIGHEST_LEVEL } from './lookup/epoch'

const TOPIC_LENGTH = 32

/**
 * Calculates swarm reference with passed params
 *
 * @param topic identification of content
 * @param time time in epoch for content
 * @param level level in epoch for content
 * @returns swarm reference
 */
export function getId(topic: Utils.Bytes<32>, time = 0, level = HIGHEST_LEVEL): Utils.Bytes<32> {
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
