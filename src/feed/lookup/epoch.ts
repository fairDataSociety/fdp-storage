import { Utils } from '@ethersphere/bee-js'
import { longToByteArray } from '../../utils/bytes'

const EPOCH_LENGTH = 8

export declare type EpochID = Utils.Bytes<typeof EPOCH_LENGTH>

export function getBaseTime(time: number, level: number): number {
  return time & (Number.MAX_SAFE_INTEGER << level)
}

export class Epoch {
  constructor(public level: number, public time: number) {}

  base(): number {
    return getBaseTime(this.time, this.level)
  }

  id(): EpochID {
    const base = this.base()
    const id = Uint8Array.from(longToByteArray(base)) as EpochID
    id[7] = this.level

    return id
  }

  equals(epoch: Epoch): boolean {
    return this.level === epoch.level && this.base() === epoch.base()
  }
}
