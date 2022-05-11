import { generateRandomBase64String } from '../../../src/utils/string'

describe('utils/string', () => {
  it('generateRandomBase64String', () => {
    for (let i = 1; i <= 500; i++) {
      expect(generateRandomBase64String(i)).toHaveLength(i)
    }
  })
})
