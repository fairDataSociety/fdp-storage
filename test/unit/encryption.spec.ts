import { decryptText, encryptText } from '../../src/utils/encryption'
import CryptoJS from 'crypto-js'
import { generateRandomHexString } from '../utils'

describe('encryption', () => {
  it('FairOS-dfs compatibility', () => {
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
      const examples: { text: string; password: string }[] = []

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

  // it('Shared data encryption', async () => {
  //   // 690be9f0b143b3d2be3a529c0bb27dc87a3e20cb141ba03666fe0730641faa0a277a75ba958602ead30f4725102f7297a34d6ce5e1ae11cff61a012a977482831678183501
  //   // 690be9f0b143b3d2be3a529c0bb27dc87a3e20cb141ba03666fe0730641faa0a277a75ba958602ead30f4725102f7297a34d6ce5e1ae11cff61a012a97748283
  //   // 1678183501
  //   const password = '1678183501'
  //   const encryptedData = JSON.parse(
  //     '[143,138,37,161,209,25,90,245,149,125,104,148,127,161,2,174,2,202,0,32,206,229,186,241,253,193,208,228,53,57,120,57,76,95,153,218,241,217,39,188,69,92,58,26,153,173,208,245,165,247,233,231,0,32,7,112,186,128,156,80,7,126,76,212,229,151,235,55,222,224,141,56,198,134,163,137,128,114,7,63,54,84,82,21,170,54,106,219,15,159,90,215,62,72,90,199,137,74,178,176,174,115,39,100,242,47,117,155,191,188,103,211,202,81,35,53,99,223,192,186,216,115,152,94,65,26,146,123,206,201,72,71,238,174,174,74,231,222,95,241,161,118,87,150,122,84,3,230,60,228,115,198,242,148,152,223,113,79,60,34,81,112,43,81,145,60,44,127,74,66,56,25,250,163,231,173,56,80,30,78,53,139,149,168,215,170,161,105,124,128,118,234,137,3,135,225,169,198,52,45,26,35,58,229,184,39,49,170,103,176,168,77,80,88,242,74,67,42,249,100,98,183,140,94,139,168,183,250,142,106,118,255,62,46,184,237,167,130,169,60,91,200,118,3,47,61,143,44,227,183,195,89,243,52,206,210,240,119,103,210,136,3,68,128,112,142,61,204,30,234,203,159,254,34,126,169,77,253,229,26,5,235,242,45,158,19,57,216,116,243,77,228,81,70,98,93,120,119,126,164,220,214,17,121,57,29,33,119,140,246,54,135,3,27,138,30,48,100,236,58,102,64,45,180,24,91,129,214,239,212,123,105,229,208,141,108,36,186,5,178,43,155,172,10,240,64,95,97,47,86,178,220,5,254,47,189,176,47,196,91,110,101,73,227,109,148,223,89,246,240,115,136,45,184,160,8,12,99,53,193,23,177,3,243,159,161,141,246,129,188,43,122,4,198,235,77,88,223,60,46,132,70,37,216,166,228,249,93,58,187,82,174,56,205,67,31,233,177,149,2,92,76,81,177,28,41,244,37,45,72,12,202,191,60,252,5,67,77,146,174,153,16,170,53,88,144,184,154,200,84,228,166,215,157,236,86,167,212,124,176,215,98,151,228,160,180,4,157,43,205,94,199,63,136,230,103,94,50,55,121,109,207,241,119,109,143,197,161,208,245,6,140,43,82,84,156,58,76,49,224,140,236,189,17,254,112,70,15,35,110,11,76,30,38,50,45,165,77,58,155,171,47,209,100,179,141,90,56,79,128,166,12,0,219,242,70,58,48,5,96,209,145,255,211,8,129,76,214,223,120,94,205,127,114,142,8,161,245,156,63,67,99,194,248,162,48,74,27,89,93,106,38,144,41,1,7,206,152,36,161,77,21,242,110,87,120,13,140,115,240,76,208,165,90,150,221,35,133]',
  //   )
  //   const bytes = Uint8Array.from(encryptedData)
  //   const result = decryptBytes(password, bytes)
  //   console.log('result', bytesToString(result))
  // })
})
