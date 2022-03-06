import { FairdriveProtocol } from '../../src'
import { generateUser } from '../utils'

function createFdp() {
  return new FairdriveProtocol('http://localhost:1633/', 'http://localhost:1635/')
}

jest.setTimeout(200000)
describe('Account', () => {
  const users = {
    debug: generateUser(),
    demo: generateUser(),
  }

  it('should strip trailing slash', () => {
    const fdp = createFdp()
    expect(fdp.accountData.bee.url).toEqual('http://localhost:1633')
  })

  describe('Registration', () => {
    it('register required users', async () => {
      const fdp = createFdp()
      const { debug, demo } = users
      let createdUser = await fdp.userSignup(debug.username, debug.password, debug.mnemonic)
      expect(createdUser.mnemonic).toEqual(debug.mnemonic)
      expect(createdUser.wallet.address).toEqual(debug.address)
      expect(createdUser.encryptedMnemonic).toBeDefined()
      expect(createdUser.reference).toBeDefined()

      createdUser = await fdp.userSignup(demo.username, demo.password, demo.mnemonic)
      expect(createdUser.mnemonic).toEqual(demo.mnemonic)
      expect(createdUser.wallet.address).toEqual(demo.address)
    })
  })

  describe('Login', () => {
    it('should login with existing user and address', async () => {
      const fdp = createFdp()
      const { debug, demo } = users
      expect(fdp.users.debug).toBeUndefined()
      await fdp.userImport(debug.username, debug.address)
      expect(fdp.users[debug.username]).toBeDefined()
      await fdp.userLogin(debug.username, debug.password)

      expect(fdp.users.demo).toBeUndefined()
      await fdp.userImport(demo.username, demo.address)
      expect(fdp.users[demo.username]).toBeDefined()
      await fdp.userLogin(demo.username, demo.password)
    })

    it('should login with existing user and mnemonic', async () => {
      const fdp = createFdp()
      const { debug } = users
      expect(fdp.users.debug).toBeUndefined()
      await fdp.userImport(debug.username, '', debug.mnemonic)
      expect(fdp.users[debug.username]).toBeDefined()
      await fdp.userLogin(debug.username, debug.password)
    })

    it('auth with incorrect data should throw errors', async () => {
      const fdp = createFdp()
      const { debug } = users
      // not imported user
      await expect(fdp.userLogin('zzz', 'zzz')).rejects.toThrow('User is not imported')

      // imported, but incorrect password
      await fdp.userImport(debug.username, debug.address)
      await expect(fdp.userLogin(debug.username, 'debug111')).rejects.toThrow('Incorrect password')

      // imported, but empty password
      await expect(fdp.userLogin(debug.username, '')).rejects.toThrow('Incorrect password')

      // import with address and mnemonic
      await expect(
        fdp.userImport('ttt', '0x1f8f8EC28a1ED657836ADB02bed12C78F05cC8Dc', 'some mnemonic'),
      ).rejects.toThrow('Use only mnemonic or address')

      // import with incorrect mnemonic
      await expect(fdp.userImport('ttt', '', 'some mnemonic')).rejects.toThrow('Incorrect mnemonic')

      // import without address or mnemonic
      await expect(fdp.userImport('ttt', '', '')).rejects.toThrow('Address or mnemonic is required')

      // import without info
      await expect(fdp.userImport('', '', '')).rejects.toThrow('Incorrect username')
    })
  })

  describe('Pods', () => {
    it('get empty pods list', async () => {
      const fdp = createFdp()
      const { debug } = users
      await fdp.userImport(debug.username, '', debug.mnemonic)

      const pods = await fdp.podLs()
      expect(pods).toHaveLength(0)
    })
  })
})
