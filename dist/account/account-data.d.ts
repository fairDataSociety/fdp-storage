import { utils, Wallet } from 'ethers';
import { UserAccountWithMnemonic } from './account';
import { Connection } from '../connection/connection';
import { AddressOptions, MnemonicOptions } from './types';
import { ENS, PublicKey } from '@fairdatasociety/fdp-contracts';
import { Reference } from '@ethersphere/bee-js';
export declare class AccountData {
    readonly connection: Connection;
    readonly ens: ENS;
    /**
     * Active FDP account wallet
     */
    wallet?: utils.HDNode;
    /**
     * Active FDP account's seed for entity creation
     */
    seed?: Uint8Array;
    /**
     * Public key for FDP account creation
     */
    publicKey?: PublicKey;
    constructor(connection: Connection, ens: ENS);
    /**
     * Connects wallet with ENS
     */
    private connectWalletWithENS;
    /**
     * Sets FDP account from seed
     *
     * With the help of the seed, account data can be managed, but cannot register a new account
     *
     * @param seed data extracted from mnemonic phrase or from uploaded account
     */
    setAccountFromSeed(seed: Uint8Array): void;
    /**
     * Sets FDP account from mnemonic phrase
     *
     * @param mnemonic phrase from BIP-039/BIP-044 wallet
     */
    setAccountFromMnemonic(mnemonic: string): void;
    /**
     * Creates a new FDP account wallet
     */
    createWallet(): Wallet;
    /**
     * Exports wallet from version 1 account
     *
     * @deprecated the method will be removed after an accounts' migration process is completed
     *
     * @param username username from version 1 account
     * @param password password from version 1 account
     * @param options migration options with address or mnemonic from version 1 account
     */
    exportWallet(username: string, password: string, options: AddressOptions | MnemonicOptions): Promise<UserAccountWithMnemonic>;
    /**
     * Migrates from FDP account without ENS to account with ENS
     *
     * @deprecated the method will be removed after an accounts' migration process is completed
     *
     * @param username username from version 1 account
     * @param password password from version 1 account
     * @param options migration options with address or mnemonic from version 1 account
     */
    migrate(username: string, password: string, options: AddressOptions | MnemonicOptions): Promise<Reference>;
    /**
     * Logs in with the FDP credentials and gives back ethers wallet
     *
     * @param username FDP username
     * @param password password of the wallet
     *
     * @returns BIP-039 + BIP-044 Wallet
     */
    login(username: string, password: string): Promise<Wallet>;
    /**
     * Creates new FDP account and gives back user account with swarm reference
     *
     * @param username FDP username
     * @param password FDP password
     */
    register(username: string, password: string): Promise<Reference>;
}
