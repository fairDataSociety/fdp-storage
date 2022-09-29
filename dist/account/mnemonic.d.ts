import { Bee, Reference, Utils } from '@ethersphere/bee-js';
import { Wallet } from 'ethers';
import { Connection } from '../connection/connection';
/**
 * Downloads encrypted mnemonic phrase from swarm chunk for version 1 account
 *
 * @deprecated use methods for v2 account instead
 *
 * @param bee Bee client
 * @param username FDP account username
 * @param address FDP account address
 *
 * @returns encrypted mnemonic phrase in Base64url format
 */
export declare function getEncryptedMnemonic(bee: Bee, username: string, address: Utils.EthAddress): Promise<string>;
/**
 * Uploads encrypted mnemonic from account version 1 to swarm chunk
 *
 * @deprecated use methods for v2 account instead
 *
 * @param connection connection information for data uploading
 * @param wallet FDP account Ethereum wallet
 * @param username FDP username
 * @param encryptedMnemonic encrypted mnemonic phrase in Base64url format
 */
export declare function uploadEncryptedMnemonic(connection: Connection, wallet: Wallet, username: string, encryptedMnemonic: string): Promise<Reference>;
