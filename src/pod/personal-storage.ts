import { Pod, PodReceiveOptions, PodShareInfo, SharedPod } from './types'
import { assertAccount } from '../account/utils'
import { writeFeedData } from '../feed/api'
import { AccountData } from '../account/account-data'
import {
  assertPod,
  assertPodName,
  assertPodShareInfo,
  assertPodsLength,
  assertSharedPod,
  createPod,
  createPodShareInfo,
  podListToBytes,
} from './utils'
import { getUnixTimestamp } from '../utils/time'
import { prepareEthAddress } from '../utils/address'
import { getExtendedPodsList, getPodsList } from './api'
import { uploadBytes } from '../file/utils'
import { stringToBytes } from '../utils/bytes'
import { Reference } from '@ethersphere/bee-js'
import { List } from './list'
import { assertEncryptedReference, EncryptedReference } from '../utils/hex'
import { getSharedInfo } from '../content-items/utils'

export const POD_TOPIC = 'Pods'

export class PersonalStorage {
  constructor(private accountData: AccountData) {}

  /**
   * Gets the list of pods for the active account
   *
   * @returns list of pods
   */
  async list(): Promise<List> {
    assertAccount(this.accountData)

    const data = await getPodsList(
      this.accountData.connection.bee,
      prepareEthAddress(this.accountData.wallet!.address),
      this.accountData.connection.options?.downloadOptions,
    )

    return data.podsList
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
        index: 0,
      },
    )

    assertPod(pod)

    return pod
  }

  /**
   * Deletes pod with passed name
   *
   * @param name pod name
   */
  async delete(name: string): Promise<void> {
    assertAccount(this.accountData)
    name = name.trim()
    const podsInfo = await getPodsList(
      this.accountData.connection.bee,
      prepareEthAddress(this.accountData.wallet!.address),
      this.accountData.connection.options?.downloadOptions,
    )

    assertPodsLength(podsInfo.podsList.getPods().length)
    const pod = podsInfo.podsList.getPods().find(item => item.name === name)

    if (!pod) {
      throw new Error(`Pod "${name}" does not exist`)
    }

    const podsFiltered = podsInfo.podsList.getPods().filter(item => item.name !== name)
    const podsSharedFiltered = podsInfo.podsList.getSharedPods().filter(item => item.name !== name)
    const allPodsData = podListToBytes(podsFiltered, podsSharedFiltered)
    const wallet = this.accountData.wallet!
    await writeFeedData(
      this.accountData.connection,
      POD_TOPIC,
      allPodsData,
      wallet.privateKey,
      podsInfo.lookupAnswer!.epoch.getNextEpoch(getUnixTimestamp()),
    )
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
    const address = prepareEthAddress(this.accountData.wallet!.address)
    const podInfo = await getExtendedPodsList(
      this.accountData.connection.bee,
      name,
      address,
      this.accountData.seed!,
      this.accountData.connection.options?.downloadOptions,
    )

    const data = stringToBytes(JSON.stringify(createPodShareInfo(name, podInfo.podAddress, address)))

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

    const sharedInfo = await getSharedInfo(this.accountData.connection.bee, reference)
    assertPodShareInfo(sharedInfo)

    return sharedInfo
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
        name: options?.name ?? data.pod_name,
        address: prepareEthAddress(data.pod_address),
      },
    )

    assertSharedPod(pod)

    return pod
  }
}
