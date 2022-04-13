import { Bee, BeeDebug } from '@ethersphere/bee-js'
import { Options } from '../types'

/**
 * Holder for Bee and BeeDebug instances
 */
export class Connection {
  constructor(public readonly bee: Bee, public readonly beeDebug: BeeDebug, public readonly options?: Options) {}
}
