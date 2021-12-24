import {Bee, Utils} from '@ethersphere/bee-js'
import {bmtHashString, extractEncryptedMnemonic} from "./account/utils";
import {decrypt, keccak256Hash} from "./account/encryption";
import {bytesToHex} from "./utils/hex";
import {getId} from "./feed/handler";

export class FairdriveProtocol {
  public readonly bee: Bee
  public readonly users: any = {}

  constructor(url: string) {
    // todo assert url
    this.bee = new Bee(url)
  }

  async userImport(username: string, address: string, mnemonic: string = ''): Promise<boolean> {
    if (mnemonic) {
      // todo implement
      throw new Error('Mnemonic is not supported')
    }

    // todo validate address and username
    if (!(username && address)) {
      throw new Error('Pass username and address')
    }

    this.users[username] = address

    return true
  }

  async userLogin(username: string, password: string): Promise<boolean> {
    if (!this.users[username]) {
      throw new Error('Before login you should import the user')
    }

    const address = this.users[username]
    const addressBytes = Utils.makeEthAddress(address)
    const usernameHash = bmtHashString(username)
    const id = getId(usernameHash)
    const chunkReference = bytesToHex(keccak256Hash(id, addressBytes))
    const chunk = await this.bee.downloadChunk(chunkReference)
    const encryptedMnemonic = extractEncryptedMnemonic(chunk)
    const decrypted = decrypt(password, encryptedMnemonic.text())
    // todo check is correct mnemonic

    return true
  }
}
