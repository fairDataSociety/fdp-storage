import { DirectoryItem, FdpContracts, FdpStorage, MAX_POD_NAME_LENGTH } from '../../../src'
import {
  batchId,
  createFdp,
  generateRandomHexString,
  generateUser,
  GET_FEED_DATA_TIMEOUT,
  getBee,
  topUpFdp,
} from '../../utils'
import { PodShareInfo, RawFileMetadata } from '../../../src/pod/types'
import { FileShareInfo } from '../../../src/file/types'
import { getFeedData } from '../../../src/feed/api'
import * as feedApi from '../../../src/feed/api'
import { decryptBytes } from '../../../src/utils/encryption'
import { Wallet } from 'ethers'
import { removeZeroFromHex } from '../../../src/account/utils'
import { bytesToString, wrapBytesWithHelpers } from '../../../src/utils/bytes'
import { mnemonicToSeed, prepareEthAddress } from '../../../src/utils/wallet'
import { assertEncryptedReference } from '../../../src/utils/hex'
import { base64toReference } from '../../../src/file/utils'
import path from 'path'
import { getNodeFileContent } from '../../../src/directory/utils'
import { ETH_ADDR_HEX_LENGTH } from '../../../src/utils/type'
import * as walletApi from '../../../src/utils/wallet'
import { HIGHEST_LEVEL } from '../../../src/feed/lookup/epoch'
import { getWalletByIndex } from '../../../src/utils/cache/wallet'
import { getPodV2Topic, POD_TOPIC_V2 } from '../../../src/pod/utils'

