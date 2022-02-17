import { Bee, BeeDebug } from '@ethersphere/bee-js'
import { Wallet } from 'ethers'

export default class AccountData {
  public readonly bee: Bee
  public readonly beeDebug: BeeDebug
  public wallet?: Wallet

  constructor(bee: Bee, beeDebug: BeeDebug, wallet?: Wallet) {
    this.bee = bee
    this.beeDebug = beeDebug
    this.wallet = wallet
  }
}
