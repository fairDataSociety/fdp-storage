import { Utils } from '@ethersphere/bee-js';
export declare const MIN_PAYLOAD_SIZE = 1;
export declare const MAX_PAYLOAD_SIZE = 4096;
export declare type ChunkAddress = Utils.Bytes<32>;
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
    readonly data: Uint8Array;
    span(): Utils.Bytes<8>;
    payload(): Utils.FlexBytes<1, 4096>;
    address(): ChunkAddress;
}
/**
 * Creates a content addressed chunk and verifies the payload size.
 *
 * @param payloadBytes the data to be stored in the chunk
 */
export declare function makeContentAddressedChunk(payloadBytes: Uint8Array): Chunk;
