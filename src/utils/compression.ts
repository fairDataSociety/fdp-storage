import pako from 'pako'

/**
 * Compresses the given data using gzip
 * @param data input data
 */
export function compress(data: Uint8Array): Uint8Array {
  return pako.deflate(data)
}

/**
 * Decompresses the given data using gzip
 * @param data input data
 */
export function decompress(data: Uint8Array): Uint8Array {
  return pako.inflate(data)
}
