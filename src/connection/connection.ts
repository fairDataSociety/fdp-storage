import { BatchId, Bee } from '@ethersphere/bee-js'
import { Options } from '../types'
import { CacheInfo } from '../cache/types'

/**
 * Holder for Bee instance and BatchId
 */
export class Connection {
  constructor(
    public readonly bee: Bee,
    public readonly postageBatchId: BatchId,
    public readonly cacheInfo: CacheInfo,
    public readonly options?: Options,
  ) {}
}
