import { Reference } from '@ethersphere/bee-js'
import { PodPasswordBytes } from '../utils/encryption'
import { HexString } from '../utils/hex'
import { LookupAnswer } from '../feed/types'
import { EthAddress } from '../utils/eth'

/**
 * Pods information prepared for internal usage
 */
export interface PodsListPrepared {
  pods: PodPrepared[]
  sharedPods: SharedPodPrepared[]
}

/**
 * Pods information in serializable format
 */
export interface PodsList {
  pods: Pod[]
  sharedPods: SharedPod[]
}

/**
 * Pod name only
 */
export interface PodName {
  name: string
}

/**
 * Pod information prepared for internal usage
 */
export interface PodPrepared extends PodName {
  password: PodPasswordBytes
  index: number
}

/**
 * Pod information in serializable format
 */
export interface Pod extends PodName {
  password: HexString
  index: number
}

/**
 * Shared pod information in serializable format
 */
export interface SharedPod extends PodName {
  password: HexString
  address: HexString
}

/**
 * Shared pod information prepared for internal usage
 */
export interface SharedPodPrepared extends PodName {
  password: PodPasswordBytes
  address: EthAddress
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
  mode: number
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
  mode: number
}

/**
 * Information about a file with lookup answer
 */
export interface FileMetadataWithLookupAnswer {
  /**
   * File metadata
   */
  meta: FileMetadata
  /**
   * Lookup answer
   */
  lookupAnswer: LookupAnswer
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
    mode: number
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
