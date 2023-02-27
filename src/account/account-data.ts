import { utils, Wallet } from 'ethers'
import {
  assertAccount,
  assertMnemonic,
  assertPassword,
  assertUsername,
  CHUNK_ALREADY_EXISTS_ERROR,
  HD_PATH,
  removeZeroFromHex,
} from './utils'
import { getEncryptedMnemonic } from './mnemonic'
import { decryptText } from '../utils/encryption'
import { downloadPortableAccount, uploadPortableAccount, UserAccountWithMnemonic } from './account'
import { Connection } from '../connection/connection'
import { AddressOptions, isAddressOptions, isMnemonicOptions, MnemonicOptions } from './types'
import { ENS, PublicKey } from '@fairdatasociety/fdp-contracts-js'
import { Reference, Utils } from '@ethersphere/bee-js'
import CryptoJS from 'crypto-js'
import { bytesToHex } from '../utils/hex'
import { mnemonicToSeed, prepareEthAddress, privateKeyToBytes } from '../utils/wallet'

export class AccountData {
  /**
   * Active FDP account wallet
   */
  public wallet?: utils.HDNode

  /**
   * Active FDP account's seed for entity creation
   */
  public seed?: Uint8Array

  /**
   * Public key for FDP account creation
   */
  public publicKey?: PublicKey

  constructor(public readonly connection: Connection, public readonly ens: ENS) {}

  /**
   * Connects wallet with ENS
   */
  private connectWalletWithENS(seed: Uint8Array) {
    this.seed = seed
    this.wallet = utils.HDNode.fromSeed(seed).derivePath(HD_PATH)
    this.ens.connect(new Wallet(this.wallet!.privateKey).connect(this.ens.provider))
  }

  /**
   * Sets FDP account from a seed
   *
   * @param seed data extracted from mnemonic phrase or from uploaded account
   */
  setAccountFromSeed(seed: Uint8Array): void {
    const hdNode = utils.HDNode.fromSeed(seed).derivePath(HD_PATH)
    this.publicKey = new utils.SigningKey(hdNode.privateKey).publicKey
    this.connectWalletWithENS(seed)
  }

  /**
   * Sets FDP account from mnemonic phrase
   *
   * @param mnemonic phrase from BIP-039/BIP-044 wallet
   */
  setAccountFromMnemonic(mnemonic: string): void {
    this.publicKey = Wallet.fromMnemonic(mnemonic).publicKey
    this.connectWalletWithENS(mnemonicToSeed(mnemonic))
  }

  /**
   * Creates a new FDP account wallet
   */
  createWallet(): Wallet {
    if (this.wallet) {
      throw new Error('Wallet already created')
    }

    const wallet = Wallet.createRandom()
    this.setAccountFromMnemonic(wallet.mnemonic.phrase)

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
  async exportWallet(
    username: string,
    password: string,
    options: AddressOptions | MnemonicOptions,
  ): Promise<UserAccountWithMnemonic> {
    assertUsername(username)
    assertPassword(password)

    let mnemonic = isMnemonicOptions(options) ? options.mnemonic : undefined

    if (isAddressOptions(options)) {
      const address = prepareEthAddress(options.address)
      const encryptedMnemonic = await getEncryptedMnemonic(this.connection.bee, username, address)
      mnemonic = decryptText(password, encryptedMnemonic)
    }

    assertMnemonic(mnemonic)

    const wallet = Wallet.fromMnemonic(mnemonic)

    return { wallet, mnemonic }
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
  async migrate(username: string, password: string, options: AddressOptions | MnemonicOptions): Promise<Reference> {
    assertUsername(username)
    assertPassword(password)

    const exported = await this.exportWallet(username, password, options)
    this.setAccountFromMnemonic(exported.mnemonic)

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
      const account = await downloadPortableAccount(this.connection.bee, address, username, password)
      this.setAccountFromSeed(account.seed)

      return account.wallet
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
  async register(username: string, password: string): Promise<Reference> {
    assertUsername(username)
    assertPassword(password)
    assertAccount(this)

    const wallet = this.wallet!

    try {
      const seed = CryptoJS.enc.Hex.parse(removeZeroFromHex(bytesToHex(this.seed!)))
      await this.ens.registerUsername(username, wallet.address, this.publicKey!)

      return await uploadPortableAccount(
        this.connection,
        username,
        password,
        privateKeyToBytes(wallet.privateKey),
        seed,
      )
    } catch (e) {
      const error = e as Error

      if (error.message?.startsWith(CHUNK_ALREADY_EXISTS_ERROR)) {
        throw new Error('User account already uploaded')
      } else {
        throw e
      }
    }
  }

  /**
   * Checks whether the public key associated with the username in ENS is identical with the wallet's public key
   *
   * @param username FDP username
   */
  async isPublicKeyEqual(username: string): Promise<boolean> {
    assertAccount(this)

    try {
      return (await this.ens.getPublicKey(username)) === this.publicKey
    } catch (e) {
      return false
    }
  }

  /**
   * Re-uploads portable account without registration in ENS
   *
   * @param username FDP username
   * @param password FDP password
   */
  async reuploadPortableAccount(username: string, password: string): Promise<void> {
    assertAccount(this)

    const wallet = this.wallet!
    const seed = CryptoJS.enc.Hex.parse(removeZeroFromHex(bytesToHex(this.seed!)))

    if (!(await this.isPublicKeyEqual(username))) {
      throw new Error('Public key from the account is not equal to the key from ENS')
    }

    try {
      await uploadPortableAccount(
        this.connection,
        username,
        password,
        Utils.hexToBytes(removeZeroFromHex(wallet.privateKey)),
        seed,
      )
    } catch (e) {
      const error = e as Error

      if (!error.message?.startsWith(CHUNK_ALREADY_EXISTS_ERROR)) {
        throw e
      }
    }
  }
}
