import { createFdp, generateRandomHexString, generateUser, sleep } from '../../../utils'
import { MAX_POD_NAME_LENGTH } from '../../../../src'
import { HIGHEST_LEVEL } from '../../../../src/feed/lookup/epoch'

jest.setTimeout(400000)
it.skip('Pods limitation check', async () => {
  const fdp = createFdp()
  generateUser(fdp)

  // todo should work with more updates than HIGHEST_LEVEL
  for (let i = 0; i < HIGHEST_LEVEL; i++) {
    const longPodName = generateRandomHexString(MAX_POD_NAME_LENGTH)
    await fdp.personalStorage.create(longPodName)
    await sleep(100)
  }
})
