import { Bee, PrivateKeyBytes, Reference } from '@ethersphere/bee-js'
import { utils, Wallet } from 'ethers'
import { IV_LENGTH, decryptBytes, encryptBytes } from '../utils/encryption'
import { assertChunkSizeLength, CHUNK_SIZE, SEED_SIZE, createCredentialsTopic, HD_PATH } from './utils'
import { Connection } from '../connection/connection'
import CryptoJS from 'crypto-js'
import { wordArrayToBytes } from '../utils/bytes'
import { EthAddress } from '../utils/eth'

/**
 * User account with seed phrase
 */
export interface UserAccountWithSeed {
  wallet: Wallet
  seed: Uint8Array
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
  const encryptedBytes = encryptBytes(password, wordArrayToBytes(chunkData))
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
  address: EthAddress,
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
