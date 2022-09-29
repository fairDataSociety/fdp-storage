import { Utils } from '@ethersphere/bee-js';
export type { PublicKey } from '@fairdatasociety/fdp-contracts';
export declare const ETH_ADDR_HEX_LENGTH = 40;
/**
 * Asserts that the given value is a number
 */
export declare function assertNumber(value: unknown): asserts value is number;
/**
 * Asserts that the given value is a string
 */
export declare function assertString(value: unknown): asserts value is string;
/**
 * Checks that value is a valid Ethereum address string (without 0x prefix)
 */
export declare function isEthAddress(value: unknown): value is Utils.EthAddress;
/**
 * Checks that value is a string
 */
export declare function isString(value: unknown): value is string;
/**
 * Checks that value is a number
 */
export declare function isNumber(value: unknown): value is number;
/**
 * Checks that value is an object
 */
export declare function isObject(value: unknown): value is object;
