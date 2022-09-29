import { Pod, PodReceiveOptions, PodShareInfo, SharedPod } from './types';
import { AccountData } from '../account/account-data';
import { Reference } from '@ethersphere/bee-js';
import { List } from './list';
import { EncryptedReference } from '../utils/hex';
export declare const POD_TOPIC = "Pods";
export declare class PersonalStorage {
    private accountData;
    constructor(accountData: AccountData);
    /**
     * Gets the list of pods for the active account
     *
     * @returns list of pods
     */
    list(): Promise<List>;
    /**
     * Creates new pod with passed name
     *
     * @param name pod name
     */
    create(name: string): Promise<Pod>;
    /**
     * Deletes pod with passed name
     *
     * @param name pod name
     */
    delete(name: string): Promise<void>;
    /**
     * Shares pod information
     *
     * @param name pod name
     *
     * @returns swarm reference of shared metadata about pod
     */
    share(name: string): Promise<Reference>;
    /**
     * Gets shared pod information
     *
     * @param reference swarm reference with shared pod information
     *
     * @returns shared pod information
     */
    getSharedInfo(reference: string | EncryptedReference): Promise<PodShareInfo>;
    /**
     * Receive and save shared pod information to user's account
     *
     * @param reference swarm reference with shared pod information
     * @param options options for receiving pod
     *
     * @returns shared pod information
     */
    saveShared(reference: string | EncryptedReference, options?: PodReceiveOptions): Promise<SharedPod>;
}
