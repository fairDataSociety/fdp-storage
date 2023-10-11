import { createFdp, generateRandomHexString, generateUser, makeFileContent } from '../../utils'
import { wrapBytesWithHelpers } from '../../../src/utils/bytes'
import { getDataBlock } from '../../../src/file/utils'

jest.setTimeout(400000)
it('Upload by index', async () => {
  const fdp = createFdp()
  const pod = generateRandomHexString()
  const { size, blocksCount, blockSize, content, filename, fullPath } = makeFileContent(5000005)

  // it's not required to upload blocks with existing account as every block secured by Swarm node,
  // so we can upload blocks in decentralized manner even using different nodes
  const blocks = []
  for (let i = 0; i < blocksCount; i++) {
    const block = getDataBlock(content, blockSize, i)
    blocks.push(await fdp.file.uploadDataBlock(block, i))
  }

  generateUser(fdp)
  await fdp.personalStorage.create(pod)

  // try to finalize blocks with incorrect order
  const mixedBlocks = [...blocks].reverse()
  await expect(fdp.file.uploadData(pod, fullPath, mixedBlocks)).rejects.toThrow(
    'The sequence of `ExternalDataBlock` is not correctly indexed.',
  )

  const fileMeta = await fdp.file.uploadData(pod, fullPath, blocks)
  expect(fileMeta.fileName).toEqual(filename)
  expect(fileMeta.blockSize).toEqual(blockSize)
  expect(fileMeta.fileSize).toEqual(size)

  const dataBig = wrapBytesWithHelpers(await fdp.file.downloadData(pod, fullPath)).text()
  expect(dataBig).toEqual(content)
  const fdpList = await fdp.directory.read(pod, '/', true)
  expect(fdpList.files.length).toEqual(1)
  const fileInfoBig = fdpList.files[0]
  expect(fileInfoBig.name).toEqual(filename)
  expect(fileInfoBig.size).toEqual(size)
})
