import { Bee, BeeDebug, Reference, Utils } from '@ethersphere/bee-js'
import { bmtHashString, extractChunkData, validateAddress, validateUsername } from './utils'
import { getId } from '../feed/handler'
import { bytesToHex } from '../utils/hex'
import { keccak256Hash } from './encryption'
import { Data } from '@ethersphere/bee-js/dist/src/types'
import { Wallet } from 'ethers'
import { getBatchId } from './batch'

export async function getEncryptedMnemonic(bee: Bee, username: string, address: string): Promise<Data> {
  validateUsername(username)
  validateAddress(address)

  const addressBytes = Utils.makeEthAddress(address)
  const usernameHash = bmtHashString(username)
  const id = getId(usernameHash)
  const chunkReference = bytesToHex(keccak256Hash(id, addressBytes))
  const chunk = await bee.downloadChunk(chunkReference)

  return extractChunkData(chunk)
}

export async function uploadEncryptedMnemonic(
  bee: Bee,
  beeDebug: BeeDebug,
  wallet: Wallet,
  username: string,
  encryptedMnemonic: string,
): Promise<Reference> {
  validateUsername(username)

  const usernameHash = bmtHashString(username)
  const id = getId(usernameHash)

  const enc = new TextEncoder()
  const mnemonicBytes = enc.encode(encryptedMnemonic)
  const socWriter = bee.makeSOCWriter(wallet.privateKey)

  return socWriter.upload(await getBatchId(beeDebug), id, mnemonicBytes)
}
