import { getExtendedPodsList } from '../pod/api'
import { AccountData } from '../account/account-data'
import { createDirectory, readDirectory } from './handler'
import { assertActiveAccount } from '../account/utils'
import { DirectoryItem } from './directory-item'

/**
 * Directory related class
 */
export class Directory {
  constructor(private accountData: AccountData) {}

  /**
   * Get files and directories under the given path
   *
   * @param podName pod for content search
   * @param path path to start searching from
   * @param isRecursively search with recursion or not
   */
  async read(podName: string, path: string, isRecursively?: boolean): Promise<DirectoryItem> {
    assertActiveAccount(this.accountData)
    const extendedInfo = await getExtendedPodsList(
      this.accountData.connection.bee,
      podName,
      this.accountData.wallet!,
      this.accountData.connection.options?.downloadOptions,
    )

    return await readDirectory(
      this.accountData.connection.bee,
      path,
      extendedInfo.podAddress,
      isRecursively,
      this.accountData.connection.options?.downloadOptions,
    )
  }

  /**
   * Creates a directory
   *
   * @param podName pod where to create a directory
   * @param path path for a directory
   */
  async create(podName: string, path: string): Promise<void> {
    assertActiveAccount(this.accountData)
    const downloadOptions = this.accountData.connection.options?.downloadOptions
    const extendedInfo = await getExtendedPodsList(
      this.accountData.connection.bee,
      podName,
      this.accountData.wallet!,
      downloadOptions,
    )

    return await createDirectory(this.accountData.connection, path, extendedInfo.podWallet, downloadOptions)
  }
}
