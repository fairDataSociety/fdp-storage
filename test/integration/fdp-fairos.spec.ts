import {
  createFdp,
  createUsableBatch,
  generateUser,
  isUsableBatchExists,
  setCachedBatchId,
  topUpAddress,
  topUpFdp,
  waitFairOS,
} from '../utils'
import { FairOSApi } from '../utils/fairos-api'
import { Wallet, utils } from 'ethers'

jest.setTimeout(200000)
describe('Fair Data Protocol with FairOS-dfs', () => {
  beforeAll(async () => {
    const batchId = await createUsableBatch()
    setCachedBatchId(batchId)

    await waitFairOS()
  })

  it('check default batch usability', async () => {
    expect(await isUsableBatchExists()).toBe(true)
  })

  it('should register in fdp and login in fairos', async () => {
    const fairos = new FairOSApi()
    const fdp = createFdp()
    const user = generateUser(fdp)
    await topUpFdp(fdp)
    const nameHash = utils.namehash(`${user.username}.fds`)
    const publicKey = Wallet.fromMnemonic(user.mnemonic).publicKey.replace('0x', '')
    await fdp.account.register(user.username, user.password)
    const response = await fairos.login(user.username, user.password)
    expect(response.status).toEqual(200)
    expect(response.data).toStrictEqual({
      address: user.address,
      name_hash: nameHash,
      public_key: publicKey,
      message: 'user logged-in successfully',
    })
  })

  it('should register in fairos and login in fdp', async () => {
    const fairos = new FairOSApi()
    const fdp = createFdp()
    const user = generateUser()
    const nameHash = utils.namehash(`${user.username}.fds`)
    const publicKey = Wallet.fromMnemonic(user.mnemonic).publicKey.replace('0x', '')
    await topUpAddress(fdp.ens, user.address)

    const response = await fairos.register(user.username, user.password, user.mnemonic)
    expect(response.status).toEqual(201)
    expect(response.data).toStrictEqual({
      address: user.address,
      name_hash: nameHash,
      public_key: publicKey,
      message: 'user signed-up successfully',
    })

    const data = await fdp.account.login(user.username, user.password)
    expect(data.address).toEqual(user.address)
  })
})
