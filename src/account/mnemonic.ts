import { Bee, Utils } from '@ethersphere/bee-js'
import { bmtHashString, extractEncryptedMnemonic } from './utils'
import { getId } from '../feed/handler'
import { bytesToHex } from '../utils/hex'
import { keccak256Hash } from './encryption'
import { Data } from '@ethersphere/bee-js/dist/src/types'

export async function getEncryptedMnemonic(bee: Bee, username: string, address: string): Promise<Data> {
  const addressBytes = Utils.makeEthAddress(address)
  const usernameHash = bmtHashString(username)
  const id = getId(usernameHash)
  const chunkReference = bytesToHex(keccak256Hash(id, addressBytes))
  const chunk = await bee.downloadChunk(chunkReference)

  return extractEncryptedMnemonic(chunk)
}
