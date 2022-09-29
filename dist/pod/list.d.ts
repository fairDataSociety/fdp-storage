import { Pod, SharedPod } from './types';
/**
 * List of created and shared pods
 */
export declare class List {
    private pods;
    private sharedPods;
    constructor(pods: Pod[], sharedPods: SharedPod[]);
    /**
     * Gets the list of created pods
     */
    getPods(): Pod[];
    /**
     * Gets the list of shared pods
     */
    getSharedPods(): SharedPod[];
}
