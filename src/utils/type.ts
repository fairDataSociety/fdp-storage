/**
 * Asserts that the given value is a number
 *
 * @param value
 */
export function assertNumber(value: unknown): asserts value is number {
  if (!isNumber(value)) {
    throw new Error('Expected a number')
  }
}

/**
 * Asserts that the given value is a string
 *
 * @param value
 */
export function assertString(value: unknown): asserts value is string {
  if (!isString(value)) {
    throw new Error('Expected a string')
  }
}

/**
 * Checks that value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Checks that value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}
