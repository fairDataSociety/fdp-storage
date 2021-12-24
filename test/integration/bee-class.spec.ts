import {FairdriveProtocol} from '../../src'

jest.setTimeout(200000)
describe('Bee class', () => {
  const fdp = new FairdriveProtocol('http://localhost:5050/')

  it('should strip trailing slash', () => {
    const fdp = new FairdriveProtocol('http://localhost:5050/')
    expect(fdp.bee.url).toEqual('http://localhost:5050')
  })

  describe('methods', () => {
    it('should login with exists user', async () => {
      await fdp.userImport('debug', '0xDd1AB1bA447D4D89A49d01386dbef99fB1005ED2')
      await fdp.userLogin('debug', 'debug')

      await fdp.userImport('demo', '0xF68FAcaEFc7DBc486a07B9a8f26a5085B3e74eb3')
      await fdp.userLogin('demo', 'demo')
    })
  })
})
