import { Reference } from '@ethersphere/bee-js'
import { RawFileMetadata } from '../pod/types'

/**
 * Uploading progress types
 */
export enum UploadProgressType {
  /**
   * Getting pod info
   */
  GetPodInfo = 'get-pod-info',
  /**
   * Getting path info
   */
  GetPathInfo = 'get-path-info',
  /**
   * Uploading file block start
   */
  UploadBlockStart = 'upload-block-start',
  /**
   * Uploading a file block end
   */
  UploadBlockEnd = 'upload-block-end',
  /**
   * Uploading file blocks meta
   */
  UploadBlocksMeta = 'upload-blocks-meta',
  /**
   * Writing parent directory info feed
   */
  WriteDirectoryInfo = 'update-directory-info',
  /**
   * Writing file info feed
   */
  WriteFileInfo = 'update-file-info',
  /**
   * Done
   */
  Done = 'done',
}

/**
 * Uploading progress block data
 */
export interface UploadProgressBlockData {
  /**
   * Total number of blocks that will be uploaded
   */
  totalBlocks: number
  /**
   * ID of the currently processing block starting from 0
   */
  currentBlockId: number
  /**
   * Percentage of blocks uploaded
   */
  uploadPercentage: number
}

/**
 * Upload progress info
 */
export interface UploadProgressInfo {
  /**
   * Type of the progress
   */
  progressType: UploadProgressType
  /**
   * Data of the progress
   */
  data?: UploadProgressBlockData
}

/**
 * File upload options
 */
export interface DataUploadOptions {
  /**
   * Size of blocks in bytes will the file be divided
   */
  blockSize?: number
  /**
   * Content type of the file
   */
  contentType?: string
  /**
   * Progress callback
   * @param info progress info
   */
  progressCallback?: (info: UploadProgressInfo) => void
}

/**
 * FairOS file blocks format
 */
export interface RawBlocks {
  blocks: RawBlock[]
}

/**
 * FairOS file block format
 */
export interface RawBlock {
  size: number
  compressedSize: number
  reference: { swarm: string }
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
  size: number
  compressedSize: number
  reference: Reference
}

/**
 * File share information
 */
export interface FileShareInfo {
  meta: RawFileMetadata
}

/**
 * File receive options
 */
export interface FileReceiveOptions {
  name: string
}
