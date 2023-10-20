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

export function wrapBytesWithHelpers(data: Uint8Array): Data {
  return Object.assign(data, {
    text: () => new TextDecoder('utf-8').decode(data),
    json: () => JSON.parse(new TextDecoder('utf-8').decode(data)),
    hex: () => bytesToHex(data),
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

/**
 * Asserts that length is greater than or equal to min length
 * @param currentLength current length
 * @param minLength min length
 * @param customMessage custom error message
 */
export function assertMinLength(currentLength: number, minLength: number, customMessage?: string): void {
  if (currentLength < minLength) {
    throw new Error(customMessage ? customMessage : `length ${currentLength} is less than min length ${minLength}`)
  }
}

/**
 * Asserts that length is less than or equal to max length
 * @param currentLength currentLength
 * @param maxLength max length
 * @param customMessage custom error message
 */
export function assertMaxLength(currentLength: number, maxLength: number, customMessage?: string): void {
  if (currentLength > maxLength) {
    throw new Error(customMessage ? customMessage : `length ${currentLength} exceeds max length ${maxLength}`)
  }
}
