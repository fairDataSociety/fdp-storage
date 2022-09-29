import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth';
import { Bee, Reference, RequestOptions } from '@ethersphere/bee-js';
import { Connection } from '../connection/connection';
import { utils } from 'ethers';
import { DirectoryItem } from '../content-items/directory-item';
export declare const MAX_DIRECTORY_NAME_LENGTH = 100;
/**
 * Get files and directories under path with recursion or not
 *
 * @param bee Bee instance
 * @param path path to start searching from
 * @param address Ethereum address of the pod which owns the path
 * @param isRecursive search with recursion or not
 * @param downloadOptions options for downloading
 */
export declare function readDirectory(bee: Bee, path: string, address: EthAddress, isRecursive?: boolean, downloadOptions?: RequestOptions): Promise<DirectoryItem>;
/**
 * Creates root directory for the pod that tied to the private key
 *
 * @param connection Bee connection
 * @param privateKey private key of the pod
 */
export declare function createRootDirectory(connection: Connection, privateKey: string | Uint8Array): Promise<Reference>;
/**
 * Creates directory under the pod
 *
 * @param connection Bee connection
 * @param fullPath path to the directory
 * @param podWallet pod wallet
 * @param downloadOptions options for downloading
 */
export declare function createDirectory(connection: Connection, fullPath: string, podWallet: utils.HDNode, downloadOptions?: RequestOptions): Promise<void>;
