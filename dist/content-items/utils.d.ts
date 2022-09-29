import { DirectoryItem } from './directory-item';
import { Bee, RequestOptions } from '@ethersphere/bee-js';
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth';
import { RawMetadataWithEpoch } from './types';
/**
 * Directory item guard
 */
export declare function isDirectoryItem(value: unknown): value is DirectoryItem;
/**
 * File item guard
 */
export declare function isFileItem(value: unknown): value is DirectoryItem;
/**
 * Get raw metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address Ethereum address of the pod which owns the path
 * @param downloadOptions options for downloading
 */
export declare function getRawMetadata(bee: Bee, path: string, address: EthAddress, downloadOptions?: RequestOptions): Promise<RawMetadataWithEpoch>;
