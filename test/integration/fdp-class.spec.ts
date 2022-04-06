import { FairDataProtocol } from '../../src'
import { beeDebugUrl, beeUrl, fairosJsUrl, generateRandomHexString, generateUser } from '../utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import FairosJs from '@fairdatasociety/fairos-js'
import { prepareEthAddress } from '../utils'

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

  describe('Registration', () => {
    it('should register users', async () => {
      const fairos = createFairosJs()
      const fdp = createFdp()

      for (const user of [generateUser(), generateUser()]) {
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
      const user = generateUser()

      await fdp.account.register(user.username, user.password, user.mnemonic)
      expect(fdp.account.usernameToAddress[user.username]).toEqual(prepareEthAddress(user.address))
      await fdp.account.setUserAddress(user.username, user.address)
      await fdp.account.login(user.username, user.password)

      // login with one line
      const fdp1 = createFdp()
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

      // not exists username
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
      for (let i = 0; i < 10; i++) {
        pods.push(generateRandomHexString())
      }

      await fairos.userSignup(user.username, user.password, user.mnemonic)
      await fdp.account.setUserAddress(user.username, user.address)
      await fdp.account.login(user.username, user.password)

      for (const podName of pods) {
        const podData = (await fairos.podNew(podName, user.password)).data
        expect(podData.code).toEqual(201)
      }

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
})
