import { Bee, BeeDebug } from '@ethersphere/bee-js'
import { Wallet } from 'ethers'
import { assertMnemonic, assertPassword, assertUsername } from './utils'
import { prepareEthAddress } from '../utils/address'
import { getEncryptedMnemonic } from './mnemonic'
import { decrypt } from './encryption'
import { createUser, UserAccountWithReference } from './account'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'

export class AccountData {
  /** username -> ethereum wallet address mapping */
  public readonly usernameToAddress: { [key: string]: EthAddress } = {}

  constructor(public readonly bee: Bee, public readonly beeDebug: BeeDebug, public wallet?: Wallet) {}

  /**
   * Sets the current account's wallet to interact with the data
   *
   * @param wallet BIP-039 + BIP-044 Wallet
   */
  setActiveAccount(wallet: Wallet): void {
    this.wallet = wallet
  }

  /**
   * Import FDP user account
   *
   * @param username username to import
   * @param mnemonic 12 space separated words to initialize wallet
   */
  async import(username: string, mnemonic: string): Promise<void> {
    assertUsername(username)
    assertMnemonic(mnemonic)

    const wallet = Wallet.fromMnemonic(mnemonic)
    this.usernameToAddress[username] = prepareEthAddress(wallet.address)
    this.setActiveAccount(wallet)
  }

  /**
   * Set Ethereum address for specific username
   *
   * @param username username to modify
   * @param address Ethereum address with or without 0x prefix
   */
  setUserAddress(username: string, address: string): void {
    assertUsername(username)
    this.usernameToAddress[username] = prepareEthAddress(address)
  }

  /**
   * Removes Ethereum address for specific username
   *
   * @param username username to modify
   */
  removeUserAddress(username: string): void {
    assertUsername(username)
    delete this.usernameToAddress[username]
  }

  /**
   * Logs in with the FDP credentials and gives back ethers wallet
   *
   * @param username FDP username
   * @param password password of the wallet
   * @param address Ethereum address associated with FDP username
   * @returns BIP-039 + BIP-044 Wallet
   */
  async login(username: string, password: string, address?: string): Promise<Wallet> {
    assertUsername(username)
    assertPassword(password)

    if (address) {
      this.setUserAddress(username, address)
    }

    const existsAddress = this.usernameToAddress[username]

    if (!existsAddress) {
      throw new Error(`No address linked to the username "${username}"`)
    }

    const encryptedMnemonic = await getEncryptedMnemonic(this.bee, username, existsAddress)
    try {
      const decrypted = decrypt(password, encryptedMnemonic.text())
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
   * @param mnemonic Optional mnemonic phrase for account
   */
  async register(username: string, password: string, mnemonic?: string): Promise<UserAccountWithReference> {
    assertUsername(username)
    assertPassword(password)

    if (this.usernameToAddress[username]) {
      throw new Error('User already imported')
    }

    try {
      const userInfo = await createUser(this, username, password, mnemonic)
      this.usernameToAddress[username] = prepareEthAddress(userInfo.wallet.address)
      this.setActiveAccount(userInfo.wallet)

      return userInfo
    } catch (e) {
      const error = e as Error

      if (error.message.indexOf('Conflict: chunk already exists') >= 0) {
        throw new Error('User already exists')
      } else {
        throw e
      }
    }
  }
}
