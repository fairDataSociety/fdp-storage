import { createFdp, generateRandomHexString, generateUser } from '../../../utils'
import { MAX_POD_NAME_LENGTH } from '../../../../src/pod/utils'

jest.setTimeout(400000)
it('Pod list size error message', async () => {
  const fdp = createFdp()
  generateUser(fdp)

  for (let i = 0; i < 25; i++) {
    const longPodName = generateRandomHexString(MAX_POD_NAME_LENGTH)

    if (i === 24) {
      await expect(fdp.personalStorage.create(longPodName)).rejects.toThrow('Exceeded pod list size by 46 bytes')
    } else {
      await fdp.personalStorage.create(longPodName)
    }
  }
})
