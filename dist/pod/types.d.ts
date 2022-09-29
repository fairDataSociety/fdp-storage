import { Utils, Reference } from '@ethersphere/bee-js';
/**
 * Pod information
 */
export interface Pod {
    name: string;
    index: number;
}
/**
 * Shared pod information
 */
export interface SharedPod {
    name: string;
    address: Utils.EthAddress;
}
/**
 * Information about a file in FairOS raw format
 */
export interface RawFileMetadata {
    version: number;
    user_address: number[];
    pod_name: string;
    file_path: string;
    file_name: string;
    file_size: number;
    block_size: number;
    content_type: string;
    compression: string;
    creation_time: number;
    access_time: number;
    modification_time: number;
    file_inode_reference: string;
}
/**
 * Information about a file in FDS format
 */
export interface FileMetadata {
    version: number;
    podAddress: Utils.EthAddress;
    podName: string;
    filePath: string;
    fileName: string;
    fileSize: number;
    blockSize: number;
    contentType: string;
    compression: string;
    creationTime: number;
    accessTime: number;
    modificationTime: number;
    blocksReference: Reference;
}
/**
 * Information about a directory
 */
export interface RawDirectoryMetadata {
    Meta: {
        Version: number;
        Path: string;
        Name: string;
        CreationTime: number;
        ModificationTime: number;
        AccessTime: number;
    };
    FileOrDirNames: string[] | null;
}
/**
 * Pod share information
 */
export interface PodShareInfo {
    pod_name: string;
    pod_address: string;
    user_address: string;
}
/**
 * Pod receive options
 */
export interface PodReceiveOptions {
    name: string;
}
