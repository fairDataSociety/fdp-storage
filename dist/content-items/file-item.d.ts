import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types';
import { Reference } from '@ethersphere/bee-js';
import { ContentItem } from './content-item';
/**
 * A representation of a file in the pod
 */
export declare class FileItem extends ContentItem {
    name: string;
    raw?: RawFileMetadata | RawDirectoryMetadata | undefined;
    size?: number | undefined;
    reference?: Reference | undefined;
    constructor(name: string, raw?: RawFileMetadata | RawDirectoryMetadata | undefined, size?: number | undefined, reference?: Reference | undefined);
    /**
     * Converts FairOS file metadata to a DirectoryItem
     *
     * @param item raw file metadata from FairOS
     */
    static fromRawFileMetadata(item: RawFileMetadata): FileItem;
}
