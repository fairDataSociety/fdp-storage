import { Bee } from '@ethersphere/bee-js'
import { decrypt } from './account/encryption'
import { getEncryptedMnemonic } from './account/mnemonic'
import { Wallet } from 'ethers'
import { createUser } from './account/account'

export class FairdriveProtocol {
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
}
