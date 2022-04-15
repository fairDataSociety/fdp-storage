import { getExtendedPodsList } from '../pod/api'
import { prepareEthAddress } from '../utils/address'
import { AccountData } from '../account/account-data'
import { readDirectory } from './handler'
import { assertActiveAccount } from '../account/utils'
import { DirectoryItem } from './directory-item'

/**
 * Directory related class
 */
export class Directory {
  constructor(private accountData: AccountData) {}

  /**
   * Get files and directories under path with recursion or not
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
      prepareEthAddress(extendedInfo.foundPodWallet.address),
      isRecursively,
    )
  }
}
