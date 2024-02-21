import { ExtendedPodInfo, getPodsData, migratePodV1ToV2, PodsVersion, PodsInfo, extractPodsV2 } from './utils'
import { prepareEthAddress, privateKeyToBytes } from '../utils/wallet'
import { utils } from 'ethers'
import { DownloadOptions } from '../content-items/types'
import { getWalletByIndex } from '../utils/cache/wallet'
import { getPodsList as getPodsListCached } from './cache/api'
import { AccountData } from '../account/account-data'
import { Bee } from '@ethersphere/bee-js'

/**
 * Gets pods list with lookup answer
 *
 * @param accountData account data
 * @param bee Bee client
 * @param userWallet root wallet for downloading and decrypting data
 * @param downloadOptions request download
 */
export async function getPodsList(
  accountData: AccountData,
  bee: Bee,
  userWallet: utils.HDNode,
  downloadOptions?: DownloadOptions,
): Promise<PodsInfo> {
  let podsData = await getPodsData(bee, prepareEthAddress(userWallet.address), downloadOptions?.requestOptions)

  if (podsData.podsVersion === PodsVersion.V1) {
    await migratePodV1ToV2(accountData, podsData, privateKeyToBytes(userWallet.privateKey))
    podsData = await getPodsData(bee, prepareEthAddress(userWallet.address), downloadOptions?.requestOptions)
  }

  const podsList = await extractPodsV2(
    accountData,
    podsData.lookupAnswer.data.chunkContent(),
    privateKeyToBytes(userWallet.privateKey),
    downloadOptions?.requestOptions,
  )

  return {
    podsList,
    epoch: podsData.lookupAnswer.epoch,
  }
}

/**
 * Gets pods list with lookup answer and extended info about pod
 *
 * @param accountData account data
 * @param bee Bee client
 * @param podName pod to find
 * @param userWallet root wallet for downloading and decrypting data
 * @param seed seed of wallet owns the FDP account
 * @param downloadOptions request options
 */
export async function getExtendedPodsList(
  accountData: AccountData,
  bee: Bee,
  podName: string,
  userWallet: utils.HDNode,
  seed: Uint8Array,
  downloadOptions?: DownloadOptions,
): Promise<ExtendedPodInfo> {
  const { podsList, epoch } = await getPodsListCached(accountData, bee, userWallet, downloadOptions)
  const pod = podsList.pods.find(item => item.name === podName)

  if (!pod) {
    throw new Error(`Pod "${podName}" does not exist`)
  }

  const podWallet = await getWalletByIndex(seed, pod.index, downloadOptions?.cacheInfo)

  return {
    pod,
    podAddress: prepareEthAddress(podWallet.address),
    podWallet,
    epoch,
  }
}
