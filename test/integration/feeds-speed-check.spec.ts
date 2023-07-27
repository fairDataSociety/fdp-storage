import { batchId, beeUrl, fdpOptions, generateRandomHexString } from '../utils'
import { FdpStorage } from '../../src'
import { FeedType } from '../../src/feed/types'
import { BatchId } from '@ethersphere/bee-js'

jest.setTimeout(400000)
describe('feed/sequential', () => {
  it('check', async () => {
    const beeNodeUrl = 'https://bee-1.fairdatasociety.org/'
    const stamp = '0'.repeat(64) as BatchId
    // const beeNodeUrl = beeUrl()
    // const stamp = batchId()
    const fdp = new FdpStorage(beeNodeUrl, stamp, {
      ...fdpOptions,
      requestOptions: {
        timeout: 100000,
      },
      feedType: FeedType.Sequence,
      ...{
        cacheOptions: {
          isUseCache: false,
        },
      },
    })

    const pod1 = generateRandomHexString()
    const pod2 = generateRandomHexString()
    const dir1 = `/${generateRandomHexString()}`
    const dir2 = `/${generateRandomHexString()}`
    const fileSize = 100000
    const fileContent = generateRandomHexString(fileSize)
    const filename = generateRandomHexString() + '.txt'
    const fullFilename = '/' + filename
    fdp.account.createWallet()
    await fdp.personalStorage.create(pod1)
    await fdp.personalStorage.create(pod2)
    await fdp.directory.create(pod1, dir1)
    await fdp.directory.create(pod1, dir2)
    await fdp.directory.create(pod2, dir1)
    await fdp.directory.create(pod2, dir2)
    await fdp.file.uploadData(pod1, fullFilename, fileContent)
    await fdp.file.uploadData(pod2, fullFilename, fileContent)
    await fdp.file.downloadData(pod1, fullFilename)
    await fdp.file.downloadData(pod2, fullFilename)
    await fdp.directory.read(pod1, '/', true)
    await fdp.directory.read(pod2, '/', true)
  })
})
