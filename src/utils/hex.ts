import { ENCRYPTED_REFERENCE_HEX_LENGTH, FlavoredType, Reference, Utils } from '@ethersphere/bee-js'

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
 * Verifies if encrypted reference is correct
 */
export function assertEncryptedReference(value: unknown): asserts value is EncryptedReference {
  const data = value as Reference

  if (!(data.length === ENCRYPTED_REFERENCE_HEX_LENGTH && Utils.isHexString(data))) {
    throw new Error('Incorrect encrypted reference')
  }
}
