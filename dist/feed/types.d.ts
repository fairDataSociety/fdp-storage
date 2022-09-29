import { Data } from '@ethersphere/bee-js';
import { Epoch } from './lookup/epoch';
/**
 * Lookup data with possibility to get chunk content
 */
export interface LookupData extends Data {
    chunkContent(): Data;
}
/**
 * Result information for lookup methods with extended information
 */
export interface LookupAnswer {
    data: LookupData;
    epoch: Epoch;
}
