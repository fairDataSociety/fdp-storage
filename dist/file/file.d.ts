import { FileMetadata } from '../pod/types';
import { AccountData } from '../account/account-data';
import { DataUploadOptions, FileReceiveOptions, FileShareInfo } from './types';
import { Data, Reference } from '@ethersphere/bee-js';
import { EncryptedReference } from '../utils/hex';
/**
 * Files management class
 */
export declare class File {
    private accountData;
    readonly defaultUploadOptions: DataUploadOptions;
    constructor(accountData: AccountData);
    /**
     * Downloads file content
     *
     * @param podName pod where file is stored
     * @param fullPath full path of the file
     */
    downloadData(podName: string, fullPath: string): Promise<Data>;
    /**
     * Uploads file content
     *
     * @param podName pod where file is stored
     * @param fullPath full path of the file
     * @param data file content
     * @param options upload options
     */
    uploadData(podName: string, fullPath: string, data: Uint8Array | string, options?: DataUploadOptions): Promise<FileMetadata>;
    /**
     * Deletes a file
     *
     * @param podName pod where file is located
     * @param fullPath full path of the file
     */
    delete(podName: string, fullPath: string): Promise<void>;
    /**
     * Shares file information
     *
     * @param podName pod where file is stored
     * @param fullPath full path of the file
     */
    share(podName: string, fullPath: string): Promise<Reference>;
    /**
     * Gets shared file information
     *
     * @param reference swarm reference with shared file information
     *
     * @returns shared file information
     */
    getSharedInfo(reference: string | EncryptedReference): Promise<FileShareInfo>;
    /**
     * Saves shared file to a personal account
     *
     * @param podName pod where file is stored
     * @param parentPath the path to the file to save
     * @param reference swarm reference with shared file information
     * @param options save options
     *
     * @returns saved file metadata
     */
    saveShared(podName: string, parentPath: string, reference: string | EncryptedReference, options?: FileReceiveOptions): Promise<FileMetadata>;
}
