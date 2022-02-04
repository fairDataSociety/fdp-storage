import { Bee, Utils } from '@ethersphere/bee-js'
import { Data } from '@ethersphere/bee-js/dist/src/types'
import { bmtHashString, extractChunkData } from '../account/utils'
import { getId } from './handler'
import { bytesToHex } from '../utils/hex'
import { keccak256Hash } from '../account/encryption'
import { lookup } from './lookup/linear'
import { Epoch } from './lookup/epoch'
import Long from 'long'
import { NoClue } from './lookup/lookup'

export async function getFeedData(bee: Bee, topic: string, address: string): Promise<Data> {
  const addressBytes = Utils.makeEthAddress(address)
  const topicHash = bmtHashString(topic)
  // const id = getId(topicHash, time)
  const chunk = await lookup(Long.fromNumber(0), NoClue, async (epoch: Epoch, time: Long): Promise<Data> => {
    const tempId = getId(topicHash, time.toNumber(), epoch.level)
    const chunkReference = bytesToHex(keccak256Hash(tempId, addressBytes))

    console.log('callback time', time.toString(), 'epoch', epoch, 'chunkReference', chunkReference)

    return await bee.downloadChunk(chunkReference)
  })
  // for (let i = 0; i <= 10; i++) {
  //   const epoch = 31 - i
  //   const tempId = getId(topicHash, time, epoch)
  //   const chunkR = bytesToHex(keccak256Hash(tempId, addressBytes))
  //   console.log('test epoch', epoch, 'chunk reference', chunkR)
  // }

  // const chunkReference = bytesToHex(keccak256Hash(id, addressBytes))
  // console.log('chunkReference', chunkReference)
  // const chunk = await bee.downloadChunk(chunkReference)

  return extractChunkData(chunk)
}
