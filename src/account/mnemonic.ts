import { Bee, Reference, Utils } from '@ethersphere/bee-js'
import { assertUsername } from './utils'
import { Wallet } from 'ethers'
import { getFeedData, writeFeedData } from '../feed/api'
import { Connection } from '../connection/connection'
import { stringToBytes } from '../utils/bytes'

/**
 * Downloads encrypted mnemonic phrase from swarm chunk
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
 * Uploads encrypted mnemonic to swarm chunk
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

  return writeFeedData(connection, username, stringToBytes(encryptedMnemonic), wallet.privateKey)
}
