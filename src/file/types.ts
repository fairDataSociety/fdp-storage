import { Reference } from '@ethersphere/bee-js'
import { RawFileMetadata } from '../pod/types'

/**
 * File upload options
 */
export interface DataUploadOptions {
  /**
   * Size of blocks in bytes will the file be divided
   */
  blockSize: number
  /**
   * Content type of the file
   */
  contentType: string
}

/**
 * FairOS file blocks format
 */
export interface RawBlocks {
  Blocks: RawBlock[]
}

/**
 * FairOS file block format
 */
export interface RawBlock {
  Name: string
  Size: number
  CompressedSize: number
  Reference: { R: string }
}

/**
 * FDP file blocks format
 */
export interface Blocks {
  blocks: Block[]
}

/**
 * FDP file block format
 */
export interface Block {
  name: string
  size: number
  compressedSize: number
  reference: Reference
}

/**
 * File share information
 */
export interface FileShareInfo {
  meta: RawFileMetadata
  source_address: string
}

/**
 * File receive options
 */
export interface FileReceiveOptions {
  name: string
}
