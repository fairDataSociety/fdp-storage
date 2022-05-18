import { Wallet } from 'ethers'
import { assertMigrateOptions, assertMnemonic, assertPassword, assertUsername } from './utils'
import { prepareEthAddress } from '../utils/address'
import { getEncryptedMnemonic, getMnemonicByPublicKey } from './mnemonic'
import { decrypt } from './encryption'
import { createUser } from './account'
import { Connection } from '../connection/connection'
import { MigrateOptions } from './types'
import { ENS } from '@fairdatasociety/fdp-contracts'

export class AccountData {
  public wallet?: Wallet

  constructor(public readonly connection: Connection, public readonly ens: ENS) {}

  /**
   * Sets the current account's wallet to interact with the data
   *
   * @param wallet BIP-039 + BIP-044 Wallet
   */
  setActiveAccount(wallet: Wallet): void {
    this.wallet = wallet.connect(this.ens.provider)
  }

  /**
   * Creates a new FDP account wallet
   */
  createWallet(): Wallet {
    if (this.wallet) {
      throw new Error('Wallet already created')
    }

    const wallet = Wallet.createRandom()
    this.setActiveAccount(wallet)

    return wallet
  }

  /**
   * Exports wallet from version 1 account
   *
   * @deprecated the method will be removed after an accounts' migration process is completed
   *
   * @param username username from version 1 account
   * @param password password from version 1 account
   * @param options migration options
   */
  async exportWallet(username: string, password: string, options: MigrateOptions): Promise<Wallet> {
    assertUsername(username)
    assertPassword(password)
    assertMigrateOptions(options)

    let mnemonic = options.mnemonic

    if (options.address) {
      const address = prepareEthAddress(options.address)
      const encryptedMnemonic = await getEncryptedMnemonic(this.connection.bee, username, address)
      mnemonic = decrypt(password, encryptedMnemonic)
    }

    assertMnemonic(mnemonic)

    return Wallet.fromMnemonic(mnemonic)
  }

  /**
   * Migrates from FDP account without ENS to account with ENS
   *
   * @deprecated the method will be removed after an accounts' migration process is completed
   *
   * @param username username from version 1 account
   * @param password password from version 1 account
   * @param options migration options with address or mnemonic from version 1 account
   */
  async migrate(username: string, password: string, options: MigrateOptions): Promise<Wallet> {
    assertUsername(username)
    assertPassword(password)
    assertMigrateOptions(options)

    let mnemonic = options.mnemonic

    if (options.address) {
      const address = prepareEthAddress(options.address)
      const encryptedMnemonic = await getEncryptedMnemonic(this.connection.bee, username, address)
      mnemonic = decrypt(password, encryptedMnemonic)
    }

    assertMnemonic(mnemonic)
    this.setActiveAccount(Wallet.fromMnemonic(mnemonic))

    return this.register(username, password)
  }

  /**
   * Logs in with the FDP credentials and gives back ethers wallet
   *
   * @param username FDP username
   * @param password password of the wallet
   *
   * @returns BIP-039 + BIP-044 Wallet
   */
  async login(username: string, password: string): Promise<Wallet> {
    assertUsername(username)
    assertPassword(password)

    if (await this.ens.isUsernameAvailable(username)) {
      throw new Error(`Username "${username}" does not exists`)
    }

    const address = prepareEthAddress(await this.ens.getUsernameOwner(username))
    const publicKey = await this.ens.getPublicKey(username)
    try {
      const mnemonic = await getMnemonicByPublicKey(this.connection.bee, publicKey, password, address)
      const wallet = Wallet.fromMnemonic(mnemonic)
      this.setActiveAccount(wallet)

      return wallet
    } catch (e) {
      throw new Error('Incorrect password')
    }
  }

  /**
   * Creates new FDP account and gives back user account with swarm reference
   *
   * @param username FDP username
   * @param password FDP password
   */
  async register(username: string, password: string): Promise<Wallet> {
    assertUsername(username)
    assertPassword(password)

    const wallet = this.wallet

    if (!wallet) {
      throw new Error('Before registration, a wallet must be created using `createWallet` method')
    }

    this.ens.connect(wallet)

    try {
      await createUser(this.connection, username, password, wallet.mnemonic.phrase)
      await this.ens.registerUsername(username, wallet.address, wallet.publicKey)
      this.setActiveAccount(wallet)

      return wallet
    } catch (e) {
      const error = e as Error

      if (error.message.startsWith('Conflict: chunk already exists')) {
        throw new Error('User account already uploaded')
      } else {
        throw e
      }
    }
  }
}
