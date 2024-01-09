import { ec as EC } from 'elliptic'
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
  assertPodShareInfo,
} from './utils'
import { getExtendedPodsList } from './api'
import { uploadBytes } from '../file/utils'
import { bytesToString, stringToBytes } from '../utils/bytes'
import { Reference, Utils } from '@ethersphere/bee-js'
import { assertEncryptedReference, EncryptedReference, HexString } from '../utils/hex'
import { prepareEthAddress, preparePrivateKey } from '../utils/wallet'
import { getCacheKey, setEpochCache } from '../cache/utils'
import { getPodsList } from './cache/api'
import { getNextEpoch } from '../feed/lookup/utils'
import { DataHub, ENS, ENS_DOMAIN, SubItem, Subscription } from '@fairdatasociety/fdp-contracts-js'
import { decryptBytes } from '../utils/encryption'
import { namehash } from 'ethers/lib/utils'

export const POD_TOPIC = 'Pods'

export class PersonalStorage {
  constructor(
    private accountData: AccountData,
    private ens: ENS,
    private dataHub: DataHub,
  ) {}

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
   * Account and postage batch id are required
   *
   * @param name pod name
   */
  async create(name: string): Promise<Pod> {
    assertAccount(this.accountData, { writeRequired: true })

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
   * Account and postage batch id are required
   *
   * @param name pod name
   */
  async delete(name: string): Promise<void> {
    assertAccount(this.accountData, { writeRequired: true })
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

  async getSubscriptions(address: string): Promise<Subscription[]> {
    return this.dataHub.getUsersSubscriptions(address)
  }

  async getAllSubItems(address: string): Promise<SubItem[]> {
    return this.dataHub.getAllSubItems(address)
  }

  async getAllSubItemsForNameHash(name: string): Promise<SubItem[]> {
    return this.dataHub.getAllSubItemsForNameHash(namehash(`${name}.${ENS_DOMAIN}`))
  }

  async openSubscribedPod(subHash: HexString, swarmLocation: HexString): Promise<unknown> {
    const sub = await this.dataHub.getSubBy(subHash)

    const publicKeyHex = await this.ens.getPublicKeyByUsernameHash(sub.fdpSellerNameHash)

    const wallet = this.accountData.wallet!

    const ec = new EC('secp256k1')

    const privateKey = ec.keyFromPrivate(wallet.privateKey)
    const publicKey = ec.keyFromPublic(publicKeyHex.substring(2), 'hex')

    const secret = privateKey.derive(publicKey.getPublic()).toString(16)

    const encryptedData = await this.accountData.connection.bee.downloadFile(swarmLocation.substring(2))

    const data = JSON.parse(bytesToString(decryptBytes(secret, encryptedData.data)))

    assertPodShareInfo(data)

    return data
  }
}
