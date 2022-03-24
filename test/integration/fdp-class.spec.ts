import { FairDataProtocol } from '../../src'
import { beeDebugUrl, beeUrl, fairosJsUrl, generateHexString, generateUser } from '../utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import FairosJs from '@fairdatasociety/fairos-js'

function createFdp() {
  return new FairDataProtocol(beeUrl(), beeDebugUrl())
}

function createFairosJs() {
  return new FairosJs(fairosJsUrl())
}

jest.setTimeout(200000)
describe('Fair Data Protocol class', () => {
  const users = {
    debug: generateUser(),
    demo: generateUser(),
  }

  it('should strip trailing slash', () => {
    const fdp = new FairDataProtocol('http://localhost:1633/', 'http://localhost:1635/')
    expect(fdp.bee.url).toEqual('http://localhost:1633')
    expect(fdp.beeDebug.url).toEqual('http://localhost:1635')
  })

  describe('Registration', () => {
    it('register required users', async () => {
      const fairos = createFairosJs()
      const fdp = createFdp()
      const { debug, demo } = users

      for (const user of [debug, demo]) {
        const createdUser = await fdp.account.register(user.username, user.password, user.mnemonic)
        expect(createdUser.mnemonic).toEqual(user.mnemonic)
        expect(createdUser.wallet.address).toEqual(user.address)
        expect(createdUser.encryptedMnemonic).toBeDefined()
        expect(createdUser.reference).toBeDefined()
        await fairos.userImport(user.username, user.password, '', user.address)
        await fairos.userLogin(user.username, user.password)
      }
    })

    it('register already registered user', async () => {
      const fdp = createFdp()
      const user = generateUser()

      await fdp.account.register(user.username, user.password, user.mnemonic)
      fdp.account.removeUserAddress(user.username)
      await expect(fdp.account.register(user.username, user.password, user.mnemonic)).rejects.toThrow(
        'User already exists',
      )
    })

    it('register already imported user', async () => {
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
      const { debug, demo } = users
      expect(fdp.account.usernameToAddress[debug.username]).toBeUndefined()
      await fdp.account.setUserAddress(debug.username, debug.address)
      expect(fdp.account.usernameToAddress[debug.username]).toBeDefined()
      await fdp.account.login(debug.username, debug.password)

      expect(fdp.account.usernameToAddress[demo.username]).toBeUndefined()
      await fdp.account.setUserAddress(demo.username, demo.address)
      expect(fdp.account.usernameToAddress[demo.username]).toBeDefined()
      await fdp.account.login(demo.username, demo.password)
    })

    it('should login with existing user and mnemonic', async () => {
      const fdp = createFdp()
      const { debug } = users
      expect(fdp.account.usernameToAddress[debug.username]).toBeUndefined()
      await fdp.account.import(debug.username, debug.mnemonic)
      expect(fdp.account.usernameToAddress[debug.username]).toBeDefined()
      await fdp.account.login(debug.username, debug.password)
    })

    it('auth with incorrect data should throw errors', async () => {
      const fdp = createFdp()
      const { debug } = users

      // not imported user
      const failUsername = 'zzz'
      await expect(fdp.account.login(failUsername, 'zzz')).rejects.toThrow(
        `No address linked to the username "${failUsername}"`,
      )

      // imported, but incorrect password
      await fdp.account.setUserAddress(debug.username, debug.address)
      await expect(fdp.account.login(debug.username, 'debug111')).rejects.toThrow('Incorrect password')

      // imported, but empty password
      await expect(fdp.account.login(debug.username, '')).rejects.toThrow('Incorrect password')

      // import with incorrect mnemonic
      await expect(fdp.account.import('ttt', 'some mnemonic')).rejects.toThrow('Incorrect mnemonic')

      // import with empty username and mnemonic
      await expect(fdp.account.import('', '')).rejects.toThrow('Incorrect username')
    })
  })

  describe('Pods', () => {
    it('get empty pods list', async () => {
      const fdp = createFdp()
      const { debug } = users
      await fdp.account.import(debug.username, debug.mnemonic)

      const pods = await fdp.personalStorage.list()
      expect(pods).toHaveLength(0)
    })

    it('create pods and get list of them', async () => {
      const fdp = createFdp()
      const fairos = createFairosJs()
      const user = generateUser()
      const pods = []
      for (let i = 0; i < 10; i++) {
        pods.push(generateHexString())
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
  })
})
