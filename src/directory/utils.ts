import { MAX_DIRECTORY_NAME_LENGTH } from './handler'

/**
 * Combine passed parts of path to full path
 *
 * @param parts path parts to combine
 */
export function combine(...parts: string[]): string {
  // remove empty items
  parts = parts.filter(item => item !== '')
  // remove slashes if element contains not only slash
  parts = parts.map(part => (part.length > 1 ? part.replaceAll('/', '') : part))

  // add slash to the start of parts if it is not the first element
  if (parts[0] !== '/') {
    parts.unshift('/')
  }

  return getPathFromParts(parts)
}

/**
 * Splits path to parts
 *
 * @param path absolute path
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
 * Join parts to path with removing a certain number of parts from the end
 *
 * @param parts parts of path
 * @param minusParts hom many parts should be removed
 */
export function getPathFromParts(parts: string[], minusParts = 0): string {
  if (parts.length === 0) {
    throw new Error('Parts list is empty')
  }

  if (parts[0] !== '/') {
    throw new Error('Path parts must start with "/"')
  }

  if (parts.length <= minusParts) {
    throw new Error('Incorrect parts count')
  }

  return '/' + parts.slice(1, parts.length - minusParts).join('/')
}

/**
 * Asserts that parts length is correct
 */
export function assertPartsLength(value: unknown): asserts value is string[] {
  const parts = value as string[]

  if (parts.length < 2) {
    throw new Error('Can not create directory for root')
  }
}

/**
 * Asserts that directory name is correct
 */
export function assertDirectoryName(value: unknown): asserts value is string {
  const name = value as string

  if (name.length === 0) {
    throw new Error('Name is empty')
  }

  if (name.includes('/')) {
    throw new Error('Name contains "/" symbol')
  }

  if (name.length > MAX_DIRECTORY_NAME_LENGTH) {
    throw new Error('Directory name is too long')
  }
}
