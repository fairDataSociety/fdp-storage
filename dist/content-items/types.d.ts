import { Epoch } from '../feed/lookup/epoch';
import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types';
/**
 * Metadata of a file or directory with epoch
 */
export interface RawMetadataWithEpoch {
    epoch: Epoch;
    metadata: RawDirectoryMetadata | RawFileMetadata;
}
