import { FileMetadata, DirectoryMetadata } from '../pod/types'

/**
 * Directory content holder
 */
export class DirectoryContent {
  constructor(
    public readonly rootDirectoryMeta: DirectoryMetadata,
    public readonly files: FileMetadata[],
    public readonly directories: DirectoryMetadata[],
  ) {}
}
