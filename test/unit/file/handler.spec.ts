import { generateBlockName } from '../../../src/file/handler'

describe('file/handler', () => {
  it('generateBlockName', () => {
    const examples = [
      {
        data: 0,
        result: 'block-00000',
      },
      {
        data: 1,
        result: 'block-00001',
      },
      {
        data: 11,
        result: 'block-00011',
      },
      {
        data: 11111,
        result: 'block-11111',
      },
      {
        data: 99999,
        result: 'block-99999',
      },
    ]

    for (const example of examples) {
      expect(generateBlockName(example.data)).toEqual(example.result)
    }
  })
})
