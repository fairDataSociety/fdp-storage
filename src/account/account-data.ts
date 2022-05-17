import { Wallet, utils } from 'ethers'
import { assertMigrateOptions, assertMnemonic, assertPassword, assertUsername, assertUsernameAvailable } from './utils'
import { prepareEthAddress } from '../utils/address'
import { getEncryptedMnemonic, getEncryptedMnemonicByPublicKey } from './mnemonic'
import { decrypt } from './encryption'
import { createUser } from './account'
import { Connection } from '../connection/connection'
import { MigrateOptions } from './types'
import { ENS } from '@fairdatasociety/fdp-contracts'

export class AccountData {
  public wallet?: Wallet

  constructor(
    public readonly connection: Connection,
    public readonly ens: ENS,
    public readonly minimumAccountBalanceEth = '0.01',
  ) {}

  /**
   * Sets the current account's wallet to interact with the data
   *
   * @param wallet BIP-039 + BIP-044 Wallet
   */
  setActiveAccount(wallet: Wallet): void {
    this.wallet = wallet
  }

  /**
   * Creates a new FDP account wallet
   */
  createWallet(): Wallet {
    return Wallet.createRandom()
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
    await assertUsernameAvailable(this.ens, username)

    let mnemonic = options.mnemonic

    if (options.address) {
      const address = prepareEthAddress(options.address)
      const encryptedMnemonic = await getEncryptedMnemonic(this.connection.bee, username, address)
      mnemonic = decrypt(password, encryptedMnemonic)
    }

    assertMnemonic(mnemonic)

    return this.register(username, password, mnemonic)
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
      const encryptedMnemonic = await getEncryptedMnemonicByPublicKey(this.connection.bee, publicKey, password, address)
      const decrypted = decrypt(password, encryptedMnemonic)
      const wallet = Wallet.fromMnemonic(decrypted)
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
   * @param mnemonic mnemonic phrase for account
   */
  async register(username: string, password: string, mnemonic: string): Promise<Wallet> {
    assertUsername(username)
    assertPassword(password)
    assertMnemonic(mnemonic)

    const wallet = Wallet.fromMnemonic(mnemonic).connect(this.ens.provider)
    this.ens.connect(wallet)

    await assertUsernameAvailable(this.ens, username)

    if ((await this.ens.provider.getBalance(wallet.address)).lt(utils.parseEther(this.minimumAccountBalanceEth))) {
      throw new Error(`Account balance is lower than ${this.minimumAccountBalanceEth}`)
    }

    try {
      await createUser(this.connection, username, password, mnemonic)
      await this.ens.registerUsername(username, wallet.address, wallet.publicKey)
      this.setActiveAccount(wallet)

      return wallet
    } catch (e) {
      const error = e as Error

      if (error.message.startsWith('Conflict: chunk already exists')) {
        throw new Error('User already exists')
      } else {
        throw e
      }
    }
  }
}
