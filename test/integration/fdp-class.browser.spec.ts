import { join } from 'path'
import { beeDebugUrl, beeUrl, createFdp, fdpOptions, generateRandomHexString, generateUser, TestUser } from '../utils'
import '../../src/index'
import '../index'
import { JSONArray, JSONObject } from 'puppeteer'
import { FdpStorage } from '../../src'
import { MAX_POD_NAME_LENGTH } from '../../src/pod/utils'
import { createUserV1 } from '../../src/account/account'
import { Wallet } from 'ethers'

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
      (): string =>
        `window.shouldFail = async (
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
        };

        window.topUpAddress = async (fdp) => {
            if (!fdp.account.wallet?.address) {
              throw new Error('Address is not defined')
            }

            const account = (await fdp.ens.provider.listAccounts())[0]
            await fdp.ens.provider.send('eth_sendTransaction', [
              {
                from: account,
                to: fdp.account.wallet.address,
                value: '10000000000000000', // 0.01 ETH
              },
            ])

            await fdp.ens.provider.send('evm_mine', [1])
        }

        new window.fdp.FdpStorage('${BEE_URL}', '${BEE_DEBUG_URL}', ${JSON.stringify(fdpOptions)})`,
    )
  })

  it('should strip trailing slash', async () => {
    const urls = await page.evaluate(async () => {
      const fdp = new window.fdp.FdpStorage('http://localhost:1633/', 'http://localhost:1635/')

      return {
        beeUrl: fdp.connection.bee.url,
        beeDebugUrl: fdp.connection.beeDebug.url,
      }
    })

    expect(urls.beeUrl).toBe('http://localhost:1633')
    expect(urls.beeDebugUrl).toBe('http://localhost:1635')
  })

  describe('Registration', () => {
    it('should create account wallet', async () => {
      const result = await page.evaluate(async () => {
        const fdp = eval(await window.initFdp()) as FdpStorage

        const wallet = fdp.account.createWallet()
        await window.shouldFail((async () => fdp.account.createWallet())(), 'Wallet already created')

        return { address: wallet.address, privateKey: wallet.privateKey }
      })

      expect(result.address).toBeDefined()
      expect(result.privateKey).toBeDefined()
    })

    it('should fail on zero balance', async () => {
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject

      await page.evaluate(async user => {
        const fdp = eval(await window.initFdp()) as FdpStorage

        fdp.account.createWallet()
        await window.shouldFail(fdp.account.register(user.username, user.password), 'Not enough funds')
      }, jsonUser)
    })

    it('should register users', async () => {
      const usersList = [generateUser(), generateUser()] as unknown as JSONArray
      const createdUsers = await page.evaluate(async users => {
        const fdp = eval(await window.initFdp()) as FdpStorage

        await window.shouldFail(
          fdp.account.register('username', 'password'),
          'Before registration, an active account must be set',
        )

        const result = []
        for (const user of users) {
          const fdp = eval(await window.initFdp()) as FdpStorage

          fdp.account.createWallet()
          await window.topUpAddress(fdp)
          const data = await fdp.account.register(user.username, user.password)
          result.push({
            address: data.address,
          })

          await fdp.account.login(user.username, user.password)
        }

        return result
      }, usersList)

      for (const createdUser of createdUsers) {
        expect(createdUser.address).toBeDefined()
      }
    })

    it('should throw when registering already registered user', async () => {
      await page.evaluate(async (user: TestUser) => {
        const fdp = eval(await window.initFdp()) as FdpStorage
        fdp.account.createWallet()
        await window.topUpAddress(fdp)

        await fdp.account.register(user.username, user.password)
        await window.shouldFail(fdp.account.register(user.username, user.password), 'User account already uploaded')
      }, generateUser() as unknown as JSONObject)
    })

    it('should migrate v1 user to v2', async () => {
      const fdp = createFdp()
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject
      await createUserV1(fdp.connection, user.username, user.password, user.mnemonic)

      const result = await page.evaluate(async (user: TestUser) => {
        const fdp = eval(await window.initFdp()) as FdpStorage
        fdp.account.setActiveAccount(Wallet.fromMnemonic(user.mnemonic))
        await window.topUpAddress(fdp)

        await fdp.account.migrate(user.username, user.password, {
          mnemonic: user.mnemonic,
        })
        const loggedWallet = await fdp.account.login(user.username, user.password)
        await window.shouldFail(fdp.account.register(user.username, user.password), 'User account already uploaded')

        return { address: loggedWallet.address }
      }, jsonUser)

      expect(result.address).toEqual(user.address)
    })
  })

  describe('Login', () => {
    it('should login with existing user', async () => {
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject
      const answer = await page.evaluate(async (user: TestUser) => {
        const result = {} as {
          result1: { address: string }
          result2: { address: string }
          createdWallet: { address: string }
        }
        const fdp = eval(await window.initFdp()) as FdpStorage
        const fdp1 = eval(await window.initFdp()) as FdpStorage
        const wallet = fdp.account.createWallet()
        result.createdWallet = { address: wallet.address }
        await window.topUpAddress(fdp)

        let data = await fdp.account.register(user.username, user.password)
        result.result1 = { address: data.address }

        data = await fdp1.account.login(user.username, user.password)
        result.result2 = { address: data.address }

        return result
      }, jsonUser)

      expect(answer.result1.address).toEqual(answer.createdWallet.address)
      expect(answer.result2.address).toEqual(answer.createdWallet.address)
    })

    it('should throw when username is not registered', async () => {
      const user = generateUser()
      const jsonFakeUser = user as unknown as JSONObject

      await page.evaluate(async (fakeUser: TestUser) => {
        const fdp = eval(await window.initFdp()) as FdpStorage

        await window.shouldFail(
          fdp.account.login(fakeUser.username, fakeUser.password),
          `Username "${fakeUser.username}" does not exists`,
        )
      }, jsonFakeUser)
    })

    it('should throw when password is not correct', async () => {
      const user = generateUser()
      const user1 = generateUser()
      const jsonUser = user as unknown as JSONObject
      const jsonUser1 = user1 as unknown as JSONObject

      await page.evaluate(
        async (user: TestUser, user1: TestUser) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          fdp.account.createWallet()
          await window.topUpAddress(fdp)

          await fdp.account.register(user.username, user.password)

          await window.shouldFail(fdp.account.login(user.username, user1.password), 'Incorrect password')
          await window.shouldFail(fdp.account.login(user.username, ''), 'Incorrect password')
        },
        jsonUser,
        jsonUser1,
      )
    })
  })

  describe('Pods', () => {
    it('should get empty pods list', async () => {
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject
      const answer = await page.evaluate(async (user: TestUser) => {
        const fdp = eval(await window.initFdp()) as FdpStorage
        fdp.account.createWallet()
        await window.topUpAddress(fdp)

        await fdp.account.register(user.username, user.password)

        return await fdp.personalStorage.list()
      }, jsonUser)

      expect(answer).toEqual([])
    })

    it('should create pods with fdp', async () => {
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject
      const longPodName = generateRandomHexString(MAX_POD_NAME_LENGTH + 1)
      const commaPodName = generateRandomHexString() + ', ' + generateRandomHexString()

      const result = await page.evaluate(
        async (user: TestUser, longPodName: string, commaPodName: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          fdp.account.createWallet()
          await window.topUpAddress(fdp)

          await fdp.account.register(user.username, user.password)

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

      const examples = [
        { name: generateRandomHexString(), index: 1 },
        { name: generateRandomHexString(), index: 2 },
        { name: generateRandomHexString(), index: 3 },
        { name: generateRandomHexString(), index: 4 },
        { name: generateRandomHexString(), index: 5 },
      ]

      const result1 = await page.evaluate(
        async (user: TestUser, examples: JSONArray) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          const iterations = []
          await fdp.account.login(user.username, user.password)
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

      for (let i = 0; result1.length > i; i++) {
        const item = result1[i]
        expect(item.result).toEqual(item.example)
      }
    })

    it('should delete pods', async () => {
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject

      await page.evaluate(async (user: TestUser) => {
        const fdp = eval(await window.initFdp()) as FdpStorage
        fdp.account.createWallet()
        await window.topUpAddress(fdp)

        await fdp.account.register(user.username, user.password)
        await fdp.account.login(user.username, user.password)
      }, jsonUser)

      const podName = generateRandomHexString()
      const podName1 = generateRandomHexString()
      const notExistsPod = generateRandomHexString()

      let list = await page.evaluate(
        async (user: TestUser, podName: string, podName1: string, notExistsPod: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage

          await fdp.account.login(user.username, user.password)
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

      list = await page.evaluate(
        async (user: TestUser, podName: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage

          await fdp.account.login(user.username, user.password)
          await fdp.personalStorage.delete(podName)

          return await fdp.personalStorage.list()
        },
        jsonUser,
        podName,
      )

      expect(list).toHaveLength(1)

      list = await page.evaluate(
        async (user: TestUser, podName: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage

          await fdp.account.login(user.username, user.password)
          await fdp.personalStorage.delete(podName)

          return await fdp.personalStorage.list()
        },
        jsonUser,
        podName1,
      )

      expect(list).toHaveLength(0)
    })
  })

  describe('Directory', () => {
    it('should create new directory', async () => {
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject
      const pod = generateRandomHexString()
      const directoryName = generateRandomHexString()
      const directoryFull = '/' + directoryName
      const directoryName1 = generateRandomHexString()
      const directoryFull1 = '/' + directoryName + '/' + directoryName1

      const { list, directoryInfo, directoryInfo1, subDirectoriesLength } = await page.evaluate(
        async (user: TestUser, pod: string, directoryFull: string, directoryFull1: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          fdp.account.createWallet()
          await window.topUpAddress(fdp)

          await fdp.account.register(user.username, user.password)
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
    })
  })

  describe('File', () => {
    it('should upload small text data as a file', async () => {
      const user = generateUser()
      const jsonUser = user as unknown as JSONObject

      const pod = generateRandomHexString()
      const fileSizeSmall = 100
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall

      const { dataSmall, fdpList, fileInfoSmall } = await page.evaluate(
        async (user: TestUser, pod: string, fullFilenameSmallPath: string, contentSmall: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          fdp.account.createWallet()
          await window.topUpAddress(fdp)

          await fdp.account.register(user.username, user.password)
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
    })

    it('should upload big text data as a file', async () => {
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
          const fdp = eval(await window.initFdp()) as FdpStorage
          fdp.account.createWallet()
          await window.topUpAddress(fdp)

          await fdp.account.register(user.username, user.password)
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
    })
  })
})
