import { decryptText, encryptText } from '../../src/account/encryption'
import CryptoJS from 'jscrypto'
import { generateRandomHexString } from '../utils'

describe('encryption', () => {
  describe('FairOS-dfs compatibility', () => {
    const examples = [
      {
        data: '7uQRkTQ2G8dzh-tFeGLQ-KIeeVHmdWnek1VsqfKj7gLcEWM4EQxY7QTXwBlaC6IQLYSfkQpCj0PqcAINRTaz0nyOuZKckJ4opVqZ9h4YPNAXQynkwl-GYnYsvKqkRW8tFf0XXQ==',
        password: 'zaqzaq',
        expected: 'wrestle tomato logic broom plastic little fault awesome ketchup brisk junior endorse',
        iv: 'eee4119134361bc77387eb457862d0f8',
      },
      {
        data: '0XpncZw1cBd9oh6MXyxYaFPiG_tMt9S-iY69RBPiKBjxKmpe9PpsGylqSTMMjRSu-eBhPUW4i8xuMlnT3HTLmd1ljK4lupMVXzfVO_SRYbFlD3Un-CjGfH7zXQQ=',
        password: 'bbb',
        expected: 'situate zone steel fog used improve reason lesson company green large target',
        iv: 'd17a67719c3570177da21e8c5f2c5868',
      },
      {
        data: 'GAEHnSA9-UhNsUeC2Mk-l9nEYXxGGTn7s3FQNPMBVFO7oK4XmpEPMMFGajmFck1cpEtpaU684ljDWdOtFCNRJ3i2KBHxPOjfGAqRwTM7JJNhbjv6KII1e144J5ei',
        password: 'helloworld',
        expected: 'kid pond elbow remove switch reveal hello letter vintage gadget police motion',
        iv: '1801079d203df9484db14782d8c93e97',
      },
    ]

    it('decryptText', () => {
      for (const item of examples) {
        const decrypted = decryptText(item.password, item.data)
        expect(decrypted).toEqual(item.expected)
      }
    })

    it('encryptText', () => {
      for (const item of examples) {
        const encrypted = encryptText(item.password, item.expected, CryptoJS.enc.Hex.parse(item.iv))
        expect(encrypted).toEqual(item.data)
      }
    })

    it('encryptText and decryptText', () => {
      const examples = []

      // examples with content length from 1 to 200 and password in range 3-10
      for (let i = 1; i <= 200; i++) {
        for (let j = 1; j <= 20; j++) {
          examples.push({
            text: generateRandomHexString(i),
            password: generateRandomHexString(j),
          })
        }
      }

      for (const item of examples) {
        const encrypted = encryptText(item.password, item.text)
        const decrypted = decryptText(item.password, encrypted)
        expect(decrypted).toEqual(item.text)
      }
    })
  })
})
