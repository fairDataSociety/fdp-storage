import { Utils } from '@ethersphere/bee-js';
/**
 * Migrate options with possibility to migrate with an address
 */
export interface AddressOptions {
    address: Utils.EthAddress;
}
/**
 * Migrate options with possibility to migrate with a mnemonic
 */
export interface MnemonicOptions {
    mnemonic: string;
}
/**
 * Checks that value is an AddressOptions
 */
export declare function isAddressOptions(options: unknown): options is AddressOptions;
/**
 * Checks that value is an MnemonicOptions
 */
export declare function isMnemonicOptions(options: unknown): options is MnemonicOptions;
