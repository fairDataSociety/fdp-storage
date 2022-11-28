import { Utils, Reference } from '@ethersphere/bee-js'
import { PodPasswordBytes } from '../utils/encryption'
import { HexString } from '../utils/hex'

/**
 * Pods metadata structure
 */
export interface PodsMetadata {
  pods: JsonPod[]
  sharedPods: JsonSharedPod[]
}

/**
 * Pod name only
 */
export interface PodName {
  name: string
}

/**
 * Pod information
 */
export interface Pod extends PodName {
  password: PodPasswordBytes
  index: number
}

/**
 * Pod information for json serialization
 */
export interface JsonPod extends PodName {
  password: HexString
  index: number
}

/**
 * Shared pod information for json serialization
 */
export interface JsonSharedPod extends PodName {
  password: HexString
  address: HexString
}

/**
 * Shared pod information
 */
export interface SharedPod extends PodName {
  password: PodPasswordBytes
  address: Utils.EthAddress
}

/**
 * Information about a file in FairOS raw format
 */
export interface RawFileMetadata {
  version: number
  filePath: string
  fileName: string
  fileSize: number
  blockSize: number
  contentType: string
  compression: string
  creationTime: number
  accessTime: number
  modificationTime: number
  fileInodeReference: string
}

/**
 * Information about a file in FDS format
 */
export interface FileMetadata {
  version: number
  filePath: string
  fileName: string
  fileSize: number
  blockSize: number
  contentType: string
  compression: string
  creationTime: number
  accessTime: number
  modificationTime: number
  blocksReference: Reference
}

/**
 * Information about a directory
 */
export interface RawDirectoryMetadata {
  meta: {
    version: number
    path: string
    name: string
    creationTime: number
    modificationTime: number
    accessTime: number
  }
  fileOrDirNames: string[] | null
}

/**
 * Pod share information
 */
export interface PodShareInfo {
  podName: string
  podAddress: string
  userAddress: string
  password: HexString
}

/**
 * Pod receive options
 */
export interface PodReceiveOptions {
  name: string
}
