import { createFdp, generateRandomHexString, generateUser, makeFileContent } from '../../utils'
import { wrapBytesWithHelpers } from '../../../src/utils/bytes'

jest.setTimeout(400000)
it('Download by index', async () => {
  const fdp = createFdp()
  const pod = generateRandomHexString()
  const { size, blocksCount, blockSize, content, filename, fullPath } = makeFileContent(5000005)
  generateUser(fdp)
  await fdp.personalStorage.create(pod)
  await fdp.file.uploadData(pod, fullPath, content)
  const fileMeta = await fdp.file.getMetadata(pod, fullPath)
  expect(fileMeta.fileName).toEqual(filename)
  expect(fileMeta.blockSize).toEqual(blockSize)
  expect(fileMeta.fileSize).toEqual(size)

  const result = new Uint8Array(fileMeta.fileSize)
  for (let i = 0; i < blocksCount; i++) {
    result.set(await fdp.file.downloadDataBlock(fileMeta, i), i * blockSize)
  }

  const dataBig = wrapBytesWithHelpers(await fdp.file.downloadData(pod, fullPath)).text()
  expect(dataBig).toEqual(content)
})
