import { Data, Utils } from '@ethersphere/bee-js';
import { AccountData } from './account-data';
import CryptoJS from 'crypto-js';
export declare const MNEMONIC_LENGTH = 12;
export declare const MAX_CHUNK_LENGTH = 4096;
export declare const AUTH_VERSION = "FDP-login-v1.0";
export declare const CHUNK_SIZE = 4096;
export declare const SEED_SIZE = 64;
export declare const HD_PATH = "m/44'/60'/0'/0/0";
/**
 * Encode input data to Base64Url with Go lang compatible paddings
 *
 * @param data input data to encode
 */
export declare function encodeBase64Url(data: CryptoJS.lib.WordArray): string;
/**
 * Decode input Base64Url data to string
 *
 * @param data Base64Url data
 */
export declare function decodeBase64Url(data: string): CryptoJS.lib.WordArray;
/**
 * Extracts only content from chunk data
 *
 * @param data full chunk data
 */
export declare function extractChunkContent(data: Data): Data;
/**
 * Calculate a Binary Merkle Tree hash for a string
 *
 * @returns the keccak256 hash in a byte array
 */
export declare function bmtHashString(stringData: string): Utils.Bytes<32>;
/**
 * Calculate a Binary Merkle Tree hash for a bytes array
 *
 * @returns the keccak256 hash in a byte array
 */
export declare function bmtHashBytes(payload: Uint8Array): Utils.Bytes<32>;
/**
 * Asserts whether non-empty username passed
 *
 * @param value FDP username
 */
export declare function assertUsername(value: unknown): asserts value is string;
/**
 * Asserts whether non-empty password passed
 *
 * @param value password
 */
export declare function assertPassword(value: unknown): asserts value is string;
/**
 * Asserts whether a valid mnemonic phrase has been passed
 *
 * @param value mnemonic phrase
 */
export declare function assertMnemonic(value: unknown): asserts value is string;
/**
 * Asserts whether an account is defined
 *
 * @param value instance of AccountData to check
 */
export declare function assertAccount(value: unknown): asserts value is AccountData;
/**
 * Asserts whether an account is defined
 *
 * @param value instance of AccountData to check
 */
export declare function assertRegistrationAccount(value: unknown): asserts value is AccountData;
/**
 * Asserts whether string is not empty
 */
export declare function assertNotEmptyString(value: unknown): asserts value is string;
/**
 * Asserts whether Base64Url encoded string is passed
 */
export declare function assertBase64UrlData(value: unknown): asserts value is string;
/**
 * Removes 0x from hex string
 */
export declare function removeZeroFromHex(value: string): string;
/**
 * Creates topic for storing private key using username and password
 */
export declare function createCredentialsTopic(username: string, password: string): Utils.Bytes<32>;
/**
 * Asserts whether a valid chunk size is passed
 */
export declare function assertChunkSizeLength(value: unknown): asserts value is number;
/**
 * Converts bytes to CryptoJS WordArray
 */
export declare function bytesToWordArray(data: Uint8Array): CryptoJS.lib.WordArray;
