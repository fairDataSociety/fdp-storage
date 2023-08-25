import { isPod, isSharedPod, MAX_POD_NAME_LENGTH } from '../../../src/pod/utils'
import { Utils } from '@ethersphere/bee-js'
import { POD_PASSWORD_LENGTH } from '../../../src/utils/encryption'

describe('pod/utils', () => {
  it('isSharedPod', () => {
    const correctPassword = new Uint8Array([
      13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36, 12, 23, 38, 126, 130, 42, 11, 61,
      162, 46, 138, 61, 6,
    ])
    const longPassword = new Uint8Array([
      13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36, 12, 23, 38, 126, 130, 42, 11, 61,
      162, 46, 138, 61, 6, 1,
    ])
    const shortPassword = new Uint8Array([
      13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36, 12, 23, 38, 126, 130, 42, 11, 61,
      162, 46, 138, 61,
    ])
    const correctAddress = new Uint8Array([
      132, 13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36,
    ])
    const longAddress = new Uint8Array([
      1, 132, 13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36,
    ])
    const shortAddress = new Uint8Array([
      13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36,
    ])
    const examples = [
      {
        name: 'Hello world',
        address: Utils.hexToBytes('840D5c9254790c17267E822a0b3Da22e8a3D0624'),
        password: correctPassword,
        isCorrect: true,
      },
      {
        name: 'Hello world',
        // without conversion
        address: correctAddress,
        password: correctPassword,
        isCorrect: true,
      },
      {
        name: 'Hello world',
        // one byte more than address
        address: longAddress,
        password: correctPassword,
        isCorrect: false,
      },
      {
        name: 'Hello world',
        // one byte less than address
        address: shortAddress,
        password: correctPassword,
        isCorrect: false,
      },
      {
        name: 'Hello world',
        address: correctAddress,
        // password one byte more
        password: longPassword,
        isCorrect: false,
      },
      {
        name: 'Hello world',
        address: correctAddress,
        // password one byte less
        password: shortPassword,
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

  describe('isPod', () => {
    const goodPod = {
      name: 'Hello',
      password: new Uint8Array(POD_PASSWORD_LENGTH),
      index: 0,
    }

    const badPods = [
      { password: new Uint8Array(POD_PASSWORD_LENGTH), index: 0 }, // Missing name
      { name: 'Test', index: 0 }, // Missing password
      { name: 'Test', password: new Uint8Array(POD_PASSWORD_LENGTH) }, // Missing index
      { name: 'Test', password: new Uint8Array(POD_PASSWORD_LENGTH), index: '0' }, // Index is a string
      { name: 'Test', password: 'password', index: 0 }, // Password is a string
      { name: 'Test', password: new Uint8Array(POD_PASSWORD_LENGTH), index: -1 }, // Negative index
      { name: 'Test', password: new Uint8Array(POD_PASSWORD_LENGTH), index: null }, // Index is null
      { name: '', password: new Uint8Array(POD_PASSWORD_LENGTH), index: 0 }, // Empty name
      { name: 'A'.repeat(MAX_POD_NAME_LENGTH + 1), password: new Uint8Array(POD_PASSWORD_LENGTH), index: 0 }, // Name too long
      { name: 'Test', password: undefined, index: 0 }, // Password is undefined
      { name: 'Test', password: null, index: 0 }, // Password is null
      { name: 'Test', password: new Uint8Array(POD_PASSWORD_LENGTH - 1), index: 0 }, // Password too short
      { name: 'Test', password: new Uint8Array(POD_PASSWORD_LENGTH + 1), index: 0 }, // Password too long
    ]

    it('should return true for a valid Pod', () => {
      expect(isPod(goodPod)).toBeTruthy()
    })

    it('should return false for an empty object', () => {
      expect(isPod({})).toBeFalsy()
    })

    badPods.forEach((badPod, index) => {
      it(`should return false for badPod[${index}]`, () => {
        expect(isPod(badPod)).toBeFalsy()
      })
    })

    it('should return false for null', () => {
      expect(isPod(null)).toBeFalsy()
    })

    it('should return false for undefined', () => {
      expect(isPod(undefined)).toBeFalsy()
    })

    it('should return false for a string', () => {
      expect(isPod('string')).toBeFalsy()
    })
  })
})
