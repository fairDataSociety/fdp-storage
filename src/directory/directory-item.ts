import { RawDirectoryMetadata, FileMetadata } from '../pod/types'
import { Reference } from '@ethersphere/bee-js'
import CryptoJS from 'crypto-js'

export const TYPE_DIRECTORY = 'directory'
export const TYPE_FILE = 'file'

/**
 * DirectoryItem is a representation of a directory or file in the pod
 */
export class DirectoryItem {
  constructor(
    public name?: string,
    public type?: 'directory' | 'file',
    public reference?: Reference,
    public raw?: FileMetadata | RawDirectoryMetadata,
    public content: DirectoryItem[] = [],
  ) {}

  /**
   * Gets the list of files in the directory
   */
  getFiles(): DirectoryItem[] {
    return this.content.filter(item => item.type === TYPE_FILE)
  }

  /**
   * Gets the list of directories in the directory
   */
  getDirectories(): DirectoryItem[] {
    return this.content.filter(item => item.type === TYPE_DIRECTORY)
  }

  /**
   * Converts raw file metadata to a DirectoryItem
   *
   * @param item raw file metadata from FairOS
   */
  static fromRawFileMetadata(item: FileMetadata): DirectoryItem {
    let reference: Reference | undefined

    if (item.file_inode_reference) {
      reference = CryptoJS.enc.Base64.parse(item.file_inode_reference).toString(CryptoJS.enc.Hex) as Reference
    }

    return new DirectoryItem(item.file_name, TYPE_FILE, reference, item)
  }

  /**
   * Converts raw directory metadata to a DirectoryItem
   *
   * @param item raw directory metadata from FairOS
   */
  static fromRawDirectoryMetadata(item: RawDirectoryMetadata): DirectoryItem {
    return new DirectoryItem(item.Meta.Name, TYPE_DIRECTORY, undefined, item)
  }
}
