import { BrandedType, Utils } from '@ethersphere/bee-js'
import { bmtHash } from './bmt'
import { assertFlexBytes, makeSpan, serializeBytes, SPAN_SIZE } from '../utils/bytes'

export const MIN_PAYLOAD_SIZE = 1
export const MAX_PAYLOAD_SIZE = 4096

const CAC_SPAN_OFFSET = 0
const CAC_PAYLOAD_OFFSET = CAC_SPAN_OFFSET + SPAN_SIZE

export type ChunkAddress = Utils.Bytes<32>

/**
 * General chunk interface for Swarm
 *
 * It stores the serialized data and provides functions to access
 * the fields of a chunk.
 *
 * It also provides an address function to calculate the address of
 * the chunk that is required for the Chunk API.
 */
export interface Chunk {
  readonly data: Uint8Array
  span(): Utils.Bytes<8>
  payload(): Utils.FlexBytes<1, 4096>

  address(): ChunkAddress
}

type ValidChunkData = BrandedType<Uint8Array, 'ValidChunkData'>

/**
 * Creates a content addressed chunk and verifies the payload size.
 *
 * @param payloadBytes the data to be stored in the chunk
 */
export function makeContentAddressedChunk(payloadBytes: Uint8Array): Chunk {
  const span = makeSpan(payloadBytes.length)
  assertFlexBytes(payloadBytes, MIN_PAYLOAD_SIZE, MAX_PAYLOAD_SIZE)
  const data = serializeBytes(span, payloadBytes) as ValidChunkData

  return {
    data,
    span: () => span,
    payload: () => Utils.flexBytesAtOffset(data, CAC_PAYLOAD_OFFSET, MIN_PAYLOAD_SIZE, MAX_PAYLOAD_SIZE),
    address: () => bmtHash(data),
  }
}
