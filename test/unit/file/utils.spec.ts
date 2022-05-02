import { Reference } from '@ethersphere/bee-js'
import { assertFullPathWithName, extractPathInfo } from '../../../src/file/utils'
import { blocksToManifest } from '../../../src/file/adapter'
import { Block, Blocks } from '../../../src/file/types'

describe('file/utils', () => {
  it('blocksToManifest', () => {
    const examples = [
      {
        blocks: [
          {
            name: 'block-00000',
            size: 17,
            compressedSize: 17,
            reference: '28d3de8a55d7543fa6f2e4819e806e9d2b4e1999703a63232f0aa8126fd24668' as Reference,
          },
        ] as Block[],
        result: {
          Blocks: [
            {
              Name: 'block-00000',
              Size: 17,
              CompressedSize: 17,
              Reference: { R: 'KNPeilXXVD+m8uSBnoBunStOGZlwOmMjLwqoEm/SRmg=' },
            },
          ],
        },
      },
      {
        blocks: [
          {
            name: 'block-00000',
            size: 1000000,
            compressedSize: 1000000,
            reference: '086a49b869ba104f7a4522276a1f2e242be358da2f9aa34e337114933557769a',
          },
          {
            name: 'block-00001',
            size: 1000000,
            compressedSize: 1000000,
            reference: 'f5ba3f738731be186207415b84bc0c8f830b0b1c043c17caced959b55a75ca49',
          },
          {
            name: 'block-00002',
            size: 1000000,
            compressedSize: 1000000,
            reference: 'ecfcd59ae28f4be080053657787460986931819226404e3c008626c21618dafc',
          },
          {
            name: 'block-00003',
            size: 1000000,
            compressedSize: 1000000,
            reference: '427e91f757f451839b4a64459ff392ad808198e8b328c25b9b9c8adf31575208',
          },
          {
            name: 'block-00004',
            size: 1000000,
            compressedSize: 1000000,
            reference: '8dbe3f333d637ac5d74e7293e39ea9181dc5886d48e5846d0e14f6e303ec504a',
          },
          {
            name: 'block-00005',
            size: 242880,
            compressedSize: 242880,
            reference: '4924c9fa5d0a0fccb9763c4877e214215522236a45451227bc6fda99fef35389',
          },
        ] as Block[],
        result: {
          Blocks: [
            {
              Name: 'block-00000',
              Size: 1000000,
              CompressedSize: 1000000,
              Reference: { R: 'CGpJuGm6EE96RSInah8uJCvjWNovmqNOM3EUkzVXdpo=' },
            },
            {
              Name: 'block-00001',
              Size: 1000000,
              CompressedSize: 1000000,
              Reference: { R: '9bo/c4cxvhhiB0FbhLwMj4MLCxwEPBfKztlZtVp1ykk=' },
            },
            {
              Name: 'block-00002',
              Size: 1000000,
              CompressedSize: 1000000,
              Reference: { R: '7PzVmuKPS+CABTZXeHRgmGkxgZImQE48AIYmwhYY2vw=' },
            },
            {
              Name: 'block-00003',
              Size: 1000000,
              CompressedSize: 1000000,
              Reference: { R: 'Qn6R91f0UYObSmRFn/OSrYCBmOizKMJbm5yK3zFXUgg=' },
            },
            {
              Name: 'block-00004',
              Size: 1000000,
              CompressedSize: 1000000,
              Reference: { R: 'jb4/Mz1jesXXTnKT456pGB3FiG1I5YRtDhT24wPsUEo=' },
            },
            {
              Name: 'block-00005',
              Size: 242880,
              CompressedSize: 242880,
              Reference: { R: 'SSTJ+l0KD8y5djxId+IUIVUiI2pFRRInvG/amf7zU4k=' },
            },
          ],
        },
      },
    ]

    for (const example of examples) {
      const blocks: Blocks = {
        blocks: example.blocks,
      }
      expect(JSON.parse(blocksToManifest(blocks))).toStrictEqual(example.result)
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
