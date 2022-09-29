import { Bee, RequestOptions } from '@ethersphere/bee-js';
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth';
import { ExtendedPodInfo, PodsInfo } from './utils';
/**
 * Gets pods list with lookup answer
 *
 * @param bee Bee instance
 * @param address Ethereum address
 * @param options request options
 */
export declare function getPodsList(bee: Bee, address: EthAddress, options?: RequestOptions): Promise<PodsInfo>;
/**
 * Gets pods list with lookup answer and extended info about pod
 *
 * @param bee Bee instance
 * @param podName pod to find
 * @param address wallet address owns the FDP account
 * @param seed seed of wallet owns the FDP account
 * @param downloadOptions request options
 */
export declare function getExtendedPodsList(bee: Bee, podName: string, address: EthAddress, seed: Uint8Array, downloadOptions?: RequestOptions): Promise<ExtendedPodInfo>;
