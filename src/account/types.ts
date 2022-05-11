import { Utils } from '@ethersphere/bee-js'

/**
 * Migrate options with possibility to migrate with an address or a mnemonic
 */
export interface MigrateOptions {
  address?: Utils.EthAddress
  mnemonic?: string
}
