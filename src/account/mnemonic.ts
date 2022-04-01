import { Bee, Data, Reference, Utils } from '@ethersphere/bee-js'
import { assertAddress, assertUsername, bmtHashString, extractChunkContent } from './utils'
import { getId } from '../feed/handler'
import { Wallet } from 'ethers'
import { AccountData } from './account-data'
import { bytesToHex } from '../utils/hex'
import { stringToBytes } from '../utils/bytes'
import { writeFeedData } from '../feed/api'
import { Epoch, HIGHEST_LEVEL } from '../feed/lookup/epoch'

/**
 * Downloads encrypted mnemonic phrase from swarm chunk
 *
 * @param bee Bee client
 * @param username FDP account username
 * @param address FDP account address
 */
export async function getEncryptedMnemonic(bee: Bee, username: string, address: string): Promise<Data> {
  assertUsername(username)
  assertAddress(address)

  const addressBytes = Utils.makeEthAddress(address)
  const usernameHash = bmtHashString(username)
  const id = getId(usernameHash)
  const chunkReference = bytesToHex(Utils.keccak256Hash(id, addressBytes))
  const chunk = await bee.downloadChunk(chunkReference)

  return extractChunkContent(chunk)
}

/**
 * Uploads encrypted mnemonic to swarm chunk
 *
 * @param accountData connection information for data uploading
 * @param wallet FDP account Ethereum wallet
 * @param username FDP username
 * @param encryptedMnemonic encrypted mnemonic to upload
 */
export async function uploadEncryptedMnemonic(
  accountData: AccountData,
  wallet: Wallet,
  username: string,
  encryptedMnemonic: string,
): Promise<Reference> {
  assertUsername(username)

  return writeFeedData(
    accountData,
    username,
    stringToBytes(encryptedMnemonic),
    wallet.privateKey,
    new Epoch(HIGHEST_LEVEL, 0),
  )
}
