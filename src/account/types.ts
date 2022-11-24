import { Utils } from '@fairdatasociety/bee-js'
import { isEthAddress, isObject } from '../utils/type'
import { isValidMnemonic } from 'ethers/lib/utils'

/**
 * Migrate options with possibility to migrate with an address
 */
export interface AddressOptions {
  address: Utils.EthAddress
}

/**
 * Migrate options with possibility to migrate with a mnemonic
 */
export interface MnemonicOptions {
  mnemonic: string
}

/**
 * Checks that value is an AddressOptions
 */
export function isAddressOptions(options: unknown): options is AddressOptions {
  return isObject(options) && isEthAddress((options as AddressOptions).address)
}

/**
 * Checks that value is an MnemonicOptions
 */
export function isMnemonicOptions(options: unknown): options is MnemonicOptions {
  return isObject(options) && isValidMnemonic((options as MnemonicOptions).mnemonic)
}
