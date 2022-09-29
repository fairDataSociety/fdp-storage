import { Epoch } from './epoch';
import { Data } from '@ethersphere/bee-js';
import { LookupAnswer } from '../types';
/**
 * Searches feed content with linear way
 *
 * @param time search start time point
 * @param read async function for downloading data using Epoch and time
 */
export declare function lookup(time: number, read: (epoch: Epoch, time: number) => Promise<Data>): Promise<LookupAnswer>;
