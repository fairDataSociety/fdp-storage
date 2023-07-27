import { Epoch } from '../feed/epoch'

export const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  isUseCache: true,
}

/**
 * Cache processor options
 */
export interface ProcessCacheDataOptions<T> {
  key: string
  onGetData: () => Promise<CacheEpochData>
  onRecoverData: (data: CacheEpochDataPrepared) => Promise<T>
  cacheInfo?: CacheInfo
}

/**
 * Combined cache information
 */
export interface CacheInfo {
  object: CacheObject
  options: CacheOptions
}

/**
 * Serializable epoch data for caching
 */
export interface CacheEpochData {
  epoch?: {
    level: number
    time: number
  }
  data?: string
}

/**
 * Recovered epoch data from cache
 */
export interface CacheEpochDataPrepared {
  epoch?: Epoch
  data?: string
}

/**
 * Object contains cache info
 */
export interface CacheObject {
  [key: string]: CacheEpochData
}

/**
 * Configuration for caching
 */
export interface CacheOptions {
  isUseCache: boolean
  onSaveCache?: (cache: CacheObject) => Promise<void>
}
