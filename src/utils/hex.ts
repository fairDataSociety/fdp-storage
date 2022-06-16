import { ENCRYPTED_REFERENCE_HEX_LENGTH, FlavoredType, Utils } from '@ethersphere/bee-js'

export type EncryptedReference = Utils.HexString<typeof ENCRYPTED_REFERENCE_HEX_LENGTH>
export type HexEthAddress = HexString<40>

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

/**
 * Checks that value is a hex eth address
 * @param address
 */
export function isHexEthAddress(address: string | HexString | HexEthAddress): address is HexEthAddress {
  return Utils.isHexEthAddress(address)
}

/**
 * Asserts that the given value is a hex eth address
 */
export function assertHexEthAddress(value: unknown): asserts value is HexEthAddress {
  const data = value as HexEthAddress

  if (!isHexEthAddress(data)) {
    throw new Error('Expected a number')
  }
}
