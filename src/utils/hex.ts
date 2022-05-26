import { FlavoredType, Utils } from '@ethersphere/bee-js'

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
 * Converts array of number or Uint8Array to HexString without prefix.
 *
 * @param bytes   The input array
 * @param len     The length of the non prefixed HexString
 */
export function bytesToHex<Length extends number = number>(bytes: Uint8Array, len?: Length): HexString<Length> {
  return Utils.bytesToHex(bytes, len)
}
