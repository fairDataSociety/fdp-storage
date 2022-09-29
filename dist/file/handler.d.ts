import { Bee, Data, RequestOptions } from '@ethersphere/bee-js';
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth';
import { FileMetadata } from '../pod/types';
/**
 * File prefix
 */
export declare const FILE_TOKEN = "_F_";
/**
 * Directory prefix
 */
export declare const DIRECTORY_TOKEN = "_D_";
/**
 * Get converted metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address Ethereum address of the pod which owns the path
 * @param downloadOptions options for downloading
 */
export declare function getFileMetadata(bee: Bee, path: string, address: EthAddress, downloadOptions?: RequestOptions): Promise<FileMetadata>;
/**
 * Downloads file parts and compile them into Data
 *
 * @param bee Bee client
 * @param fullPath full path to the file
 * @param address address of the pod
 * @param downloadOptions download options
 */
export declare function downloadData(bee: Bee, fullPath: string, address: EthAddress, downloadOptions?: RequestOptions): Promise<Data>;
/**
 * Generate block name by block number
 */
export declare function generateBlockName(blockNumber: number): string;
