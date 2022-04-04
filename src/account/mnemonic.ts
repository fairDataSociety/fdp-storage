import { Bee, Data, Reference, Utils } from '@ethersphere/bee-js'
import { assertUsername, bmtHashString, extractChunkContent } from './utils'
import { getId } from '../feed/handler'
import { Wallet } from 'ethers'
import { bytesToHex } from '../utils/hex'
import { stringToBytes } from '../utils/bytes'
import { writeFeedData } from '../feed/api'
import { Epoch, HIGHEST_LEVEL } from '../feed/lookup/epoch'
import { getBatchId } from '../utils/batch'
import { Connection } from '../connection/connection'

/**
 * Downloads encrypted mnemonic phrase from swarm chunk
 *
 * @param bee Bee client
 * @param username FDP account username
 * @param address FDP account address
 */
export async function getEncryptedMnemonic(bee: Bee, username: string, address: Utils.EthAddress): Promise<Data> {
  assertUsername(username)

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
 * @param connection connection information for data uploading
 * @param wallet FDP account Ethereum wallet
 * @param username FDP username
 * @param encryptedMnemonic encrypted mnemonic to upload
 */
export async function uploadEncryptedMnemonic(
  connection: Connection,
  wallet: Wallet,
  username: string,
  encryptedMnemonic: string,
): Promise<Reference> {
  assertUsername(username)

  const usernameHash = bmtHashString(username)
  const id = getId(usernameHash)

  const enc = new TextEncoder()
  const mnemonicBytes = enc.encode(encryptedMnemonic)
  const socWriter = connection.bee.makeSOCWriter(wallet.privateKey)

  return socWriter.upload(await getBatchId(connection.beeDebug), id, mnemonicBytes)
}
