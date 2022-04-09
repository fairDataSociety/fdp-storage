import { Pod } from './types'
import { assertActiveAccount } from '../account/utils'
import { Data } from '@ethersphere/bee-js'
import { getFeedData, writeFeedData } from '../feed/api'
import { AccountData } from '../account/account-data'
import { assertPodNameAvailable, assertPodsLength, createMetadata, extractPods, metaVersion } from './utils'
import { Epoch, getFirstEpoch } from '../feed/lookup/epoch'
import { getUnixTimestamp } from '../utils/time'
import { Wallet } from 'ethers'
import { stringToBytes } from '../utils/bytes'
import { LookupAnswer } from '../feed/types'
import { prepareEthAddress } from '../utils/address'

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
    let data: Data
    try {
      data = (
        await getFeedData(
          this.accountData.connection.bee,
          POD_TOPIC,
          prepareEthAddress(this.accountData.wallet!.address),
          this.accountData.connection.options?.downloadOptions,
        )
      ).data.chunkContent()
    } catch (e) {
      return []
    }

    return extractPods(data)
  }

  /**
   * Creates new pod with passed name
   *
   * @param name pod name
   */
  async create(name: string): Promise<Pod> {
    assertActiveAccount(this.accountData)
    name = name.trim()
    let lookupAnswer: LookupAnswer | undefined
    let list: Pod[]
    try {
      lookupAnswer = await getFeedData(
        this.accountData.connection.bee,
        POD_TOPIC,
        prepareEthAddress(this.accountData.wallet!.address),
        this.accountData.connection.options?.downloadOptions,
      )
      list = extractPods(lookupAnswer.data.chunkContent())
    } catch (e) {
      list = []
    }

    assertPodsLength(list.length)
    assertPodNameAvailable(list, name)

    let epoch: Epoch
    const currentTime = getUnixTimestamp()

    if (lookupAnswer) {
      epoch = lookupAnswer.epoch.getNextEpoch(currentTime)
    } else {
      epoch = getFirstEpoch(currentTime)
    }

    const index = list.length + 1
    const newPod = { name, index } as Pod
    list.push(newPod)
    const allPodsData = stringToBytes(list.map(item => `${item.name},${item.index}`).join('\n') + '\n')
    const wallet = this.accountData.wallet!
    // create pod
    await writeFeedData(this.accountData.connection, POD_TOPIC, allPodsData, wallet.privateKey, epoch)
    // create root directory for pod
    const now = getUnixTimestamp()
    const path = '/'
    // create a new key pair from the master mnemonic. This key pair is used as the base key pair for a newly created pod
    const pathWallet = Wallet.fromMnemonic(wallet.mnemonic.phrase, `m/44'/60'/0'/0/${index}`)
    const metadata = createMetadata(metaVersion, '', path, now, now, now)
    await writeFeedData(this.accountData.connection, path, metadata, pathWallet.privateKey)

    return newPod
  }
}
