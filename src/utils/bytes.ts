/**
 * Helper type for dealing with fixed size byte arrays.
 *
 * It changes the type of `length` property of `Uint8Array` to the
 * generic `Length` type parameter which is runtime compatible with
 * the original, because it extends from the `number` type.
 */
import { Data } from '@ethersphere/bee-js'
import { Bytes } from '@ethersphere/bee-js/dist/types/utils/bytes'
import { bytesToHex } from './hex'

/**
 * Type guard for `Bytes<T>` type
 *
 * @param b       The byte array
 * @param length  The length of the byte array
 */
export function isBytes<Length extends number>(b: unknown, length: Length): b is Bytes<Length> {
  return b instanceof Uint8Array && b.length === length
}

/**
 * Verifies if a byte array has a certain length
 *
 * @param b       The byte array
 * @param length  The specified length
 */
export function assertBytes<Length extends number>(b: unknown, length: Length): asserts b is Bytes<Length> {
  if (!isBytes(b, length)) {
    throw new TypeError(`Parameter is not valid Bytes of length: ${length} !== ${(b as Uint8Array).length}`)
  }
}

/**
 * Returns true if two byte arrays are equal
 *
 * @param a Byte array to compare
 * @param b Byte array to compare
 */
export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

/**
 * Returns a new byte array filled with zeroes with the specified length
 *
 * @param length The length of data to be returned
 */
export function makeBytes<Length extends number>(length: Length): Bytes<Length> {
  return new Uint8Array(length) as Bytes<Length>
}

export function wrapBytesWithHelpers(data: Uint8Array): Data {
  return Object.assign(data, {
    text: () => new TextDecoder('utf-8').decode(data),
    json: () => JSON.parse(new TextDecoder('utf-8').decode(data)),
    hex: () => bytesToHex(data),
  })
}

/**
 * Converting long number to bytes array
 *
 * @param long bytes array
 */
export function longToByteArray(long: number): number[] {
  const byteArray = [0, 0, 0, 0, 0, 0, 0, 0]

  for (let index = 0; index < byteArray.length; index++) {
    const byte = long & 0xff
    byteArray[index] = byte
    long = (long - byte) / 256
  }

  return byteArray
}
