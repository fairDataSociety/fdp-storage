import { utils, Wallet } from 'ethers'
import { assertAccount, assertPassword, assertUsername, HD_PATH, removeZeroFromHex } from './utils'
import { downloadPortableAccount, uploadPortableAccount } from './account'
import { Connection } from '../connection/connection'
import { RegistrationRequest } from './types'
import { ENS, PublicKey } from '@fairdatasociety/fdp-contracts-js'
import { Reference, Utils } from '@ethersphere/bee-js'
import CryptoJS from 'crypto-js'
import { bytesToHex } from '../utils/hex'
import { mnemonicToSeed, prepareEthAddress, privateKeyToBytes } from '../utils/wallet'
import { isChunkAlreadyExistsError, isInsufficientFundsError } from '../utils/error'

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

  constructor(
    public readonly connection: Connection,
    public readonly ens: ENS,
  ) {}

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
   * Logs in with the FDP credentials and gives back ethers wallet
   *
   * Account and postage batch id are not required
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
      throw new Error(`Username "${username}" does not exist`)
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
   * Creates a request object that is used to invoke the 'register' method. This object
   * encapsulates the complete state of registration process. In case when registration
   * fails in any of the steps, the 'register' method can be safely invoked again with
   * the existing RegistrationRequest object. The process will continue from the failed
   * step.
   *
   * Account and postage batch id are not required
   *
   * @param username FDP username
   * @param password FDP password
   *
   */
  createRegistrationRequest(username: string, password: string): RegistrationRequest {
    return {
      username,
      password,
      ensCompleted: false,
    }
  }

  /**
   * Creates a new FDP account and gives back user account with swarm reference
   *
   * Account and postage batch id are required
   *
   * @param request a RegistrationRequest object that contains the state of registration process
   */
  async register(request: RegistrationRequest): Promise<Reference> {
    const { username, password, ensCompleted } = request

    assertAccount(this, { writeRequired: true })
    assertUsername(username)
    assertPassword(password)

    const wallet = this.wallet!

    try {
      const seed = CryptoJS.enc.Hex.parse(removeZeroFromHex(bytesToHex(this.seed!)))

      if (!ensCompleted) {
        if (!request.ensRequest) {
          request.ensRequest = this.ens.createRegisterUsernameRequest(username, wallet.address, this.publicKey!)
        }

        await this.ens.registerUsername(request.ensRequest)
      }

      request.ensCompleted = true

      return await uploadPortableAccount(
        this.connection,
        username,
        password,
        privateKeyToBytes(wallet.privateKey),
        seed,
      )
    } catch (e) {
      if (isChunkAlreadyExistsError(e)) {
        throw new Error('User account already uploaded')
      } else if (isInsufficientFundsError(e)) {
        throw new Error('Not enough funds')
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
   * Account and postage batch id are required
   *
   * @param username FDP username
   * @param password FDP password
   */
  async reuploadPortableAccount(username: string, password: string): Promise<void> {
    assertAccount(this, { writeRequired: true })

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
      if (!isChunkAlreadyExistsError(e)) {
        throw e
      }
    }
  }
}
