import { createFdp, generateRandomHexString, generateUser, topUpAddress, topUpFdp, waitFairOS } from '../utils'
import { FairOSApi } from '../utils/fairos-api'
import { Wallet, utils } from 'ethers'

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
      const nameHash = utils.namehash(`${user.username}.fds`)
      const publicKey = Wallet.fromMnemonic(user.mnemonic).publicKey.replace('0x', '')
      await fdp.account.register(user.username, user.password)
      const response = await fairos.login(user.username, user.password)
      expect(response.status).toEqual(200)
      expect(response.data).toStrictEqual({
        address: user.address,
        name_hash: nameHash,
        public_key: publicKey,
        message: 'user logged-in successfully',
      })
    })

    it('should register in fairos and login in fdp', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser()
      const nameHash = utils.namehash(`${user.username}.fds`)
      const publicKey = Wallet.fromMnemonic(user.mnemonic).publicKey.replace('0x', '')
      await topUpAddress(fdp.ens, user.address)

      const response = await fairos.register(user.username, user.password, user.mnemonic)
      expect(response.status).toEqual(201)
      expect(response.data).toStrictEqual({
        address: user.address,
        name_hash: nameHash,
        public_key: publicKey,
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

      await topUpFdp(fdp)
      await fdp.account.register(user.username, user.password)
      const podName1 = generateRandomHexString()
      const podName2 = generateRandomHexString()
      fdp.account.setAccountFromMnemonic(user.mnemonic)
      await fdp.personalStorage.create(podName1)
      const fdpResponse = await fdp.personalStorage.list()
      await fairos.login(user.username, user.password)
      const response = await fairos.podLs()
      expect(response.status).toEqual(200)
      expect(response.data).toStrictEqual({
        pod_name: [podName1],
        shared_pod_name: [],
      })

      await fdp.personalStorage.create(podName2)
      const response2 = await fairos.podLs()
      expect(response2.status).toEqual(200)
      // sometimes pods have different order
      expect(response2.data.pod_name).toContain(podName1)
      expect(response2.data.pod_name).toContain(podName2)
      expect(response2.data.shared_pod_name).toEqual([])
    })

    it('should create pods in fairos and list them in fdp', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      const podName1 = generateRandomHexString()
      const podName2 = generateRandomHexString()
      const podName3 = generateRandomHexString()
      await topUpFdp(fdp)
      await fdp.account.register(user.username, user.password)
      fdp.account.setAccountFromMnemonic(user.mnemonic)
      await fairos.login(user.username, user.password)
      const createResponse = await fairos.podNew(podName1, user.password)
      expect(createResponse.status).toEqual(201)
      expect(createResponse.data).toStrictEqual({ message: 'pod created successfully' })
     
      const fdpResponse = await fdp.personalStorage.list()
      expect(fdpResponse).toEqual({ pods: [{ name: podName1, index: 1 }], sharedPods: [] })

      await fairos.podNew(podName2, user.password)
      const fdpResponse2 = await fdp.personalStorage.list()
      expect(fdpResponse2.getPods()).toHaveLength(2)
      // because pods could be returned in a different order
      expect(fdpResponse2.getPods().find(item => item.name === podName1)).toBeDefined()
      expect(fdpResponse2.getPods().find(item => item.name === podName2)).toBeDefined()

      await fdp.personalStorage.create(podName3)
      const response2 = await fairos.podLs()
      expect(response2.status).toEqual(200)
      const pods = response2.data.pod_name
      // sometimes pods return in different order, so they couldn't be strictly compared
      expect(pods).toHaveLength(3)
      expect(pods).toContain(podName1)
      expect(pods).toContain(podName2)
      expect(pods).toContain(podName3)
    })

    it('should delete pod in fdp and it will disappear in fairos', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      const podName1 = generateRandomHexString()
      
      await topUpFdp(fdp)
      await fdp.account.register(user.username, user.password)
      fdp.account.setAccountFromMnemonic(user.mnemonic)
      
      await fairos.login(user.username, user.password)

      await fdp.personalStorage.create(podName1)
      const response = await fairos.podLs()
      expect(response.status).toEqual(200)
      expect(response.data).toStrictEqual({
        pod_name: [podName1],
        shared_pod_name: [],
      })

      await fdp.personalStorage.delete(podName1)
      const response2 = await fairos.podLs()
      expect(response2.status).toEqual(200)
      expect(response2.data).toStrictEqual({
        pod_name: [],
        shared_pod_name: [],
      })
    })

    it('should delete pod in fairos and it will disappear in fdp', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      const podName1 = generateRandomHexString()
      const podName2 = generateRandomHexString()
      await topUpFdp(fdp)
      await fdp.account.register(user.username, user.password)
      fdp.account.setAccountFromMnemonic(user.mnemonic)

      await fairos.login(user.username, user.password)
      const createResponse1 = await fairos.podNew(podName1, user.password)
      const createResponse2 = await fairos.podNew(podName2, user.password)
      expect(createResponse1.status).toEqual(201)
      expect(createResponse1.data).toStrictEqual({ message: 'pod created successfully' })
      expect(createResponse2.status).toEqual(201)
      expect(createResponse2.data).toStrictEqual({ message: 'pod created successfully' })

     
      const fdpResponse = await fdp.personalStorage.list()
      expect(fdpResponse).toEqual({
        pods: [
          { name: podName1, index: 1 },
          { name: podName2, index: 2 },
        ],
        sharedPods: [],
      })

      await fairos.podDelete(podName1, user.password)
      const fdpResponse2 = await fdp.personalStorage.list()
      expect(fdpResponse2).toEqual({
        pods: [{ name: podName2, index: 2 }],
        sharedPods: [],
      })

      // test mixed interaction (pod created from fairos and deleted with fdp)
      await fdp.personalStorage.delete(podName2)
      const fdpResponse3 = await fdp.personalStorage.list()
      expect(fdpResponse3).toEqual({
        pods: [],
        sharedPods: [],
      })
      const fairosResponse3 = await fairos.podLs()
      expect(fairosResponse3.data).toEqual({
        pod_name: [],
        shared_pod_name: [],
      })
    })
  })

  describe('Directory', () => {
    it('should create directories in fdp and list them in fairos', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      await topUpFdp(fdp)
      await fdp.account.register(user.username, user.password)
      fdp.account.setAccountFromMnemonic(user.mnemonic)

      const podName1 = generateRandomHexString()
      const directoryName1 = generateRandomHexString()
      const fullDirectoryName1 = '/' + directoryName1
      const subDirectoryName1 = generateRandomHexString()
      const fullSubDirectoryName1 = fullDirectoryName1 + '/' + subDirectoryName1
      const directoryName2 = generateRandomHexString()
      const fullDirectoryName2 = '/' + directoryName2
      
      await fdp.personalStorage.create(podName1)
      await fdp.directory.create(podName1, fullDirectoryName1)
      await fairos.login(user.username, user.password)
      await fairos.podOpen(podName1, user.password)
      const response = await fairos.dirLs(podName1)
      expect(response.status).toEqual(200)
      expect(response.data?.dirs).toHaveLength(1)
      const dir1 = response.data.dirs[0]
      expect(dir1.name).toEqual(directoryName1)
      expect(dir1.content_type).toEqual('inode/directory')
      expect(dir1.creation_time).toBeDefined()
      expect(dir1.modification_time).toBeDefined()
      expect(dir1.access_time).toBeDefined()

      await fdp.directory.create(podName1, fullSubDirectoryName1)
      await fdp.directory.create(podName1, fullDirectoryName2)
      const response2 = await fairos.dirLs(podName1)
      expect(response2.data?.dirs).toHaveLength(2)
      const dirs2 = response2.data?.dirs
      // expect(dirs2[0].name).toEqual(directoryName1)
      // expect(dirs2[1].name).toEqual(directoryName2)

      const data3 = (await fairos.dirLs(podName1, fullDirectoryName1)).data
      const dirs3 = data3.dirs
      const dir3 = dirs3[0]
      expect(dirs3).toHaveLength(1)
      expect(dir3.name).toEqual(subDirectoryName1)
      expect(dir3.content_type).toEqual('inode/directory')
      expect(dir3.creation_time).toBeDefined()
      expect(dir3.modification_time).toBeDefined()
      expect(dir3.access_time).toBeDefined()
    })

    it('should create directories in fairos and list them in fdp', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      await topUpFdp(fdp)
      await fdp.account.register(user.username, user.password)
      fdp.account.setAccountFromMnemonic(user.mnemonic)

      const podName1 = generateRandomHexString()
      const directoryName1 = generateRandomHexString()
      const fullDirectoryName1 = '/' + directoryName1
      const subDirectoryName1 = generateRandomHexString()
      const fullSubDirectoryName1 = fullDirectoryName1 + '/' + subDirectoryName1
      const directoryName2 = generateRandomHexString()
      const fullDirectoryName2 = '/' + directoryName2
      const directoryName3 = generateRandomHexString()
      const fullDirectoryName3 = '/' + directoryName3

      await fairos.login(user.username, user.password)
      await fairos.podNew(podName1, user.password)
      await fairos.dirMkdir(podName1, fullDirectoryName1, user.password)
      const response = await fdp.directory.read(podName1, '/')
      expect(response.getDirectories()).toHaveLength(1)
      const dir1 = response.getDirectories()[0]
      expect(dir1.name).toEqual(directoryName1)

      await fairos.dirMkdir(podName1, fullSubDirectoryName1, user.password)
      await fairos.dirMkdir(podName1, fullDirectoryName2, user.password)
      const response2 = await fdp.directory.read(podName1, '/', true)
      expect(response2.getDirectories()).toHaveLength(2)
      const dir2 = response2.getDirectories()[0].getDirectories()
      expect(dir2).toHaveLength(1)
      expect(response2.getDirectories()[1].getDirectories()).toHaveLength(0)
      expect(response2.getDirectories()[1].name).toEqual(directoryName2)
      expect(dir2[0].name).toEqual(subDirectoryName1)

      // test mixed clients directory creation in the same account
      await fdp.directory.create(podName1, fullDirectoryName3)
      const response3 = (await fairos.dirLs(podName1)).data?.dirs
      expect(response3).toHaveLength(3)
    })

    it('should delete directory in fdp and it will disappear in fairos', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      await topUpFdp(fdp)
      await fdp.account.register(user.username, user.password)
      fdp.account.setAccountFromMnemonic(user.mnemonic)

      const podName1 = generateRandomHexString()
      const directoryName1 = generateRandomHexString()
      const fullDirectoryName1 = '/' + directoryName1
      await fdp.personalStorage.create(podName1)
      await fdp.directory.create(podName1, fullDirectoryName1)
      await fairos.login(user.username, user.password)
      await fairos.podOpen(podName1, user.password)
      const response = await fairos.dirLs(podName1)
      expect(response.status).toEqual(200)
      const dirs1 = response.data?.dirs
      expect(dirs1).toHaveLength(1)
      expect(dirs1[0].name).toEqual(directoryName1)
      expect(dirs1[0].content_type).toEqual('inode/directory')

      await fdp.directory.delete(podName1, fullDirectoryName1)
      const response2 = await fairos.dirLs(podName1)
      const dirs2 = response2.data?.dirs
      expect(dirs2).toBeUndefined()
    })

    it('should delete directory in fairos and it will disappear in fdp', async () => {
      const fairos = new FairOSApi()
      const fdp = createFdp()
      const user = generateUser(fdp)
      const podName1 = generateRandomHexString()
      const directoryName1 = generateRandomHexString()
      const fullDirectoryName1 = '/' + directoryName1
      await topUpFdp(fdp)
      await fdp.account.register(user.username, user.password)
      fdp.account.setAccountFromMnemonic(user.mnemonic)

      await fairos.login(user.username, user.password)
      await fairos.podNew(podName1, user.password)
      await fairos.dirMkdir(podName1, fullDirectoryName1, user.password)

      const fdpResponse = await fdp.directory.read(podName1, '/', true)
      expect(fdpResponse.getDirectories()).toHaveLength(1)
      const dir1 = fdpResponse.getDirectories()[0]
      expect(dir1.name).toEqual(directoryName1)

      await fairos.dirRmdir(podName1, fullDirectoryName1)
      const fdpResponse2 = await fdp.directory.read(podName1, '/', true)
      expect(fdpResponse2.getDirectories()).toHaveLength(0)

      // test mixed interaction (directory created from fairos and deleted with fdp)
      await fdp.directory.delete(podName1, fullDirectoryName1)
      const fdpResponse3 = await fdp.directory.read(podName1, '/', true)
      expect(fdpResponse3.getDirectories()).toHaveLength(0)
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
      await fdp.account.register(user.username, user.password)
      fdp.account.setAccountFromMnemonic(user.mnemonic)
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
      await fdp.account.register(user.username, user.password)
      fdp.account.setAccountFromMnemonic(user.mnemonic)

      await fairos.login(user.username, user.password)
      await fairos.podNew(podName1, user.password)
      const response1 = await fairos.fileUpload(podName1, '/', contentBig, filenameBig)
      const data1 = response1.data.Responses
      expect(response1.status).toEqual(200)
      expect(data1).toStrictEqual([
        {
          file_name: filenameBig,
          message: 'uploaded successfully',
        },
      ])

      const file1 = await fdp.file.downloadData(podName1, fullFilenameBigPath)
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
      await fdp.account.register(user.username, user.password)
      fdp.account.setAccountFromMnemonic(user.mnemonic)
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
      const user = generateUser(fdp)
      const podName1 = generateRandomHexString()
      const fileSizeBig = 1000015
      const contentBig = generateRandomHexString(fileSizeBig)
      const contentBig2 = generateRandomHexString(fileSizeBig)
      const filenameBig = generateRandomHexString() + '.txt'
      const filenameBig2 = generateRandomHexString() + '.txt'
      const fullFilenameBigPath = '/' + filenameBig
      const fullFilenameBigPath2 = '/' + filenameBig2
      await topUpFdp(fdp)
      await fdp.account.register(user.username, user.password)
      fdp.account.setAccountFromMnemonic(user.mnemonic)

      await fairos.login(user.username, user.password)
      await fairos.podNew(podName1, user.password)
      await fairos.fileUpload(podName1, '/', contentBig, filenameBig)
      await fairos.fileUpload(podName1, '/', contentBig2, filenameBig2)

      const fdpResponse = await fdp.directory.read(podName1, '/', true)
      expect(fdpResponse.getFiles()).toHaveLength(2)
      expect(fdpResponse.getFiles()[0].name).toEqual(filenameBig)
      expect(fdpResponse.getFiles()[1].name).toEqual(filenameBig2)

      await fairos.fileDelete(podName1, fullFilenameBigPath)
      const fdpResponse2 = await fdp.directory.read(podName1, '/', true)
      expect(fdpResponse2.getFiles()).toHaveLength(1)
      expect(fdpResponse2.getFiles()[0].name).toEqual(filenameBig2)

      // test mixed interaction (file created from fairos and deleted with fdp)
      await fdp.file.delete(podName1, fullFilenameBigPath2)
      const fdpResponse3 = await fdp.directory.read(podName1, '/', true)
      expect(fdpResponse3.getFiles()).toHaveLength(0)
      const fairosDirs = await fairos.dirLs(podName1)
      expect(fairosDirs.data).toEqual({})
    })
  })
})
