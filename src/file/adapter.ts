import { Block, Blocks, RawBlock, RawBlocks } from './types'
import { FileMetadata, RawFileMetadata } from '../pod/types'
import { base64toReference, referenceToBase64 } from './utils'
import { stringToBytes } from '../utils/bytes'

/**
 * Converts FairOS block format to FDS block format
 *
 * @param block FairOS block
 */
export function rawBlockToBlock(block: RawBlock): Block {
  return {
    size: block.Size,
    compressedSize: block.CompressedSize,
    reference: base64toReference(block.Reference.R),
  }
}

/**
 * Converts FairOS blocks format to FDS blocks format
 *
 * @param blocks FairOS blocks
 */
export function rawBlocksToBlocks(blocks: RawBlocks): Blocks {
  const resultBlocks = blocks.Blocks.map(item => rawBlockToBlock(item))

  return {
    blocks: resultBlocks,
  }
}

/**
 * Converts FDS block format to FairOS block format
 *
 * @param block FDS block
 */
export function blockToRawBlock(block: Block): RawBlock {
  return {
    Size: block.size,
    CompressedSize: block.compressedSize,
    Reference: {
      R: referenceToBase64(block.reference),
    },
  }
}

/**
 * Converts FDS blocks format to FairOS blocks format
 *
 * @param blocks FDS blocks
 */
export function blocksToRawBlocks(blocks: Blocks): RawBlocks {
  return {
    Blocks: blocks.blocks.map(item => blockToRawBlock(item)),
  }
}

/**
 * Converts FDS blocks format to FairOS manifest string
 *
 * @param blocks FDS blocks
 */
export function blocksToManifest(blocks: Blocks): string {
  return JSON.stringify(blocksToRawBlocks(blocks))
}

/**
 * Converts FairOS file metadata to FDS file metadata
 *
 * @param data FairOS raw file metadata
 */
export function rawFileMetadataToFileMetadata(data: RawFileMetadata): FileMetadata {
  return {
    version: data.version,
    filePath: data.filePath,
    fileName: data.fileName,
    fileSize: data.fileSize,
    blockSize: data.blockSize,
    contentType: data.contentType,
    compression: data.compression,
    creationTime: data.creationTime,
    accessTime: data.accessTime,
    modificationTime: data.modificationTime,
    blocksReference: base64toReference(data.fileInodeReference),
  }
}

/**
 * Converts FDS file metadata to FairOS file metadata
 */
export function fileMetadataToRawFileMetadata(data: FileMetadata): RawFileMetadata {
  return {
    version: data.version,
    filePath: data.filePath,
    fileName: data.fileName,
    fileSize: data.fileSize,
    blockSize: data.blockSize,
    contentType: data.contentType,
    compression: data.compression,
    creationTime: data.creationTime,
    accessTime: data.accessTime,
    modificationTime: data.modificationTime,
    fileInodeReference: referenceToBase64(data.blocksReference),
  }
}

/**
 * Converts FDS file metadata to FairOS raw file metadata in bytes representation
 *
 * @param data FDS file metadata
 */
export function getFileMetadataRawBytes(data: FileMetadata): Uint8Array {
  return stringToBytes(JSON.stringify(fileMetadataToRawFileMetadata(data)))
}
