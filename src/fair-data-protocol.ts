import { Bee, BeeDebug } from '@ethersphere/bee-js'
import { AccountData } from './account/account-data'
import { PersonalStorage } from './pod/personal-storage'
import { Connection } from './connection/connection'

export class FairDataProtocol {
  public readonly connection: Connection
  public readonly account: AccountData
  public readonly personalStorage: PersonalStorage

  constructor(beeUrl: string, beeDebugUrl: string, timeout = 5000) {
    this.connection = new Connection(new Bee(beeUrl), new BeeDebug(beeDebugUrl), timeout)
    this.account = new AccountData(this.connection)
    this.personalStorage = new PersonalStorage(this.account)
  }
}
