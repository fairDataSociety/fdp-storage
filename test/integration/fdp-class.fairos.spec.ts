import {
  createFdp,
  createUsableBatch,
  generateRandomHexString,
  generateUser,
  isUsableBatchExists,
  setCachedBatchId,
  topUpAddress,
  topUpFdp,
  waitFairOS,
} from '../utils'
import { FairOSApi } from '../utils/fairos-api'
import { Wallet, utils } from 'ethers'

jest.setTimeout(400000)
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

  it('should create pods in fdp and list them in fairos', async () => {
    const fairos = new FairOSApi()
    const fdp = createFdp()
    const user = generateUser(fdp)
    const podName1 = generateRandomHexString()
    const podName2 = generateRandomHexString()
    await topUpFdp(fdp)
    await fdp.account.register(user.username, user.password)
    await fdp.personalStorage.create(podName1)
    await fairos.login(user.username, user.password)
    const response = await fairos.podLs()
    expect(response.status).toEqual(200)
    expect(response.data).toStrictEqual({
      pod_name: [podName1],
      shared_pod_name: [],
    })

    await fdp.personalStorage.create(podName2)
    const response2 = await fairos.podLs()
    expect(response2.status).toEqual(200)
    expect(response2.data).toStrictEqual({
      pod_name: [podName1, podName2],
      shared_pod_name: [],
    })
  })

  it('should create pods in fairos and list them in fdp', async () => {
    const fairos = new FairOSApi()
    const fdp = createFdp()
    const user = generateUser()
    const podName1 = generateRandomHexString()
    const podName2 = generateRandomHexString()
    const podName3 = generateRandomHexString()
    await topUpAddress(fdp.ens, user.address)

    await fairos.register(user.username, user.password, user.mnemonic)
    const createResponse = await fairos.podNew(podName1, user.password)
    expect(createResponse.status).toEqual(201)
    expect(createResponse.data).toStrictEqual({ message: 'pod created successfully' })

    await fdp.account.login(user.username, user.password)
    const fdpResponse = await fdp.personalStorage.list()
    expect(fdpResponse).toEqual({ pods: [{ name: podName1, index: 1 }], sharedPods: [] })

    await fairos.podNew(podName2, user.password)
    const fdpResponse2 = await fdp.personalStorage.list()
    expect(fdpResponse2).toEqual({
      pods: [
        { name: podName1, index: 1 },
        { name: podName2, index: 2 },
      ],
      sharedPods: [],
    })

    await fdp.personalStorage.create(podName3)
    const response2 = await fairos.podLs()
    expect(response2.status).toEqual(200)
    const pods = response2.data.pod_name
    // sometimes pods return in different order, so they couldn't be strictly compared
    expect(pods).toHaveLength(3)
    expect(pods).toContain(podName1)
    expect(pods).toContain(podName2)
    expect(pods).toContain(podName3)
  })
})
