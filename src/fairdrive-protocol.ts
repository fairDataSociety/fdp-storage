import { Bee } from '@ethersphere/bee-js'
import { decrypt } from './account/encryption'
import { getEncryptedMnemonic } from './account/mnemonic'
import { Wallet } from 'ethers'
import { createUser } from './account/account'
import { getFeedData } from './feed/api'

export class FairdriveProtocol {
  static POD_TOPIC = 'Pods'
  /** Ethereum Swarm Bee client instance */
  public readonly bee: Bee
  /** username -> ethereum wallet address mapping */
  public readonly users: { [key: string]: string } = {}

  constructor(url: string) {
    this.bee = new Bee(url)
  }

  /**
   * Import FDP user account
   *
   * @param username Username to import
   * @param address 0x prefixed ethereum address of the user
   * @param mnemonic 12 space separated words to initialize wallet
   */
  async userImport(username: string, address = '', mnemonic = ''): Promise<void> {
    // todo validate address and username
    if (!username) {
      throw new Error('Username is required')
    }

    if (address && mnemonic) {
      throw new Error('Use only mnemonic or address')
    }

    if (!address && !mnemonic) {
      throw new Error('Address or mnemonic is required')
    }

    if (address) {
      this.users[username] = address
    } else if (mnemonic) {
      try {
        this.users[username] = Wallet.fromMnemonic(mnemonic).address
      } catch (e) {
        throw new Error('Incorrect mnemonic')
      }
    }
  }

  /**
   * Logs in with the FDP credentails and gives back ethers wallet
   *
   * @param username FDP username
   * @param password password of the wallet
   * @returns BIP-039 + BIG-044 Wallet
   */
  async userLogin(username: string, password: string): Promise<Wallet> {
    if (!this.users[username]) {
      throw new Error('User is not imported')
    }

    if (!password) {
      throw new Error('Empty password')
    }

    const address = this.users[username]
    const encryptedMnemonic = await getEncryptedMnemonic(this.bee, username, address)
    const decrypted = decrypt(password, encryptedMnemonic.text())

    try {
      return Wallet.fromMnemonic(decrypted)
    } catch (e) {
      throw new Error('Incorrect password')
    }
  }

  async userSignup(username: string, password: string, mnemonic = ''): Promise<UserAccountWithReference> {
    // todo check input
    // todo check is already exists / imported
    const userInfo = await createUser(this.bee, username, password, mnemonic)
    this.users[username] = userInfo.wallet.address

    return userInfo
  }

  // todo implement protocol and account management. Call podLs and other methods under account
  async podLs() {
    // todo remove specific vars
    const address = '0x1f8f8EC28a1ED657836ADB02bed12C78F05cC8Dc'
    const result = await getFeedData(this.bee, FairdriveProtocol.POD_TOPIC, address)
    console.log('result', result.text().split('\n').filter(item => !!item.trim()))
  }
}
