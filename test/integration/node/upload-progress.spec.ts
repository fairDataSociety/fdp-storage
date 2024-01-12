import { createFdp, generateRandomHexString, generateUser } from '../../utils'
import { wrapBytesWithHelpers } from '../../../src/utils/bytes'
import { UploadProgressInfo } from '../../../src'

jest.setTimeout(400000)
it('Fair Data Protocol upload progress', async () => {
  const fdp = createFdp()
  generateUser(fdp)
  const pod = generateRandomHexString()
  const fileSizeBig = 5000005
  const contentBig = generateRandomHexString(fileSizeBig)
  const filenameBig = generateRandomHexString() + '.txt'
  const fullFilenameBigPath = '/' + filenameBig
  const callbackData = []

  const progressCallback = (progressInfo: UploadProgressInfo) => {
    callbackData.push(progressInfo)
  }

  await fdp.personalStorage.create(pod)
  await fdp.file.uploadData(pod, fullFilenameBigPath, contentBig, {
    progressCallback,
  })
  const dataBig = wrapBytesWithHelpers(await fdp.file.downloadData(pod, fullFilenameBigPath)).text()
  expect(dataBig).toEqual(contentBig)
  const fdpList = await fdp.directory.read(pod, '/', true)
  expect(fdpList.files.length).toEqual(1)
  const fileInfoBig = fdpList.files[0]
  expect(fileInfoBig.name).toEqual(filenameBig)
  expect(fileInfoBig.size).toEqual(fileSizeBig)

  expect(callbackData.length).toEqual(16)
})
