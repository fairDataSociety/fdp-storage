import { Pod, PodReceiveOptions, PodShareInfo, PodsList, PodsListPrepared, SharedPod } from './types'
import { assertAccount } from '../account/utils'
import { AccountData } from '../account/account-data'
import {
  assertPod,
  assertPodName,
  assertPodsLength,
  assertSharedPod,
  createPod,
  createPodShareInfo,
  getSharedPodInfo,
  podListToBytes,
  podListToJSON,
  podPreparedToPod,
  podsListPreparedToPodsList,
  sharedPodPreparedToSharedPod,
  uploadPodDataV2,
} from './utils'
import { getExtendedPodsList } from './api'
import { uploadBytes } from '../file/utils'
import { stringToBytes } from '../utils/bytes'
import { Reference, Utils } from '@ethersphere/bee-js'
import { assertEncryptedReference, EncryptedReference } from '../utils/hex'
import { prepareEthAddress } from '../utils/wallet'
import { getCacheKey, setEpochCache } from '../cache/utils'
import { getPodsList } from './cache/api'
import { getNextEpoch } from '../feed/lookup/utils'

export class PersonalStorage {
  constructor(private accountData: AccountData) {}

  /**
   * Gets the list of pods for the active account
   *
   * Account is required, postage batch id is not required
   *
   * @returns list of pods
   */
  async list(): Promise<PodsList> {
    assertAccount(this.accountData)

    let podsList: PodsListPrepared = {
      pods: [],
      sharedPods: [],
    }

    try {
      podsList = (
        await getPodsList(this.accountData, this.accountData.connection.bee, this.accountData.wallet!, {
          requestOptions: this.accountData.connection.options?.requestOptions,
          cacheInfo: this.accountData.connection.cacheInfo,
        })
      ).podsList
      // eslint-disable-next-line no-empty
    } catch (e) {}

    return podsListPreparedToPodsList(podsList)
  }

  /**
   * Creates new pod with passed name
   *
   * Account and postage batch id are required
   *
   * @param name pod name
   */
  async create(name: string): Promise<Pod> {
    assertAccount(this.accountData, { writeRequired: true })

    const pod = await createPod(
      this.accountData,
      this.accountData.connection,
      this.accountData.wallet!,
      this.accountData.seed!,
      {
        name,
      },
    )

    assertPod(pod)

    return podPreparedToPod(pod)
  }

  /**
   * Deletes pod with passed name
   *
   * Account and postage batch id are required
   *
   * @param name pod name
   */
  async delete(name: string): Promise<void> {
    assertAccount(this.accountData, { writeRequired: true })
    name = name.trim()
    const podsInfo = await getPodsList(this.accountData, this.accountData.connection.bee, this.accountData.wallet!, {
      requestOptions: this.accountData.connection.options?.requestOptions,
      cacheInfo: this.accountData.connection.cacheInfo,
    })

    assertPodsLength(podsInfo.podsList.pods.length)
    const pod = podsInfo.podsList.pods.find(item => item.name === name)

    if (!pod) {
      throw new Error(`Pod "${name}" does not exist`)
    }

    const podsFiltered = podsInfo.podsList.pods.filter(item => item.name !== name)
    const podsSharedFiltered = podsInfo.podsList.sharedPods.filter(item => item.name !== name)
    const allPodsData = podListToBytes(podsFiltered, podsSharedFiltered)
    const wallet = this.accountData.wallet!
    const epoch = getNextEpoch(podsInfo.epoch)
    await uploadPodDataV2(this.accountData, allPodsData)
    await setEpochCache(this.accountData.connection.cacheInfo, getCacheKey(wallet.address), {
      epoch,
      data: podListToJSON(podsFiltered, podsSharedFiltered),
    })
  }

  /**
   * Shares pod information
   *
   * Account and postage batch id are required
   *
   * @param name pod name
   *
   * @returns swarm reference of shared metadata about pod
   */
  async share(name: string): Promise<Reference> {
    assertAccount(this.accountData, { writeRequired: true })
    assertPodName(name)
    const wallet = this.accountData.wallet!
    const address = prepareEthAddress(wallet.address)
    const podInfo = await getExtendedPodsList(
      this.accountData,
      this.accountData.connection.bee,
      name,
      wallet,
      this.accountData.seed!,
      {
        requestOptions: this.accountData.connection.options?.requestOptions,
        cacheInfo: this.accountData.connection.cacheInfo,
      },
    )

    const data = stringToBytes(
      JSON.stringify(createPodShareInfo(name, podInfo.podAddress, address, podInfo.pod.password)),
    )

    return (await uploadBytes(this.accountData.connection, data)).reference
  }

  /**
   * Gets shared pod information
   *
   * Account and postage batch id are not required
   *
   * @param reference swarm reference with shared pod information
   *
   * @returns shared pod information
   */
  async getSharedInfo(reference: string | EncryptedReference): Promise<PodShareInfo> {
    assertEncryptedReference(reference)

    return getSharedPodInfo(this.accountData.connection.bee, reference)
  }

  /**
   * Receive and save shared pod information to user's account
   *
   * Account and postage batch id are required
   *
   * @param reference swarm reference with shared pod information
   * @param options options for receiving pod
   *
   * @returns shared pod information
   */
  async saveShared(reference: string | EncryptedReference, options?: PodReceiveOptions): Promise<SharedPod> {
    assertAccount(this.accountData, { writeRequired: true })
    assertEncryptedReference(reference)

    const data = await this.getSharedInfo(reference)

    const pod = await createPod(
      this.accountData,
      this.accountData.connection,
      this.accountData.wallet!,
      this.accountData.seed!,
      {
        name: options?.name ?? data.podName,
        address: prepareEthAddress(data.podAddress),
        password: Utils.hexToBytes(data.password),
      },
    )

    assertSharedPod(pod)

    return sharedPodPreparedToSharedPod(pod)
  }
}
