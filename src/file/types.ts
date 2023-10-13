import { Reference } from '@ethersphere/bee-js'
import { FileMetadata, RawFileMetadata } from '../pod/types'

/**
 * Download progress info
 */
export interface DownloadProgressInfo {
  /**
   * Type of the progress
   */
  progressType: DownloadProgressType
  /**
   * Data of the progress
   */
  data?: ProgressBlockData
}

/**
 * Data download options
 */
export type DataDownloadOptions = ProgressCallback<DownloadProgressInfo>

/**
 * Download progress types
 */
export enum DownloadProgressType {
  /**
   * Getting pod info
   */
  GetPodInfo = 'get-pod-info',
  /**
   * Getting path info
   */
  GetPathInfo = 'get-path-info',
  /**
   * Downloading file blocks meta
   */
  DownloadBlocksMeta = 'download-blocks-meta',
  /**
   * Downloading a file block start
   */
  DownloadBlockStart = 'download-block-start',
  /**
   * Downloading a file block end
   */
  DownloadBlockEnd = 'download-block-end',
  /**
   * Done
   */
  Done = 'done',
}

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
   * Uploading a file block start
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
 * Processing progress block data
 */
export interface ProgressBlockData {
  /**
   * Total number of blocks that will be processed
   */
  totalBlocks: number
  /**
   * ID of the currently processing block starting from 0
   */
  currentBlockId: number
  /**
   * Percentage of blocks processed
   */
  percentage: number
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
  data?: ProgressBlockData
}

/**
 * Progress callback
 */
export interface ProgressCallback<T> {
  progressCallback?: (info: T) => void
}

/**
 * File upload options
 */
export interface DataUploadOptions extends ProgressCallback<UploadProgressInfo> {
  /**
   * Size of blocks in bytes will the file be divided
   */
  blockSize?: number
  /**
   * Content type of the file
   */
  contentType?: string
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
 * FDP file metadata with blocks data
 */
export type FileMetadataWithBlocks = FileMetadata & Blocks

/**
 * FDP file block format
 */
export interface Block {
  size: number
  compressedSize: number
  reference: Reference
}

/**
 * FDP file block format for external usage
 */
export interface ExternalDataBlock extends Block {
  /**
   * Block index
   */
  index: number
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
