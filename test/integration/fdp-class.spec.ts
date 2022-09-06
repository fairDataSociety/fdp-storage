import { FdpContracts, FdpStorage } from '../../src'
import {
  createFdp,
  createUsableBatch,
  generateRandomHexString,
  generateUser,
  GET_FEED_DATA_TIMEOUT,
  getCachedBatchId,
  isUsableBatchExists,
  setCachedBatchId,
  topUpFdp,
} from '../utils'
import { MAX_POD_NAME_LENGTH } from '../../src/pod/utils'
import { createUserV1 } from '../../src/account/account'
import { PodShareInfo, RawFileMetadata } from '../../src/pod/types'
import { FileShareInfo } from '../../src/file/types'

jest.setTimeout(200000)
describe('Fair Data Protocol class', () => {
  beforeAll(async () => {
    const batchId = await createUsableBatch()
    setCachedBatchId(batchId)
  })

  it('should strip trailing slash', () => {
    const fdp = new FdpStorage('http://localhost:1633/', getCachedBatchId(), {
      downloadOptions: {
        timeout: GET_FEED_DATA_TIMEOUT,
      },
    })
    expect(fdp.connection.bee.url).toEqual('http://localhost:1633')
  })

  it('check default batch usability', async () => {
    expect(await isUsableBatchExists()).toBe(true)
  })

  it('fdp-contracts is not empty', async () => {
    expect(FdpContracts).toBeDefined()
    expect(FdpContracts.ENS).toBeDefined()
  })

  describe('Registration', () => {
    it('should create account wallet', async () => {
      const fdp = createFdp()

      const wallet = fdp.account.createWallet()
      expect(wallet.mnemonic.phrase).toBeDefined()
      expect(wallet.address).toBeDefined()
      expect(wallet.privateKey).toBeDefined()

      await expect(async () => fdp.account.createWallet()).rejects.toThrow('Wallet already created')
    })

    it('should fail on zero balance', async () => {
      const fdp = createFdp()
      const user = generateUser(fdp)

      await expect(fdp.account.register(user.username, user.password)).rejects.toThrow('Not enough funds')
    })

    it('should register users', async () => {
      const fdp = createFdp()

      await expect(fdp.account.register('user', 'password')).rejects.toThrow('Account wallet not found')

      for (let i = 0; i < 2; i++) {
        const fdp = createFdp()

        const user = generateUser(fdp)
        await topUpFdp(fdp)
        const reference = await fdp.account.register(user.username, user.password)
        expect(reference).toBeDefined()
      }
    })

    it('should throw when registering already registered user', async () => {
      const fdp = createFdp()
      const user = generateUser(fdp)
      await topUpFdp(fdp)

      await fdp.account.register(user.username, user.password)
      await expect(fdp.account.register(user.username, user.password)).rejects.toThrow(
        `ENS: Username ${user.username} is not available`,
      )
    })

    it('should migrate v1 user to v2', async () => {
      const fdp = createFdp()
      const fdp2 = createFdp()

      const user = generateUser(fdp)
      generateUser(fdp2)
      await topUpFdp(fdp)
      await topUpFdp(fdp2)
      await createUserV1(fdp.connection, user.username, user.password, user.mnemonic)
      await fdp.account.migrate(user.username, user.password, {
        mnemonic: user.mnemonic,
      })
      const loggedWallet = await fdp.account.login(user.username, user.password)
      expect(loggedWallet.address).toEqual(user.address)

      await expect(fdp2.account.register(user.username, user.password)).rejects.toThrow(
        `ENS: Username ${user.username} is not available`,
      )
    })
  })

  describe('Login', () => {
    it('should login with existing user', async () => {
      const fdp = createFdp()
      const fdp1 = createFdp()
      const user = generateUser(fdp)
      await topUpFdp(fdp)

      const data = await fdp.account.register(user.username, user.password)
      expect(data).toBeDefined()

      const wallet1 = await fdp1.account.login(user.username, user.password)
      expect(wallet1.address).toEqual(user.address)
    })

    it('should throw when username is not registered', async () => {
      const fdp = createFdp()

      const fakeUser = generateUser(fdp)
      await expect(fdp.account.login(fakeUser.username, fakeUser.password)).rejects.toThrow(
        `Username "${fakeUser.username}" does not exists`,
      )
    })

    it('should throw when password is not correct', async () => {
      const fdp = createFdp()
      const user = generateUser(fdp)
      await topUpFdp(fdp)

      await fdp.account.register(user.username, user.password)
      await expect(fdp.account.login(user.username, generateUser().password)).rejects.toThrow('Incorrect password')
      await expect(fdp.account.login(user.username, '')).rejects.toThrow('Incorrect password')
    })
  })

  describe('Pods', () => {
    it('should get empty pods list', async () => {
      const fdp = createFdp()
      generateUser(fdp)

      const pods = (await fdp.personalStorage.list()).getPods()
      expect(pods).toHaveLength(0)
    })

    it('should create pods', async () => {
      const fdp = createFdp()
      generateUser(fdp)

      let list = (await fdp.personalStorage.list()).getPods()
      expect(list).toHaveLength(0)

      const longPodName = generateRandomHexString(MAX_POD_NAME_LENGTH + 1)
      const commaPodName = generateRandomHexString() + ', ' + generateRandomHexString()
      await expect(fdp.personalStorage.create(longPodName)).rejects.toThrow('Pod name is too long')
      await expect(fdp.personalStorage.create(commaPodName)).rejects.toThrow('Pod name cannot contain commas')
      await expect(fdp.personalStorage.create('')).rejects.toThrow('Pod name is too short')

      const examples = [
        { name: generateRandomHexString(), index: 1 },
        { name: generateRandomHexString(), index: 2 },
        { name: generateRandomHexString(), index: 3 },
        { name: generateRandomHexString(), index: 4 },
        { name: generateRandomHexString(), index: 5 },
      ]

      for (let i = 0; examples.length > i; i++) {
        const example = examples[i]
        const result = await fdp.personalStorage.create(example.name)
        expect(result).toEqual(example)

        list = (await fdp.personalStorage.list()).getPods()
        expect(list).toHaveLength(i + 1)
        expect(list[i]).toEqual(example)
      }

      const failPod = examples[0]
      await expect(fdp.personalStorage.create(failPod.name)).rejects.toThrow(
        `Pod with name "${failPod.name}" already exists`,
      )
    })

    it('should delete pods', async () => {
      const fdp = createFdp()
      generateUser(fdp)

      const podName = generateRandomHexString()
      const podName1 = generateRandomHexString()
      await fdp.personalStorage.create(podName)
      await fdp.personalStorage.create(podName1)
      let list = (await fdp.personalStorage.list()).getPods()
      expect(list).toHaveLength(2)

      const notExistsPod = generateRandomHexString()
      await expect(fdp.personalStorage.delete(notExistsPod)).rejects.toThrow(`Pod "${notExistsPod}" does not exist`)

      await fdp.personalStorage.delete(podName)
      list = (await fdp.personalStorage.list()).getPods()
      expect(list).toHaveLength(1)

      await fdp.personalStorage.delete(podName1)
      list = (await fdp.personalStorage.list()).getPods()
      expect(list).toHaveLength(0)
    })

    it('should share a pod', async () => {
      const fdp = createFdp()
      const user = generateUser(fdp)

      const podName = generateRandomHexString()
      await fdp.personalStorage.create(podName)
      const sharedReference = await fdp.personalStorage.share(podName)
      expect(sharedReference).toHaveLength(128)
      const sharedData = (await fdp.connection.bee.downloadData(sharedReference)).json() as unknown as PodShareInfo
      expect(sharedData.pod_name).toEqual(podName)
      expect(sharedData.pod_address).toHaveLength(40)
      expect(sharedData.user_address).toEqual(user.address.toLowerCase().replace('0x', ''))
    })

    it('should receive shared pod info', async () => {
      const fdp = createFdp()
      const user = generateUser(fdp)

      const podName = generateRandomHexString()
      await fdp.personalStorage.create(podName)
      const sharedReference = await fdp.personalStorage.share(podName)
      const sharedData = await fdp.personalStorage.getSharedInfo(sharedReference)

      expect(sharedData.pod_name).toEqual(podName)
      expect(sharedData.pod_address).toHaveLength(40)
      expect(sharedData.user_address).toEqual(user.address.toLowerCase().replace('0x', ''))
    })

    it('should save shared pod', async () => {
      const fdp = createFdp()
      const fdp1 = createFdp()
      generateUser(fdp)
      generateUser(fdp1)

      const podName = generateRandomHexString()
      await fdp.personalStorage.create(podName)
      const sharedReference = await fdp.personalStorage.share(podName)

      const list0 = await fdp1.personalStorage.list()
      expect(list0.getPods()).toHaveLength(0)
      expect(list0.getSharedPods()).toHaveLength(0)
      const pod = await fdp1.personalStorage.saveShared(sharedReference)

      expect(pod.name).toEqual(podName)
      expect(pod.address).toHaveLength(20)

      const list = await fdp1.personalStorage.list()
      expect(list.getPods()).toHaveLength(0)
      expect(list.getSharedPods()).toHaveLength(1)
      const savedPod = list.getSharedPods()[0]
      expect(savedPod.name).toEqual(podName)
      expect(savedPod.address).toHaveLength(20)
      expect(savedPod.address).toStrictEqual(pod.address)

      await expect(fdp1.personalStorage.saveShared(sharedReference)).rejects.toThrow(
        `Shared pod with name "${podName}" already exists`,
      )

      const newPodName = generateRandomHexString()
      const pod1 = await fdp1.personalStorage.saveShared(sharedReference, {
        name: newPodName,
      })

      expect(pod1.name).toEqual(newPodName)
      expect(pod1.address).toHaveLength(20)
      expect(pod1.address).toStrictEqual(pod.address)
      const list1 = await fdp1.personalStorage.list()
      expect(list1.getPods()).toHaveLength(0)
      expect(list1.getSharedPods()).toHaveLength(2)
      const savedPod1 = list1.getSharedPods()[1]
      expect(savedPod1.name).toEqual(newPodName)
      expect(savedPod1.address).toHaveLength(20)
      expect(savedPod1.address).toStrictEqual(pod.address)
    })
  })

  describe('Directory', () => {
    it('should create new directory', async () => {
      const fdp = createFdp()
      generateUser(fdp)
      const pod = generateRandomHexString()
      const directoryName = generateRandomHexString()
      const directoryFull = '/' + directoryName
      const directoryName1 = generateRandomHexString()
      const directoryFull1 = '/' + directoryName + '/' + directoryName1

      await fdp.personalStorage.create(pod)
      await expect(fdp.directory.create(pod, directoryFull1)).rejects.toThrow('Parent directory does not exist')
      await fdp.directory.create(pod, directoryFull)
      await expect(fdp.directory.create(pod, directoryFull)).rejects.toThrow(
        `Directory "${directoryFull}" already uploaded to the network`,
      )
      await fdp.directory.create(pod, directoryFull1)
      await expect(fdp.directory.create(pod, directoryFull)).rejects.toThrow(
        `Directory "${directoryFull}" already uploaded to the network`,
      )
      const list = await fdp.directory.read(pod, '/', true)
      expect(list.content).toHaveLength(1)
      expect(list.getDirectories()[0].content).toHaveLength(1)
      const directoryInfo = list.content[0]
      const directoryInfo1 = list.getDirectories()[0].getDirectories()[0]
      expect(directoryInfo.name).toEqual(directoryName)
      expect(directoryInfo1.name).toEqual(directoryName1)
    })

    it('should delete a directory', async () => {
      const fdp = createFdp()
      generateUser(fdp)
      const pod = generateRandomHexString()
      const directoryName = generateRandomHexString()
      const directoryFull = '/' + directoryName

      await fdp.personalStorage.create(pod)
      await fdp.directory.create(pod, directoryFull)
      const list = await fdp.directory.read(pod, '/', true)
      expect(list.content).toHaveLength(1)

      await fdp.directory.delete(pod, directoryFull)
      const listAfter = await fdp.directory.read(pod, '/', true)
      expect(listAfter.content).toHaveLength(0)
    })
  })

  describe('File', () => {
    it('should upload small text data as a file', async () => {
      const fdp = createFdp()
      generateUser(fdp)
      const pod = generateRandomHexString()
      const fileSizeSmall = 100
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall

      await fdp.personalStorage.create(pod)
      await fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall)
      await expect(fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall)).rejects.toThrow(
        `File "${fullFilenameSmallPath}" already uploaded to the network`,
      )
      const dataSmall = await fdp.file.downloadData(pod, fullFilenameSmallPath)
      expect(dataSmall.text()).toEqual(contentSmall)
      const fdpList = await fdp.directory.read(pod, '/', true)
      expect(fdpList.getFiles().length).toEqual(1)
      const fileInfoSmall = fdpList.getFiles()[0]
      expect(fileInfoSmall.name).toEqual(filenameSmall)
      expect(fileInfoSmall.size).toEqual(fileSizeSmall)
    })

    it('should upload big text data as a file', async () => {
      const fdp = createFdp()
      generateUser(fdp)
      const pod = generateRandomHexString()
      const incorrectPod = generateRandomHexString()
      const fileSizeBig = 5000005
      const contentBig = generateRandomHexString(fileSizeBig)
      const filenameBig = generateRandomHexString() + '.txt'
      const fullFilenameBigPath = '/' + filenameBig
      const incorrectFullPath = fullFilenameBigPath + generateRandomHexString()

      await fdp.personalStorage.create(pod)
      await expect(fdp.file.uploadData(incorrectPod, fullFilenameBigPath, contentBig)).rejects.toThrow(
        `Pod "${incorrectPod}" does not exist`,
      )
      await fdp.file.uploadData(pod, fullFilenameBigPath, contentBig)
      await expect(fdp.file.downloadData(pod, incorrectFullPath)).rejects.toThrow('Data not found')
      const dataBig = (await fdp.file.downloadData(pod, fullFilenameBigPath)).text()
      expect(dataBig).toEqual(contentBig)
      const fdpList = await fdp.directory.read(pod, '/', true)
      expect(fdpList.getFiles().length).toEqual(1)
      const fileInfoBig = fdpList.getFiles()[0]
      expect(fileInfoBig.name).toEqual(filenameBig)
      expect(fileInfoBig.size).toEqual(fileSizeBig)
    })

    it('should delete a file', async () => {
      const fdp = createFdp()
      generateUser(fdp)
      const pod = generateRandomHexString()
      const fileSizeSmall = 100
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall

      await fdp.personalStorage.create(pod)
      await fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall)

      const fdpList = await fdp.directory.read(pod, '/', true)
      expect(fdpList.getFiles().length).toEqual(1)

      await fdp.file.delete(pod, fullFilenameSmallPath)
      const fdpList1 = await fdp.directory.read(pod, '/', true)
      expect(fdpList1.getFiles().length).toEqual(0)
    })

    it('should share a file', async () => {
      const fdp = createFdp()
      generateUser(fdp)
      const pod = generateRandomHexString()
      const fileSizeSmall = 100
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall

      await fdp.personalStorage.create(pod)
      await fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall)

      const sharedReference = await fdp.file.share(pod, fullFilenameSmallPath)
      expect(sharedReference).toHaveLength(128)
      const sharedData = (await fdp.connection.bee.downloadData(sharedReference)).json() as unknown as FileShareInfo
      expect(sharedData.meta).toBeDefined()
      expect(sharedData.source_address).toHaveLength(40)
    })

    it('should receive information about shared file', async () => {
      const fdp = createFdp()
      generateUser(fdp)
      const pod = generateRandomHexString()
      const fileSizeSmall = 100
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall

      await fdp.personalStorage.create(pod)
      await fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall)

      const sharedReference = await fdp.file.share(pod, fullFilenameSmallPath)
      const sharedData = await fdp.file.getSharedInfo(sharedReference)

      expect(sharedData.meta).toBeDefined()
      expect(sharedData.meta.pod_name).toEqual(pod)
      expect(sharedData.meta.file_path).toEqual('/')
      expect(sharedData.meta.file_name).toEqual(filenameSmall)
      expect(sharedData.meta.file_size).toEqual(fileSizeSmall)
      expect(sharedData.source_address).toHaveLength(40)
    })

    it('should save shared file to a pod', async () => {
      const fdp = createFdp()
      const fdp1 = createFdp()
      generateUser(fdp)
      generateUser(fdp1)
      const pod = generateRandomHexString()
      const pod1 = generateRandomHexString()
      const fileSizeSmall = 100
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall

      await fdp.personalStorage.create(pod)
      await fdp1.personalStorage.create(pod1)
      await fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall)
      const sharedReference = await fdp.file.share(pod, fullFilenameSmallPath)
      const newFilePath = '/'
      const sharedData = await fdp1.file.saveShared(pod1, newFilePath, sharedReference)

      expect(sharedData.podName).toEqual(pod1)
      expect(sharedData.filePath).toEqual(newFilePath)
      expect(sharedData.fileName).toEqual(filenameSmall)
      expect(sharedData.fileSize).toEqual(fileSizeSmall)

      const list = await fdp1.directory.read(pod1, '/')
      const files = list.getFiles()
      expect(files).toHaveLength(1)
      const fileInfo = files[0]
      expect(fileInfo.name).toEqual(filenameSmall)
      expect(fileInfo.size).toEqual(fileSizeSmall)
      const meta = fileInfo.raw as RawFileMetadata
      expect(meta.file_name).toEqual(filenameSmall)
      expect(meta.file_size).toEqual(fileSizeSmall)
      expect(meta.pod_name).toEqual(pod1)

      const data = await fdp1.file.downloadData(pod1, fullFilenameSmallPath)
      expect(data.text()).toEqual(contentSmall)

      // checking saving with custom name
      const customName = 'NewCustomName.txt'
      const sharedData1 = await fdp1.file.saveShared(pod1, newFilePath, sharedReference, { name: customName })
      expect(sharedData1.podName).toEqual(pod1)
      expect(sharedData1.filePath).toEqual(newFilePath)
      expect(sharedData1.fileName).toEqual(customName)
      expect(sharedData1.fileSize).toEqual(fileSizeSmall)

      const data1 = await fdp1.file.downloadData(pod1, '/' + customName)
      expect(data1.text()).toEqual(contentSmall)

      const list1 = await fdp1.directory.read(pod1, '/')
      const files1 = list1.getFiles()
      expect(files1).toHaveLength(2)
    })
  })
})
