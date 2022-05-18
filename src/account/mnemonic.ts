import { Bee, Reference, Utils } from '@ethersphere/bee-js'
import { assertBase64UrlData, assertUsername, removeZeroFromHex } from './utils'
import { Wallet } from 'ethers'
import { getFeedData, writeFeedData } from '../feed/api'
import { Connection } from '../connection/connection'
import { stringToBytes } from '../utils/bytes'
import { PublicKey } from '../utils/type'
import { decrypt } from './encryption'
import { wrapChunkHelper } from '../feed/utils'

export const ADDRESS_LENGTH = 64

/**
 * Downloads and decrypts mnemonic phrase from swarm chunk
 *
 * @param bee Bee client
 * @param publicKey FDP account public key
 * @param password FDP account password
 * @param address FDP account address
 *
 * @returns mnemonic phrase
 */
export async function getMnemonicByPublicKey(
  bee: Bee,
  publicKey: PublicKey,
  password: string,
  address: Utils.EthAddress,
): Promise<string> {
  const topic = removeZeroFromHex(publicKey) + password
  const encryptedContent = (await getFeedData(bee, topic, address)).data.chunkContent().text()
  const decryptedContent = decrypt(password, encryptedContent)
  const chunkAddress = decryptedContent.substring(0, ADDRESS_LENGTH)
  const encryptedMnemonic = wrapChunkHelper(await bee.downloadChunk(chunkAddress))
    .chunkContent()
    .text()

  return decrypt(password, encryptedMnemonic)
}

/**
 * Downloads encrypted mnemonic phrase from swarm chunk for version 1 account
 *
 * @deprecated use `getEncryptedMnemonicByPublicKey` instead for latest version of an account
 *
 * @param bee Bee client
 * @param username FDP account username
 * @param address FDP account address
 *
 * @returns encrypted mnemonic phrase in Base64url format
 */
export async function getEncryptedMnemonic(bee: Bee, username: string, address: Utils.EthAddress): Promise<string> {
  assertUsername(username)

  return (await getFeedData(bee, username, address)).data.chunkContent().text()
}

/**
 * Uploads encrypted mnemonic from account version 1 to swarm chunk
 *
 * @deprecated unloading for the new version of the account is implemented in `createUser` method
 *
 * @param connection connection information for data uploading
 * @param wallet FDP account Ethereum wallet
 * @param username FDP username
 * @param encryptedMnemonic encrypted mnemonic phrase in Base64url format
 */
export async function uploadEncryptedMnemonic(
  connection: Connection,
  wallet: Wallet,
  username: string,
  encryptedMnemonic: string,
): Promise<Reference> {
  assertUsername(username)
  assertBase64UrlData(encryptedMnemonic)

  return writeFeedData(connection, username, stringToBytes(encryptedMnemonic), wallet.privateKey)
}
