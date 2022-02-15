import { Bee } from '@ethersphere/bee-js'
import { decrypt } from './account/encryption'
import { getEncryptedMnemonic } from './account/mnemonic'
import { Wallet } from 'ethers'
import { createUser, UserAccountWithReference } from './account/account'
import { getFeedData } from './feed/api'
import { Pod } from './pod'
import { validateAddress, validatePassword, validateUsername } from './account/utils'

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
    validateUsername(username)
    validateAddress(username)

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
   * Logs in with the FDP credentials and gives back ethers wallet
   *
   * @param username FDP username
   * @param password password of the wallet
   * @returns BIP-039 + BIG-044 Wallet
   */
  async userLogin(username: string, password: string): Promise<Wallet> {
    validateUsername(username)
    validatePassword(password)

    const address = this.users[username]

    if (!address) {
      throw new Error('User is not imported')
    }

    const encryptedMnemonic = await getEncryptedMnemonic(this.bee, username, address)
    const decrypted = decrypt(password, encryptedMnemonic.text())

    try {
      return Wallet.fromMnemonic(decrypted)
    } catch (e) {
      throw new Error('Incorrect password')
    }
  }

  async userSignup(username: string, password: string, mnemonic = ''): Promise<UserAccountWithReference> {
    // todo check is already exists / imported
    validateUsername(username)
    validatePassword(password)

    const userInfo = await createUser(this.bee, username, password, mnemonic)
    this.users[username] = userInfo.wallet.address

    return userInfo
  }

  // todo implement protocol and account management. Call podLs and other methods under account
  async podLs(): Promise<Pod[]> {
    // todo remove specific vars
    const address = '0x1f8f8EC28a1ED657836ADB02bed12C78F05cC8Dc'
    const result = await getFeedData(this.bee, FairdriveProtocol.POD_TOPIC, address)

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
