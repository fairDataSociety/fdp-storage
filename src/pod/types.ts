import { DirectoryContent } from '../directory/directory-content'

/**
 * Pod information
 */
export interface Pod {
  name: string
  index: number
}

/**
 * Metadata information for pod directory
 */
export interface PodMetadata {
  Version: number
  Path: string
  Name: string
  CreationTime: number
  ModificationTime: number
  AccessTime: number
}

/**
 * Information about a file
 */
export interface FileMetadata {
  version: number
  user_address: number[]
  pod_name: string
  file_path: string
  file_name: string
  file_size: number
  block_size: number
  content_type: string
  compression: string
  creation_time: number
  access_time: number
  modification_time: number
  file_inode_reference: string
}

/**
 * Information about a directory
 */
export interface DirectoryMetadata {
  Meta: FileMetadata | PodMetadata
  FileOrDirNames: string[] | null
  content?: DirectoryContent
}
