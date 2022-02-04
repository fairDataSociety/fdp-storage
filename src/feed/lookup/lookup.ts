import Long from 'long'
import { Epoch } from './epoch'

export const LowestLevel = 0
export const HighestLevel = 31
export const DefaultLevel = HighestLevel
export const NoClue = new Epoch(0, 0)
export const worstHint = new Epoch(63, 0)

export class Lookup {
  getNextLevel(last: Epoch, now: Long): number {
    let mix = last.base().xor(now)
    mix = mix.or(Long.fromNumber(1).shiftLeft((last.level as number) - 1))

    if (mix.greaterThan(Long.MAX_UNSIGNED_VALUE.shiftRight(Long.fromNumber(64 - HighestLevel - 1)))) {
      return HighestLevel
    }

    let mask = Long.fromNumber(1).shiftLeft(HighestLevel)
    for (let i = HighestLevel; i > LowestLevel; i--) {
      if (mix.and(mask).notEquals(0)) {
        return i
      }

      mask = mask.shiftRight(1)
    }

    return 0
  }

  getNextEpoch(last: Epoch, now: Long): Epoch {
    if (last === NoClue) {
      return this.getFirstEpoch(now)
    }

    const level = this.getNextLevel(last, now)

    return new Epoch(level, now)
  }

  getFirstEpoch(now: Long): Epoch {
    return new Epoch(HighestLevel, now)
  }
}
