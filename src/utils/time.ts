import { assertNumber } from './type'

/**
 * Get unix timestamp in seconds
 */
export function getUnixTimestamp(): number {
  return Math.round(Date.now() / 1000)
}

/**
 * Asserts unix timestamp
 */
export function assertUnixTimestamp(timestamp: unknown): asserts timestamp is number {
  assertNumber(timestamp)

  if (timestamp.toString().length > 10) {
    throw new Error('Number is not a unix timestamp')
  }
}
