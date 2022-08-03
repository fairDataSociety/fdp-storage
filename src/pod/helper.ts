/**
 * Gets extended information about pods using AccountData instance and pod name
 *
 * @param accountData AccountData instance
 * @param podName pod name
 */
import { ExtendedPodInfo } from './utils'
import { getExtendedPodsList } from './api'
import { prepareEthAddress } from '../utils/address'
import { AccountData } from '../account/account-data'

export async function getExtendedPodsListByAccountData(
  accountData: AccountData,
  podName: string,
): Promise<ExtendedPodInfo> {
  return getExtendedPodsList(
    accountData.connection.bee,
    podName,
    prepareEthAddress(accountData.wallet!.address),
    accountData.seed!,
    accountData.connection.options?.downloadOptions,
  )
}
