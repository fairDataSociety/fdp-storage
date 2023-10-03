import { createFdp, generateRandomHexString } from '../../utils'

jest.setTimeout(400000)
it('Fair Data Protocol speed check', async () => {
  const fdpNoCache = createFdp({
    isUseCache: false,
  })
  const fdpCache = createFdp({
    isUseCache: true,
  })

  for (const item of [
    {
      fdp: fdpNoCache,
      title: 'FDP No Cache',
    },
    {
      fdp: fdpCache,
      title: 'FDP With Cache',
    },
  ]) {
    const { fdp, title } = item
    const pod1 = generateRandomHexString()
    const pod2 = generateRandomHexString()
    const dir1 = `/${generateRandomHexString()}`
    const dir2 = `/${generateRandomHexString()}`
    const fileSize = 100000
    const fileContent = generateRandomHexString(fileSize)
    const filename = generateRandomHexString() + '.txt'
    const fullFilename = '/' + filename
    fdp.account.createWallet()

    // eslint-disable-next-line no-console
    console.time(title)
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
    // eslint-disable-next-line no-console
    console.timeEnd(title)
  }
})
