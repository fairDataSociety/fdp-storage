import { Utils } from '@ethersphere/bee-js'
import { isEthAddress, isObject } from '../utils/type'
import { isValidMnemonic } from 'ethers/lib/utils'
import { ServiceRequest } from '@fairdatasociety/fdp-contracts-js/build/types/model/service-request.model'
import { RegisterUsernameRequestData } from '@fairdatasociety/fdp-contracts-js'

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
 * This objects encapsulates state of registration process.
 */
export interface RegistrationRequest {
  username: string
  password: string
  ensCompleted: boolean
  ensRequest?: ServiceRequest<RegisterUsernameRequestData>
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
