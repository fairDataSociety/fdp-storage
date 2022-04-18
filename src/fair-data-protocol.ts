import { Bee, BeeDebug } from '@ethersphere/bee-js'
import { AccountData } from './account/account-data'
import { PersonalStorage } from './pod/personal-storage'
import { Connection } from './connection/connection'
import { Options } from './types'
import { Directory } from './directory/directory'
import { File } from './file/file'

export class FairDataProtocol {
  public readonly connection: Connection
  public readonly account: AccountData
  public readonly personalStorage: PersonalStorage
  public readonly directory: Directory
  public readonly file: File

  constructor(beeUrl: string, beeDebugUrl: string, options?: Options) {
    this.connection = new Connection(new Bee(beeUrl), new BeeDebug(beeDebugUrl), options)
    this.account = new AccountData(this.connection)
    this.personalStorage = new PersonalStorage(this.account)
    this.directory = new Directory(this.account)
    this.file = new File(this.account)
  }
}
