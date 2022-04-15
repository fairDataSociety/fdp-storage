import { Pod } from './types'
import { assertActiveAccount } from '../account/utils'
import { writeFeedData } from '../feed/api'
import { AccountData } from '../account/account-data'
import { assertPodNameAvailable, assertPodsLength, createMetadata, metaVersion, podListToBytes } from './utils'
import { Epoch, getFirstEpoch } from '../feed/lookup/epoch'
import { getUnixTimestamp } from '../utils/time'
import { prepareEthAddress } from '../utils/address'
import { getPodsList } from './api'
import { getWalletByIndex } from '../utils/wallet'

export const POD_TOPIC = 'Pods'

export class PersonalStorage {
  constructor(private accountData: AccountData) {}

  /**
   * Gets the list of pods for the active account
   *
   * @returns list of pods
   */
  async list(): Promise<Pod[]> {
    assertActiveAccount(this.accountData)

    return (
      await getPodsList(
        this.accountData.connection.bee,
        prepareEthAddress(this.accountData.wallet!.address),
        this.accountData.connection.options?.downloadOptions,
      )
    ).pods
  }

  /**
   * Creates new pod with passed name
   *
   * @param name pod name
   */
  async create(name: string): Promise<Pod> {
    assertActiveAccount(this.accountData)
    name = name.trim()
    const podsInfo = await getPodsList(
      this.accountData.connection.bee,
      prepareEthAddress(this.accountData.wallet!.address),
      this.accountData.connection.options?.downloadOptions,
    )

    const nextIndex = podsInfo.pods.length + 1
    assertPodsLength(nextIndex)
    assertPodNameAvailable(podsInfo.pods, name)

    let epoch: Epoch
    const currentTime = getUnixTimestamp()

    if (podsInfo.lookupAnswer) {
      epoch = podsInfo.lookupAnswer.epoch.getNextEpoch(currentTime)
    } else {
      epoch = getFirstEpoch(currentTime)
    }

    const newPod = { name, index: nextIndex } as Pod
    podsInfo.pods.push(newPod)
    const allPodsData = podListToBytes(podsInfo.pods)
    const wallet = this.accountData.wallet!
    // create pod
    await writeFeedData(this.accountData.connection, POD_TOPIC, allPodsData, wallet.privateKey, epoch)
    // create root directory for pod
    const now = getUnixTimestamp()
    const path = '/'
    // create a new key pair from the master mnemonic. This key pair is used as the base key pair for a newly created descendant pod
    const pathWallet = getWalletByIndex(wallet.mnemonic.phrase, nextIndex)
    const metadata = createMetadata(metaVersion, '', path, now, now, now)
    await writeFeedData(this.accountData.connection, path, metadata, pathWallet.privateKey)

    return newPod
  }

  /**
   * Deletes pod with passed name
   *
   * @param name pod name
   */
  async delete(name: string): Promise<void> {
    assertActiveAccount(this.accountData)
    name = name.trim()
    const podsInfo = await getPodsList(
      this.accountData.connection.bee,
      prepareEthAddress(this.accountData.wallet!.address),
      this.accountData.connection.options?.downloadOptions,
    )

    assertPodsLength(podsInfo.pods.length)
    const pod = podsInfo.pods.find(item => item.name === name)

    if (!pod) {
      throw new Error(`Pod "${name}" does not exist`)
    }

    const podsFiltered = podsInfo.pods.filter(item => item.name !== name)
    const allPodsData = podListToBytes(podsFiltered)
    const wallet = this.accountData.wallet!
    await writeFeedData(
      this.accountData.connection,
      POD_TOPIC,
      allPodsData,
      wallet.privateKey,
      podsInfo.lookupAnswer!.epoch.getNextEpoch(getUnixTimestamp()),
    )
  }
}
