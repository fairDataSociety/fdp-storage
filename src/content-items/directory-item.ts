import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types'
import { Reference } from '@ethersphere/bee-js'
import { ContentItem } from './content-item'
import { FileItem } from './file-item'
import { isDirectoryItem, isFileItem } from './utils'

/**
 * A representation of a directory in the pod
 */
export class DirectoryItem extends ContentItem {
  constructor(
    public name: string,
    public content: Array<DirectoryItem | FileItem> = [],
    public raw?: RawFileMetadata | RawDirectoryMetadata,
    public size?: number,
    public reference?: Reference,
  ) {
    super(name, raw, size, reference)
  }

  /**
   * Gets the list of files in the directory
   */
  getFiles(): FileItem[] {
    return this.content.filter(isFileItem)
  }

  /**
   * Gets the list of directories in the directory
   */
  getDirectories(): DirectoryItem[] {
    return this.content.filter(isDirectoryItem)
  }

  /**
   * Converts FairOS directory metadata to a DirectoryItem
   *
   * @param item raw directory metadata from FairOS
   */
  static fromRawDirectoryMetadata(item: RawDirectoryMetadata): DirectoryItem {
    return new DirectoryItem(item.meta.name, [], item)
  }
}
