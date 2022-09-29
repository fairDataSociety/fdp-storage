import { Bee, Reference, RequestOptions, Utils } from '@ethersphere/bee-js';
import { Epoch } from './lookup/epoch';
import { LookupAnswer } from './types';
import { Connection } from '../connection/connection';
/**
 * Finds and downloads the latest feed content
 *
 * @param bee Bee client
 * @param topic topic for calculation swarm chunk
 * @param address Ethereum address for calculation swarm chunk
 * @param options download chunk options
 */
export declare function getFeedData(bee: Bee, topic: string, address: Utils.EthAddress | Uint8Array, options?: RequestOptions): Promise<LookupAnswer>;
/**
 * Writes data to feed using `topic` and `epoch` as a key and signed data with `privateKey` as a value
 *
 * @param connection connection information for data uploading
 * @param topic key for data
 * @param data data to upload
 * @param privateKey private key to sign data
 * @param epoch feed epoch
 */
export declare function writeFeedData(connection: Connection, topic: string, data: Uint8Array, privateKey: string | Uint8Array, epoch?: Epoch): Promise<Reference>;
