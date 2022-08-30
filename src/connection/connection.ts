import { BatchId, Bee } from '@ethersphere/bee-js'
import { Options } from '../types'

/**
 * Holder for Bee instance and BatchId
 */
export class Connection {
  constructor(public readonly bee: Bee, public readonly postageBatchId: BatchId, public readonly options?: Options) {}
}
