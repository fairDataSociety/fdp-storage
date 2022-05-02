import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types'
import { Reference } from '@ethersphere/bee-js'

/**
 * DirectoryItem is a representation of a directory or file in the pod
 */
export class ContentItem {
  constructor(
    public name: string,
    public raw?: RawFileMetadata | RawDirectoryMetadata,
    public size?: number,
    public reference?: Reference,
  ) {}
}
