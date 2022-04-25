import { Reference } from '@ethersphere/bee-js'

/**
 * File upload options
 */
export interface DataUploadOptions {
  blockSize: number
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