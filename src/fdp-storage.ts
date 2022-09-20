import { BatchId, Bee, KyRequestOptions, RequestOptions } from '@ethersphere/bee-js'
import { AccountData } from './account/account-data'
import { PersonalStorage } from './pod/personal-storage'
import { Connection } from './connection/connection'
import { Options } from './types'
import { Directory } from './directory/directory'
import { File } from './file/file'
import { ENS } from '@fairdatasociety/fdp-contracts'
import { Url } from 'url'

export class FdpStorage {
  public readonly connection: Connection
  public readonly account: AccountData
  public readonly personalStorage: PersonalStorage
  public readonly directory: Directory
  public readonly file: File
  public readonly ens: ENS

  constructor(beeUrl: string, postageBatchId: BatchId, options?: Options) {
    // @ts-ignore
    Bee.prototype.getKy = this.fetchPolyfill
    const bee = new Bee(beeUrl)
    this.connection = new Connection(bee, postageBatchId, options)
    this.ens = new ENS(options?.ensOptions, null, options?.ensDomain)
    this.account = new AccountData(this.connection, this.ens)
    this.personalStorage = new PersonalStorage(this.account)
    this.directory = new Directory(this.account)
    this.file = new File(this.account)
  }

  /**
   * fetch polyfill for ky and bee-js
   * @param options Options that affects the request behavior
   */
  fetchPolyfill(options: RequestOptions = {}): any {
    return async (url: URL, kyOpts: KyRequestOptions): Promise<any> => {
      const res = await fetch(url, {
        ...kyOpts,
        ...options,
        headers: Object(kyOpts.headers),
      })
      return {
        data: undefined,
        ...res,
      } // KyResponse type
    }
  }
}
