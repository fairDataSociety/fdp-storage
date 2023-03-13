import { SharedPod, PodReceiveOptions, PodShareInfo, PodsList, Pod, PodsListPrepared } from './types'
import { assertAccount } from '../account/utils'
import { writeFeedData } from '../feed/api'
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
  podsListPreparedToPodsList,
  podPreparedToPod,
  sharedPodPreparedToSharedPod,
  podListToJSON,
} from './utils'
import { getExtendedPodsList } from './api'
import { uploadBytes } from '../file/utils'
import { stringToBytes } from '../utils/bytes'
import { Reference, Utils } from '@ethersphere/bee-js'
import { assertEncryptedReference, EncryptedReference } from '../utils/hex'
import { prepareEthAddress, preparePrivateKey } from '../utils/wallet'
import { getCacheKey, setEpochCache } from '../cache/utils'
import { getPodsList } from './cache/api'
import { getNextEpoch } from '../feed/lookup/utils'

export const POD_TOPIC = 'Pods'

export class PersonalStorage {
  constructor(private accountData: AccountData) {}

  /**
   * Gets the list of pods for the active account
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
        await getPodsList(this.accountData.connection.bee, this.accountData.wallet!, {
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
   * @param name pod name
   */
  async create(name: string): Promise<Pod> {
    assertAccount(this.accountData)

    const pod = await createPod(
      this.accountData.connection.bee,
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
   * @param name pod name
   */
  async delete(name: string): Promise<void> {
    assertAccount(this.accountData)
    name = name.trim()
    const podsInfo = await getPodsList(this.accountData.connection.bee, this.accountData.wallet!, {
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
    await writeFeedData(
      this.accountData.connection,
      POD_TOPIC,
      allPodsData,
      wallet,
      preparePrivateKey(wallet.privateKey),
      epoch,
    )
    await setEpochCache(this.accountData.connection.cacheInfo, getCacheKey(wallet.address), {
      epoch,
      data: podListToJSON(podsFiltered, podsSharedFiltered),
    })
  }

  /**
   * Shares pod information
   *
   * @param name pod name
   *
   * @returns swarm reference of shared metadata about pod
   */
  async share(name: string): Promise<Reference> {
    assertAccount(this.accountData)
    assertPodName(name)
    const wallet = this.accountData.wallet!
    const address = prepareEthAddress(wallet.address)
    const podInfo = await getExtendedPodsList(this.accountData.connection.bee, name, wallet, this.accountData.seed!, {
      requestOptions: this.accountData.connection.options?.requestOptions,
      cacheInfo: this.accountData.connection.cacheInfo,
    })

    const data = stringToBytes(
      JSON.stringify(createPodShareInfo(name, podInfo.podAddress, address, podInfo.pod.password)),
    )

    return (await uploadBytes(this.accountData.connection, data)).reference
  }

  /**
   * Gets shared pod information
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
   * @param reference swarm reference with shared pod information
   * @param options options for receiving pod
   *
   * @returns shared pod information
   */
  async saveShared(reference: string | EncryptedReference, options?: PodReceiveOptions): Promise<SharedPod> {
    assertAccount(this.accountData)
    assertEncryptedReference(reference)

    const data = await this.getSharedInfo(reference)

    const pod = await createPod(
      this.accountData.connection.bee,
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
