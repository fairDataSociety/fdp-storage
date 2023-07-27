import { Bee, Topic } from '@ethersphere/bee-js'
import { batchId, beeUrl } from '../../utils'
import { Wallet } from 'ethers'
import { bytesToString } from '../../../src/utils/bytes'

describe('feed/sequential', () => {
  it('check', async () => {
    // const wallet = Wallet.createRandom()
    // const bee = new Bee(beeUrl())
    // const data1 = 'Hello world 1'
    // const data2 = 'Hello world 2'
    // // const topic = Utils.makeHexString('hello')
    // const topic = '0000000000000000000000000000000000000000000000000000000000000000' as Topic
    // const referenceData1 = await bee.uploadData(batchId(), data1)
    // const referenceData2 = await bee.uploadData(batchId(), data2)
    // const writer = bee.makeFeedWriter('sequence', topic, wallet.privateKey)
    // const reader = bee.makeFeedReader('sequence', topic, wallet.address)
    // await writer.upload(batchId(), referenceData1.reference)
    // expect(bytesToString(await bee.downloadData((await reader.download()).reference))).toEqual(data1)
    // await writer.upload(batchId(), referenceData2.reference)
    // expect(bytesToString(await bee.downloadData((await reader.download()).reference))).toEqual(data2)
  })
})
