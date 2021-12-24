import {Bytes} from '../utils/bytes'
import {makeContentAddressedChunk} from '../chunk/cac'

const TopicLength = 32

export function epocId(time: any, level: any): Uint8Array {
  const result = new Uint8Array(8)
  result[7] = 31

  return result
}

export function getId(topic: Uint8Array, time: any = '', level: any = ''): Bytes<32> {
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
