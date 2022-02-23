import Long from 'long'
import { Bytes } from '@ethersphere/bee-js/dist/src/utils/bytes'

const EpochLength = 8

export declare type EpochID = Bytes<typeof EpochLength>

export function getBaseTime(time: Long, level: number): Long {
  return time.and(Long.MAX_UNSIGNED_VALUE.shiftLeft(level))
}

export class Epoch {
  constructor(public level: number, public time: Long) {}

  base(): Long {
    return getBaseTime(this.time, this.level)
  }

  id(): EpochID {
    const base = this.base()
    const id = Uint8Array.from(base.toBytes()) as EpochID
    id[7] = this.level

    return id
  }

  equals(epoch: Epoch): boolean {
    return this.level === epoch.level && this.base() === epoch.base()
  }
}
