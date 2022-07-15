import { isEthAddress } from '../../../src/utils/type'

describe('utils/type', () => {
  it('isEthAddress', () => {
    const examples = [
      {
        data: '840D5c9254790c17267E822a0b3Da22e8a3D0624',
        isCorrect: true,
      },
      {
        data: '840D5c9254790c17267E822a0b3Da22e8a3D062',
        isCorrect: false,
      },
      {
        data: '840D5c9254790c17267',
        isCorrect: false,
      },
      {
        data: '',
        isCorrect: false,
      },
      {
        data: '0x',
        isCorrect: false,
      },
      {
        data: '0x840D5c9254790c17267E822a0b3Da22e8a3D0624',
        isCorrect: false,
      },
      {
        data: '0x840D5c9254790c17267E822a0b3Da22e8a3D06',
        isCorrect: false,
      },
    ]
    for (const example of examples) {
      if (example.isCorrect) {
        expect(isEthAddress(example.data)).toBeTruthy()
      } else {
        expect(isEthAddress(example.data)).toBeFalsy()
      }
    }
  })
})
