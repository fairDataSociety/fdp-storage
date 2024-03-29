import { Epoch, getBaseTime, HIGHEST_LEVEL } from '../../../src/feed/lookup/epoch'
import { bytesToHex } from '../../../src/utils/hex'

describe('feed/epoch', () => {
  it('getBaseTime', () => {
    const examples = [
      {
        data: {
          time: 0,
          level: 63,
        },
        result: 0,
      },
      {
        data: {
          time: 1648637256,
          level: 31,
        },
        result: 0,
      },
      {
        data: {
          time: 1648637256,
          level: 30,
        },
        result: 1073741824,
      },
      {
        data: {
          time: 1648637404,
          level: 30,
        },
        result: 1073741824,
      },
      {
        data: {
          time: 1073741823,
          level: 30,
        },
        result: 0,
      },
    ]
    for (const example of examples) {
      const result = getBaseTime(example.data.time, example.data.level)

      expect(result).toEqual(example.result)
    }
  })

  it('getNextLevel', () => {
    const examples = [
      {
        data: {
          epoch: new Epoch(63, 0),
          time: 1648635721,
        },
        result: 31,
      },
      {
        data: {
          epoch: new Epoch(5, 1533799046),
          time: 1533799046,
        },
        result: 4,
      },
      {
        data: {
          epoch: new Epoch(31, 1648635721),
          time: 1648635721,
        },
        result: 30,
      },
    ]
    for (const example of examples) {
      const result = example.data.epoch.getNextLevel(example.data.time)

      expect(result).toEqual(example.result)
    }
  })

  it('getNextEpoch', () => {
    const examples = [
      {
        data: {
          epoch: new Epoch(63, 0),
          time: 1648635721,
        },
        result: new Epoch(31, 1648635721),
      },
      {
        data: {
          epoch: new Epoch(31, 1648635721),
          time: 1648635721,
        },
        result: new Epoch(30, 1648635721),
      },
    ]
    for (const example of examples) {
      const result = example.data.epoch.getNextEpoch(example.data.time)

      expect(result.level).toEqual(example.result.level)
      expect(result.time).toEqual(example.result.time)
    }
  })

  it('getNextEpoch limits', () => {
    const ids: { [key: string]: boolean } = {}
    let epoch = new Epoch(HIGHEST_LEVEL, 1648635721)
    // todo should work with more updates than HIGHEST_LEVEL
    for (let i = 0; i <= HIGHEST_LEVEL; i++) {
      epoch = epoch.getNextEpoch(epoch.time)
      const id = bytesToHex(epoch.id()) as string

      if (ids[id]) {
        throw new Error('epoch id already exists')
      } else {
        ids[id] = true
      }
    }
  })
})
