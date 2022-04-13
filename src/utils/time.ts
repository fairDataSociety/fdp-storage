/**
 * Get unix timestamp in seconds
 */
export function getUnixTimestamp(): number {
  return Math.round(Date.now() / 1000)
}

/**
 * Asserts unix timestamp
 *
 * @param timestamp
 */
export function assertUnixTimestamp(timestamp: number): void {
  if (timestamp.toString().length > 10) {
    throw new Error('Timestamp is not a unix timestamp')
  }
}
