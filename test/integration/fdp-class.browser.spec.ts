import { join } from 'path'
import {
  beeDebugUrl,
  beeUrl,
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

const GET_FEED_DATA_TIMEOUT = 100

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

      let i = 0
      for (const createdUser of createdUsers) {
        const user = usersList[i] as unknown as TestUser
        expect(createdUser.mnemonic).toEqual(user.mnemonic)
        expect(createdUser.wallet.address).toEqual(user.address)
        expect(createdUser.encryptedMnemonic).toBeDefined()
        expect(createdUser.reference).toBeDefined()
        await fairos.userImport(user.username, user.password, '', user.address)
        await fairos.userLogin(user.username, user.password)
        i++
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

      const result = await page.evaluate(async (user: TestUser) => {
        const fdp = eval(await window.initFdp()) as FairDataProtocol

        await fdp.account.register(user.username, user.password, user.mnemonic)

        return await fdp.personalStorage.list()
      }, jsonUser)

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
})
