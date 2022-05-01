import { FileItem } from './file-item'
import { DirectoryItem } from './directory-item'

/**
 * Directory item guard
 */
export function isDirectoryItem(value: unknown): value is DirectoryItem {
  return value instanceof DirectoryItem
}

/**
 * File item guard
 */
export function isFileItem(value: unknown): value is DirectoryItem {
  return value instanceof FileItem
}
