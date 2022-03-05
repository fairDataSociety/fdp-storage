import { Bee, BeeDebug } from '@ethersphere/bee-js'
import { Wallet } from 'ethers'

export default class AccountData {
  constructor(public readonly bee: Bee, public readonly beeDebug: BeeDebug, public wallet?: Wallet) {}
}
