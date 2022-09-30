import { isSharedPod } from '../../../src/pod/utils'
import { Utils } from '@ethersphere/bee-js'

describe('pod/utils', () => {
  it('isSharedPod', () => {
    const examples = [
      {
        name: 'Hello world',
        address: Utils.hexToBytes('840D5c9254790c17267E822a0b3Da22e8a3D0624'),
        password: new Uint8Array([
          13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36, 12, 23, 38, 126, 130, 42, 11,
          61, 162, 46, 138, 61, 6,
        ]),
        isCorrect: true,
      },
      {
        name: 'Hello world',
        // without conversion
        address: new Uint8Array([132, 13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36]),
        password: new Uint8Array([
          13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36, 12, 23, 38, 126, 130, 42, 11,
          61, 162, 46, 138, 61, 6,
        ]),
        isCorrect: true,
      },
      {
        name: 'Hello world',
        // one byte more than address
        address: new Uint8Array([
          1, 132, 13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36,
        ]),
        password: new Uint8Array([
          13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36, 12, 23, 38, 126, 130, 42, 11,
          61, 162, 46, 138, 61, 6,
        ]),
        isCorrect: false,
      },
      {
        name: 'Hello world',
        // one byte less than address
        address: new Uint8Array([13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36]),
        password: new Uint8Array([
          13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36, 12, 23, 38, 126, 130, 42, 11,
          61, 162, 46, 138, 61, 6,
        ]),
        isCorrect: false,
      },
      {
        name: 'Hello world',
        address: new Uint8Array([132, 13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36]),
        // password one byte more
        password: new Uint8Array([
          13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36, 12, 23, 38, 126, 130, 42, 11,
          61, 162, 46, 138, 61, 6, 1,
        ]),
        isCorrect: false,
      },
      {
        name: 'Hello world',
        address: new Uint8Array([132, 13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36]),
        // password one byte less
        password: new Uint8Array([
          13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36, 12, 23, 38, 126, 130, 42, 11,
          61, 162, 46, 138, 61,
        ]),
        isCorrect: false,
      },
    ]

    for (const example of examples) {
      if (example.isCorrect) {
        expect(isSharedPod(example)).toBeTruthy()
      } else {
        expect(isSharedPod(example)).toBeFalsy()
      }
    }
  })
})
