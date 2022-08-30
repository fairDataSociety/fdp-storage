import { Bee, PrivateKeyBytes, Reference, Utils } from '@ethersphere/bee-js'
import { utils, Wallet } from 'ethers'
import { decryptBytes, encryptText, encryptBytes, IV_LENGTH } from './encryption'
import { uploadEncryptedMnemonic } from './mnemonic'
import {
  assertChunkSizeLength,
  assertMnemonic,
  assertPassword,
  CHUNK_SIZE,
  SEED_SIZE,
  createCredentialsTopic,
  HD_PATH,
} from './utils'
import { Connection } from '../connection/connection'
import CryptoJS from 'crypto-js'

/**
 * Created and encrypted user account to upload to the network
 * @deprecated interface for v1 accounts
 */
interface UserAccount {
  wallet: Wallet
  mnemonic: string
  encryptedMnemonic: string
}

/**
 * Account and mnemonic phrase
 * @deprecated interface for v1 accounts
 */
export interface UserAccountWithMnemonic {
  wallet: Wallet
  mnemonic: string
}

/**
 * User account with seed phrase
 */
export interface UserAccountWithSeed {
  wallet: Wallet
  seed: Uint8Array
}

/**
 * Encrypted account uploaded to the network
 */
export interface UserAccountWithReference extends UserAccount {
  reference: Reference
}

/**
 * Creates a new user account based on the passed mnemonic phrase or without it, encrypted with a password
 *
 * @deprecated method for v1 accounts
 *
 * @param password FDP password
 * @param mnemonic mnemonic phrase
 */
async function createUserAccount(password: string, mnemonic?: string): Promise<UserAccount> {
  assertPassword(password)

  if (mnemonic) {
    assertMnemonic(mnemonic)
  } else {
    mnemonic = Wallet.createRandom().mnemonic.phrase
  }

  const wallet = Wallet.fromMnemonic(mnemonic)
  const encryptedMnemonic = encryptText(password, mnemonic)

  return {
    wallet,
    mnemonic,
    encryptedMnemonic,
  }
}

/**
 * Creates a new user (version 1) and uploads the encrypted account to the network
 *
 * @deprecated use `createUser` method instead to create the latest version of an account
 *
 * @param connection connection information for data uploading
 * @param username FDP username
 * @param password FDP password
 * @param mnemonic mnemonic phrase
 */
export async function createUserV1(
  connection: Connection,
  username: string,
  password: string,
  mnemonic?: string,
): Promise<UserAccountWithReference> {
  const account = await createUserAccount(password, mnemonic)
  const reference = await uploadEncryptedMnemonic(connection, account.wallet, username, account.encryptedMnemonic)

  return { ...account, reference }
}

/**
 * Uploads portable account (version 2)
 *
 * @param connection connection information for data uploading
 * @param username FDP username for topic creation
 * @param password FDP password for encrypting SOC data
 * @param privateKey account's wallet private key for signing SOC
 * @param seed account's seed for storing in SOC
 *
 * @returns swarm reference to encrypted Ethereum wallet
 */
export async function uploadPortableAccount(
  connection: Connection,
  username: string,
  password: string,
  privateKey: PrivateKeyBytes,
  seed: CryptoJS.lib.WordArray,
): Promise<Reference> {
  const paddedData = CryptoJS.lib.WordArray.random(CHUNK_SIZE - SEED_SIZE - IV_LENGTH)
  const chunkData = seed.concat(paddedData)
  const encryptedBytes = encryptBytes(password, chunkData)
  assertChunkSizeLength(encryptedBytes.length)
  const topic = createCredentialsTopic(username, password)
  const socWriter = connection.bee.makeSOCWriter(privateKey)

  return socWriter.upload(connection.postageBatchId, topic, encryptedBytes)
}

/**
 * Downloads portable account (version 2)
 *
 * @param bee Bee instance
 * @param address FDP account address
 * @param username FDP username
 * @param password FDP password
 *
 * @returns decrypted Ethereum wallet of the account
 */
export async function downloadPortableAccount(
  bee: Bee,
  address: Utils.EthAddress,
  username: string,
  password: string,
): Promise<UserAccountWithSeed> {
  const topic = createCredentialsTopic(username, password)
  const socReader = bee.makeSOCReader(address)
  const encryptedData = (await socReader.download(topic)).payload()
  const seed = decryptBytes(password, encryptedData).slice(0, SEED_SIZE)
  const node = utils.HDNode.fromSeed(seed).derivePath(HD_PATH)
  const wallet = new Wallet(node.privateKey)

  return { wallet, seed }
}
