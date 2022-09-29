import { Connection } from '../connection/connection';
import { Bee, Reference, RequestOptions, UploadResult, Utils } from '@ethersphere/bee-js';
import { PathInfo } from '../pod/utils';
import { Blocks, FileShareInfo } from './types';
import { FileMetadata, RawFileMetadata } from '../pod/types';
import { EncryptedReference } from '../utils/hex';
/**
 * Asserts that full path string is correct
 *
 * @param value full path string
 */
export declare function assertFullPathWithName(value: unknown): asserts value is string;
/**
 * Uploads data to swarm with specific FairOS configuration
 *
 * @param connection Bee connection
 * @param data data to upload
 */
export declare function uploadBytes(connection: Connection, data: Uint8Array): Promise<UploadResult>;
/**
 * Extracts filename and path from full path
 *
 * @param fullPath full absolute path with filename
 */
export declare function extractPathInfo(fullPath: string): PathInfo;
/**
 * Downloads raw FairOS blocks and convert it to FDS blocks
 *
 * @param bee Bee client
 * @param reference blocks Swarm reference
 * @param downloadOptions download options
 */
export declare function downloadBlocksManifest(bee: Bee, reference: Reference, downloadOptions?: RequestOptions): Promise<Blocks>;
/**
 * Converts Base64 string to Swarm Reference
 *
 * @param base64 Reference encoded to Base64
 */
export declare function base64toReference(base64: string): Reference;
/**
 * Converts Swarm Reference to Base64
 *
 * @param reference Swarm Reference
 */
export declare function referenceToBase64(reference: Reference): string;
/**
 * Creates file share information structure
 */
export declare function createFileShareInfo(meta: RawFileMetadata, podAddress: Utils.EthAddress): FileShareInfo;
/**
 * Checks that value is file share info
 */
export declare function isFileShareInfo(value: unknown): value is FileShareInfo;
/**
 * Verifies if file share info is correct
 */
export declare function assertFileShareInfo(value: unknown): asserts value is FileShareInfo;
/**
 * Gets shared information about file
 *
 * @param bee Bee instance
 * @param reference reference to shared information
 */
export declare function getSharedFileInfo(bee: Bee, reference: EncryptedReference): Promise<FileShareInfo>;
/**
 * Updates shared metadata with new params
 *
 * @param meta shared metadata
 * @param podName pod name
 * @param filePath parent path of file
 * @param fileName file name
 * @param podAddress pod address
 */
export declare function updateFileMetadata(meta: FileMetadata, podName: string, filePath: string, fileName: string, podAddress: Utils.EthAddress): FileMetadata;
