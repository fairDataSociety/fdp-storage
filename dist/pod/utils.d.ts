import { Pod, PodShareInfo, SharedPod } from './types';
import { Bee, Data, Utils } from '@ethersphere/bee-js';
import { LookupAnswer } from '../feed/types';
import { utils } from 'ethers';
import { EncryptedReference } from '../utils/hex';
import { List } from './list';
import { Connection } from '../connection/connection';
import { AccountData } from '../account/account-data';
export declare const META_VERSION = 1;
export declare const MAX_PODS_COUNT = 65536;
export declare const MAX_POD_NAME_LENGTH = 64;
/**
 * Information about pods list
 */
export interface PodsInfo {
    podsList: List;
    lookupAnswer: LookupAnswer | undefined;
}
/**
 * Extended information about specific pod
 */
export interface ExtendedPodInfo {
    pod: Pod;
    podWallet: utils.HDNode;
    podAddress: Utils.EthAddress;
    lookupAnswer: LookupAnswer | undefined;
}
export interface PathInfo {
    filename: string;
    path: string;
}
/**
 * Extracts pod information from raw data
 *
 * @param data raw data with pod information
 */
export declare function extractPods(data: Data): List;
/**
 * Creates metadata in bytes format for pod directory
 */
export declare function createRawDirectoryMetadata(version: number, path: string, name: string, creationTime: number, modificationTime: number, accessTime: number, fileOrDirNames?: string[]): Uint8Array;
/**
 * Verifies if pods list length is correct
 *
 * @param value pods list length
 */
export declare function assertPodsLength(value: unknown): asserts value is number;
/**
 * Verifies that name not exists in pods list
 *
 * @param value list of pods
 * @param name name of pod
 */
export declare function assertPodNameAvailable(name: string, value: unknown): asserts value is Pod[];
/**
 * Verifies that name not exists in shared pods list
 *
 * @param value list of shared pods
 * @param name name of pod
 */
export declare function assertSharedPodNameAvailable(name: string, value: unknown): asserts value is SharedPod[];
/**
 * Asserts that pod name is correct
 */
export declare function assertPodName(value: unknown): asserts value is string;
/**
 * Converts pods list to bytes array
 */
export declare function podListToBytes(pods: Pod[], sharedPods: SharedPod[]): Uint8Array;
/**
 * Pod guard
 */
export declare function isPod(value: unknown): value is Pod;
/**
 * Shared pod guard
 */
export declare function isSharedPod(value: unknown): value is SharedPod;
/**
 * Asserts that pod is correct
 */
export declare function assertPod(value: unknown): asserts value is Pod;
/**
 * Asserts that shared pod is correct
 */
export declare function assertSharedPod(value: unknown): asserts value is SharedPod;
/**
 * Asserts that pods are correct
 */
export declare function assertPods(value: unknown): asserts value is Pod[];
/**
 * Asserts that shared pods are correct
 */
export declare function assertSharedPods(value: unknown): asserts value is SharedPod[];
/**
 * Creates information for pod sharing
 */
export declare function createPodShareInfo(podName: string, podAddress: Utils.EthAddress, userAddress: Utils.EthAddress): PodShareInfo;
/**
 * Checks that value is pod share info
 */
export declare function isPodShareInfo(value: unknown): value is PodShareInfo;
/**
 * Verifies if pod share info is correct
 */
export declare function assertPodShareInfo(value: unknown): asserts value is PodShareInfo;
/**
 * Creates user's pod or add a shared pod to an account
 *
 * @param bee Bee instance
 * @param connection Connection instance
 * @param userWallet FDP account wallet
 * @param seed FDP account seed
 * @param pod pod information to create
 */
export declare function createPod(bee: Bee, connection: Connection, userWallet: utils.HDNode, seed: Uint8Array, pod: Pod | SharedPod): Promise<Pod | SharedPod>;
/**
 * Gets extended information about pods using AccountData instance and pod name
 *
 * @param accountData AccountData instance
 * @param podName pod name
 */
export declare function getExtendedPodsListByAccountData(accountData: AccountData, podName: string): Promise<ExtendedPodInfo>;
/**
 * Gets shared information about pod
 *
 * @param bee Bee instance
 * @param reference reference to shared information
 */
export declare function getSharedPodInfo(bee: Bee, reference: EncryptedReference): Promise<PodShareInfo>;
