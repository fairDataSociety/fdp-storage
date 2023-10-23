import { createFdp, generateUser } from '../../../utils'
import { BatchId } from '@ethersphere/bee-js'

jest.setTimeout(400000)
it('Batch Id only for write operations', async () => {
  const fdp = createFdp(undefined, {
    batchId: '' as BatchId,
  })
  generateUser(fdp)

  const testPod = 'test'
  const testFilePath = '/test'
  const testReference = '0000000000000000000000000000000000000000000000000000000000000000'
  const testData = new Uint8Array([1, 2, 3])
  const error = 'Batch ID must be a valid hexadecimal string with a length of 64'
  // read-only operations do not require batch id
  const list = await fdp.personalStorage.list()
  expect(list).toEqual({ pods: [], sharedPods: [] })

  // write operations require batch id
  await expect(fdp.personalStorage.create(testPod)).rejects.toThrow(error)
  await expect(fdp.personalStorage.saveShared(testPod)).rejects.toThrow(error)
  await expect(fdp.personalStorage.share(testPod)).rejects.toThrow(error)
  await expect(fdp.personalStorage.delete(testPod)).rejects.toThrow(error)

  await expect(fdp.file.share(testPod, testFilePath)).rejects.toThrow(error)
  await expect(fdp.file.delete(testPod, testFilePath)).rejects.toThrow(error)
  await expect(fdp.file.uploadDataBlock(testData, 0)).rejects.toThrow(error)
  await expect(fdp.file.saveShared(testPod, testFilePath, testReference)).rejects.toThrow(error)
  await expect(fdp.file.uploadData(testPod, testFilePath, testData)).rejects.toThrow(error)

  await expect(fdp.directory.create(testPod, testFilePath)).rejects.toThrow(error)
  await expect(fdp.directory.delete(testPod, testFilePath)).rejects.toThrow(error)
  await expect(fdp.directory.upload(testPod, testFilePath)).rejects.toThrow(error)

  const testUsername = 'username'
  const testPassword = 'password'
  await expect(fdp.account.register(fdp.account.createRegistrationRequest(testUsername, testPassword))).rejects.toThrow(
    error,
  )
  await expect(fdp.account.reuploadPortableAccount(testUsername, testPassword)).rejects.toThrow(error)
})
