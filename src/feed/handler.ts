import { Bytes } from '../utils/bytes'
import { makeContentAddressedChunk } from '../chunk/cac'
import Long from 'long'

const TopicLength = 32

export function epocId(time: number, level: number): number[] {
  const base = Long.fromNumber(time).and(Long.MAX_UNSIGNED_VALUE.shiftLeft(level))
  const result = base.toBytes()
  result[7] = level

  return result
}

// todo explain what it does
export function getId(topic: Uint8Array, time: any = '', level = 31): Bytes<32> {
  const bufId = new Uint8Array(40)
  let cursor = 0
  for (let i = 0; i < TopicLength; i++) {
    bufId[cursor] = topic[cursor]
    cursor++
  }
  const eid = epocId(time, level)
  for (let i = 0; i < eid.length; i++) {
    bufId[cursor + i] = eid[i]
  }

  return makeContentAddressedChunk(bufId).address()
}

export function getAddress() {
  /*
  func (h *Handler) getAddress(topic Topic, user utils.Address, epoch lookup.Epoch) (swarm.Address, error) {
	id, err := h.getId(topic, epoch.Time, epoch.Level)
	if err != nil {
		return swarm.ZeroAddress, err
	}
	addr, err := toSignDigest(id, user[:])
	if err != nil {
		return swarm.ZeroAddress, err
	}
	return swarm.NewAddress(addr), nil
}
   */
}
