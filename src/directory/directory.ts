import { getExtendedPodsList } from '../pod/api'
import { AccountData } from '../account/account-data'
import { createDirectory, readDirectory } from './handler'
import { assertAccount } from '../account/utils'
import { DirectoryItem } from '../content-items/directory-item'
import { removeEntryFromDirectory } from '../content-items/handler'
import { extractPathInfo } from '../file/utils'
import { assertPodName } from '../pod/utils'
import { prepareEthAddress } from '../utils/address'

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
   * @param isRecursive search with recursion or not
   */
  async read(podName: string, path: string, isRecursive?: boolean): Promise<DirectoryItem> {
    assertAccount(this.accountData)
    assertPodName(podName)
    const extendedInfo = await getExtendedPodsList(
      this.accountData.connection.bee,
      podName,
      prepareEthAddress(this.accountData.wallet!.address),
      this.accountData.seed!,
      this.accountData.connection.options?.downloadOptions,
    )

    return readDirectory(
      this.accountData.connection.bee,
      path,
      extendedInfo.podAddress,
      isRecursive,
      this.accountData.connection.options?.downloadOptions,
    )
  }

  /**
   * Creates a directory
   *
   * @param podName pod where to create a directory
   * @param fullPath path for a directory
   */
  async create(podName: string, fullPath: string): Promise<void> {
    assertAccount(this.accountData)
    assertPodName(podName)
    const downloadOptions = this.accountData.connection.options?.downloadOptions
    const extendedInfo = await getExtendedPodsList(
      this.accountData.connection.bee,
      podName,
      prepareEthAddress(this.accountData.wallet!.address),
      this.accountData.seed!,
      downloadOptions,
    )

    return createDirectory(this.accountData.connection, fullPath, extendedInfo.podWallet, downloadOptions)
  }

  /**
   * Deletes a directory
   *
   * @param podName pod where to delete a directory
   * @param fullPath path for a directory
   */
  async delete(podName: string, fullPath: string): Promise<void> {
    assertAccount(this.accountData)
    assertPodName(podName)
    const pathInfo = extractPathInfo(fullPath)
    const connection = this.accountData.connection
    const downloadOptions = connection.options?.downloadOptions
    const extendedInfo = await getExtendedPodsList(
      connection.bee,
      podName,
      prepareEthAddress(this.accountData.wallet!.address),
      this.accountData.seed!,
      downloadOptions,
    )

    await removeEntryFromDirectory(
      connection,
      extendedInfo.podWallet,
      pathInfo.path,
      pathInfo.filename,
      false,
      downloadOptions,
    )
  }
}
