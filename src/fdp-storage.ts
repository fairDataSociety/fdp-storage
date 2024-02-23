import { BatchId, Bee } from '@ethersphere/bee-js'
import { AccountData } from './account/account-data'
import { PersonalStorage } from './pod/personal-storage'
import { Connection } from './connection/connection'
import { Options } from './types'
import { Directory } from './directory/directory'
import { File } from './file/file'
import { ENS, DataHub } from '@fairdatasociety/fdp-contracts-js'
import { CacheInfo, DEFAULT_CACHE_OPTIONS } from './cache/types'

export class FdpStorage {
  public readonly connection: Connection
  public readonly account: AccountData
  public readonly personalStorage: PersonalStorage
  public readonly directory: Directory
  public readonly file: File
  public readonly ens: ENS
  public readonly dataHub: DataHub
  public readonly cache: CacheInfo

  constructor(beeUrl: string, postageBatchId: BatchId, options?: Options) {
    this.cache = {
      object: {},
      options: options?.cacheOptions || DEFAULT_CACHE_OPTIONS,
    }
    this.connection = new Connection(new Bee(beeUrl), postageBatchId, this.cache, options)
    this.ens = new ENS(options?.ensOptions, null, options?.ensDomain)
    this.dataHub = new DataHub(options?.dataHubOptions, null, options?.ensDomain)
    this.account = new AccountData(this.connection, this.ens)
    this.personalStorage = new PersonalStorage(this.account, this.ens, this.dataHub)
    this.directory = new Directory(this.account)
    this.file = new File(this.account)
  }
}
