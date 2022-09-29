import { AccountData } from '../account/account-data';
import { DirectoryItem } from '../content-items/directory-item';
/**
 * Directory related class
 */
export declare class Directory {
    private accountData;
    constructor(accountData: AccountData);
    /**
     * Get files and directories under the given path
     *
     * @param podName pod for content search
     * @param path path to start searching from
     * @param isRecursive search with recursion or not
     */
    read(podName: string, path: string, isRecursive?: boolean): Promise<DirectoryItem>;
    /**
     * Creates a directory
     *
     * @param podName pod where to create a directory
     * @param fullPath path for a directory
     */
    create(podName: string, fullPath: string): Promise<void>;
    /**
     * Deletes a directory
     *
     * @param podName pod where to delete a directory
     * @param fullPath path for a directory
     */
    delete(podName: string, fullPath: string): Promise<void>;
}
