import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types';
import { Reference } from '@ethersphere/bee-js';
/**
 * DirectoryItem is a representation of a directory or file in the pod
 */
export declare class ContentItem {
    name: string;
    raw?: RawFileMetadata | RawDirectoryMetadata | undefined;
    size?: number | undefined;
    reference?: Reference | undefined;
    constructor(name: string, raw?: RawFileMetadata | RawDirectoryMetadata | undefined, size?: number | undefined, reference?: Reference | undefined);
}
