import { Data } from '@ethersphere/bee-js'
import { Epoch } from './epoch'

/**
 * Lookup data with possibility to get chunk content
 */
export interface LookupData extends Data {
  chunkContent(): Data
}

/**
 * Result information for lookup methods with extended information
 */
export interface LookupAnswer {
  /**
   * Data from lookup
   */
  data: LookupData

  /**
   * Epoch info only for epoch feed
   */
  epoch?: Epoch
}

/**
 * Feed type
 */
export enum FeedType {
  Sequence = 'sequence',
  Epoch = 'epoch',
}

/**
 * Epoch options
 */
export interface EpochOptions {
  /**
   * Current epoch
   */
  epoch?: Epoch

  /**
   * Get next epoch or not
   */
  isGetNextEpoch?: boolean

  /**
   * Get next level or not
   */
  isGetNextLevel?: boolean
}

/**
 * Write feed options
 */
export interface WriteFeedOptions {
  /**
   * Feed type
   */
  feedType: FeedType

  /**
   * Epoch options
   */
  epochOptions?: EpochOptions
}

/**
 * Asserts that data is an epoch options
 *
 * @param data Data to check
 */
export function assertEpochOptions(data: unknown): asserts data is EpochOptions {
  const options = data as EpochOptions

  if (options?.epoch === undefined && options?.isGetNextEpoch === undefined) {
    throw new Error('EpochOptions: Neither "epoch" nor "isGetNextEpoch" is defined')
  }
}

/**
 * Asserts that data is a write feed options
 *
 * @param data Data to check
 */
export function assertWriteFeedOptions(data: unknown): asserts data is WriteFeedOptions {
  const options = data as WriteFeedOptions

  switch (options.feedType) {
    case FeedType.Epoch:
      break
    case FeedType.Sequence:
      if (options.epochOptions) {
        throw new Error('WriteFeedOptions: "epochOptions" is defined for "sequence" feed type')
      }

      break
    default:
      throw new Error('WriteFeedOptions: "feedType" is not valid')
  }
}
