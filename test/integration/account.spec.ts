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
      await fdp.userImport('debug', '0x1f8f8EC28a1ED657836ADB02bed12C78F05cC8Dc')
      expect(fdp.users.debug).toBeDefined()
      await fdp.userLogin('debug', 'debug')

      expect(fdp.users.demo).toBeUndefined()
      await fdp.userImport('demo', '0x9E8A6709eD1E58FA2241E7ea70308A37bbEc3B7B')
      expect(fdp.users.demo).toBeDefined()
      await fdp.userLogin('demo', 'demo')
    })

    it('should login with existing user and mnemonic', async () => {
      const fdp = createFdp()

      expect(fdp.users.debug).toBeUndefined()
      await fdp.userImport(
        'debug',
        '',
        'never umbrella juice enable mask industry leopard media hybrid tornado wrong behave',
      )
      expect(fdp.users.debug).toBeDefined()
      await fdp.userLogin('debug', 'debug')
    })

    it('auth with incorrect data should throw errors', async () => {
      const fdp = createFdp()
      // not imported user
      await expect(fdp.userLogin('zzz', 'zzz')).rejects.toThrow('User is not imported')

      // imported, but incorrect password
      await fdp.userImport('debug', '0x1f8f8EC28a1ED657836ADB02bed12C78F05cC8Dc')
      await expect(fdp.userLogin('debug', 'debug111')).rejects.toThrow('Incorrect password')

      // imported, but empty password
      await expect(fdp.userLogin('debug', '')).rejects.toThrow('Incorrect password')

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
      await fdp.userImport(user.username, userInfo.wallet.address)
      await fdp.userLogin(user.username, user.password)
    })

    it('Pod ls', async () => {
      const fdp = createFdp()

      const pods = await fdp.podLs()
      expect(pods).toHaveLength(50)
    })
  })
})
