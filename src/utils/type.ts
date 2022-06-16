import { Utils } from '@ethersphere/bee-js'

export type { PublicKey } from '@fairdatasociety/fdp-contracts'

/**
 * Asserts that the given value is a number
 */
export function assertNumber(value: unknown): asserts value is number {
  if (!isNumber(value)) {
    throw new Error('Expected a number')
  }
}

/**
 * Asserts that the given value is a string
 */
export function assertString(value: unknown): asserts value is string {
  if (!isString(value)) {
    throw new Error('Expected a string')
  }
}

/**
 * Checks that value is a valid Ethereum address
 */
export function isEthAddress(value: unknown): value is Utils.EthAddress {
  return Utils.isHexString(value) && value.length === 20
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

/**
 * Checks that value is an object
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function isObject(value: unknown): value is object {
  return typeof value === 'object'
}
