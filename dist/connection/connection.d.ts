import { BatchId, Bee } from '@ethersphere/bee-js';
import { Options } from '../types';
/**
 * Holder for Bee instance and BatchId
 */
export declare class Connection {
    readonly bee: Bee;
    readonly postageBatchId: BatchId;
    readonly options?: Options | undefined;
    constructor(bee: Bee, postageBatchId: BatchId, options?: Options | undefined);
}
