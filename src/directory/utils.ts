import { MAX_DIRECTORY_NAME_LENGTH } from './handler'

/**
 * Combine two parts of path to full path
 *
 * @param partOne first part of path
 * @param partTwo second part of path
 */
export function combine(partOne: string, partTwo: string): string {
  if (!partOne.endsWith('/')) {
    partOne = partOne + '/'
  }

  return partOne + partTwo
}

/**
 * Splits path to directories parts
 *
 * @param path
 */
export function getPathParts(path: string): string[] {
  if (path.length === 0) {
    throw new Error('Path is empty')
  }

  if (!path.startsWith('/')) {
    throw new Error('Incorrect path')
  }

  if (path === '/') {
    return ['/']
  }

  return ['/', ...path.split('/').slice(1)]
}

/**
 * Join parts to path
 *
 * @param parts
 * @param minusDirectories
 */
export function getPathFromParts(parts: string[], minusDirectories: number): string {
  if (parts.length === 0) {
    throw new Error('Path is empty')
  }

  if (parts.length <= minusDirectories) {
    throw new Error('Incorrect parts count')
  }

  return '/' + parts.slice(1, parts.length - minusDirectories).join('/')
}

/**
 * Asserts that parts length is correct
 *
 * @param parts
 */
export function assertPartsLength(parts: string[]): void {
  if (parts.length < 2) {
    throw new Error('Can not create directory for root')
  }
}

/**
 * Asserts that directory name is correct
 *
 * @param name
 */
export function assertDirectoryName(name: string): void {
  if (name.length === 0) {
    throw new Error('Name is empty')
  }

  if (name.length > MAX_DIRECTORY_NAME_LENGTH) {
    throw new Error('Directory name is too long')
  }
}
