import { Connection } from '../connection/connection';
import { utils } from 'ethers';
import { Reference, RequestOptions } from '@ethersphere/bee-js';
/**
 * Add child file or directory to a defined parent directory
 *
 * @param connection connection information for data management
 * @param wallet wallet of the pod
 * @param parentPath parent path
 * @param entryPath entry path
 * @param isFile define if entry is file or directory
 * @param downloadOptions download options
 */
export declare function addEntryToDirectory(connection: Connection, wallet: utils.HDNode, parentPath: string, entryPath: string, isFile: boolean, downloadOptions?: RequestOptions): Promise<Reference>;
/**
 * Removes file or directory from the parent directory
 *
 * @param connection connection information for data management
 * @param wallet wallet of the pod
 * @param parentPath parent path of the entry
 * @param entryPath full path of the entry
 * @param isFile define if entry is file or directory
 * @param downloadOptions download options
 */
export declare function removeEntryFromDirectory(connection: Connection, wallet: utils.HDNode, parentPath: string, entryPath: string, isFile: boolean, downloadOptions?: RequestOptions): Promise<Reference>;
