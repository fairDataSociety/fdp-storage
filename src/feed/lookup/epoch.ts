import { Utils } from '@ethersphere/bee-js'
import { longToByteArray } from '../../utils/bytes'

const EPOCH_LENGTH = 8

export declare type EpochID = Utils.Bytes<typeof EPOCH_LENGTH>

/**
 * Calculates base time in form of number
 *
 * @param time time parameter for calculation
 * @param level level parameter for calculation
 */
export function getBaseTime(time: number, level: number): number {
  return time & (Number.MAX_SAFE_INTEGER << level)
}

export class Epoch {
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
}
