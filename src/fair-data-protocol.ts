import { Bee, BeeDebug } from '@ethersphere/bee-js'
import { decrypt } from './account/encryption'
import { getEncryptedMnemonic } from './account/mnemonic'
import { Wallet } from 'ethers'
import { createUser, UserAccountWithReference } from './account/account'
import { getFeedData } from './feed/api'
import { Pod } from './types'
import { assertActiveAccount, assertAddress, assertMnemonic, assertPassword, assertUsername } from './account/utils'
import AccountData from './account/account-data'
import { Data } from '@ethersphere/bee-js/dist/src/types'

export const POD_TOPIC = 'Pods'

export class FairDataProtocol {
  /** AccountData instance */
  public readonly accountData: AccountData
  /** username -> ethereum wallet address mapping */
  public readonly users: { [key: string]: string } = {}

  constructor(beeUrl: string, debugUrl: string) {
    this.accountData = new AccountData(new Bee(beeUrl), new BeeDebug(debugUrl))
  }

  setActiveAccount(wallet: Wallet): void {
    this.accountData.wallet = wallet
  }

  /**
   * Import FDP user account
   *
   * @param username Username to import
   * @param address 0x prefixed ethereum address of the user
   * @param mnemonic 12 space separated words to initialize wallet
   */
  async userImport(username: string, address?: string, mnemonic?: string): Promise<void> {
    assertUsername(username)

    if (address && mnemonic) {
      throw new Error('Use only mnemonic or address')
    }

    if (!address && !mnemonic) {
      throw new Error('Address or mnemonic is required')
    }

    if (address) {
      assertAddress(address)
      this.users[username] = address
    } else if (mnemonic) {
      try {
        assertMnemonic(mnemonic)
        const wallet = Wallet.fromMnemonic(mnemonic)
        this.users[username] = wallet.address
        this.setActiveAccount(wallet)
      } catch (e) {
        throw new Error('Incorrect mnemonic')
      }
    }
  }

  /**
   * Logs in with the FDP credentials and gives back ethers wallet
   *
   * @param username FDP username
   * @param password password of the wallet
   * @returns BIP-039 + BIP-044 Wallet
   */
  async userLogin(username: string, password: string): Promise<Wallet> {
    assertUsername(username)
    assertPassword(password)

    const address = this.users[username]

    if (!address) {
      throw new Error('User is not imported')
    }

    const encryptedMnemonic = await getEncryptedMnemonic(this.accountData.bee, username, address)
    try {
      const decrypted = decrypt(password, encryptedMnemonic.text())
      const wallet = Wallet.fromMnemonic(decrypted)
      this.setActiveAccount(wallet)

      return wallet
    } catch (e) {
      throw new Error('Incorrect password')
    }
  }

  async userSignup(username: string, password: string, mnemonic = ''): Promise<UserAccountWithReference> {
    // todo check is already exists / imported
    assertUsername(username)
    assertPassword(password)

    try {
      const userInfo = await createUser(this.accountData, username, password, mnemonic)
      this.users[username] = userInfo.wallet.address
      this.setActiveAccount(userInfo.wallet)

      return userInfo
    } catch (e) {
      const error = e as Error

      if (error.message.indexOf('Conflict: chunk already exists') >= 0) {
        throw new Error('User already exists')
      } else {
        throw new Error(error.message)
      }
    }
  }

  async podLs(): Promise<Pod[]> {
    assertActiveAccount(this.accountData)
    let result: Data
    try {
      result = await getFeedData(this.accountData.bee, POD_TOPIC, this.accountData.wallet!.address)
    } catch (e) {
      return []
    }

    return result
      .text()
      .split('\n')
      .filter(item => Boolean(item.trim()))
      .map(item => {
        const parts = item.split(',')

        if (parts.length !== 2) {
          throw new Error('Pod information: incorrect length')
        }

        return { name: parts[0], index: Number(parts[1]) } as Pod
      })
  }
}
