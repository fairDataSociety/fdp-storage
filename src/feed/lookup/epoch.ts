import Long from 'long'
import { Bytes } from '@ethersphere/bee-js/dist/src/utils/bytes'

const EpochLength = 8

export declare type EpochID = Bytes<typeof EpochLength>

export function getBaseTime(time: number, level: number): Long {
  return Long.fromNumber(time).and(Long.MAX_UNSIGNED_VALUE.shiftLeft(level))
}

export class Epoch {
  level
  time

  constructor(level: number, time: Long) {
    this.level = level
    this.time = time
  }

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
