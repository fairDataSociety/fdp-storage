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
