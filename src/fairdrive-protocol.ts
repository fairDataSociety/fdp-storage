import { Bee } from '@ethersphere/bee-js'
import { decrypt } from './account/encryption'
import { getEncryptedMnemonic } from './account/mnemonic'
import { Wallet } from 'ethers'
import { createUser } from './account/account'
import { getFeedData } from './feed/api'

export class FairdriveProtocol {
  static POD_TOPIC = 'Pods'
  public readonly bee: Bee
  public readonly users: any = {}

  constructor(url: string) {
    // todo assert url
    this.bee = new Bee(url)
  }

  async userImport(username: string, address = '', mnemonic = ''): Promise<boolean> {
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

    if (mnemonic) {
      try {
        address = Wallet.fromMnemonic(mnemonic).address
      } catch (e) {
        throw new Error('Incorrect mnemonic')
      }
    }

    this.users[username] = address

    return true
  }

  async userLogin(username: string, password: string): Promise<boolean> {
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
      Wallet.fromMnemonic(decrypted)
    } catch (e) {
      throw new Error('Incorrect password')
    }

    return true
  }

  async userSignup(username: string, password: string, mnemonic = '') {
    // todo check input
    // todo check is already exists / imported
    const userInfo = await createUser(this.bee, username, password, mnemonic)
    this.users[username] = userInfo.wallet.address

    return userInfo
  }

  // todo implement protocol and account managment. Call podLs and other methods under account
  async podLs() {
    const address = '0xA753B85A138443EB732d0183F48e67551a19d9A7'
    const result = await getFeedData(this.bee, FairdriveProtocol.POD_TOPIC, address)
    console.log('result', result.text())
  }
}
