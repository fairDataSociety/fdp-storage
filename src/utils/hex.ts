import { BrandedType, FlavoredType, Utils } from '@ethersphere/bee-js'

/**
 * Nominal type to represent hex strings WITHOUT '0x' prefix.
 * For example for 32 bytes hex representation you have to use 64 length.
 * TODO: Make Length mandatory: https://github.com/ethersphere/bee-js/issues/208
 */
export type HexString<Length extends number = number> = FlavoredType<
  string & {
    readonly length: Length
  },
  'HexString'
>

/**
 * Type for HexString with prefix.
 * The main hex type used internally should be non-prefixed HexString
 * and therefore this type should be used as least as possible.
 * Because of that it does not contain the Length property as the variables
 * should be validated and converted to HexString ASAP.
 */
export type PrefixedHexString = BrandedType<string, 'PrefixedHexString'>

/**
 * Converts array of number or Uint8Array to HexString without prefix.
 *
 * @param bytes   The input array
 * @param len     The length of the non prefixed HexString
 */
export function bytesToHex<Length extends number = number>(bytes: Uint8Array, len?: Length): HexString<Length> {
  return Utils.bytesToHex(bytes, len)
}

/**
 * Type guard for HexStrings.
 * Requires no 0x prefix!
 *
 * TODO: Make Length mandatory: https://github.com/ethersphere/bee-js/issues/208
 *
 * @param s string input
 * @param len expected length of the HexString
 */
export function isHexString<Length extends number = number>(s: unknown, len?: number): s is HexString<Length> {
  return typeof s === 'string' && /^[0-9a-f]+$/i.test(s) && (!len || s.length === len)
}

/**
 * Type guard for PrefixedHexStrings.
 * Does enforce presence of 0x prefix!
 *
 * @param s string input
 */
export function isPrefixedHexString(s: unknown): s is PrefixedHexString {
  return typeof s === 'string' && /^0x[0-9a-f]+$/i.test(s)
}

/**
 * Verifies if the provided input is a HexString.
 *
 * TODO: Make Length mandatory: https://github.com/ethersphere/bee-js/issues/208
 *
 * @param s string input
 * @param len expected length of the HexString
 * @param name optional name for the asserted value
 * @returns HexString or throws error
 */
export function assertHexString<Length extends number = number>(
  s: unknown,
  len?: number,
  name = 'value',
): asserts s is HexString<Length> {
  if (!isHexString(s, len)) {
    if (isPrefixedHexString(s)) {
      throw new TypeError(`${name} not valid non prefixed hex string (has 0x prefix): ${s}`)
    }

    // Don't display length error if no length specified in order not to confuse user
    const lengthMsg = len ? ` of length ${len}` : ''
    throw new TypeError(`${name} not valid hex string${lengthMsg}: ${s}`)
  }
}

/**
 * Verifies if the provided input is a PrefixedHexString.
 *
 * @param s string input
 * @param name optional name for the asserted value
 * @returns HexString or throws error
 */
export function assertPrefixedHexString(s: string, name = 'value'): asserts s is PrefixedHexString {
  if (!isPrefixedHexString(s)) {
    throw new TypeError(`${name} not valid prefixed hex string: ${s}`)
  }
}
