import { FairdriveProtocol } from '../../src'

function createFdp() {
  return new FairdriveProtocol('http://localhost:1633/')
}

jest.setTimeout(200000)
describe('Account', () => {
  it('should strip trailing slash', () => {
    const fdp = createFdp()
    expect(fdp.bee.url).toEqual('http://localhost:1633')
  })

  describe('Login', () => {
    it('should login with existing user and address', async () => {
      const fdp = createFdp()
      expect(fdp.users.debug).toBeUndefined()
      await fdp.userImport('debug', '0xDd1AB1bA447D4D89A49d01386dbef99fB1005ED2')
      expect(fdp.users.debug).toBeDefined()
      await fdp.userLogin('debug', 'debug')

      expect(fdp.users.demo).toBeUndefined()
      await fdp.userImport('demo', '0xF68FAcaEFc7DBc486a07B9a8f26a5085B3e74eb3')
      expect(fdp.users.demo).toBeDefined()
      await fdp.userLogin('demo', 'demo')
    })

    it('should login with existing user and mnemonic', async () => {
      const fdp = createFdp()

      expect(fdp.users.debug).toBeUndefined()
      await fdp.userImport('debug', '', 'home tragic shoe fun planet false imitate raven sword tool purchase mouse')
      expect(fdp.users.debug).toBeDefined()
      await fdp.userLogin('debug', 'debug')
    })

    it('auth with incorrect data should throw errors', async () => {
      const fdp = createFdp()
      // not imported user
      await expect(fdp.userLogin('zzz', 'zzz')).rejects.toThrow('User is not imported')

      // imported, but incorrect password
      await fdp.userImport('debug', '0xDd1AB1bA447D4D89A49d01386dbef99fB1005ED2')
      await expect(fdp.userLogin('debug', 'debug111')).rejects.toThrow('Incorrect password')

      // imported, but empty password
      await expect(fdp.userLogin('debug', '')).rejects.toThrow('Empty password')

      // import with address and mnemonic
      await expect(
        fdp.userImport('ttt', '0xDd1AB1bA447D4D89A49d01386dbef99fB1005ED2', 'some mnemonic'),
      ).rejects.toThrow('Use only mnemonic or address')

      // import with incorrect mnemonic
      await expect(fdp.userImport('ttt', '', 'some mnemonic')).rejects.toThrow('Incorrect mnemonic')

      // import without address or mnemonic
      await expect(fdp.userImport('ttt', '', '')).rejects.toThrow('Address or mnemonic is required')

      // import without info
      await expect(fdp.userImport('', '', '')).rejects.toThrow('Username is required')
    })

    it('signup', async () => {
      const fdp = createFdp()
      const user = {
        username: 'test000000000',
        password: 'aaa',
      }

      const userInfo = await fdp.userSignup(user.username, user.password)
      expect(userInfo).toBeDefined()
      expect(userInfo.wallet).toBeDefined()
      expect(userInfo.mnemonic).toBeDefined()
      expect(userInfo.encryptedMnemonic).toBeDefined()
      expect(userInfo.reference).toBeDefined()
      fdp.userImport(user.username, userInfo.wallet.address)
      await fdp.userLogin(user.username, user.password)
    })
  })
})
