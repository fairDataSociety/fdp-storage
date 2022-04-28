import { FairDataProtocol } from '../../src'
import {
  beeDebugUrl,
  beeUrl,
  bytesToString,
  fairosJsUrl,
  generateRandomHexString,
  generateUser,
  prepareEthAddress,
  isBatchUsable,
} from '../utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import FairosJs from '@fairdatasociety/fairos-js'
import { FairOSDirectoryItems } from '../types'
import { MAX_POD_NAME_LENGTH } from '../../src/pod/utils'

const GET_FEED_DATA_TIMEOUT = 1000

function createFdp() {
  return new FairDataProtocol(beeUrl(), beeDebugUrl(), {
    downloadOptions: {
      timeout: GET_FEED_DATA_TIMEOUT,
    },
  })
}

function createFairosJs() {
  return new FairosJs(fairosJsUrl())
}

jest.setTimeout(200000)
describe('Fair Data Protocol class', () => {
  it('should strip trailing slash', () => {
    const fdp = new FairDataProtocol('http://localhost:1633/', 'http://localhost:1635/', {
      downloadOptions: {
        timeout: GET_FEED_DATA_TIMEOUT,
      },
    })
    expect(fdp.connection.bee.url).toEqual('http://localhost:1633')
    expect(fdp.connection.beeDebug.url).toEqual('http://localhost:1635')
  })

  it('check default batch usability', async () => {
    const fdp = createFdp()

    expect(await isBatchUsable(fdp.connection.beeDebug)).toBe(true)
  })

  describe('Registration', () => {
    it('should register users', async () => {
      const fairos = createFairosJs()
      const fdp = createFdp()

      const usersList = [generateUser(), generateUser()]
      for (const user of usersList) {
        const createdUser = await fdp.account.register(user.username, user.password, user.mnemonic)
        expect(createdUser.mnemonic).toEqual(user.mnemonic)
        expect(createdUser.wallet.address).toEqual(user.address)
        expect(createdUser.encryptedMnemonic).toBeDefined()
        expect(createdUser.reference).toBeDefined()
        await fairos.userImport(user.username, user.password, '', user.address)
        await fairos.userLogin(user.username, user.password)
      }
    })

    it('should throw when registering already registered user', async () => {
      const fdp = createFdp()
      const user = generateUser()

      await fdp.account.register(user.username, user.password, user.mnemonic)
      fdp.account.removeUserAddress(user.username)
      await expect(fdp.account.register(user.username, user.password, user.mnemonic)).rejects.toThrow(
        'User already exists',
      )
    })

    it('should throw when registering already imported user', async () => {
      const fdp = createFdp()
      const user = generateUser()

      await fdp.account.setUserAddress(user.username, user.address)
      await expect(fdp.account.register(user.username, user.password, user.mnemonic)).rejects.toThrow(
        'User already imported',
      )
    })
  })

  describe('Login', () => {
    it('should login with existing user and address', async () => {
      const fdp = createFdp()
      const fdp1 = createFdp()
      const user = generateUser()

      await fdp.account.register(user.username, user.password, user.mnemonic)
      expect(fdp.account.usernameToAddress[user.username]).toEqual(prepareEthAddress(user.address))
      await fdp.account.setUserAddress(user.username, user.address)
      await fdp.account.login(user.username, user.password)

      // login with one line
      await fdp1.account.login(user.username, user.password, user.address)
      expect(fdp1.account.usernameToAddress[user.username]).toEqual(prepareEthAddress(user.address))
    })

    it('should login after importing with username and mnemonic', async () => {
      const fdp = createFdp()
      const fdp1 = createFdp()
      const user = generateUser()

      expect(fdp.account.usernameToAddress[user.username]).toBeUndefined()
      await fdp.account.register(user.username, user.password, user.mnemonic)

      await fdp1.account.import(user.username, user.mnemonic)
      expect(fdp1.account.usernameToAddress[user.username]).toEqual(prepareEthAddress(user.address))
      await fdp1.account.login(user.username, user.password)
    })

    it('should throw when login with incorrect login and password', async () => {
      const fdp1 = createFdp()
      const fdp = createFdp()
      const user = generateUser()

      await fdp1.account.register(user.username, user.password, user.mnemonic)

      // not imported username
      const failUsername = generateUser().username
      await expect(fdp.account.login(failUsername, 'zzz')).rejects.toThrow(
        `No address linked to the username "${failUsername}"`,
      )

      // imported but incorrect password
      await fdp.account.setUserAddress(user.username, user.address)
      await expect(fdp.account.login(user.username, generateUser().password)).rejects.toThrow('Incorrect password')

      // imported but empty password
      await expect(fdp.account.login(user.username, '')).rejects.toThrow('Incorrect password')

      // import with incorrect mnemonic
      await expect(fdp.account.import(generateUser().username, 'some mnemonic')).rejects.toThrow('Incorrect mnemonic')

      // import with empty username and mnemonic
      await expect(fdp.account.import('', '')).rejects.toThrow('Incorrect username')
    })
  })

  describe('Pods', () => {
    it('should get empty pods list', async () => {
      const fdp = createFdp()
      const user = generateUser()

      await fdp.account.register(user.username, user.password, user.mnemonic)
      const pods = await fdp.personalStorage.list()
      expect(pods).toHaveLength(0)
    })

    it('should create pods with fairos and get list of them', async () => {
      const fdp = createFdp()
      const fairos = createFairosJs()
      const user = generateUser()
      const pods = []

      await fairos.userSignup(user.username, user.password, user.mnemonic)
      for (let i = 0; i < 10; i++) {
        const podName = generateRandomHexString()
        pods.push(podName)
        const podData = (await fairos.podNew(podName, user.password)).data
        expect(podData.code).toEqual(201)
      }

      await fdp.account.setUserAddress(user.username, user.address)
      await fdp.account.login(user.username, user.password)

      const podsList = await fdp.personalStorage.list()
      expect(podsList.length).toEqual(pods.length)

      for (const podName of podsList) {
        expect(pods.includes(podName.name)).toBeTruthy()
      }
    })

    it('should create pods with fdp', async () => {
      const fdp = createFdp()
      const user = generateUser()
      const fairos = createFairosJs()

      await fdp.account.register(user.username, user.password, user.mnemonic)
      let list = await fdp.personalStorage.list()
      expect(list).toHaveLength(0)

      await fairos.userImport(user.username, user.password, '', user.address)
      await fairos.userLogin(user.username, user.password)
      expect((await fairos.podLs()).data.pod_name).toHaveLength(0)

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

        list = await fdp.personalStorage.list()
        expect(list).toHaveLength(i + 1)
        expect(list[i]).toEqual(example)

        const fairosPods = (await fairos.podLs()).data.pod_name
        expect(fairosPods).toHaveLength(i + 1)
        expect(fairosPods).toContain(example.name)

        const openResult = (await fairos.podOpen(example.name, user.password)).data
        expect(openResult.message).toEqual('pod opened successfully')
      }

      const failPod = examples[0]
      await expect(fdp.personalStorage.create(failPod.name)).rejects.toThrow(
        `Pod with name "${failPod.name}" already exists`,
      )
    })

    it('should delete pods', async () => {
      const fdp = createFdp()
      const user = generateUser()
      const fairos = createFairosJs()

      await fdp.account.register(user.username, user.password, user.mnemonic)
      await fdp.account.login(user.username, user.password, user.address)
      await fairos.userImport(user.username, user.password, '', user.address)
      await fairos.userLogin(user.username, user.password)
      expect((await fairos.podLs()).data.pod_name).toHaveLength(0)

      const podName = generateRandomHexString()
      const podName1 = generateRandomHexString()
      await fdp.personalStorage.create(podName)
      await fdp.personalStorage.create(podName1)
      let list = await fdp.personalStorage.list()
      expect(list).toHaveLength(2)
      expect((await fairos.podLs()).data.pod_name).toHaveLength(2)

      const notExistsPod = generateRandomHexString()
      await expect(fdp.personalStorage.delete(notExistsPod)).rejects.toThrow(`Pod "${notExistsPod}" does not exist`)

      await fdp.personalStorage.delete(podName)
      list = await fdp.personalStorage.list()
      expect(list).toHaveLength(1)
      expect((await fairos.podLs()).data.pod_name).toHaveLength(1)

      await fdp.personalStorage.delete(podName1)
      list = await fdp.personalStorage.list()
      expect(list).toHaveLength(0)
      expect((await fairos.podLs()).data.pod_name).toHaveLength(0)
    })
  })

  describe('Directory', () => {
    it('should find all directories', async () => {
      const fdp = createFdp()
      const fairos = createFairosJs()
      const user = generateUser()
      const pod = generateRandomHexString()
      const createDirectories = ['/one', '/two', '/one/one_1', '/two/two_1']

      await fdp.account.register(user.username, user.password, user.mnemonic)
      await fdp.personalStorage.create(pod)
      await fairos.userImport(user.username, user.password, '', user.address)
      await fairos.userLogin(user.username, user.password)
      await fairos.podOpen(pod, user.password)
      for (const directory of createDirectories) {
        await fairos.dirMkdir(pod, directory)
      }

      const podsNoRecursive = await fdp.directory.read(pod, '/', false)
      expect(podsNoRecursive.name).toEqual('/')
      expect(podsNoRecursive.content).toHaveLength(2)
      expect(podsNoRecursive.getFiles()).toHaveLength(0)
      const noRecursiveDirectories = podsNoRecursive.getDirectories()
      expect(noRecursiveDirectories).toHaveLength(2)
      expect(noRecursiveDirectories[0].name).toEqual('one')
      expect(noRecursiveDirectories[1].name).toEqual('two')
      expect(noRecursiveDirectories[0].content).toHaveLength(0)
      expect(noRecursiveDirectories[1].content).toHaveLength(0)

      const podsRecursive = await fdp.directory.read(pod, '/', true)
      expect(podsRecursive.name).toEqual('/')
      expect(podsRecursive.content).toHaveLength(2)
      expect(podsRecursive.getFiles()).toHaveLength(0)
      const recursiveDirectories = podsRecursive.getDirectories()
      expect(recursiveDirectories).toHaveLength(2)
      expect(recursiveDirectories[0].getDirectories()).toHaveLength(1)
      expect(recursiveDirectories[0].getDirectories()[0].name).toEqual('one_1')
      expect(recursiveDirectories[1].getDirectories()).toHaveLength(1)
      expect(recursiveDirectories[1].getDirectories()[0].name).toEqual('two_1')
    })

    it('should create new directory', async () => {
      const fdp = createFdp()
      const fairos = createFairosJs()
      const user = generateUser()
      const pod = generateRandomHexString()
      const directoryName = generateRandomHexString()
      const directoryFull = '/' + directoryName
      const directoryName1 = generateRandomHexString()
      const directoryFull1 = '/' + directoryName + '/' + directoryName1

      await fdp.account.register(user.username, user.password, user.mnemonic)
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

      await fairos.userImport(user.username, user.password, '', user.address)
      await fairos.userLogin(user.username, user.password)
      await fairos.podOpen(pod, user.password)
      const fairosList = (await fairos.dirLs(pod, '/')).data as FairOSDirectoryItems
      expect(fairosList.dirs).toHaveLength(1)
      const dir = fairosList.dirs[0]
      expect(dir.name).toEqual(directoryName)
    })
  })

  describe('File', () => {
    it('should upload small text data as a file', async () => {
      const fdp = createFdp()
      const fairos = createFairosJs()
      const user = generateUser()
      const pod = generateRandomHexString()
      const fileSizeSmall = 100
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall

      await fdp.account.register(user.username, user.password, user.mnemonic)
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

      await fairos.userImport(user.username, user.password, '', user.address)
      await fairos.userLogin(user.username, user.password)
      await fairos.podOpen(pod, user.password)
      const list = (await fairos.dirLs(pod, '/')).data as FairOSDirectoryItems
      expect(list.files).toHaveLength(1)
      const fairosSmallFile = list.files[0]
      expect(fairosSmallFile.name).toEqual(filenameSmall)
      expect(fairosSmallFile.size).toEqual(fileSizeSmall.toString())
      const dataSmallFairos = (await fairos.fileDownload(pod, fullFilenameSmallPath, filenameSmall)).data
      expect(bytesToString(dataSmallFairos)).toEqual(contentSmall)
    })

    it('should upload big text data as a file', async () => {
      const fdp = createFdp()
      const fairos = createFairosJs()
      const user = generateUser()
      const pod = generateRandomHexString()
      const incorrectPod = generateRandomHexString()
      const fileSizeBig = 5000005
      const contentBig = generateRandomHexString(fileSizeBig)
      const filenameBig = generateRandomHexString() + '.txt'
      const fullFilenameBigPath = '/' + filenameBig
      const incorrectFullPath = fullFilenameBigPath + generateRandomHexString()

      await fdp.account.register(user.username, user.password, user.mnemonic)
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

      await fairos.userImport(user.username, user.password, '', user.address)
      await fairos.userLogin(user.username, user.password)
      await fairos.podOpen(pod, user.password)
      const list = (await fairos.dirLs(pod, '/')).data as FairOSDirectoryItems
      expect(list.files).toHaveLength(1)

      const fairosBigFile = list.files[0]
      expect(fairosBigFile.name).toEqual(filenameBig)
      expect(fairosBigFile.size).toEqual(fileSizeBig.toString())
      const dataBigFairos = (await fairos.fileDownload(pod, fullFilenameBigPath, filenameBig)).data
      expect(bytesToString(dataBigFairos)).toEqual(contentBig)
    })
  })
})
