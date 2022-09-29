import { Utils } from '@ethersphere/bee-js';
/**
 * Calculate a Binary Merkle Tree hash for a chunk
 *
 * The BMT chunk address is the hash of the 8 byte span and the root
 * hash of a binary Merkle tree (BMT) built on the 32-byte segments
 * of the underlying data.
 *
 * If the chunk content is less than 4k, the hash is calculated as
 * if the chunk was padded with all zeros up to 4096 bytes.
 *
 * @param chunkContent Chunk data including span and payload as well
 *
 * @returns the keccak256 hash in a byte array
 */
export declare function bmtHash(chunkContent: Uint8Array): Utils.Bytes<32>;
