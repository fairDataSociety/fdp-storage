/**
 * Get unix timestamp in seconds
 */
export function getUnixTimestamp(): number {
  return Math.round(Date.now() / 1000)
}

/**
 * Asserts unix timestamp
 */
export function assertUnixTimestamp(value: unknown): asserts value is number {
  const timestamp = value as number

  if (timestamp.toString().length > 10) {
    throw new Error('Timestamp is not a unix timestamp')
  }
}
