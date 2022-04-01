import { extractChunkContent } from '../account/utils'
import { Data } from '@ethersphere/bee-js'
import { LookupData } from './types'

/**
 * Wrap chunk data with helper
 *
 * @param data chunk data
 */
export function wrapChunkHelper(data: Data): LookupData {
  return Object.assign(data, {
    chunkContent: () => extractChunkContent(data),
  })
}
