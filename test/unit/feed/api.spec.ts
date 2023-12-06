import { getFeedData, writeFeedData } from '../../../src/feed/api'
import { createFdp, generateUser } from '../../utils'
import { stringToBytes } from '../../../src/utils/bytes'
import { prepareEthAddress, preparePrivateKey } from '../../../src/utils/wallet'
import { decryptBytes } from '../../../src/utils/encryption'
import { bytesToHex } from '../../../src/utils/hex'

jest.setTimeout(400000)
describe('feed/api', () => {
  it('write-read check', async () => {
    const fdp = createFdp()
    generateUser(fdp)

    const wallet = fdp.account.wallet!
    const podPassword = preparePrivateKey(wallet.privateKey)
    const topic = '/'
    const data = stringToBytes(JSON.stringify({ hello: 'world of bees' }))
    await writeFeedData(fdp.connection, topic, data, wallet, podPassword)
    const feedData = await getFeedData(fdp.connection.bee, topic, prepareEthAddress(wallet.address))
    const result = decryptBytes(bytesToHex(podPassword), feedData.data.chunkContent())

    expect(result).toEqual(data)
  })
})
