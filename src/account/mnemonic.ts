import { Bee, Data, Reference, Utils } from '@ethersphere/bee-js'
import { assertAddress, assertUsername, bmtHashString, extractChunkData } from './utils'
import { getId } from '../feed/handler'
import { Wallet } from 'ethers'
import AccountData from './account-data'
import { bytesToHex } from '../utils/hex'
import { getBatchId } from '../utils/batch'

export async function getEncryptedMnemonic(bee: Bee, username: string, address: string): Promise<Data> {
  assertUsername(username)
  assertAddress(address)

  const addressBytes = Utils.makeEthAddress(address)
  const usernameHash = bmtHashString(username)
  const id = getId(usernameHash)
  const chunkReference = bytesToHex(Utils.keccak256Hash(id, addressBytes))
  const chunk = await bee.downloadChunk(chunkReference)

  return extractChunkData(chunk)
}

export async function uploadEncryptedMnemonic(
  accountData: AccountData,
  wallet: Wallet,
  username: string,
  encryptedMnemonic: string,
): Promise<Reference> {
  assertUsername(username)

  const usernameHash = bmtHashString(username)
  const id = getId(usernameHash)

  const enc = new TextEncoder()
  const mnemonicBytes = enc.encode(encryptedMnemonic)
  const socWriter = accountData.bee.makeSOCWriter(wallet.privateKey)

  return socWriter.upload(await getBatchId(accountData.beeDebug), id, mnemonicBytes)
}
