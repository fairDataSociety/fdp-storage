import { utils } from 'ethers';
/**
 * Get Hierarchal Deterministic Wallet from seed by index
 *
 * @param seed data for wallet creation
 * @param index wallet index
 */
export declare function getWalletByIndex(seed: Uint8Array, index: number): utils.HDNode;
