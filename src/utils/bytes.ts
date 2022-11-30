/**
 * Helper type for dealing with fixed size byte arrays.
 *
 * It changes the type of `length` property of `Uint8Array` to the
 * generic `Length` type parameter which is runtime compatible with
 * the original, because it extends from the `number` type.
 */
import { Data, Utils } from '@ethersphere/bee-js'
import { bytesToHex } from './hex'
import { BeeArgumentError } from './error'
import CryptoJS from 'crypto-js'

export const SPAN_SIZE = 8

// we limit the maximum span size in 32 bits to avoid BigInt compatibility issues
const MAX_SPAN_LENGTH = 2 ** 32 - 1

/**
 * Type guard for `Bytes<T>` type
 *
 * @param b       The byte array
 * @param length  The length of the byte array
 */
export function isBytes<Length extends number>(b: unknown, length: Length): b is Utils.Bytes<Length> {
  return b instanceof Uint8Array && b.length === length
}

/**
 * Verifies if a byte array has a certain length
 *
 * @param b       The byte array
 * @param length  The specified length
 */
export function assertBytes<Length extends number>(b: unknown, length: Length): asserts b is Utils.Bytes<Length> {
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
export function makeBytes<Length extends number>(length: Length): Utils.Bytes<Length> {
  return new Uint8Array(length) as Utils.Bytes<Length>
}

export function wrapBytesWithHelpers(data: Uint8Array): Data {
  return Object.assign(data, {
    text: () => new TextDecoder('utf-8').decode(data),
    json: () => JSON.parse(new TextDecoder('utf-8').decode(data)),
    hex: () => bytesToHex(data),
    bytes: () => data,
  })
}

/**
 * Converts long number to bytes array
 *
 * @param long long number
 * @returns representing a long as an array of bytes
 */
export function longToByteArray(long: number): Utils.Bytes<8> {
  const byteArray = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0])

  for (let index = 0; index < byteArray.length; index++) {
    const byte = long & 0xff
    byteArray[index] = byte
    long = (long - byte) / 256
  }

  return byteArray as Utils.Bytes<8>
}

/**
 * Helper function for serialize byte arrays
 *
 * @param arrays Any number of byte array arguments
 */
export function serializeBytes(...arrays: Uint8Array[]): Uint8Array {
  const length = arrays.reduce((prev, curr) => prev + curr.length, 0)
  const buffer = new Uint8Array(length)
  let offset = 0
  arrays.forEach(arr => {
    buffer.set(arr, offset)
    offset += arr.length
  })

  return buffer
}

/**
 * Create a span for storing the length of the chunk
 *
 * The length is encoded in 64-bit little endian.
 *
 * @param length The length of the span
 */
export function makeSpan(length: number): Utils.Bytes<8> {
  if (length <= 0) {
    throw new BeeArgumentError('invalid length for span', length)
  }

  if (length > MAX_SPAN_LENGTH) {
    throw new BeeArgumentError('invalid length (> MAX_SPAN_LENGTH)', length)
  }

  const span = new Uint8Array(SPAN_SIZE)
  const dataView = new DataView(span.buffer)
  const littleEndian = true
  const lengthLower32 = length & 0xffffffff

  dataView.setUint32(0, lengthLower32, littleEndian)

  return span as Utils.Bytes<8>
}

/**
 * Converts string to bytes array
 *
 * @param data string data
 */
export function stringToBytes(data: string): Uint8Array {
  return new TextEncoder().encode(data)
}

/**
 * Converts bytes array to string
 *
 * @param data bytes data
 */
export function bytesToString(data: Uint8Array): string {
  return new TextDecoder().decode(data)
}

export function assertFlexBytes<Min extends number, Max extends number = Min>(
  b: unknown,
  min: Min,
  max: Max,
): asserts b is Utils.FlexBytes<Min, Max> {
  return Utils.assertFlexBytes(b, min, max)
}

/**
 * Converts bytes to CryptoJS WordArray
 */
export function bytesToWordArray(data: Uint8Array): CryptoJS.lib.WordArray {
  return CryptoJS.enc.Hex.parse(bytesToHex(data))
}

/**
 * Converts word array to bytes
 */
export function wordArrayToBytes(data: CryptoJS.lib.WordArray): Uint8Array {
  return Utils.hexToBytes(CryptoJS.enc.Hex.stringify(data))
}
