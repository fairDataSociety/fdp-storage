import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types'
import { Reference } from '@ethersphere/bee-js'
import CryptoJS from 'jscrypto'
import { ContentItem } from './content-item'

/**
 * A representation of a file in the pod
 */
export class FileItem extends ContentItem {
  constructor(
    public name: string,
    public raw?: RawFileMetadata | RawDirectoryMetadata,
    public size?: number,
    public reference?: Reference,
  ) {
    super(name, raw, size, reference)
  }

  /**
   * Converts FairOS file metadata to a DirectoryItem
   *
   * @param item raw file metadata from FairOS
   */
  static fromRawFileMetadata(item: RawFileMetadata): FileItem {
    let reference: Reference | undefined

    if (item.file_inode_reference) {
      reference = CryptoJS.enc.Base64.parse(item.file_inode_reference).toString(CryptoJS.enc.Hex) as Reference
    }

    return new FileItem(item.file_name, item, Number(item.file_size), reference)
  }
}
