import { createFdp, generateRandomHexString, generateUser } from '../../utils'
import { wrapBytesWithHelpers } from '../../../src/utils/bytes'
import { DownloadProgressInfo } from '../../../src'
import { DEFAULT_UPLOAD_OPTIONS } from '../../../src/content-items/handler'

jest.setTimeout(400000)
it('Fair Data Protocol download progress', async () => {
  const fdp = createFdp()
  generateUser(fdp)
  const pod = generateRandomHexString()
  const fileSizeBig = 5000005
  const blocksCount = Math.ceil(fileSizeBig / DEFAULT_UPLOAD_OPTIONS.blockSize!)
  const contentBig = generateRandomHexString(fileSizeBig)
  const filenameBig = generateRandomHexString() + '.txt'
  const fullFilenameBigPath = '/' + filenameBig
  const callbackData = []

  const progressCallback = (progressInfo: DownloadProgressInfo) => {
    callbackData.push(progressInfo)
  }

  await fdp.personalStorage.create(pod)
  await fdp.file.uploadData(pod, fullFilenameBigPath, contentBig)
  const dataBig = wrapBytesWithHelpers(
    await fdp.file.downloadData(pod, fullFilenameBigPath, {
      progressCallback,
    }),
  ).text()
  expect(dataBig).toEqual(contentBig)
  const fdpList = await fdp.directory.read(pod, '/', true)
  expect(fdpList.files.length).toEqual(1)
  const fileInfoBig = fdpList.files[0]
  expect(fileInfoBig.name).toEqual(filenameBig)
  expect(fileInfoBig.size).toEqual(fileSizeBig)

  // multiply `blocksCount` by 2 because each block has two events.
  // the 4 other events from `DownloadProgressType` occur once each
  const totalEvents = blocksCount * 2 + 4
  expect(callbackData.length).toEqual(totalEvents)
})
