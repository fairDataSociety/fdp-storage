import { Bee, BeeDebug } from '@ethersphere/bee-js'

/**
 * Holder for Bee and BeeDebug instances
 */
export class Connection {
  constructor(public readonly bee: Bee, public readonly beeDebug: BeeDebug, public readonly timeout: number) {}
}
