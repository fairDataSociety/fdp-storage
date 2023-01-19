import { isObject, isString } from '../utils/type'
import { BrowserFileInfo, NodeFileInfo } from './utils'

/**
 * Checks that browser file info is correct
 */
export function isBrowserFileInfo(value: unknown): value is BrowserFileInfo {
  const data = value as BrowserFileInfo

  // check that `browserFile` is object, but not `File` to be able to check in node.js where `File` is available
  return isObject(data.browserFile) && isString(data.relativePathWithBase) && isString(data.relativePath)
}

/**
 * Asserts that node.js file info is correct
 */
export function assertNodeFileInfo(value: unknown): asserts value is NodeFileInfo {
  const data = value as NodeFileInfo

  if (!(isString(data.fullPath) && isString(data.relativePathWithBase) && isString(data.relativePath))) {
    throw new Error('Incorrect node file info')
  }
}
