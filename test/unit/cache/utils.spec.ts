import { getCacheKey } from '../../../src/cache/utils'
import CryptoJS from 'crypto-js'

describe('cache/utils', () => {
  it('getCacheKey', () => {
    const examples = [
      {
        input: {
          username: 'satoshi',
          pod: '',
          path: '',
        },
        expected: 'satoshi',
      },
      {
        input: {
          username: 'satoshi',
          pod: 'one',
          path: '',
        },
        expected: 'satoshi:one',
      },
      {
        input: {
          username: 'satoshi',
          pod: 'one',
          path: '/',
        },
        expected: 'satoshi:one:/',
      },
      {
        input: {
          username: 'nakamoto',
          pod: 'one-more',
          path: '/dir-one',
        },
        expected: 'nakamoto:one-more:/dir-one',
      },
      {
        input: {
          username: 'satoshi',
          pod: 'one',
          path: '/dir-one/file',
        },
        expected: 'satoshi:one:/dir-one/file',
      },
      {
        input: {
          username: 'vitalik',
          pod: 'my-pod',
          path: '/dir-one/dir/',
        },
        expected: 'vitalik:my-pod:/dir-one/dir/',
      },
    ]

    for (const example of examples) {
      const { username, pod, path } = example.input
      const expectedSha256 = CryptoJS.enc.Hex.stringify(CryptoJS.SHA256(example.expected))
      expect(getCacheKey(username, pod, path)).toEqual(expectedSha256)
    }
  })
})
