import { Block, Blocks, RawBlock, RawBlocks } from './types'
import { FileMetadata, RawDirectoryMetadata, RawFileMetadata } from '../pod/types'
import { prepareEthAddress } from '../utils/address'
import { base64toReference, referenceToBase64 } from './utils'
import { stringToBytes } from '../utils/bytes'

/**
 * Converts FairOS block format to FDS block format
 *
 * @param block FairOS block
 */
export function rawBlockToBlock(block: RawBlock): Block {
  return {
    name: block.Name,
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
    Name: block.name,
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
    userAddress: prepareEthAddress(Uint8Array.from(data.user_address)),
    podName: data.pod_name,
    filePath: data.file_path,
    fileName: data.file_name,
    fileSize: data.file_size,
    blockSize: data.block_size,
    contentType: data.content_type,
    compression: data.compression,
    creationTime: data.creation_time,
    accessTime: data.access_time,
    modificationTime: data.modification_time,
    blocksReference: base64toReference(data.file_inode_reference),
  }
}

/**
 * Converts FDS file metadata to FairOS file metadata
 */
export function fileMetadataToRawFileMetadata(data: FileMetadata): RawFileMetadata {
  return {
    version: data.version,
    user_address: Array.from(data.userAddress),
    pod_name: data.podName,
    file_path: data.filePath,
    file_name: data.fileName,
    file_size: data.fileSize,
    block_size: data.blockSize,
    content_type: data.contentType,
    compression: data.compression,
    creation_time: data.creationTime,
    access_time: data.accessTime,
    modification_time: data.modificationTime,
    file_inode_reference: referenceToBase64(data.blocksReference),
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

/**
 * Converts FairOS raw directory metadata in bytes representation
 *
 * @param data
 */
export function getRawDirectoryMetadataBytes(data: RawDirectoryMetadata): Uint8Array {
  return stringToBytes(JSON.stringify(data))
}
