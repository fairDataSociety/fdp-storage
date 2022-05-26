import { Bee, PrivateKeyBytes, Reference, Utils } from '@ethersphere/bee-js'
import { Wallet } from 'ethers'
import { decryptBytes, encryptText, encryptBytes, IV_LENGTH } from './encryption'
import { uploadEncryptedMnemonic } from './mnemonic'
import { assertChunkSizeLength, assertMnemonic, assertPassword, CHUNK_SIZE, createCredentialsTopic } from './utils'
import { Connection } from '../connection/connection'
import { getBatchId } from '../utils/batch'
import CryptoJS from 'crypto-js'

/**
 * Created and encrypted user account to upload to the network
 */
interface UserAccount {
  wallet: Wallet
  mnemonic: string
  encryptedMnemonic: string
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
 * @param username FDP username
 * @param password FDP password
 * @param privateKey account's wallet private key
 *
 * @returns swarm reference to encrypted Ethereum wallet
 */
export async function uploadPortableAccount(
  connection: Connection,
  username: string,
  password: string,
  privateKey: PrivateKeyBytes,
): Promise<Reference> {
  const paddedData = CryptoJS.lib.WordArray.random(CHUNK_SIZE - privateKey.length - IV_LENGTH)
  const privateKeyWords = CryptoJS.enc.Hex.parse(Utils.bytesToHex(privateKey))
  const chunkData = privateKeyWords.concat(paddedData)
  const encryptedBytes = encryptBytes(password, chunkData)
  assertChunkSizeLength(encryptedBytes.length)
  const topic = createCredentialsTopic(username, password)
  const socWriter = connection.bee.makeSOCWriter(privateKey)

  return socWriter.upload(await getBatchId(connection.beeDebug), topic, encryptedBytes)
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
): Promise<Wallet> {
  const topic = createCredentialsTopic(username, password)
  const socReader = bee.makeSOCReader(address)
  const encryptedData = (await socReader.download(topic)).payload()
  const privateKey = decryptBytes(password, encryptedData).slice(0, 32)

  return new Wallet(privateKey)
}
