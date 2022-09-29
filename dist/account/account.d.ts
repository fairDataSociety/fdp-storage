import { Bee, PrivateKeyBytes, Reference, Utils } from '@ethersphere/bee-js';
import { Wallet } from 'ethers';
import { Connection } from '../connection/connection';
import CryptoJS from 'crypto-js';
/**
 * Created and encrypted user account to upload to the network
 * @deprecated interface for v1 accounts
 */
interface UserAccount {
    wallet: Wallet;
    mnemonic: string;
    encryptedMnemonic: string;
}
/**
 * Account and mnemonic phrase
 * @deprecated interface for v1 accounts
 */
export interface UserAccountWithMnemonic {
    wallet: Wallet;
    mnemonic: string;
}
/**
 * User account with seed phrase
 */
export interface UserAccountWithSeed {
    wallet: Wallet;
    seed: Uint8Array;
}
/**
 * Encrypted account uploaded to the network
 */
export interface UserAccountWithReference extends UserAccount {
    reference: Reference;
}
/**
 * Creates a new user (version 1) and uploads the encrypted account to the network
 *
 * @deprecated use `createUser` method instead to create the latest version of an account
 *
 * @param connection connection information for data uploading
 * @param username FDP username
 * @param password FDP password
 * @param mnemonic mnemonic phrase
 */
export declare function createUserV1(connection: Connection, username: string, password: string, mnemonic?: string): Promise<UserAccountWithReference>;
/**
 * Uploads portable account (version 2)
 *
 * @param connection connection information for data uploading
 * @param username FDP username for topic creation
 * @param password FDP password for encrypting SOC data
 * @param privateKey account's wallet private key for signing SOC
 * @param seed account's seed for storing in SOC
 *
 * @returns swarm reference to encrypted Ethereum wallet
 */
export declare function uploadPortableAccount(connection: Connection, username: string, password: string, privateKey: PrivateKeyBytes, seed: CryptoJS.lib.WordArray): Promise<Reference>;
/**
 * Downloads portable account (version 2)
 *
 * @param bee Bee instance
 * @param address FDP account address
 * @param username FDP username
 * @param password FDP password
 *
 * @returns decrypted Ethereum wallet of the account
 */
export declare function downloadPortableAccount(bee: Bee, address: Utils.EthAddress, username: string, password: string): Promise<UserAccountWithSeed>;
export {};
