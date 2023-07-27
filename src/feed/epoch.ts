import { Reference, Utils } from '@ethersphere/bee-js'
import { longToByteArray } from '../utils/bytes'
import { Connection } from '../connection/connection'
import { utils, Wallet } from 'ethers'
import { getUnixTimestamp } from '../utils/time'
import { bmtHashString } from '../account/utils'
import { getId } from './handler'

const EPOCH_LENGTH = 8

export const HIGHEST_LEVEL = 31
export const LOWEST_LEVEL = 0
export declare type EpochID = Utils.Bytes<typeof EPOCH_LENGTH>

/**
 * Calculates base time in form of number
 *
 * @param time unix timestamp parameter for calculation
 * @param level level parameter for calculation
 */
export function getBaseTime(time: number, level: number): number {
  return time & (Number.MAX_SAFE_INTEGER << level)
}

/**
 * Creates instance of `Epoch` where the first update should be located based on what time is passed
 */
export function getFirstEpoch(time: number): Epoch {
  return new Epoch(HIGHEST_LEVEL, time)
}

/**
 * An epoch represents a concrete time period starting at a specific point in time, called
 * the epoch base time and has a specific length. Period lengths are expressed as powers
 * of 2 in seconds. The shortest period is 20^0 = 1 second, the longest is 2^31 seconds
 */
export class Epoch {
  /**
   * Create en Epoch instance
   *
   * @param level level that identify a specific epoch
   * @param time time that identify a specific epoch
   */
  constructor(public level: number, public time: number) {}

  /**
   * Calculates base time in form of number for `level` and `time`
   *
   * @returns result number
   */
  base(): number {
    return getBaseTime(this.time, this.level)
  }

  /**
   * Packs time and level into an array of bytes
   *
   * @returns array of bytes with time and level
   */
  id(): EpochID {
    const base = this.base()
    const id = Uint8Array.from(longToByteArray(base)) as EpochID
    id[7] = this.level

    return id
  }

  /**
   * Checks if two epochs are equal
   *
   * @param epoch epoch to compare
   */
  equals(epoch: Epoch): boolean {
    return this.level === epoch.level && this.base() === epoch.base()
  }

  /**
   * Calculates the first nonzero bit of the XOR of base and 'time', counting from the highest significant bit
   * but limited to not return a level that is smaller than the base-1
   *
   * @return the frequency level a next update should be placed at, provided where the last update was and what time it is now
   */
  getNextLevel(time: number): number {
    // if the last update was more than 2^HIGHEST_LEVEL seconds ago, choose the highest level
    if (this.level > HIGHEST_LEVEL) {
      return HIGHEST_LEVEL
    }
    // First XOR the last epoch base time with the current clock. This will set all the FairOS most significant bits to zero.
    let mix = this.base() ^ time
    // Then, make sure we stop the below loop before one level below the current, by setting that level's bit to 1.
    // If the next level is lower than the current one, it must be exactly level-1 and not lower.
    mix = mix | Math.abs(1 << (this.level - 1))

    // set up a mask to scan for nonzero bits, starting at the highest level
    let mask = Math.abs(Math.pow(2, HIGHEST_LEVEL))

    for (let i = HIGHEST_LEVEL; i > LOWEST_LEVEL; i--) {
      if ((mix & mask) !== 0) {
        // if we find a nonzero bit, this is the level the next update should be at.
        return i
      }

      // move our bit one position to the right
      mask >>>= 1
    }

    return 0
  }

  /**
   * Calculates the next epoch based on the current level and the new time
   *
   * @param time new time
   */
  getNextEpoch(time: number): Epoch {
    return new Epoch(this.getNextLevel(time), time)
  }
}

/**
 * Writes data without encryption to feed using `topic` and `epoch` as a key and signed data with `privateKey` as a value
 *
 * @deprecated required for deprecated methods
 *
 * @param connection connection information for data uploading
 * @param topic key for data
 * @param data data to upload
 * @param wallet feed owner's wallet
 * @param epoch feed epoch
 */
export async function writeEpochFeedDataRaw(
  connection: Connection,
  topic: string,
  data: Uint8Array,
  wallet: utils.HDNode | Wallet,
  epoch?: Epoch,
): Promise<Reference> {
  if (!epoch) {
    epoch = new Epoch(HIGHEST_LEVEL, getUnixTimestamp())
  }

  const topicHash = bmtHashString(topic)
  const id = getId(topicHash, epoch.time, epoch.level)
  const socWriter = connection.bee.makeSOCWriter(wallet.privateKey)

  return socWriter.upload(connection.postageBatchId, id, data)
}
