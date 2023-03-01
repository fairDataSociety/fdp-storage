import CryptoJS from 'crypto-js'
import { CacheEpochData, CacheEpochDataPrepared, CacheInfo, CacheObject, ProcessCacheDataOptions } from './types'
import { Epoch } from '../feed/lookup/epoch'

/**
 * Creates cache key
 */
export function getCacheKey(...keys: string[]): string {
  const key = [...keys].filter(item => Boolean(item)).join(':')

  return CryptoJS.enc.Hex.stringify(CryptoJS.SHA256(key))
}

/**
 * Gets prepared cache value
 */
export function getEpochCacheData(cacheObject: CacheObject, key: string): CacheEpochDataPrepared | undefined {
  const data = cacheObject[key]

  return data === undefined
    ? undefined
    : {
        epoch: data?.epoch && new Epoch(data.epoch.level, data.epoch.time),
        data: data?.data,
      }
}

/**
 * Sets epoch cache data
 */
export async function setEpochCache(cacheInfo: CacheInfo, key: string, value: CacheEpochData): Promise<void> {
  if (!cacheInfo.options.isUseCache) {
    return
  }

  cacheInfo.object[key] = value

  if (cacheInfo.options.onSaveCache) {
    await cacheInfo.options.onSaveCache(cacheInfo.object)
  }
}

/**
 * Process data with caching
 *
 * @param key caching key
 * @param onGetData callback for data that should be cached
 * @param onRecoverData callback for recovering data from cache
 * @param cacheInfo cache info
 */
export async function processCacheData<T>({
  key,
  onGetData,
  onRecoverData,
  cacheInfo,
}: ProcessCacheDataOptions<T>): Promise<T> {
  const isUseCache = cacheInfo?.options?.isUseCache
  const value = isUseCache ? getEpochCacheData(cacheInfo.object, key) : undefined

  if (value !== undefined) {
    return onRecoverData(value)
  }

  const cacheData = await onGetData()

  if (isUseCache) {
    await setEpochCache(cacheInfo, key, cacheData)
  }

  const { epoch: cacheEpoch, data } = cacheData
  const epoch = cacheEpoch && new Epoch(cacheEpoch.level, cacheEpoch.time)

  return onRecoverData({ epoch, data })
}
