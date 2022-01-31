import { Bee, Reference, Utils } from '@ethersphere/bee-js'
import { Data } from '@ethersphere/bee-js/dist/src/types'
import { Wallet } from 'ethers'
import { getId } from '../feed/handler'
import { bmtHashString, extractEncryptedMnemonic } from './utils'

export async function getEncryptedMnemonic(bee: Bee, username: string, address: string): Promise<Data> {
  const addressBytes = Utils.makeEthAddress(address)
  const id = getId(bmtHashString(username))
  const chunkReference = Utils.bytesToHex(Utils.keccak256Hash(id, addressBytes))
  const chunk = await bee.downloadChunk(chunkReference)

  return extractEncryptedMnemonic(chunk)
}

// todo offload from address param, get it from wallet
export async function uploadEncryptedMnemonic(
  bee: Bee,
  wallet: Wallet,
  username: string,
  encryptedMnemonic: string,
): Promise<Reference> {
  const usernameHash = bmtHashString(username)
  const id = getId(usernameHash)

  const enc = new TextEncoder()
  const mnemonicBytes = enc.encode(encryptedMnemonic)

  const socWriter = bee.makeSOCWriter(wallet.privateKey)
  // todo fill postage stamps

  // todo: postage stamp from parameter
  return socWriter.upload('e9a8f99430cf2ec090f4b5b8e1befbc9cc4d48aba68f3c7db151fb5df25f6fd0', id, mnemonicBytes)
}