jest.setTimeout(400000)
describe('Fair Data Protocol class', () => {
  it('should strip trailing slash', () => {
    const fdp = new FdpStorage('http://localhost:1633/', batchId(), {
      requestOptions: {
        timeout: GET_FEED_DATA_TIMEOUT,
      },
    })
    expect(fdp.connection.bee.url).toEqual('http://localhost:1633')
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

      await expect(
        fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password)),
      ).rejects.toThrow('Not enough funds')
    })

    it('should register users', async () => {
      const fdp = createFdp()

      await expect(fdp.account.register(fdp.account.createRegistrationRequest('user', 'password'))).rejects.toThrow(
        'Account wallet not found',
      )

      for (let i = 0; i < 2; i++) {
        const fdp = createFdp()

        const user = generateUser(fdp)
        await topUpFdp(fdp)
        const reference = await fdp.account.register(
          fdp.account.createRegistrationRequest(user.username, user.password),
        )
        expect(reference).toBeDefined()
      }
    })

    it('should throw when registering already registered user', async () => {
      const fdp = createFdp()
      const user = generateUser(fdp)
      await topUpFdp(fdp)

      await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
      await expect(
        fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password)),
      ).rejects.toThrow(`ENS: Username ${user.username} is not available`)
    })
  })

  describe('Login', () => {
    it('should login with existing user', async () => {
      const fdp = createFdp()
      const fdp1 = createFdp()
      const user = generateUser(fdp)
      await topUpFdp(fdp)

      const data = await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
      expect(data).toBeDefined()

      const wallet1 = await fdp1.account.login(user.username, user.password)
      expect(wallet1.address).toEqual(user.address)
    })

    it('should throw when username is not registered', async () => {
      const fdp = createFdp()

      const fakeUser = generateUser(fdp)
      await expect(fdp.account.login(fakeUser.username, fakeUser.password)).rejects.toThrow(
        `Username "${fakeUser.username}" does not exist`,
      )
    })

    it('should throw when password is not correct', async () => {
      const fdp = createFdp()
      const user = generateUser(fdp)
      await topUpFdp(fdp)

      await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
      await expect(fdp.account.login(user.username, generateUser().password)).rejects.toThrow('Incorrect password')
      await expect(fdp.account.login(user.username, '')).rejects.toThrow('Incorrect password')
    })

    it('should re-upload an account', async () => {
      const fdp = createFdp()
      const fdp1 = createFdp()
      const user = generateUser(fdp)
      const userFake = generateUser()
      await topUpFdp(fdp)

      const data = await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
      expect(data).toBeDefined()

      fdp1.account.setAccountFromMnemonic(userFake.mnemonic)
      const result1 = await fdp1.account.isPublicKeyEqual(user.username)
      expect(result1).toEqual(false)
      await expect(fdp1.account.reuploadPortableAccount(user.username, user.password)).rejects.toThrow(
        'Public key from the account is not equal to the key from ENS',
      )

      fdp1.account.setAccountFromMnemonic(user.mnemonic)
      const result2 = await fdp1.account.isPublicKeyEqual(user.username)
      expect(result2).toEqual(true)
      await fdp1.account.reuploadPortableAccount(user.username, user.password)
    })
  })

  describe('Pods', () => {
    it('should get empty pods list', async () => {
      const fdp = createFdp()
      generateUser(fdp)

      const pods = (await fdp.personalStorage.list()).pods
      expect(pods).toHaveLength(0)
    })

    it('should create pods', async () => {
      const fdp = createFdp()
      generateUser(fdp)

      let list = (await fdp.personalStorage.list()).pods
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
        expect(result.name).toEqual(example.name)
        expect(result.index).toEqual(example.index)
        expect(result.password).toBeDefined()

        list = (await fdp.personalStorage.list()).pods
        expect(list).toHaveLength(i + 1)
        expect(list[i].name).toEqual(example.name)
        expect(list[i].index).toEqual(example.index)
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
      let list = (await fdp.personalStorage.list()).pods
      expect(list).toHaveLength(2)

      const notExistsPod = generateRandomHexString()
      await expect(fdp.personalStorage.delete(notExistsPod)).rejects.toThrow(`Pod "${notExistsPod}" does not exist`)

      await fdp.personalStorage.delete(podName)
      list = (await fdp.personalStorage.list()).pods
      expect(list).toHaveLength(1)

      await fdp.personalStorage.delete(podName1)
      list = (await fdp.personalStorage.list()).pods
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
      expect(sharedData.podName).toEqual(podName)
      expect(sharedData.podAddress).toHaveLength(ETH_ADDR_HEX_LENGTH)
      expect(sharedData.userAddress).toEqual(user.address.toLowerCase().replace('0x', ''))
    })

    it('should receive shared pod info', async () => {
      const fdp = createFdp()
      const user = generateUser(fdp)

      const podName = generateRandomHexString()
      await fdp.personalStorage.create(podName)
      const sharedReference = await fdp.personalStorage.share(podName)
      const sharedData = await fdp.personalStorage.getSharedInfo(sharedReference)

      expect(sharedData.podName).toEqual(podName)
      expect(sharedData.podAddress).toHaveLength(ETH_ADDR_HEX_LENGTH)
      expect(sharedData.userAddress).toEqual(user.address.toLowerCase().replace('0x', ''))
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
      expect(list0.pods).toHaveLength(0)
      expect(list0.sharedPods).toHaveLength(0)
      const pod = await fdp1.personalStorage.saveShared(sharedReference)

      expect(pod.name).toEqual(podName)
      expect(pod.address).toHaveLength(ETH_ADDR_HEX_LENGTH)

      const list = await fdp1.personalStorage.list()
      expect(list.pods).toHaveLength(0)
      expect(list.sharedPods).toHaveLength(1)
      const savedPod = list.sharedPods[0]
      expect(savedPod.name).toEqual(podName)
      expect(savedPod.address).toHaveLength(ETH_ADDR_HEX_LENGTH)
      expect(savedPod.address).toStrictEqual(pod.address)

      await expect(fdp1.personalStorage.saveShared(sharedReference)).rejects.toThrow(
        `Shared pod with name "${podName}" already exists`,
      )

      const newPodName = generateRandomHexString()
      const pod1 = await fdp1.personalStorage.saveShared(sharedReference, {
        name: newPodName,
      })

      expect(pod1.name).toEqual(newPodName)
      expect(pod1.address).toHaveLength(ETH_ADDR_HEX_LENGTH)
      expect(pod1.address).toStrictEqual(pod.address)
      const list1 = await fdp1.personalStorage.list()
      expect(list1.pods).toHaveLength(0)
      expect(list1.sharedPods).toHaveLength(2)
      const savedPod1 = list1.sharedPods[1]
      expect(savedPod1.name).toEqual(newPodName)
      expect(savedPod1.address).toHaveLength(ETH_ADDR_HEX_LENGTH)
      expect(savedPod1.address).toStrictEqual(pod.address)
    })
  })

  describe('Directory', () => {
    it('should create directories after deletion', async () => {
      const reuploadTimes = 3
      const fdp = createFdp()
      generateUser(fdp)
      const pod = generateRandomHexString()
      const path1Name = generateRandomHexString()
      const path1Full = `/${path1Name}`

      await fdp.personalStorage.create(pod)
      await fdp.directory.create(pod, path1Full)
      const list1 = await fdp.directory.read(pod, '/')
      expect(list1.directories).toHaveLength(1)
      expect(list1.directories[0].name).toEqual(path1Name)

      for (let i = 0; i < reuploadTimes; i++) {
        await fdp.directory.delete(pod, path1Full)
        const list2 = await fdp.directory.read(pod, '/')
        expect(list2.directories).toHaveLength(0)

        await fdp.directory.create(pod, path1Full)
        const list3 = await fdp.directory.read(pod, '/')
        expect(list3.directories).toHaveLength(1)
        expect(list3.directories[0].name).toEqual(path1Name)
      }
    })

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
        `Directory "${directoryFull}" already listed in the parent directory list`,
      )
      await fdp.directory.create(pod, directoryFull1)
      await expect(fdp.directory.create(pod, directoryFull1)).rejects.toThrow(
        `Directory "${directoryFull1}" already listed in the parent directory list`,
      )
      const list = await fdp.directory.read(pod, '/', true)
      expect(list.directories).toHaveLength(1)
      expect(list.directories[0].directories).toHaveLength(1)
      const directoryInfo = list.directories[0]
      const directoryInfo1 = list.directories[0].directories[0]
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
      expect(list.directories).toHaveLength(1)

      await fdp.directory.delete(pod, directoryFull)
      const listAfter = await fdp.directory.read(pod, '/', true)
      expect(listAfter.directories).toHaveLength(0)
    })

    it('should upload a directory', async () => {
      const fdp = createFdp()
      generateUser(fdp)
      const pod1 = generateRandomHexString()
      const pod2 = generateRandomHexString()
      const fullPath = path.resolve(__dirname, '../../data-unit/directory-utils')
      const filesInfo = [
        {
          localPath: fullPath + '/file1.txt',
          fdpPath: '/file1.txt',
          fdpFullPath: '/directory-utils/file1.txt',
        },
        {
          localPath: fullPath + '/file2.txt',
          fdpPath: '/file2.txt',
          fdpFullPath: '/directory-utils/file2.txt',
        },
        {
          localPath: fullPath + '/dir1/dir1-1/file1-1-1.txt',
          fdpPath: '/dir1/dir1-1/file1-1-1.txt',
          fdpFullPath: '/directory-utils/dir1/dir1-1/file1-1-1.txt',
        },
        {
          localPath: fullPath + '/dir2/file2-1.txt',
          fdpPath: '/dir2/file2-1.txt',
          fdpFullPath: '/directory-utils/dir2/file2-1.txt',
        },
      ]

      await fdp.personalStorage.create(pod1)
      await fdp.personalStorage.create(pod2)
      await fdp.directory.upload(pod1, fullPath, { isRecursive: true, isIncludeDirectoryName: true })
      const list1 = await fdp.directory.read(pod1, '/', true)
      const dir1 = list1.directories[0]
      expect(dir1.files).toHaveLength(2)
      expect(dir1.directories).toHaveLength(2)
      const subDir1 = dir1.directories.find(item => item.name === 'dir1')
      const subDir2 = dir1.directories.find(item => item.name === 'dir2')
      expect(subDir1).toBeDefined()
      expect(subDir2).toBeDefined()
      // 1 empty directory should not be uploaded + 1 not empty should be uploaded
      expect(subDir1!.directories).toHaveLength(1)
      expect(subDir1!.directories[0].files).toHaveLength(1)
      expect(subDir1!.files).toHaveLength(0)
      expect(subDir2!.files).toHaveLength(1)

      for (const fileInfo of filesInfo) {
        const fileContent = getNodeFileContent(fileInfo.localPath)
        const downloaded = wrapBytesWithHelpers(await fdp.file.downloadData(pod1, fileInfo.fdpFullPath))
        expect(downloaded.text()).toEqual(fileContent.toString())
      }

      await fdp.directory.upload(pod2, fullPath, { isRecursive: true, isIncludeDirectoryName: false })
      const list2 = await fdp.directory.read(pod2, '/', true)
      expect(list2.directories).toHaveLength(2)
      expect(list2.files).toHaveLength(2)

      for (const fileInfo of filesInfo) {
        const fileContent = getNodeFileContent(fileInfo.localPath)
        const downloaded = wrapBytesWithHelpers(await fdp.file.downloadData(pod2, fileInfo.fdpPath))
        expect(downloaded.text()).toEqual(fileContent.toString())
      }
    })

    it('should serialize and deserialize directories list and pods', async () => {
      const fdp = createFdp()
      generateUser(fdp)
      const pod = generateRandomHexString()
      const directoriesToCreate = ['/one', '/two', '/three', '/one/one-one', '/one/one-one/one-one-one', '/two/two-one']
      const filesToCreate = [
        {
          path: '/file1.txt',
          data: generateRandomHexString(),
        },
        {
          path: '/file2.txt',
          data: generateRandomHexString(),
        },
        {
          path: '/one/file-in-one-1.txt',
          data: generateRandomHexString(),
        },
        {
          path: '/one/file-in-one-2.txt',
          data: generateRandomHexString(),
        },
      ]

      await fdp.personalStorage.create(pod)
      const pods1 = await fdp.personalStorage.list()
      const pods1Serialized = JSON.stringify(pods1)
      const pods1Deserialized = JSON.parse(pods1Serialized)
      expect(pods1.pods.length).toEqual(pods1Deserialized.pods.length)
      const firstPod = pods1.pods[0]
      const firstPodDeserialized = pods1Deserialized.pods[0]
      expect(firstPod.name).toStrictEqual(firstPodDeserialized.name)
      expect(firstPod.index).toStrictEqual(firstPodDeserialized.index)
      expect(firstPod.password).toStrictEqual(firstPodDeserialized.password)
      expect(pods1.sharedPods.length).toEqual(pods1Deserialized.sharedPods.length)

      for (const directoryToCreate of directoriesToCreate) {
        await fdp.directory.create(pod, directoryToCreate)
      }

      for (const fileToCreate of filesToCreate) {
        await fdp.file.uploadData(pod, fileToCreate.path, fileToCreate.data)
      }
      const list1 = await fdp.directory.read(pod, '/', true)
      expect(list1.directories).toHaveLength(3)
      const dirOne1 = list1.directories.find(item => item.name === 'one')
      const dirOneOne1 = dirOne1?.directories.find(item => item.name === 'one-one')
      const dirTwo1 = list1.directories.find(item => item.name === 'two')
      expect(dirOne1?.directories).toHaveLength(1)
      expect(dirOneOne1?.directories).toHaveLength(1)
      expect(dirOneOne1?.files).toHaveLength(0)
      expect(dirOne1?.files).toHaveLength(2)
      expect(dirTwo1?.directories).toHaveLength(1)
      expect(list1.files).toHaveLength(2)

      const serialized = JSON.stringify(list1)
      const recovered = JSON.parse(serialized) as DirectoryItem
      expect(recovered.directories).toHaveLength(3)
      expect(recovered.files).toHaveLength(2)
      const recoveredDirOne1 = recovered.directories.find(item => item.name === 'one')
      const recoveredDirOneOne1 = recoveredDirOne1?.directories.find(item => item.name === 'one-one')
      const recoveredDirTwo1 = recovered.directories.find(item => item.name === 'two')
      expect(recoveredDirOne1?.directories).toHaveLength(1)
      expect(recoveredDirOneOne1?.directories).toHaveLength(1)
      expect(recoveredDirOneOne1?.files).toHaveLength(0)
      expect(recoveredDirOne1?.files).toHaveLength(2)
      expect(recoveredDirTwo1?.directories).toHaveLength(1)
    })
  })

  describe('File', () => {
    it('should upload files after deletion', async () => {
      const reuploadTimes = 3
      const fdp = createFdp()
      generateUser(fdp)
      const pod = generateRandomHexString()
      const fileSizeSmall = 100
      const fileSizeSmall1 = 10
      const fileSizeSmall2 = 1000
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall

      await fdp.personalStorage.create(pod)
      await fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall)
      const list1 = await fdp.directory.read(pod, '/')
      expect(list1.files).toHaveLength(1)

      const contentSamples = [
        // the same content
        contentSmall,
        // less data
        generateRandomHexString(fileSizeSmall1),
        // more data
        generateRandomHexString(fileSizeSmall2),
      ]
      for (let i = 0; i < reuploadTimes; i++) {
        await fdp.file.delete(pod, fullFilenameSmallPath)
        const list2 = await fdp.directory.read(pod, '/')
        expect(list2.files).toHaveLength(0)

        const content = contentSamples[i]
        await fdp.file.uploadData(pod, fullFilenameSmallPath, content)
        const list3 = await fdp.directory.read(pod, '/')
        expect(list3.files).toHaveLength(1)
        expect(list3.files[0].name).toEqual(filenameSmall)
        const data1 = bytesToString(await fdp.file.downloadData(pod, fullFilenameSmallPath))
        expect(data1).toEqual(content)
      }
    })

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
        `File "${fullFilenameSmallPath}" already listed in the parent directory list`,
      )
      const dataSmall = wrapBytesWithHelpers(await fdp.file.downloadData(pod, fullFilenameSmallPath))
      expect(dataSmall.text()).toEqual(contentSmall)
      const fdpList = await fdp.directory.read(pod, '/', true)
      expect(fdpList.files.length).toEqual(1)
      const fileInfoSmall = fdpList.files[0]
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
      const dataBig = wrapBytesWithHelpers(await fdp.file.downloadData(pod, fullFilenameBigPath)).text()
      expect(dataBig).toEqual(contentBig)
      const fdpList = await fdp.directory.read(pod, '/', true)
      expect(fdpList.files.length).toEqual(1)
      const fileInfoBig = fdpList.files[0]
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
      expect(fdpList.files.length).toEqual(1)

      await fdp.file.delete(pod, fullFilenameSmallPath)
      const fdpList1 = await fdp.directory.read(pod, '/', true)
      expect(fdpList1.files.length).toEqual(0)
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
      expect(sharedData.meta.filePath).toEqual('/')
      expect(sharedData.meta.fileName).toEqual(filenameSmall)
      expect(sharedData.meta.fileSize).toEqual(fileSizeSmall)
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

      expect(sharedData.filePath).toEqual(newFilePath)
      expect(sharedData.fileName).toEqual(filenameSmall)
      expect(sharedData.fileSize).toEqual(fileSizeSmall)

      const list = await fdp1.directory.read(pod1, '/')
      const files = list.files
      expect(files).toHaveLength(1)
      const fileInfo = files[0]
      expect(fileInfo.name).toEqual(filenameSmall)
      expect(fileInfo.size).toEqual(fileSizeSmall)
      const meta = fileInfo.raw as RawFileMetadata
      expect(meta.fileName).toEqual(filenameSmall)
      expect(meta.fileSize).toEqual(fileSizeSmall)

      const data = wrapBytesWithHelpers(await fdp1.file.downloadData(pod1, fullFilenameSmallPath))
      expect(data.text()).toEqual(contentSmall)

      // checking saving with custom name
      const customName = 'NewCustomName.txt'
      const sharedData1 = await fdp1.file.saveShared(pod1, newFilePath, sharedReference, { name: customName })
      expect(sharedData1.filePath).toEqual(newFilePath)
      expect(sharedData1.fileName).toEqual(customName)
      expect(sharedData1.fileSize).toEqual(fileSizeSmall)

      const data1 = wrapBytesWithHelpers(await fdp1.file.downloadData(pod1, '/' + customName))
      expect(data1.text()).toEqual(contentSmall)

      const list1 = await fdp1.directory.read(pod1, '/')
      const files1 = list1.files
      expect(files1).toHaveLength(2)
    })
  })

  describe('Encryption', () => {
    it('should be encrypted metadata and file data', async () => {
      const bee = getBee()
      const fdp = createFdp()
      const user = generateUser(fdp)
      const pod = generateRandomHexString()
      const directoryName = generateRandomHexString()
      const fullDirectory = '/' + directoryName
      const fileSizeSmall = 100
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall

      const privateKey = removeZeroFromHex(Wallet.fromMnemonic(user.mnemonic).privateKey)
      const seed = mnemonicToSeed(user.mnemonic)

      // check pod metadata
      const pod1 = await fdp.personalStorage.create(pod)
      const podData = await getFeedData(bee, getPodV2Topic(), prepareEthAddress(user.address))
      const encryptedText1 = podData.data.chunkContent().text()
      const encryptedBytes1 = podData.data.chunkContent()
      // data decrypts with wallet for the pod. Data inside the pod will be encrypted with a password stored in the pod
      const decryptedText1 = bytesToString(decryptBytes(privateKey, encryptedBytes1))
      expect(encryptedText1).not.toContain(pod)
      expect(decryptedText1).toContain('version')
      expect(decryptedText1).toContain('filePath')
      expect(decryptedText1).toContain(POD_TOPIC_V2)
      // HDNode with index 1 is for first pod
      const node1 = await getWalletByIndex(seed, 1)
      const rootDirectoryData = await getFeedData(bee, '/', prepareEthAddress(node1.address))
      const encryptedText2 = rootDirectoryData.data.chunkContent().text()
      const encryptedBytes2 = rootDirectoryData.data.chunkContent()
      // data decrypts with password stored in the pod
      const decryptedText2 = bytesToString(decryptBytes(pod1.password, encryptedBytes2))
      // check some keywords from root directory of the pod metadata
      const metaWords1 = ['meta', 'version', 'creationTime', 'fileOrDirNames']
      for (const metaWord of metaWords1) {
        expect(encryptedText2).not.toContain(metaWord)
        expect(decryptedText2).toContain(metaWord)
      }

      // check directory metadata
      await fdp.directory.create(pod, fullDirectory)
      const fullDirectoryData = await getFeedData(bee, fullDirectory, prepareEthAddress(node1.address))
      const encryptedText3 = fullDirectoryData.data.chunkContent().text()
      const encryptedBytes3 = fullDirectoryData.data.chunkContent()
      const decryptedText3 = bytesToString(decryptBytes(pod1.password, encryptedBytes3))
      expect(decryptedText3).toContain(directoryName)
      for (const metaWord of metaWords1) {
        expect(encryptedText3).not.toContain(metaWord)
        expect(decryptedText3).toContain(metaWord)
      }

      await fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall)
      const fileManifestData = await getFeedData(bee, fullFilenameSmallPath, prepareEthAddress(node1.address))
      const encryptedText4 = fileManifestData.data.chunkContent().text()
      const encryptedBytes4 = fileManifestData.data.chunkContent()
      const decryptedText4 = bytesToString(decryptBytes(pod1.password, encryptedBytes4))
      const metaWords2 = [filenameSmall, 'version', 'filePath', 'fileName', 'fileSize', 'fileInodeReference']
      for (const metaWord of metaWords2) {
        expect(encryptedText4).not.toContain(metaWord)
        expect(decryptedText4).toContain(metaWord)
      }

      // check file metadata
      const metaObject = JSON.parse(decryptedText4)
      const blocksReference = base64toReference(metaObject.fileInodeReference)
      assertEncryptedReference(blocksReference)
      const decryptedData5 = await bee.downloadData(blocksReference)
      const decryptedText5 = decryptedData5.text()
      const metaWords3 = ['blocks', 'size', 'compressedSize', 'reference']
      for (const metaWord of metaWords3) {
        expect(decryptedText5).toContain(metaWord)
      }

      // check file block
      const blocks = JSON.parse(decryptedText5)
      const blockReference = base64toReference(blocks.blocks[0].reference.swarm)
      const encryptedData6 = await bee.downloadData(blockReference)
      const decryptedText6 = encryptedData6.text()
      expect(decryptedText6).toEqual(contentSmall)
    })
  })

  describe('Caching', () => {
    it('should collect correct metrics without cache', async () => {
      const writeFeedDataSpy = jest.spyOn(feedApi, 'writeFeedData')
      const getFeedDataSpy = jest.spyOn(feedApi, 'getFeedData')
      const getWalletByIndexSpy = jest.spyOn(walletApi, 'getWalletByIndex')

      const fdpNoCache = createFdp({
        isUseCache: false,
      })

      const pod1 = generateRandomHexString()
      const pod2 = generateRandomHexString()
      const fileSize = 100
      const fileContent = generateRandomHexString(fileSize)
      const filename = generateRandomHexString() + '.txt'
      const fullFilename = '/' + filename
      fdpNoCache.account.createWallet()

      // no cache - create first pod
      await fdpNoCache.personalStorage.create(pod1)
      // for the first feed write it should be the highest level
      expect(writeFeedDataSpy.mock.calls[0][5]?.level).toEqual(HIGHEST_LEVEL)
      // getting old V1 pods info + getting V2 pods info + getting V2 pods info for data uploading (todo: can be reduced)
      expect(getFeedDataSpy).toBeCalledTimes(3)
      // calculating wallet by index for the pod
      expect(getWalletByIndexSpy).toBeCalledTimes(1)

      jest.clearAllMocks()
      await fdpNoCache.personalStorage.create(pod2)
      expect(writeFeedDataSpy.mock.calls[0][5]?.level).toEqual(HIGHEST_LEVEL - 1)
      // get V1 pods info + V2 pods info
      expect(getFeedDataSpy).toBeCalledTimes(2)
      expect(getWalletByIndexSpy).toBeCalledTimes(1)

      jest.clearAllMocks()
      await fdpNoCache.personalStorage.list()
      // getting info about pods from the network
      expect(getFeedDataSpy).toBeCalledTimes(1)

      jest.clearAllMocks()
      await fdpNoCache.directory.read(pod1, '/', true)
      // should not write any info
      expect(writeFeedDataSpy).toBeCalledTimes(0)
      // getting info about pods from the network and getting root info of the pod
      expect(getFeedDataSpy).toBeCalledTimes(2)
      // calculating wallet by index for the pod
      expect(getWalletByIndexSpy).toBeCalledTimes(1)

      jest.clearAllMocks()
      await fdpNoCache.file.uploadData(pod1, fullFilename, fileContent)
      // write file metadata + update root dir
      expect(writeFeedDataSpy).toBeCalledTimes(2)
      // get pods info + check file exists + get parent metadata
      expect(getFeedDataSpy).toBeCalledTimes(3)
      // calc the pod wallet
      expect(getWalletByIndexSpy).toBeCalledTimes(1)

      jest.clearAllMocks()
      await fdpNoCache.file.delete(pod1, fullFilename)
      // update root dir metadata + write magic word instead of the file
      expect(writeFeedDataSpy).toBeCalledTimes(2)
      // get pods info + check is file available + update root dir metadata
      expect(getFeedDataSpy).toBeCalledTimes(3)
      // calc the pod wallet
      expect(getWalletByIndexSpy).toBeCalledTimes(1)

      jest.clearAllMocks()
      await fdpNoCache.personalStorage.delete(pod1)
      // writing info about pods to the network
      expect(writeFeedDataSpy).toBeCalledTimes(1)
      // get V1 pods info + V2 pods info
      expect(getFeedDataSpy).toBeCalledTimes(2)
      expect(getWalletByIndexSpy).toBeCalledTimes(0)

      jest.restoreAllMocks()
    })

    it('should collect correct metrics with cache', async () => {
      const writeFeedDataSpy = jest.spyOn(feedApi, 'writeFeedData')
      const getFeedDataSpy = jest.spyOn(feedApi, 'getFeedData')
      const getWalletByIndexSpy = jest.spyOn(walletApi, 'getWalletByIndex')
      let cache = ''
      const fdpWithCache = createFdp({
        isUseCache: true,
        onSaveCache: async cacheObject => {
          cache = JSON.stringify(cacheObject)
        },
      })

      const pod1 = generateRandomHexString()
      const pod2 = generateRandomHexString()
      const fileSize = 100
      const fileContent = generateRandomHexString(fileSize)
      const filename = generateRandomHexString() + '.txt'
      const fullFilename = '/' + filename
      const wallet = fdpWithCache.account.createWallet()

      // with cache - create first pod
      await fdpWithCache.personalStorage.create(pod1)
      // for the first feed write it should be the highest level
      expect(writeFeedDataSpy.mock.calls[0][5]?.level).toEqual(HIGHEST_LEVEL)
      // getting V1 pods info + V2 pods info + V2 pods info for data uploading (todo: can be reduced)
      expect(getFeedDataSpy).toBeCalledTimes(3)
      // calculating wallet by index for the pod
      expect(getWalletByIndexSpy).toBeCalledTimes(1)

      jest.clearAllMocks()
      await fdpWithCache.personalStorage.create(pod2)
      // V2 pods info for data uploading (todo: can be reduced)
      expect(getFeedDataSpy).toBeCalledTimes(1)
      // should be calculated correct level without getting previous one from the network
      expect(writeFeedDataSpy.mock.calls[0][5]?.level).toEqual(HIGHEST_LEVEL - 1)
      // calc a wallet for the new pod
      expect(getWalletByIndexSpy).toBeCalledTimes(1)

      jest.clearAllMocks()
      await fdpWithCache.personalStorage.list()
      // the list cached
      expect(getFeedDataSpy).toBeCalledTimes(0)

      jest.clearAllMocks()
      await fdpWithCache.directory.read(pod1, '/', true)
      // should not write any info
      expect(writeFeedDataSpy).toBeCalledTimes(0)
      // should get root info of the pod only. should not get info about pods from the network
      expect(getFeedDataSpy).toBeCalledTimes(1)
      // shouldn't calculate the pod wallet again
      expect(getWalletByIndexSpy).toBeCalledTimes(0)

      jest.clearAllMocks()
      await fdpWithCache.file.uploadData(pod1, fullFilename, fileContent)
      // write file metadata + update root dir
      expect(writeFeedDataSpy).toBeCalledTimes(2)
      // check file exists + get parent metadata. pods info is cached
      expect(getFeedDataSpy).toBeCalledTimes(2)
      // the pod wallet is cached
      expect(getWalletByIndexSpy).toBeCalledTimes(0)

      jest.clearAllMocks()
      await fdpWithCache.file.delete(pod1, fullFilename)
      // update root dir metadata + write magic word instead of the file
      expect(writeFeedDataSpy).toBeCalledTimes(2)
      // update root dir metadata + check is file deleted. should not get pods info
      expect(getFeedDataSpy).toBeCalledTimes(2)
      // the pod wallet is cached
      expect(getWalletByIndexSpy).toBeCalledTimes(0)

      jest.clearAllMocks()
      await fdpWithCache.personalStorage.delete(pod1)
      // writing info about pods to the network
      expect(writeFeedDataSpy).toBeCalledTimes(1)
      // V2 pods info for data uploading (todo: can be reduced)
      expect(getFeedDataSpy).toBeCalledTimes(1)
      expect(getWalletByIndexSpy).toBeCalledTimes(0)

      // recovering cache data
      const fdpRecovered = createFdp({
        isUseCache: true,
      })
      fdpRecovered.cache.object = JSON.parse(cache)
      fdpRecovered.account.setAccountFromMnemonic(wallet.mnemonic.phrase)
      const pods = await fdpRecovered.personalStorage.list()
      expect(pods.pods).toHaveLength(1)
      expect(pods.pods[0].name).toEqual(pod2)

      jest.restoreAllMocks()
    })
  })
})
