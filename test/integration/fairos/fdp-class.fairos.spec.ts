import { createFdp, generateRandomHexString, generateUser, topUpAddress, topUpFdp, waitFairOS } from '../../utils'
import { Directories, FairOSApi, PodsList } from '../../utils/fairos-api'
import { namehash, Wallet } from 'ethers'
import { wrapBytesWithHelpers } from '../../../src/utils/bytes'
import { getExtendedPodsListByAccountData } from '../../../src/pod/utils'
import { getRawMetadata } from '../../../src/content-items/utils'
import { RawDirectoryMetadata, RawFileMetadata } from '../../../src/pod/types'
import { DEFAULT_FILE_PERMISSIONS, getFileMode } from '../../../src/file/utils'
import { DEFAULT_DIRECTORY_PERMISSIONS, getDirectoryMode } from '../../../src/directory/utils'

jest.setTimeout(400000)
describe('Fair Data Protocol with FairOS-dfs', () => {
  beforeAll(async () => {
    await waitFairOS()
  })

  describe('Account', () => {
    it('should register in fdp and login in fairos', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      await topUpFdp(fdp)
      const nameHash = namehash(`${user.username}.fds`)
      const publicKey = Wallet.fromPhrase(user.mnemonic).publicKey.replace('0x', '')
      await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
      const response = await fairos.login(user.username, user.password)
      expect(response.status).toEqual(200)
      expect(response.data.accessToken).toBeDefined()
      expect(response.data.address).toEqual(user.address)
      expect(response.data.nameHash).toEqual(nameHash)
      expect(response.data.publicKey).toEqual(publicKey)
      expect(response.data.message).toEqual('user logged-in successfully')
    })

    it('should register in fairos and login in fdp', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser()
      const nameHash = namehash(`${user.username}.fds`)
      const publicKey = Wallet.fromPhrase(user.mnemonic).publicKey.replace('0x', '')
      await topUpAddress(user.address)

      const response = await fairos.register(user.username, user.password, user.mnemonic)
      expect(response.status).toEqual(201)
      expect(response.data).toStrictEqual({
        address: user.address,
        nameHash,
        publicKey,
        message: 'user signed-up successfully',
      })

      const data = await fdp.account.login(user.username, user.password)
      expect(data.address).toEqual(user.address)
    })
  })

  describe('Pod', () => {
    it('should create pods in fdp and list them in fairos', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      const podName1 = generateRandomHexString()
      const podName2 = generateRandomHexString()

      await topUpFdp(fdp)
      await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
      await fdp.personalStorage.create(podName1)
      await fairos.login(user.username, user.password)
      const response = await fairos.podLs()
      expect(response.status).toEqual(200)
      expect(response.data).toStrictEqual({
        pods: [podName1],
        sharedPods: [],
      })

      await fdp.personalStorage.create(podName2)
      const response2 = await fairos.podLs()
      expect(response2.status).toEqual(200)
      const response2Data = response2.data as PodsList
      expect(response2Data.pods).toHaveLength(2)
      expect(response2Data.sharedPods).toHaveLength(0)
      expect(response2Data.pods.includes(podName1)).toBeDefined()
      expect(response2Data.pods.includes(podName2)).toBeDefined()
    })

    it('should create pods in fairos and list them in fdp', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser()
      const podName1 = generateRandomHexString()
      const podName2 = generateRandomHexString()
      const podName3 = generateRandomHexString()

      await topUpAddress(user.address)
      await fairos.register(user.username, user.password, user.mnemonic)
      const createdPod1 = await fairos.podNew(podName1, user.password)
      expect(createdPod1.status).toEqual(201)
      expect(createdPod1.data).toStrictEqual({ message: 'pod created successfully' })
      const fairosList1 = (await fairos.podLs()).data as PodsList
      expect(fairosList1.pods).toHaveLength(1)

      await fdp.account.login(user.username, user.password)
      const fdpResponse = await fdp.personalStorage.list()
      expect(fdpResponse.pods).toHaveLength(1)
      expect(fdpResponse.sharedPods).toHaveLength(0)
      expect(fdpResponse.pods.find(item => item.name === podName1)).toBeDefined()

      const createdPod2 = await fairos.podNew(podName2, user.password)
      expect(createdPod2.status).toEqual(201)
      expect(createdPod2.data).toStrictEqual({ message: 'pod created successfully' })

      const fdpResponse2 = await fdp.personalStorage.list()
      expect(fdpResponse2.pods).toHaveLength(2)
      // because pods could be returned in a different order
      expect(fdpResponse2.pods.find(item => item.name === podName1)).toBeDefined()
      expect(fdpResponse2.pods.find(item => item.name === podName2)).toBeDefined()

      await fdp.personalStorage.create(podName3)
      const fairosPods = ((await fairos.podLs()).data as PodsList).pods
      expect(fairosPods).toHaveLength(3)
      expect(fairosPods.includes(podName1)).toBeDefined()
      expect(fairosPods.includes(podName2)).toBeDefined()
      expect(fairosPods.includes(podName3)).toBeDefined()
    })

    it('should delete pod in fdp and it will disappear in fairos', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      const podName1 = generateRandomHexString()

      await topUpFdp(fdp)
      await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
      await fdp.personalStorage.create(podName1)
      await fairos.login(user.username, user.password)
      const fairosList1 = (await fairos.podLs()).data as PodsList
      expect(fairosList1.pods).toHaveLength(1)
      expect(fairosList1.sharedPods).toHaveLength(0)

      await fdp.personalStorage.delete(podName1)
      const fairosList2 = (await fairos.podLs()).data as PodsList
      expect(fairosList2.pods).toHaveLength(0)
      expect(fairosList2.sharedPods).toHaveLength(0)
    })

    it('should delete pod in fairos and it will disappear in fdp', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser()
      const podName1 = generateRandomHexString()
      const podName2 = generateRandomHexString()

      await topUpAddress(user.address)
      await fairos.register(user.username, user.password, user.mnemonic)
      const createResponse1 = await fairos.podNew(podName1, user.password)
      const createResponse2 = await fairos.podNew(podName2, user.password)
      expect(createResponse1.status).toEqual(201)
      expect(createResponse1.data).toStrictEqual({ message: 'pod created successfully' })
      expect(createResponse2.status).toEqual(201)
      expect(createResponse2.data).toStrictEqual({ message: 'pod created successfully' })

      await fdp.account.login(user.username, user.password)
      const fdpPods = (await fdp.personalStorage.list()).pods
      expect(fdpPods).toHaveLength(2)
      expect(fdpPods.find(item => item.name === podName1)).toBeDefined()
      expect(fdpPods.find(item => item.name === podName2)).toBeDefined()

      const deleteResponse1 = await fairos.podDelete(podName1, user.password)
      expect(deleteResponse1.data).toEqual({ message: 'pod deleted successfully' })

      const fdpPods2 = (await fdp.personalStorage.list()).pods
      expect(fdpPods2).toHaveLength(1)
      expect(fdpPods2.find(item => item.name === podName1)).toBeUndefined()
      expect(fdpPods2.find(item => item.name === podName2)).toBeDefined()

      // test mixed interaction (pod created from fairos and deleted with fdp)
      await fdp.personalStorage.delete(podName2)
      const fdpResponse3 = await fdp.personalStorage.list()
      expect(fdpResponse3).toEqual({
        pods: [],
        sharedPods: [],
      })
      const fairosResponse3 = await fairos.podLs()
      expect(fairosResponse3.data).toEqual({
        pods: [],
        sharedPods: [],
      })
    })
  })

  describe('Directory', () => {
    it('should create directories in fdp and list them in fairos', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      const podName1 = generateRandomHexString()
      const directoryName1 = generateRandomHexString()
      const fullDirectoryName1 = '/' + directoryName1
      const subDirectoryName1 = generateRandomHexString()
      const fullSubDirectoryName1 = fullDirectoryName1 + '/' + subDirectoryName1
      const directoryName2 = generateRandomHexString()
      const fullDirectoryName2 = '/' + directoryName2

      await topUpFdp(fdp)
      await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
      await fdp.personalStorage.create(podName1)
      await fdp.directory.create(podName1, fullDirectoryName1)
      await fairos.login(user.username, user.password)
      await fairos.podOpen(podName1, user.password)
      const response = await fairos.dirLs(podName1)
      const data = response.data as Directories
      expect(response.status).toEqual(200)
      expect(data.dirs).toHaveLength(1)
      const dir1 = data.dirs[0]
      expect(dir1.name).toEqual(directoryName1)
      expect(dir1.contentType).toEqual('inode/directory')
      expect(dir1.creationTime).toBeDefined()
      expect(dir1.modificationTime).toBeDefined()
      expect(dir1.accessTime).toBeDefined()

      await fdp.directory.create(podName1, fullSubDirectoryName1)
      await fdp.directory.create(podName1, fullDirectoryName2)
      const response2 = await fairos.dirLs(podName1)
      expect(response2.data?.dirs).toHaveLength(2)
      const dirs2 = (response2.data as Directories).dirs
      expect(dirs2.find(item => item.name === directoryName1)).toBeDefined()
      expect(dirs2.find(item => item.name === directoryName2)).toBeDefined()

      const data3 = (await fairos.dirLs(podName1, fullDirectoryName1)).data as Directories
      const dirs3 = data3.dirs
      const dir3 = dirs3[0]
      expect(dirs3).toHaveLength(1)
      expect(dir3.name).toEqual(subDirectoryName1)
      expect(dir3.contentType).toEqual('inode/directory')
      expect(dir3.creationTime).toBeDefined()
      expect(dir3.modificationTime).toBeDefined()
      expect(dir3.accessTime).toBeDefined()
    })

    it('should create directories in fairos and list them in fdp', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      const podName1 = generateRandomHexString()
      const directoryName1 = generateRandomHexString()
      const fullDirectoryName1 = '/' + directoryName1
      const subDirectoryName1 = generateRandomHexString()
      const fullSubDirectoryName1 = fullDirectoryName1 + '/' + subDirectoryName1
      const directoryName2 = generateRandomHexString()
      const fullDirectoryName2 = '/' + directoryName2
      const directoryName3 = generateRandomHexString()
      const fullDirectoryName3 = '/' + directoryName3

      await topUpFdp(fdp)
      await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
      await fairos.login(user.username, user.password)
      await fairos.podNew(podName1, user.password)
      await fairos.dirMkdir(podName1, fullDirectoryName1, user.password)
      const response = await fdp.directory.read(podName1, '/')
      expect(response.directories).toHaveLength(1)
      const dir1 = response.directories[0]
      expect(dir1.name).toEqual(directoryName1)

      await fairos.dirMkdir(podName1, fullSubDirectoryName1, user.password)
      await fairos.dirMkdir(podName1, fullDirectoryName2, user.password)
      const response2 = await fdp.directory.read(podName1, '/', true)
      expect(response2.directories).toHaveLength(2)
      const dir2 = response2.directories[0].directories
      expect(dir2).toHaveLength(1)
      expect(response2.directories[1].directories).toHaveLength(0)
      expect(response2.directories[1].name).toEqual(directoryName2)
      expect(dir2[0].name).toEqual(subDirectoryName1)

      // test mixed clients directory creation in the same account
      await fdp.directory.create(podName1, fullDirectoryName3)
      const response3 = (await fairos.dirLs(podName1)).data as Directories
      expect(response3.dirs).toHaveLength(3)
      expect(response3.dirs.find(item => item.name === directoryName3)).toBeDefined()
    })

    it('should delete directory in fdp and it will disappear in fairos', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      const podName1 = generateRandomHexString()
      const directoryName1 = generateRandomHexString()
      const fullDirectoryName1 = '/' + directoryName1

      await topUpFdp(fdp)
      await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
      await fdp.personalStorage.create(podName1)
      await fdp.directory.create(podName1, fullDirectoryName1)
      await fairos.login(user.username, user.password)
      await fairos.podOpen(podName1, user.password)
      const response = await fairos.dirLs(podName1)
      expect(response.status).toEqual(200)
      const dirs1 = (response.data as Directories).dirs
      expect(dirs1).toHaveLength(1)
      expect(dirs1[0].name).toEqual(directoryName1)
      expect(dirs1[0].contentType).toEqual('inode/directory')

      await fdp.directory.delete(podName1, fullDirectoryName1)
      const response2 = await fairos.dirLs(podName1)
      const dirs2 = response2.data?.dirs
      expect(dirs2).toBeUndefined()
    })

    it('should delete directory in fairos and it will disappear in fdp', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser()
      const podName1 = generateRandomHexString()
      const directoryName1 = generateRandomHexString()
      const fullDirectoryName1 = '/' + directoryName1

      await topUpAddress(user.address)
      await fairos.register(user.username, user.password, user.mnemonic)
      await fairos.podNew(podName1, user.password)
      await fairos.dirMkdir(podName1, fullDirectoryName1, user.password)

      await fdp.account.login(user.username, user.password)
      const fdpResponse = await fdp.directory.read(podName1, '/', true)
      expect(fdpResponse.directories).toHaveLength(1)
      const dir1 = fdpResponse.directories[0]
      expect(dir1.name).toEqual(directoryName1)

      await fairos.dirRmdir(podName1, fullDirectoryName1)
      const fdpResponse2 = await fdp.directory.read(podName1, '/', true)
      expect(fdpResponse2.directories).toHaveLength(0)

      // test mixed interaction (directory created from fairos and deleted with fdp)
      await expect(fdp.directory.delete(podName1, fullDirectoryName1)).rejects.toThrow(
        `Item "${fullDirectoryName1}" not found in the list of items`,
      )
      const fdpResponse3 = await fdp.directory.read(podName1, '/', true)
      expect(fdpResponse3.directories).toHaveLength(0)
      const fairosDirs = await fairos.dirLs(podName1)
      expect(fairosDirs.data).toEqual({})
    })
  })

  describe('File', () => {
    it('should upload file with fdp and it should available via fairos', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      const podName1 = generateRandomHexString()
      const fileSizeBig = 5000015
      const contentBig = generateRandomHexString(fileSizeBig)
      const filenameBig = generateRandomHexString() + '.txt'
      const fullFilenameBigPath = '/' + filenameBig

      await topUpFdp(fdp)
      await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
      await fdp.personalStorage.create(podName1)
      await fdp.file.uploadData(podName1, fullFilenameBigPath, contentBig)

      await fairos.login(user.username, user.password)
      await fairos.podOpen(podName1, user.password)
      const response1 = await fairos.dirLs(podName1)
      const files = response1.data?.files
      expect(response1.status).toEqual(200)
      expect(files).toHaveLength(1)
      expect(Number(files[0].size)).toEqual(fileSizeBig)
      expect(files[0].name).toEqual(filenameBig)

      const response2 = await fairos.fileDownload(podName1, fullFilenameBigPath)
      expect(response2.status).toEqual(200)
      expect(response2.data).toEqual(contentBig)
    })

    it('should upload file with fairos and it should available via fdp', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      const podName1 = generateRandomHexString()
      const fileSizeBig = 5000015
      const contentBig = generateRandomHexString(fileSizeBig)
      const contentBig1 = generateRandomHexString(fileSizeBig)
      const filenameBig = generateRandomHexString() + '.txt'
      const filenameBig1 = generateRandomHexString() + '.txt'
      const fullFilenameBigPath = '/' + filenameBig
      const fullFilenameBigPath1 = '/' + filenameBig1

      await topUpFdp(fdp)
      await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
      await fairos.login(user.username, user.password)
      await fairos.podNew(podName1, user.password)
      const response1 = await fairos.fileUpload(podName1, '/', contentBig, filenameBig)
      const data1 = response1.data.Responses
      expect(response1.status).toEqual(200)
      expect(data1).toStrictEqual([
        {
          fileName: filenameBig,
          message: 'uploaded successfully',
        },
      ])

      const file1 = wrapBytesWithHelpers(await fdp.file.downloadData(podName1, fullFilenameBigPath))
      expect(file1.text()).toEqual(contentBig)

      // test mixed uploading
      await fdp.file.uploadData(podName1, fullFilenameBigPath1, contentBig1)
      // re-open pod because fairos can't download file without this action - https://github.com/fairDataSociety/fairOS-dfs/issues/278
      await fairos.podClose(podName1)
      await fairos.podOpen(podName1, user.password)
      const response2 = await fairos.dirLs(podName1)
      const files2 = response2.data.files
      expect(files2).toHaveLength(2)
      // download file uploaded with fdp
      const data2 = (await fairos.fileDownload(podName1, fullFilenameBigPath1)).data
      expect(data2).toEqual(contentBig1)
    })

    it('should delete file in fdp and it will disappear in fairos', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      const podName1 = generateRandomHexString()
      const fileSizeBig = 1000015
      const contentBig = generateRandomHexString(fileSizeBig)
      const filenameBig = generateRandomHexString() + '.txt'
      const fullFilenameBigPath = '/' + filenameBig

      await topUpFdp(fdp)
      await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
      await fdp.personalStorage.create(podName1)
      await fdp.file.uploadData(podName1, fullFilenameBigPath, contentBig)
      await fairos.login(user.username, user.password)
      await fairos.podOpen(podName1, user.password)
      const response = await fairos.dirLs(podName1)
      expect(response.status).toEqual(200)
      const files1 = response.data?.files
      expect(files1).toHaveLength(1)
      expect(files1[0].name).toEqual(filenameBig)

      await fdp.file.delete(podName1, fullFilenameBigPath)
      const response2 = await fairos.dirLs(podName1)
      const dirs2 = response2.data?.files
      expect(dirs2).toBeUndefined()
    })

    it('should delete file in fairos and it will disappear in fdp', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser()
      const podName1 = generateRandomHexString()
      const fileSizeBig = 1000015
      const contentBig = generateRandomHexString(fileSizeBig)
      const contentBig2 = generateRandomHexString(fileSizeBig)
      const filenameBig = generateRandomHexString() + '.txt'
      const filenameBig2 = generateRandomHexString() + '.txt'
      const fullFilenameBigPath = '/' + filenameBig
      const fullFilenameBigPath2 = '/' + filenameBig2

      await topUpAddress(user.address)
      await fairos.register(user.username, user.password, user.mnemonic)
      await fairos.podNew(podName1, user.password)
      await fairos.fileUpload(podName1, '/', contentBig, filenameBig)
      await fairos.fileUpload(podName1, '/', contentBig2, filenameBig2)

      await fdp.account.login(user.username, user.password)
      const fdpResponse = await fdp.directory.read(podName1, '/', true)
      expect(fdpResponse.files).toHaveLength(2)
      expect(fdpResponse.files[0].name).toEqual(filenameBig)
      expect(fdpResponse.files[1].name).toEqual(filenameBig2)

      await fairos.fileDelete(podName1, fullFilenameBigPath)
      const fdpResponse2 = await fdp.directory.read(podName1, '/', true)
      expect(fdpResponse2.files).toHaveLength(1)
      expect(fdpResponse2.files[0].name).toEqual(filenameBig2)

      // test mixed interaction (file created from fairos and deleted with fdp)
      await fdp.file.delete(podName1, fullFilenameBigPath2)
      const fdpResponse3 = await fdp.directory.read(podName1, '/', true)
      expect(fdpResponse3.files).toHaveLength(0)
      const fairosDirs = await fairos.dirLs(podName1)
      expect(fairosDirs.data).toEqual({})
    })
  })

  describe('Metadata', () => {
    it('should exists fields for file and directory in fairos and fdp', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      const podName1 = generateRandomHexString()
      const fileSizeBig = 1000015
      const contentBig = generateRandomHexString(fileSizeBig)
      const contentBig2 = generateRandomHexString(fileSizeBig)
      const filenameBig = generateRandomHexString() + '.txt'
      const filenameBig2 = generateRandomHexString() + '.txt'
      const fullFilenameBigPath = '/' + filenameBig
      const fullFilenameBigPath2 = '/' + filenameBig2
      const newDirectory1 = generateRandomHexString()
      const newDirectory2 = generateRandomHexString()
      const fullNewDirectory1 = '/' + newDirectory1
      const fullNewDirectory2 = '/' + newDirectory2

      const checkDirectoryMetadata = (rawDirectoryMetadata: RawDirectoryMetadata, directoryName: string) => {
        expect(Object.keys(rawDirectoryMetadata)).toHaveLength(2)
        expect(Object.keys(rawDirectoryMetadata.meta)).toHaveLength(7)
        expect(rawDirectoryMetadata.fileOrDirNames).toBeDefined()
        const meta = rawDirectoryMetadata.meta
        expect(meta.version).toEqual(2)
        expect(meta.path).toEqual('/')
        expect(meta.name).toEqual(directoryName)
        expect(meta.creationTime).toBeDefined()
        expect(meta.accessTime).toBeDefined()
        expect(meta.modificationTime).toBeDefined()
        expect(meta.mode).toEqual(getDirectoryMode(DEFAULT_DIRECTORY_PERMISSIONS))
      }

      const checkFileMetadata = (
        rawFileMetadata: RawFileMetadata,
        filename: string,
        filesize: number,
        contentType: string,
      ) => {
        expect(Object.keys(rawFileMetadata)).toHaveLength(12)
        expect(rawFileMetadata.version).toEqual(2)
        expect(rawFileMetadata.filePath).toEqual('/')
        expect(rawFileMetadata.fileName).toEqual(filename)
        expect(rawFileMetadata.fileSize).toEqual(filesize)
        expect(rawFileMetadata.blockSize).toEqual(1000000)
        expect(rawFileMetadata.contentType).toEqual(contentType)
        expect(rawFileMetadata.compression).toEqual('')
        expect(rawFileMetadata.creationTime).toBeDefined()
        expect(rawFileMetadata.accessTime).toBeDefined()
        expect(rawFileMetadata.modificationTime).toBeDefined()
        expect(rawFileMetadata.fileInodeReference).toBeDefined()
        expect(rawFileMetadata.mode).toEqual(getFileMode(DEFAULT_FILE_PERMISSIONS))
      }

      await topUpFdp(fdp)
      await fairos.register(user.username, user.password, user.mnemonic)
      await fairos.podNew(podName1, user.password)
      await fairos.dirMkdir(podName1, fullNewDirectory1, user.password)
      await fairos.fileUpload(podName1, '/', contentBig, filenameBig)

      const { podAddress, pod } = await getExtendedPodsListByAccountData(fdp.account, podName1)
      const rawDirectoryMetadata = (
        await getRawMetadata(fdp.connection.bee, fullNewDirectory1, podAddress, pod.password)
      ).metadata as RawDirectoryMetadata
      checkDirectoryMetadata(rawDirectoryMetadata, newDirectory1)

      const rawFileMetadata = (await getRawMetadata(fdp.connection.bee, fullFilenameBigPath, podAddress, pod.password))
        .metadata as RawFileMetadata
      checkFileMetadata(rawFileMetadata, filenameBig, fileSizeBig, 'text/plain; charset=utf-8')

      await fdp.directory.create(podName1, fullNewDirectory2)
      await fdp.file.uploadData(podName1, fullFilenameBigPath2, contentBig2)
      const rawDirectoryMetadata1 = (
        await getRawMetadata(fdp.connection.bee, fullNewDirectory2, podAddress, pod.password)
      ).metadata as RawDirectoryMetadata
      checkDirectoryMetadata(rawDirectoryMetadata1, newDirectory2)

      const rawFileMetadata1 = (
        await getRawMetadata(fdp.connection.bee, fullFilenameBigPath2, podAddress, pod.password)
      ).metadata as RawFileMetadata
      checkFileMetadata(rawFileMetadata1, filenameBig2, fileSizeBig, '')
    })
  })
})
