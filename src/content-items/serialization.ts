import { DirectoryItem } from './directory-item'
import { FileItem } from './file-item'
import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types'
import { isObject, isString } from '../utils/type'
import { Reference } from '@ethersphere/bee-js'
import { getJsonObject } from '../utils/json'

/**
 * Type container for an object
 */
export interface TypedObject {
  objectType: string
}

/**
 * `FileItem` in an object representation
 */
export interface FileItemObject extends TypedObject {
  name: string
  raw?: RawFileMetadata | RawDirectoryMetadata
  size?: number
  reference?: string
}

/**
 * `DirectoryItem` in an object representation
 */
export interface DirectoryItemObject extends TypedObject {
  name: string
  content: Array<DirectoryItemObject | FileItemObject>
  raw?: RawFileMetadata | RawDirectoryMetadata
  size?: number
  reference?: string
}

/**
 * Validates that `DirectoryItemObject` is correct
 */
export function validateDirectoryItemObject(data: unknown): asserts data is DirectoryItemObject {
  const value = data as DirectoryItemObject

  if (
    !(
      isObject(value) &&
      value.objectType === DirectoryItem.type &&
      isString(value.name) &&
      Array.isArray(value.content)
    )
  ) {
    throw new Error('Incorrect directory item object')
  }
}

/**
 * Validates that `FileItemObject` is correct
 */
export function validateFileItemObject(data: unknown): asserts data is FileItemObject {
  const value = data as FileItemObject

  if (!(isObject(value) && value.objectType === FileItem.type && isString(value.name))) {
    throw new Error('Incorrect file item object')
  }
}

/**
 * Converts JSON to `DirectoryItem`
 */
export function jsonToDirectoryItem(data: string | unknown): DirectoryItem {
  const json = getJsonObject(data, 'directory item')
  validateDirectoryItemObject(json)
  const content = json.content.map((item: TypedObject) => {
    if (item.objectType === DirectoryItem.type) {
      return jsonToDirectoryItem(item)
    } else {
      return jsonToFileItem(item)
    }
  })

  return new DirectoryItem(json.name, content, json.raw, json.size, json.reference as Reference)
}

/**
 * Converts JSON to `FileItem`
 */
export function jsonToFileItem(data: string | unknown): FileItem {
  const json = getJsonObject(data, 'file item')
  validateFileItemObject(json)

  return new FileItem(json.name, json.raw, json.size, json.reference as Reference)
}
