import { Reference } from '@ethersphere/bee-js'
import { assertFullPathWithName, extractPathInfo } from '../../../src/file/utils'
import { blocksToManifest } from '../../../src/file/adapter'
import { Blocks } from '../../../src/file/types'

describe('file/utils', () => {
  it('blocksToManifestString', () => {
    const examples = [
      {
        size: 17,
        reference: '28d3de8a55d7543fa6f2e4819e806e9d2b4e1999703a63232f0aa8126fd24668' as Reference,
        result:
          '{"Blocks":[{"Name":"block-00000","Size":17,"CompressedSize":17,"Reference":{"R":"KNPeilXXVD+m8uSBnoBunStOGZlwOmMjLwqoEm/SRmg="}}]}',
      },
    ]

    for (const example of examples) {
      const blocks: Blocks = {
        blocks: [],
      }
      blocks.blocks.push({
        name: 'block-00000',
        size: example.size,
        compressedSize: example.size,
        reference: example.reference,
      })
      expect(blocksToManifest(blocks)).toEqual(example.result)
    }
  })

  it('assertFullPathWithName', () => {
    const examples = [
      {
        path: 'a/b/c',
        isError: true,
        error: 'Path must start with "/"',
      },
      {
        path: ' ',
        isError: true,
        error: 'Path to contain characters that can be truncated',
      },
      {
        path: '/',
        isError: true,
        error: 'File or directory name is empty',
      },
      {
        path: '/a/b/c',
      },
    ]

    for (const example of examples) {
      if (example.isError) {
        expect(example.error).toBeDefined()
        expect(() => assertFullPathWithName(example.path)).toThrow(example.error)
      } else {
        assertFullPathWithName(example.path)
      }
    }
  })

  it('extractPathInfo', () => {
    const examples = [
      {
        data: '/',
        error: 'File or directory name is empty',
      },
      {
        data: 'hello',
        error: 'Path must start with "/"',
      },
      {
        data: '/file.txt',
        result: {
          filename: 'file.txt',
          path: '/',
        },
      },
      {
        data: '/a/file1.txt',
        result: {
          filename: 'file1.txt',
          path: '/a',
        },
      },
      {
        data: '/a/b/c/d/file2.txt',
        result: {
          filename: 'file2.txt',
          path: '/a/b/c/d',
        },
      },
      {
        data: '/directory and spaces/file3.txt',
        result: {
          filename: 'file3.txt',
          path: '/directory and spaces',
        },
      },
      {
        data: '/dir/filewithoutextension',
        result: {
          filename: 'filewithoutextension',
          path: '/dir',
        },
      },
      {
        data: '/dir/file with spaces',
        result: {
          filename: 'file with spaces',
          path: '/dir',
        },
      },
    ]

    for (const example of examples) {
      if (example.error) {
        expect(() => extractPathInfo(example.data)).toThrow(example.error)
      } else {
        expect(extractPathInfo(example.data)).toEqual(example.result)
      }
    }
  })
})
