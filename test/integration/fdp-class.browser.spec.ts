import { join } from 'path'
import { beeDebugUrl, beeUrl, generateUser } from '../utils'

jest.setTimeout(200000)
describe('Fair Data Protocol class - in browser', () => {
  const users = {
    debug: generateUser(),
    demo: generateUser(),
  }
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
        const accountData = new window.FairDataProtocol.FairDataProtocol(BEE_URL, BEE_DEBUG_URL).accountData

        return {
          beeUrl: accountData.bee.url,
          beeDebugUrl: accountData.beeDebug.url,
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
      const usersList = [users.debug, users.demo]
      const createdUsers = await page.evaluate(
        async (BEE_URL, BEE_DEBUG_URL, users) => {
          users = JSON.parse(users)
          const fdp = new window.FairDataProtocol.FairDataProtocol(BEE_URL, BEE_DEBUG_URL)
          const result = []
          for (const user of users) {
            const data = await fdp.userSignup(user.username, user.password, user.mnemonic)
            result.push(data)

            await fdp.userImport(user.username, '', user.mnemonic)
            await fdp.userLogin(user.username, user.password)
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
  })
})
