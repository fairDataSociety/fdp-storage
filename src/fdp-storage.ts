import { BatchId, Bee } from '@ethersphere/bee-js'
import { AccountData } from './account/account-data'
import { PersonalStorage } from './pod/personal-storage'
import { PodEnvironment } from "./pod/PodEnvironment"
import { Connection } from './connection/connection'
import { Options } from './types'
import { Directory } from './directory/directory'
import { File } from './file/file'
import { ENS } from '@fairdatasociety/fdp-contracts'
import { getPodsList } from './pod/api'
import { getWalletByIndex, prepareEthAddress } from './utils/wallet'

export class FdpStorage {
  public readonly connection: Connection
  public readonly account: AccountData
  public readonly personalStorage: PersonalStorage
  public readonly directory: Directory
  public readonly file: File
  public readonly ens: ENS
  podEnvironment: PodEnvironment | null = null

  constructor(beeUrl: string, postageBatchId: BatchId, options?: Options) {
    this.connection = new Connection(new Bee(beeUrl), postageBatchId, options)
    this.ens = new ENS(options?.ensOptions, null, options?.ensDomain)
    this.account = new AccountData(this.connection, this.ens)
    this.personalStorage = new PersonalStorage(this.account)
    this.directory = new Directory(this.account)
    this.file = new File(this.account)
  }

  async loadPodEnvironment(name: string) {
    const podsInfo = await getPodsList(
      this.connection.bee,
      this.account.wallet!,
      this.account.connection.options?.downloadOptions,
    )
    const pod = podsInfo.podsList.getPods().find(item => item.name === name)

    if (!pod) {
      throw new Error(`Pod "${name}" does not exist`)
    }
    const podWallet = getWalletByIndex(this.account.seed!, pod.index)
    this.podEnvironment = {
      pod,
      podAddress: prepareEthAddress(podWallet.address),
      podWallet,
      lookupAnswer: podsInfo.lookupAnswer,
    }
    this.personalStorage.setPodEnvironment(this.podEnvironment!)
    this.directory.setPodEnvironment(this.podEnvironment!)
    this.file.setPodEnvironment(this.podEnvironment!)
  }
}
