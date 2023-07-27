import { Bee, BeeRequestOptions, Reference, Utils } from '@ethersphere/bee-js'
import { assertBase64UrlData, assertUsername } from './utils'
import { Wallet } from 'ethers'
import { getFeedData } from '../feed/api'
import { Connection } from '../connection/connection'
import { stringToBytes } from '../utils/bytes'
import { writeEpochFeedDataRaw } from '../feed/epoch'
import { FeedType } from '../feed/types'

/**
 * Downloads encrypted mnemonic phrase from swarm chunk for version 1 account
 *
 * @deprecated use methods for v2 account instead
 *
 * @param bee Bee client
 * @param username FDP account username
 * @param address FDP account address
 * @param feedType
 * @param requestOptions download data requestOptions
 * @returns encrypted mnemonic phrase in Base64url format
 */
export async function getEncryptedMnemonic(
  bee: Bee,
  username: string,
  address: Utils.EthAddress,
  feedType: FeedType,
  requestOptions?: BeeRequestOptions,
): Promise<string> {
  assertUsername(username)

  return (await getFeedData(bee, username, address, feedType, requestOptions)).data.chunkContent().text()
}

/**
 * Uploads encrypted mnemonic from account version 1 to swarm chunk
 *
 * @deprecated use methods for v2 account instead
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

  return writeEpochFeedDataRaw(connection, username, stringToBytes(encryptedMnemonic), wallet)
}
