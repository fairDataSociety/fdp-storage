import { ENCRYPTED_REFERENCE_HEX_LENGTH, FlavoredType, Utils } from '@ethersphere/bee-js';
export declare type EncryptedReference = Utils.HexString<typeof ENCRYPTED_REFERENCE_HEX_LENGTH>;
export declare type HexEthAddress = HexString<40>;
/**
 * Nominal type to represent hex strings WITHOUT '0x' prefix.
 * For example for 32 bytes hex representation you have to use 64 length.
 * TODO: Make Length mandatory: https://github.com/ethersphere/bee-js/issues/208
 */
export declare type HexString<Length extends number = number> = FlavoredType<string & {
    readonly length: Length;
}, 'HexString'>;
/**
 * Converts array of number or Uint8Array to HexString without prefix.
 *
 * @param bytes   The input array
 * @param len     The length of the non prefixed HexString
 */
export declare function bytesToHex<Length extends number = number>(bytes: Uint8Array, len?: Length): HexString<Length>;
/**
 * Checks that value is a hex eth address
 * @param address
 */
export declare function isHexEthAddress(address: string | HexString | HexEthAddress): address is HexEthAddress;
/**
 * Asserts that the given value is a hex eth address
 */
export declare function assertHexEthAddress(value: unknown): asserts value is HexEthAddress;
/**
 * Verifies if encrypted reference is correct
 */
export declare function assertEncryptedReference(value: unknown): asserts value is EncryptedReference;
