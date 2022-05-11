import { Reference } from '@ethersphere/bee-js'
import { Wallet } from 'ethers'
import { encrypt } from './encryption'
import { uploadEncryptedMnemonic } from './mnemonic'
import { assertMnemonic, assertPassword, removeZeroFromHex } from './utils'
import { Connection } from '../connection/connection'
import { writeFeedData } from '../feed/api'
import { stringToBytes } from '../utils/bytes'
import { generateRandomBase64String } from '../utils/string'

/**
 * Maximal size of padding to store the encrypted mnemonic address
 */
export const PADDING_MAX = 500
/**
 * Minimal size of padding to store the encrypted mnemonic address
 */
export const PADDING_MIN = 300
/**
 * Topic length for uploading encrypted mnemonic
 */
export const RANDOM_TOPIC_LENGTH = 16

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
  const encryptedMnemonic = encrypt(password, mnemonic)

  return {
    wallet,
    mnemonic,
    encryptedMnemonic,
  }
}

/**
 * Creates a new user (version 1) and uploads the encrypted account to the network
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
 * Creates a new user (version 2) and uploads the encrypted account to the network
 *
 * @param connection connection information for data uploading
 * @param username FDP username
 * @param password FDP password
 * @param mnemonic mnemonic phrase
 */
export async function createUser(
  connection: Connection,
  username: string,
  password: string,
  mnemonic: string,
): Promise<Reference> {
  const { wallet, encryptedMnemonic } = await createUserAccount(password, mnemonic)
  const topic = generateRandomBase64String(RANDOM_TOPIC_LENGTH)
  const encryptedMnemonicAddress = removeZeroFromHex(
    await writeFeedData(connection, topic, stringToBytes(encryptedMnemonic), wallet.privateKey),
  )
  const paddingLength = Math.floor(Math.random() * (PADDING_MAX - PADDING_MIN)) + PADDING_MIN
  const randomPadding = generateRandomBase64String(paddingLength)
  const encryptedAddress = encrypt(password, encryptedMnemonicAddress + randomPadding)
  const topicPublicKey = removeZeroFromHex(wallet.publicKey) + password

  return writeFeedData(connection, topicPublicKey, stringToBytes(encryptedAddress), wallet.privateKey)
}
