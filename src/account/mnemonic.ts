import { Bee, Reference, Utils } from '@ethersphere/bee-js'
import { bmtHashString, extractChunkData, validateUsername } from './utils'
import { getId } from '../feed/handler'
import { bytesToHex } from '../utils/hex'
import { keccak256Hash } from './encryption'
import { Data } from '@ethersphere/bee-js/dist/src/types'
import { Wallet } from 'ethers'

export async function getEncryptedMnemonic(bee: Bee, username: string, address: string): Promise<Data> {
  const addressBytes = Utils.makeEthAddress(address)
  const usernameHash = bmtHashString(username)
  const id = getId(usernameHash)
  const chunkReference = bytesToHex(keccak256Hash(id, addressBytes))
  const chunk = await bee.downloadChunk(chunkReference)

  return extractChunkData(chunk)
}

export async function uploadEncryptedMnemonic(
  bee: Bee,
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
  // todo fill postage stamps

  return socWriter.upload('15c9a6252287bed75733a78b5464b21a7e15c5255dac49f1b88faeb4925ced63', id, mnemonicBytes)
}
