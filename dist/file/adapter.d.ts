import { Block, Blocks, RawBlock, RawBlocks } from './types';
import { FileMetadata, RawFileMetadata } from '../pod/types';
/**
 * Converts FairOS block format to FDS block format
 *
 * @param block FairOS block
 */
export declare function rawBlockToBlock(block: RawBlock): Block;
/**
 * Converts FairOS blocks format to FDS blocks format
 *
 * @param blocks FairOS blocks
 */
export declare function rawBlocksToBlocks(blocks: RawBlocks): Blocks;
/**
 * Converts FDS block format to FairOS block format
 *
 * @param block FDS block
 */
export declare function blockToRawBlock(block: Block): RawBlock;
/**
 * Converts FDS blocks format to FairOS blocks format
 *
 * @param blocks FDS blocks
 */
export declare function blocksToRawBlocks(blocks: Blocks): RawBlocks;
/**
 * Converts FDS blocks format to FairOS manifest string
 *
 * @param blocks FDS blocks
 */
export declare function blocksToManifest(blocks: Blocks): string;
/**
 * Converts FairOS file metadata to FDS file metadata
 *
 * @param data FairOS raw file metadata
 */
export declare function rawFileMetadataToFileMetadata(data: RawFileMetadata): FileMetadata;
/**
 * Converts FDS file metadata to FairOS file metadata
 */
export declare function fileMetadataToRawFileMetadata(data: FileMetadata): RawFileMetadata;
/**
 * Converts FDS file metadata to FairOS raw file metadata in bytes representation
 *
 * @param data FDS file metadata
 */
export declare function getFileMetadataRawBytes(data: FileMetadata): Uint8Array;
