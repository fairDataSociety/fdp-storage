import Long from 'long'
import { Epoch } from './epoch'

export const LOWEST_LEVEL = 0
export const HIGHEST_LEVEL = 31
export const NO_CLUE = new Epoch(0, Long.ZERO)

export class Lookup {
  getNextLevel(last: Epoch, now: Long): number {
    let mix = last.base().xor(now)
    mix = mix.or(Long.fromNumber(1).shiftLeft((last.level as number) - 1))

    if (mix.greaterThan(Long.MAX_UNSIGNED_VALUE.shiftRight(Long.fromNumber(64 - HIGHEST_LEVEL - 1)))) {
      return HIGHEST_LEVEL
    }

    let mask = Long.fromNumber(1).shiftLeft(HIGHEST_LEVEL)
    for (let i = HIGHEST_LEVEL; i > LOWEST_LEVEL; i--) {
      if (mix.and(mask).notEquals(0)) {
        return i
      }

      mask = mask.shiftRight(1)
    }

    return 0
  }

  getNextEpoch(last: Epoch, now: Long): Epoch {
    if (last === NO_CLUE) {
      return this.getFirstEpoch(now)
    }

    const level = this.getNextLevel(last, now)

    return new Epoch(level, now)
  }

  getFirstEpoch(now: Long): Epoch {
    return new Epoch(HIGHEST_LEVEL, now)
  }
}
