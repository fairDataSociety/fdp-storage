import { isString } from './type'

/**
 * Parse JSON object with error handling
 */
export function jsonParse(data: string, errorMessage: string): unknown {
  try {
    return JSON.parse(data)
  } catch (e) {
    throw new Error(`Error in JSON parsing for "${errorMessage}"`)
  }
}

/**
 * Gets JSON object with error handling
 */
export function getJsonObject(data: string | unknown, errorMessage: string): unknown {
  return isString(data) ? jsonParse(data, errorMessage) : data
}
