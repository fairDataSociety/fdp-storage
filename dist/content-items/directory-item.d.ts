import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types';
import { Reference } from '@ethersphere/bee-js';
import { ContentItem } from './content-item';
import { FileItem } from './file-item';
/**
 * A representation of a directory in the pod
 */
export declare class DirectoryItem extends ContentItem {
    name: string;
    content: Array<DirectoryItem | FileItem>;
    raw?: RawFileMetadata | RawDirectoryMetadata | undefined;
    size?: number | undefined;
    reference?: Reference | undefined;
    constructor(name: string, content?: Array<DirectoryItem | FileItem>, raw?: RawFileMetadata | RawDirectoryMetadata | undefined, size?: number | undefined, reference?: Reference | undefined);
    /**
     * Gets the list of files in the directory
     */
    getFiles(): FileItem[];
    /**
     * Gets the list of directories in the directory
     */
    getDirectories(): DirectoryItem[];
    /**
     * Converts FairOS directory metadata to a DirectoryItem
     *
     * @param item raw directory metadata from FairOS
     */
    static fromRawDirectoryMetadata(item: RawDirectoryMetadata): DirectoryItem;
}
