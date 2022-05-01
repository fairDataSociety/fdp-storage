import { join } from 'path'
import {
  beeDebugUrl,
  beeUrl,
  bytesToString,
  fairosJsUrl,
  generateRandomHexString,
  generateUser,
  prepareEthAddress,
  TestUser,
} from '../utils'
import '../../src/index'
import '../index'
import { JSONArray, JSONObject } from 'puppeteer'
import { FairDataProtocol } from '../../src'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import FairosJs from '@fairdatasociety/fairos-js'
import { FairOSDirectoryItems } from '../types'
import { MAX_POD_NAME_LENGTH } from '../../src/pod/utils'

const GET_FEED_DATA_TIMEOUT = 1000

function createFairosJs() {
  return new FairosJs(fairosJsUrl())
}

jest.setTimeout(200000)
describe('Fair Data Protocol class - in browser', () => {
  const BEE_URL = beeUrl()
  const BEE_DEBUG_URL = beeDebugUrl()

  beforeAll(async () => {
    await jestPuppeteer.resetPage()
    const testPage = join(__dirname, '..', 'testpage', 'testpage.html')
    await page.goto(`file://${testPage}`)
    await page.exposeFunction(
      'initFdp',
      (): string => `new window.fdp.FairDataProtocol('${BEE_URL}', '${BEE_DEBUG_URL}', ${GET_FEED_DATA_TIMEOUT})`,
    )
    await page.exposeFunction(
      'shouldFailString',
      (): string =>
        `window.shouldFail = async(
            method,
            message,
            failMessage = 'Method should fail',
          ) => {
            try {
              await method
              fail(failMessage)
            } catch (e) {
              if (e instanceof Error && e.message === message) {
                return
              }

              throw e
            }
          }`,
    )
  })

  it('should strip trailing slash', async () => {
    const urls = await page.evaluate(async () => {
      const fdp = new window.fdp.FairDataProtocol('http://localhost:1633/', 'http://localhost:1635/')

      return {
        beeUrl: fdp.connection.bee.url,
        beeDebugUrl: fdp.connection.beeDebug.url,
      }
    })

    expect(urls.beeUrl).toBe('http://localhost:1633')
    expect(urls.beeDebugUrl).toBe('http://localhost:1635')
  })

  describe('Registration', () => {
    it('should register users', async () => {
      const fairos = createFairosJs()

      const usersList = [generateUser(), generateUser()] as unknown as JSONArray
      const createdUsers = await page.evaluate(async users => {
        const fdp = eval(await window.initFdp()) as FairDataProtocol

        const result = []
        for (const user of users) {
          const data = await fdp.account.register(user.username, user.password, user.mnemonic)
          result.push(data)

          await fdp.account.import(user.username, user.mnemonic)
          await fdp.account.login(user.username, user.password)
        }

        return result
      }, usersList)

      for (const [i, createdUser] of createdUsers.entries()) {
        const user = usersList[i] as unknown as TestUser
        expect(createdUser.mnemonic).toEqual(user.mnemonic)
        expect(createdUser.wallet.address).toEqual(user.address)
        expect(createdUser.encryptedMnemonic).toBeDefined()
        expect(createdUser.reference).toBeDefined()
        await fairos.userImport(user.username, user.password, '', user.address)
        await fairos.userLogin(user.username, user.password)
      }
    })

    it('should throw when registering already registered user', async () => {
      await page.evaluate(async (user: TestUser) => {
        const fdp = eval(await window.initFdp()) as FairDataProtocol
        eval(await window.shouldFailString())

        await fdp.account.register(user.username, user.password, user.mnemonic)
        fdp.account.removeUserAddress(user.username)
        await window.shouldFail(
          fdp.account.register(user.username, user.password, user.mnemonic),
          'User already exists',
        )
      }, generateUser() as unknown as JSONObject)
    })

    it('should throw when registering already imported user', async () => {
      await page.evaluate(async (user: TestUser) => {
        const fdp = eval(await window.initFdp()) as FairDataProtocol
        eval(await window.shouldFailString())

        await fdp.account.setUserAddress(user.username, user.address)
        await window.shouldFail(
          fdp.account.register(user.username, user.password, user.mnemonic),
          'User already imported',
        )
      }, generateUser() as unknown as JSONObject)
    })
  })

  describe('Login', () => {
    it('should login with existing user and address', async () => {
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject
      const answer = await page.evaluate(async (user: TestUser) => {
        const result = {} as {
          address1: string
          address2: string
        }
        const fdp = eval(await window.initFdp()) as FairDataProtocol
        const fdp1 = eval(await window.initFdp()) as FairDataProtocol

        await fdp.account.register(user.username, user.password, user.mnemonic)
        result.address1 = fdp.account.usernameToAddress[user.username].toString()
        await fdp.account.setUserAddress(user.username, user.address)
        await fdp.account.login(user.username, user.password)

        await fdp1.account.login(user.username, user.password, user.address)
        result.address2 = fdp1.account.usernameToAddress[user.username].toString()

        return result
      }, jsonUser)

      expect(answer.address1).toEqual(prepareEthAddress(user.address).toString())
      expect(answer.address2).toEqual(prepareEthAddress(user.address).toString())
    })

    it('should login after importing with username and mnemonic', async () => {
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject
      const answer = await page.evaluate(async (user: TestUser) => {
        const result = {} as {
          address1: string
          address2: string
        }
        const fdp = eval(await window.initFdp()) as FairDataProtocol
        const fdp1 = eval(await window.initFdp()) as FairDataProtocol

        result.address1 = typeof fdp.account.usernameToAddress[user.username]
        await fdp.account.register(user.username, user.password, user.mnemonic)

        await fdp1.account.import(user.username, user.mnemonic)
        result.address2 = fdp1.account.usernameToAddress[user.username].toString()
        await fdp1.account.login(user.username, user.password)

        return result
      }, jsonUser)

      expect(answer.address1).toEqual('undefined')
      expect(answer.address2).toEqual(prepareEthAddress(user.address).toString())
    })

    it('should throw when login with incorrect login and password', async () => {
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject
      const randomData = generateUser().username
      const randomData1 = generateUser().username

      await page.evaluate(
        async (user: TestUser, randomData: string, randomData1: string) => {
          const fdp = eval(await window.initFdp()) as FairDataProtocol
          const fdp1 = eval(await window.initFdp()) as FairDataProtocol
          eval(await window.shouldFailString())

          await fdp1.account.register(user.username, user.password, user.mnemonic)

          // not imported username
          await window.shouldFail(
            fdp.account.login(randomData, 'zzz'),
            `No address linked to the username "${randomData}"`,
          )

          // imported but incorrect password
          await fdp.account.setUserAddress(user.username, user.address)
          await window.shouldFail(fdp.account.login(user.username, randomData), 'Incorrect password')

          // imported but empty password
          await window.shouldFail(fdp.account.login(user.username, ''), 'Incorrect password')

          // import with incorrect mnemonic
          await window.shouldFail(fdp.account.import(randomData1, 'some mnemonic'), 'Incorrect mnemonic')

          // import with empty username and mnemonic
          await window.shouldFail(fdp.account.import('', ''), 'Incorrect username')
        },
        jsonUser,
        randomData,
        randomData1,
      )
    })
  })

  describe('Pods', () => {
    it('should get empty pods list', async () => {
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject
      const answer = await page.evaluate(async (user: TestUser) => {
        const fdp = eval(await window.initFdp()) as FairDataProtocol
        await fdp.account.register(user.username, user.password, user.mnemonic)

        return await fdp.personalStorage.list()
      }, jsonUser)

      expect(answer).toEqual([])
    })

    it('should create pods with fairos and get list of them', async () => {
      const fairos = createFairosJs()
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject

      const pods = []
      await fairos.userSignup(user.username, user.password, user.mnemonic)
      for (let i = 0; i < 10; i++) {
        const podName = generateRandomHexString()
        pods.push(podName)
        const podData = (await fairos.podNew(podName, user.password)).data
        expect(podData.code).toEqual(201)
      }

      const podsList = await page.evaluate(async (user: TestUser) => {
        const fdp = eval(await window.initFdp()) as FairDataProtocol
        await fdp.account.setUserAddress(user.username, user.address)
        await fdp.account.login(user.username, user.password)

        return await fdp.personalStorage.list()
      }, jsonUser)

      expect(podsList.length).toEqual(pods.length)

      for (const podName of podsList) {
        expect(pods.includes(podName.name)).toBeTruthy()
      }
    })

    it('should create pods with fdp', async () => {
      const user = generateUser()
      const fairos = createFairosJs()
      const jsonUser = user as unknown as JSONObject
      const longPodName = generateRandomHexString(MAX_POD_NAME_LENGTH + 1)
      const commaPodName = generateRandomHexString() + ', ' + generateRandomHexString()

      const result = await page.evaluate(
        async (user: TestUser, longPodName: string, commaPodName: string) => {
          const fdp = eval(await window.initFdp()) as FairDataProtocol
          eval(await window.shouldFailString())

          await fdp.account.register(user.username, user.password, user.mnemonic)

          await window.shouldFail(fdp.personalStorage.create(longPodName), 'Pod name is too long')
          await window.shouldFail(fdp.personalStorage.create(commaPodName), 'Pod name cannot contain commas')
          await window.shouldFail(fdp.personalStorage.create(''), 'Pod name is too short')

          return await fdp.personalStorage.list()
        },
        jsonUser,
        longPodName,
        commaPodName,
      )

      expect(result).toHaveLength(0)
      await fairos.userImport(user.username, user.password, '', user.address)
      await fairos.userLogin(user.username, user.password)
      expect((await fairos.podLs()).data.pod_name).toHaveLength(0)

      const examples = [
        { name: generateRandomHexString(), index: 1 },
        { name: generateRandomHexString(), index: 2 },
        { name: generateRandomHexString(), index: 3 },
        { name: generateRandomHexString(), index: 4 },
        { name: generateRandomHexString(), index: 5 },
      ]

      const result1 = await page.evaluate(
        async (user: TestUser, examples: JSONArray) => {
          eval(await window.shouldFailString())
          const fdp = eval(await window.initFdp()) as FairDataProtocol
          const iterations = []
          await fdp.account.login(user.username, user.password, user.address)
          for (let i = 0; examples.length > i; i++) {
            const example = examples[i] as unknown as { name: string; index: number }
            const out = await fdp.personalStorage.create(example.name)
            const list = await fdp.personalStorage.list()

            iterations.push({
              result: out,
              example,
              list,
            })
          }

          const failPod = examples[0] as unknown as { name: string; index: number }
          await window.shouldFail(
            fdp.personalStorage.create(failPod.name),
            `Pod with name "${failPod.name}" already exists`,
          )

          return iterations as unknown as {
            result: JSONObject
            example: { name: string; index: number }
            list: JSONArray
          }[]
        },
        jsonUser,
        examples as unknown as JSONArray,
      )

      expect(result1).toHaveLength(examples.length)
      const fairosPods = (await fairos.podLs()).data.pod_name
      expect(fairosPods).toHaveLength(examples.length)

      for (let i = 0; result1.length > i; i++) {
        const item = result1[i]
        expect(item.result).toEqual(item.example)
        const openResult = (await fairos.podOpen(item.example.name, user.password)).data
        expect(openResult.message).toEqual('pod opened successfully')
      }
    })

    it('should delete pods', async () => {
      const user = generateUser()
      const fairos = createFairosJs()
      const jsonUser = user as unknown as JSONObject

      await page.evaluate(async (user: TestUser) => {
        const fdp = eval(await window.initFdp()) as FairDataProtocol
        await fdp.account.register(user.username, user.password, user.mnemonic)
        await fdp.account.login(user.username, user.password, user.address)
      }, jsonUser)

      await fairos.userImport(user.username, user.password, '', user.address)
      await fairos.userLogin(user.username, user.password)
      expect((await fairos.podLs()).data.pod_name).toHaveLength(0)

      const podName = generateRandomHexString()
      const podName1 = generateRandomHexString()
      const notExistsPod = generateRandomHexString()

      let list = await page.evaluate(
        async (user: TestUser, podName: string, podName1: string, notExistsPod: string) => {
          const fdp = eval(await window.initFdp()) as FairDataProtocol
          eval(await window.shouldFailString())

          await fdp.account.login(user.username, user.password, user.address)
          await fdp.personalStorage.create(podName)
          await fdp.personalStorage.create(podName1)

          await window.shouldFail(fdp.personalStorage.delete(notExistsPod), `Pod "${notExistsPod}" does not exist`)

          return await fdp.personalStorage.list()
        },
        jsonUser,
        podName,
        podName1,
        notExistsPod,
      )

      expect(list).toHaveLength(2)
      expect((await fairos.podLs()).data.pod_name).toHaveLength(2)

      list = await page.evaluate(
        async (user: TestUser, podName: string) => {
          const fdp = eval(await window.initFdp()) as FairDataProtocol
          eval(await window.shouldFailString())

          await fdp.account.login(user.username, user.password, user.address)
          await fdp.personalStorage.delete(podName)

          return await fdp.personalStorage.list()
        },
        jsonUser,
        podName,
      )

      expect(list).toHaveLength(1)
      expect((await fairos.podLs()).data.pod_name).toHaveLength(1)

      list = await page.evaluate(
        async (user: TestUser, podName: string) => {
          const fdp = eval(await window.initFdp()) as FairDataProtocol
          eval(await window.shouldFailString())

          await fdp.account.login(user.username, user.password, user.address)
          await fdp.personalStorage.delete(podName)

          return await fdp.personalStorage.list()
        },
        jsonUser,
        podName1,
      )

      expect(list).toHaveLength(0)
      expect((await fairos.podLs()).data.pod_name).toHaveLength(0)
    })
  })

  describe('Directory', () => {
    it('should find all directories', async () => {
      const user = generateUser()
      const fairos = createFairosJs()
      const jsonUser = user as unknown as JSONObject
      const pod = generateRandomHexString()
      const createDirectories = ['/one', '/two', '/one/one_1', '/two/two_1']

      await page.evaluate(
        async (user: TestUser, pod: string) => {
          const fdp = eval(await window.initFdp()) as FairDataProtocol
          await fdp.account.register(user.username, user.password, user.mnemonic)
          await fdp.personalStorage.create(pod)
        },
        jsonUser,
        pod,
      )

      await fairos.userImport(user.username, user.password, '', user.address)
      await fairos.userLogin(user.username, user.password)
      await fairos.podOpen(pod, user.password)
      for (const directory of createDirectories) {
        await fairos.dirMkdir(pod, directory)
      }

      const {
        podsNoRecursive,
        noRecursiveDirectories,
        podsRecursive,
        recursiveDirectories,
        noRecursiveFiles,
        recursiveFiles,
        subDirs1,
        subDirs2,
      } = await page.evaluate(
        async (user: TestUser, pod: string) => {
          const fdp = eval(await window.initFdp()) as FairDataProtocol
          await fdp.account.login(user.username, user.password, user.address)
          const podsNoRecursive = await fdp.directory.read(pod, '/', false)
          const noRecursiveDirectories = podsNoRecursive.getDirectories()
          const noRecursiveFiles = podsNoRecursive.getFiles()
          const podsRecursive = await fdp.directory.read(pod, '/', true)
          const recursiveDirectories = podsRecursive.getDirectories()
          const recursiveFiles = podsRecursive.getFiles()
          const subDirs1 = recursiveDirectories[0].getDirectories()
          const subDirs2 = recursiveDirectories[1].getDirectories()

          return {
            podsNoRecursive,
            noRecursiveDirectories,
            noRecursiveFiles,
            podsRecursive,
            recursiveDirectories,
            recursiveFiles,
            subDirs1,
            subDirs2,
          }
        },
        jsonUser,
        pod,
        createDirectories,
      )

      expect(podsNoRecursive.name).toEqual('/')
      expect(podsNoRecursive.content).toHaveLength(2)
      expect(noRecursiveFiles).toHaveLength(0)
      expect(noRecursiveDirectories).toHaveLength(2)
      expect(noRecursiveDirectories[0].name).toEqual('one')
      expect(noRecursiveDirectories[1].name).toEqual('two')
      expect(noRecursiveDirectories[0].content).toHaveLength(0)
      expect(noRecursiveDirectories[1].content).toHaveLength(0)
      expect(podsRecursive.name).toEqual('/')
      expect(podsRecursive.content).toHaveLength(2)
      expect(recursiveFiles).toHaveLength(0)
      expect(recursiveDirectories).toHaveLength(2)
      expect(subDirs1).toHaveLength(1)
      expect(subDirs1[0].name).toEqual('one_1')
      expect(subDirs2).toHaveLength(1)
      expect(subDirs2[0].name).toEqual('two_1')
    })

    it('should create new directory', async () => {
      const fairos = createFairosJs()
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject
      const pod = generateRandomHexString()
      const directoryName = generateRandomHexString()
      const directoryFull = '/' + directoryName
      const directoryName1 = generateRandomHexString()
      const directoryFull1 = '/' + directoryName + '/' + directoryName1

      const { list, directoryInfo, directoryInfo1, subDirectoriesLength } = await page.evaluate(
        async (user: TestUser, pod: string, directoryFull: string, directoryFull1: string) => {
          const fdp = eval(await window.initFdp()) as FairDataProtocol
          eval(await window.shouldFailString())

          await fdp.account.register(user.username, user.password, user.mnemonic)
          await fdp.personalStorage.create(pod)
          await window.shouldFail(fdp.directory.create(pod, directoryFull1), 'Parent directory does not exist')

          await fdp.directory.create(pod, directoryFull)
          await window.shouldFail(
            fdp.directory.create(pod, directoryFull),
            `Directory "${directoryFull}" already uploaded to the network`,
          )
          await fdp.directory.create(pod, directoryFull1)
          await window.shouldFail(
            fdp.directory.create(pod, directoryFull1),
            `Directory "${directoryFull1}" already uploaded to the network`,
          )

          const list = await fdp.directory.read(pod, '/', true)
          const directoryInfo = list.getDirectories()[0]
          const subDirectoriesLength = directoryInfo.getDirectories().length
          const directoryInfo1 = directoryInfo.getDirectories()[0]

          return {
            list,
            directoryInfo,
            directoryInfo1,
            subDirectoriesLength,
          }
        },
        jsonUser,
        pod,
        directoryFull,
        directoryFull1,
      )

      expect(list.content).toHaveLength(1)
      expect(subDirectoriesLength).toEqual(1)
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
      const fairos = createFairosJs()
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject

      const pod = generateRandomHexString()
      const fileSizeSmall = 100
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall

      const { dataSmall, fdpList, fileInfoSmall } = await page.evaluate(
        async (user: TestUser, pod: string, fullFilenameSmallPath: string, contentSmall: string) => {
          const fdp = eval(await window.initFdp()) as FairDataProtocol
          eval(await window.shouldFailString())

          await fdp.account.register(user.username, user.password, user.mnemonic)
          await fdp.personalStorage.create(pod)
          await fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall)
          await window.shouldFail(
            fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall),
            `File "${fullFilenameSmallPath}" already uploaded to the network`,
          )

          const dataSmall = (await fdp.file.downloadData(pod, fullFilenameSmallPath)).text()
          const fdpList = await fdp.directory.read(pod, '/', true)
          const fileInfoSmall = fdpList.getFiles()[0]

          return {
            dataSmall,
            fdpList,
            fileInfoSmall,
          }
        },
        jsonUser,
        pod,
        fullFilenameSmallPath,
        contentSmall,
      )

      expect(dataSmall).toEqual(contentSmall)
      expect(fdpList.content.length).toEqual(1)
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
      const fairos = createFairosJs()
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject
      const pod = generateRandomHexString()
      const incorrectPod = generateRandomHexString()
      const fileSizeBig = 5000005
      const contentBig = generateRandomHexString(fileSizeBig)
      const filenameBig = generateRandomHexString() + '.txt'
      const fullFilenameBigPath = '/' + filenameBig
      const incorrectFullPath = fullFilenameBigPath + generateRandomHexString()

      const { dataBig, fdpList, fileInfoBig } = await page.evaluate(
        async (
          user: TestUser,
          pod: string,
          fullFilenameBigPath: string,
          contentBig: string,
          incorrectPod: string,
          incorrectFullPath: string,
        ) => {
          const fdp = eval(await window.initFdp()) as FairDataProtocol
          eval(await window.shouldFailString())
          await fdp.account.register(user.username, user.password, user.mnemonic)
          await fdp.personalStorage.create(pod)
          await window.shouldFail(
            fdp.file.uploadData(incorrectPod, fullFilenameBigPath, contentBig),
            `Pod "${incorrectPod}" does not exist`,
          )
          await fdp.file.uploadData(pod, fullFilenameBigPath, contentBig)
          await window.shouldFail(fdp.file.downloadData(pod, incorrectFullPath), 'Data not found')
          const dataBig = (await fdp.file.downloadData(pod, fullFilenameBigPath)).text()
          const fdpList = await fdp.directory.read(pod, '/', true)
          const fileInfoBig = fdpList.getFiles()[0]

          return {
            dataBig,
            fdpList,
            fileInfoBig,
          }
        },
        jsonUser,
        pod,
        fullFilenameBigPath,
        contentBig,
        incorrectPod,
        incorrectFullPath,
      )

      expect(dataBig).toEqual(contentBig)
      expect(fdpList.content.length).toEqual(1)
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
