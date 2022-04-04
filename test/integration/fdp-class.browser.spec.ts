import { join } from 'path'
import { beeDebugUrl, beeUrl, generateUser } from '../utils'
import '../../src/index'

jest.setTimeout(200000)
describe('Fair Data Protocol class - in browser', () => {
  const BEE_URL = beeUrl()
  const BEE_DEBUG_URL = beeDebugUrl()

  beforeAll(async () => {
    await jestPuppeteer.resetPage()
    const testPage = join(__dirname, '..', 'testpage', 'testpage.html')
    await page.goto(`file://${testPage}`)
  })

  it('should create a new FDP instance in browser', async () => {
    const urls = await page.evaluate(
      (BEE_URL, BEE_DEBUG_URL) => {
        const fdp = new window.fdp.FairDataProtocol(BEE_URL, BEE_DEBUG_URL)

        return {
          beeUrl: fdp.connection.bee.url,
          beeDebugUrl: fdp.connection.beeDebug.url,
        }
      },
      BEE_URL,
      BEE_DEBUG_URL,
    )

    expect(urls.beeUrl).toBe(BEE_URL)
    expect(urls.beeDebugUrl).toBe(BEE_DEBUG_URL)
  })

  describe('Registration', () => {
    it('register required users', async () => {
      const usersList = [generateUser(), generateUser()]
      const createdUsers = await page.evaluate(
        async (BEE_URL, BEE_DEBUG_URL, users) => {
          users = JSON.parse(users)
          const fdp = new window.fdp.FairDataProtocol(BEE_URL, BEE_DEBUG_URL)
          const result = []
          for (const user of users) {
            const data = await fdp.account.register(user.username, user.password, user.mnemonic)
            result.push(data)

            await fdp.account.import(user.username, user.mnemonic)
            await fdp.account.login(user.username, user.password)
          }

          return result
        },
        BEE_URL,
        BEE_DEBUG_URL,
        JSON.stringify(usersList),
      )

      for (const [index, createdUser] of createdUsers.entries()) {
        const user = usersList[index]
        expect(createdUser.mnemonic).toEqual(user.mnemonic)
        expect(createdUser.wallet.address).toEqual(user.address)
        expect(createdUser.encryptedMnemonic).toBeDefined()
        expect(createdUser.reference).toBeDefined()
      }
    })

    it('register already registered user', async () => {
      await page.evaluate(
        async (BEE_URL, BEE_DEBUG_URL, data) => {
          const user = JSON.parse(data)
          const fdp = new window.fdp.FairDataProtocol(BEE_URL, BEE_DEBUG_URL)

          await fdp.account.register(user.username, user.password, user.mnemonic)
          fdp.account.removeUserAddress(user.username)
          try {
            await fdp.account.register(user.username, user.password, user.mnemonic)
            fail('Signup should fail with the same username')
          } catch (e) {
            if (e instanceof Error && e.message === 'User already exists') {
              return
            }

            throw e
          }
        },
        BEE_URL,
        BEE_DEBUG_URL,
        JSON.stringify(generateUser()),
      )
    })

    it('register already imported user', async () => {
      await page.evaluate(
        async (BEE_URL, BEE_DEBUG_URL, data) => {
          const user = JSON.parse(data)
          const fdp = new window.fdp.FairDataProtocol(BEE_URL, BEE_DEBUG_URL)

          await fdp.account.setUserAddress(user.username, user.address)
          try {
            await fdp.account.register(user.username, user.password, user.mnemonic)
            fail('Signup should fail')
          } catch (e) {
            if (e instanceof Error && e.message === 'User already imported') {
              return
            }

            throw e
          }
        },
        BEE_URL,
        BEE_DEBUG_URL,
        JSON.stringify(generateUser()),
      )
    })
  })
})
