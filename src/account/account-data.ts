import { Wallet, utils } from 'ethers'
import { assertMnemonic, assertPassword, assertUsername, removeZeroFromHex } from './utils'
import { prepareEthAddress } from '../utils/address'
import { getEncryptedMnemonic } from './mnemonic'
import { decryptText } from './encryption'
import { uploadPortableAccount, downloadPortableAccount } from './account'
import { Connection } from '../connection/connection'
import { AddressOptions, isAddressOptions, isMnemonicOptions, MnemonicOptions } from './types'
import { ENS } from '@fairdatasociety/fdp-contracts'
import { Utils } from '@ethersphere/bee-js'

export class AccountData {
  /**
   * Active FDP account wallet
   */
  public wallet?: Wallet
  public seed?: Uint8Array

  constructor(public readonly connection: Connection, public readonly ens: ENS) {}

  /**
   * Sets the current account's wallet to interact with the data
   *
   * @param wallet BIP-039 + BIP-044 Wallet
   */
  setActiveAccount(wallet: Wallet, seed?: Uint8Array): void {
    this.seed = seed || new Uint8Array()
    this.wallet = wallet.connect(this.ens.provider)
    this.ens.connect(this.wallet)
  }

  /**
   * Creates a new FDP account wallet
   */
  createWallet(): Wallet {
    if (this.wallet) {
      throw new Error('Wallet already created')
    }

    const wallet = Wallet.createRandom()
    this.setActiveAccount(wallet, Utils.hexToBytes(utils.mnemonicToSeed(wallet.mnemonic.phrase).slice(2)))

    return wallet
  }

  /**
   * Exports wallet from version 1 account
   *
   * @deprecated the method will be removed after an accounts' migration process is completed
   *
   * @param username username from version 1 account
   * @param password password from version 1 account
   * @param options migration options with address or mnemonic from version 1 account
   */
  async exportWallet(username: string, password: string, options: AddressOptions | MnemonicOptions): Promise<Wallet> {
    assertUsername(username)
    assertPassword(password)

    let mnemonic = isMnemonicOptions(options) ? options.mnemonic : undefined

    if (isAddressOptions(options)) {
      const address = prepareEthAddress(options.address)
      const encryptedMnemonic = await getEncryptedMnemonic(this.connection.bee, username, address)
      mnemonic = decryptText(password, encryptedMnemonic)
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
  async migrate(username: string, password: string, options: MnemonicOptions): Promise<Wallet> {
    assertUsername(username)
    assertPassword(password)

    this.setActiveAccount(await this.exportWallet(username, password, options), Utils.hexToBytes(utils.mnemonicToSeed(options.mnemonic).slice(2)))

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

    const publicKey = await this.ens.getPublicKey(username)
    try {
      const address = prepareEthAddress(utils.computeAddress(publicKey))
      const acc = await downloadPortableAccount(this.connection.bee, address, username, password)
      this.setActiveAccount(acc.wallet, acc.seed)

      return acc.wallet
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
      throw new Error('Before registration, an active account must be set')
    } 

    try {
      const seed = utils.mnemonicToSeed(wallet.mnemonic.phrase)

      const ref = await uploadPortableAccount(
        this.connection,
        username,
        password,
        Utils.hexToBytes(removeZeroFromHex(wallet.privateKey)),
        seed,
      )
      await this.ens.registerUsername(username, wallet.address, wallet.publicKey)
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
