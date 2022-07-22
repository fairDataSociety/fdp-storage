import { Pod } from './types'
import { utils } from 'ethers'
import { assertActiveAccount } from '../account/utils'
import { writeFeedData } from '../feed/api'
import { AccountData } from '../account/account-data'
import { assertPodName, assertPodNameAvailable, assertPodsLength, createPodShareInfo, podListToBytes } from './utils'
import { Epoch, getFirstEpoch } from '../feed/lookup/epoch'
import { getUnixTimestamp } from '../utils/time'
import { prepareEthAddress } from '../utils/address'
import { getExtendedPodsList, getPodsList } from './api'
import { getWalletByIndex } from '../utils/wallet'
import { createRootDirectory } from '../directory/handler'
import { uploadBytes } from '../file/utils'
import { stringToBytes } from '../utils/bytes'
import { Reference } from '@ethersphere/bee-js'

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
    assertPodName(name)
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

    const newPod: Pod = { name, index: nextIndex }
    podsInfo.pods.push(newPod)
    const allPodsData = podListToBytes(podsInfo.pods)
    const wallet = this.accountData.wallet!
    
    // create pod
    await writeFeedData(this.accountData.connection, POD_TOPIC, allPodsData, wallet.privateKey, epoch)
    const seed = this.accountData.seed
    const podWallet = getWalletByIndex(seed, nextIndex)
    await createRootDirectory(this.accountData.connection, podWallet.privateKey)

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

  /**
   * Shares pod information
   *
   * @param name pod name
   *
   * @returns swarm reference of shared metadata about pod
   */
  async share(name: string): Promise<Reference> {
    assertActiveAccount(this.accountData)
    assertPodName(name)
    const wallet = this.accountData.wallet!
    const podInfo = await getExtendedPodsList(
      this.accountData.connection.bee,
      name,
      wallet,
      this.accountData.connection.options?.downloadOptions,
    )

    const data = stringToBytes(
      JSON.stringify(createPodShareInfo(name, podInfo.podAddress, prepareEthAddress(wallet.address))),
    )

    return (await uploadBytes(this.accountData.connection, data)).reference
  }
}
