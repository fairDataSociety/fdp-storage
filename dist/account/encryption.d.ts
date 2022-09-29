import CryptoJS from 'crypto-js';
export declare const IV_LENGTH = 16;
/**
 * Decrypts text with password
 *
 * @param password string to decrypt text
 * @param text text to be decrypted
 */
export declare function decryptText(password: string, text: string): string;
/**
 * Decrypts bytes with password
 *
 * @param password string to decrypt bytes
 * @param data bytes to be decrypted
 */
export declare function decryptBytes(password: string, data: Uint8Array): Uint8Array;
/**
 * Decrypts WordsArray with password
 *
 * @param password string to decrypt bytes
 * @param data WordsArray to be decrypted
 */
export declare function decrypt(password: string, data: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray;
/**
 * Encrypts text with password
 *
 * @param password string to encrypt text
 * @param text text to be encrypted
 * @param customIv initial vector for AES. In case of absence, a random vector will be created
 */
export declare function encryptText(password: string, text: string, customIv?: CryptoJS.lib.WordArray): string;
/**
 * Encrypt bytes with password
 *
 * @param password string for text encryption
 * @param data bytes to be encrypted
 * @param customIv initial vector for AES. In case of absence, a random vector will be created
 */
export declare function encryptBytes(password: string, data: CryptoJS.lib.WordArray, customIv?: CryptoJS.lib.WordArray): Uint8Array;
/**
 * Encrypt WordArray with password
 *
 * @param password string for text encryption
 * @param data WordArray to be encrypted
 * @param customIv initial vector for AES. In case of absence, a random vector will be created
 */
export declare function encrypt(password: string, data: CryptoJS.lib.WordArray | string, customIv?: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray;
