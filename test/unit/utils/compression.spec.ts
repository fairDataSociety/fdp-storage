import { compress, decompress } from '../../../src/utils/compression'
import { bytesToString, stringToBytes } from '../../../src/utils/bytes'
import { Utils } from '@ethersphere/bee-js'

describe('utils/compression', () => {
  it('should compress and decompress', () => {
    const data = 'Hello world'
    const compressed = compress(stringToBytes(data))
    expect(compressed).not.toEqual(data)

    const decompressed = decompress(compressed)
    expect(bytesToString(decompressed)).toEqual(data)
  })

  it('should decompress fairos compression', () => {
    const data = 'Hello world'
    const fairosCompressed = Utils.hexToBytes(
      '1f8b080000096e8800ff000b00f4ff48656c6c6f20776f726c64000000ffff0300529ed68b0b000000',
    )

    const decompressed = decompress(fairosCompressed)
    expect(bytesToString(decompressed)).toEqual(data)
  })
})
