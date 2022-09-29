/**
 * Helper type for dealing with fixed size byte arrays.
 *
 * It changes the type of `length` property of `Uint8Array` to the
 * generic `Length` type parameter which is runtime compatible with
 * the original, because it extends from the `number` type.
 */
import { Data, Utils } from '@ethersphere/bee-js';
export declare const SPAN_SIZE = 8;
/**
 * Type guard for `Bytes<T>` type
 *
 * @param b       The byte array
 * @param length  The length of the byte array
 */
export declare function isBytes<Length extends number>(b: unknown, length: Length): b is Utils.Bytes<Length>;
/**
 * Verifies if a byte array has a certain length
 *
 * @param b       The byte array
 * @param length  The specified length
 */
export declare function assertBytes<Length extends number>(b: unknown, length: Length): asserts b is Utils.Bytes<Length>;
/**
 * Returns true if two byte arrays are equal
 *
 * @param a Byte array to compare
 * @param b Byte array to compare
 */
export declare function bytesEqual(a: Uint8Array, b: Uint8Array): boolean;
/**
 * Returns a new byte array filled with zeroes with the specified length
 *
 * @param length The length of data to be returned
 */
export declare function makeBytes<Length extends number>(length: Length): Utils.Bytes<Length>;
export declare function wrapBytesWithHelpers(data: Uint8Array): Data;
/**
 * Converts long number to bytes array
 *
 * @param long long number
 * @returns representing a long as an array of bytes
 */
export declare function longToByteArray(long: number): Utils.Bytes<8>;
/**
 * Helper function for serialize byte arrays
 *
 * @param arrays Any number of byte array arguments
 */
export declare function serializeBytes(...arrays: Uint8Array[]): Uint8Array;
/**
 * Create a span for storing the length of the chunk
 *
 * The length is encoded in 64-bit little endian.
 *
 * @param length The length of the span
 */
export declare function makeSpan(length: number): Utils.Bytes<8>;
/**
 * Converts string to bytes array
 *
 * @param data string data
 */
export declare function stringToBytes(data: string): Uint8Array;
export declare function assertFlexBytes<Min extends number, Max extends number = Min>(b: unknown, min: Min, max: Max): asserts b is Utils.FlexBytes<Min, Max>;
