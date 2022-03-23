import { Bee, BeeDebug } from '@ethersphere/bee-js'
import AccountData from './account/account-data'
import { PersonalStorage } from './pod/personal-storage'

export class FairDataProtocol {
  public readonly bee: Bee
  public readonly beeDebug: BeeDebug
  public readonly account: AccountData
  public readonly personalStorage: PersonalStorage

  constructor(beeUrl: string, beeDebugUrl: string) {
    this.bee = new Bee(beeUrl)
    this.beeDebug = new BeeDebug(beeDebugUrl)
    this.account = new AccountData(this.bee, this.beeDebug)
    this.personalStorage = new PersonalStorage(this.account)
  }
}
