import { Reference } from '@ethersphere/bee-js'
import { assertFullPathWithName, calcUploadBlockPercentage, extractPathInfo } from '../../../src/file/utils'
import { blocksToManifest } from '../../../src/file/adapter'
import { Block, Blocks } from '../../../src/file/types'

describe('file/utils', () => {
  it('blocksToManifest', () => {
    const examples = [
      {
        blocks: [
          {
            size: 17,
            compressedSize: 17,
            reference: '28d3de8a55d7543fa6f2e4819e806e9d2b4e1999703a63232f0aa8126fd24668' as Reference,
          },
        ] as Block[],
        result: {
          blocks: [
            {
              size: 17,
              compressedSize: 17,
              reference: { swarm: 'KNPeilXXVD+m8uSBnoBunStOGZlwOmMjLwqoEm/SRmg=' },
            },
          ],
        },
      },
      {
        blocks: [
          {
            size: 1000000,
            compressedSize: 1000000,
            reference: '086a49b869ba104f7a4522276a1f2e242be358da2f9aa34e337114933557769a',
          },
          {
            size: 1000000,
            compressedSize: 1000000,
            reference: 'f5ba3f738731be186207415b84bc0c8f830b0b1c043c17caced959b55a75ca49',
          },
          {
            size: 1000000,
            compressedSize: 1000000,
            reference: 'ecfcd59ae28f4be080053657787460986931819226404e3c008626c21618dafc',
          },
          {
            size: 1000000,
            compressedSize: 1000000,
            reference: '427e91f757f451839b4a64459ff392ad808198e8b328c25b9b9c8adf31575208',
          },
          {
            size: 1000000,
            compressedSize: 1000000,
            reference: '8dbe3f333d637ac5d74e7293e39ea9181dc5886d48e5846d0e14f6e303ec504a',
          },
          {
            size: 242880,
            compressedSize: 242880,
            reference: '4924c9fa5d0a0fccb9763c4877e214215522236a45451227bc6fda99fef35389',
          },
        ] as Block[],
        result: {
          blocks: [
            {
              size: 1000000,
              compressedSize: 1000000,
              reference: { swarm: 'CGpJuGm6EE96RSInah8uJCvjWNovmqNOM3EUkzVXdpo=' },
            },
            {
              size: 1000000,
              compressedSize: 1000000,
              reference: { swarm: '9bo/c4cxvhhiB0FbhLwMj4MLCxwEPBfKztlZtVp1ykk=' },
            },
            {
              size: 1000000,
              compressedSize: 1000000,
              reference: { swarm: '7PzVmuKPS+CABTZXeHRgmGkxgZImQE48AIYmwhYY2vw=' },
            },
            {
              size: 1000000,
              compressedSize: 1000000,
              reference: { swarm: 'Qn6R91f0UYObSmRFn/OSrYCBmOizKMJbm5yK3zFXUgg=' },
            },
            {
              size: 1000000,
              compressedSize: 1000000,
              reference: { swarm: 'jb4/Mz1jesXXTnKT456pGB3FiG1I5YRtDhT24wPsUEo=' },
            },
            {
              size: 242880,
              compressedSize: 242880,
              reference: { swarm: 'SSTJ+l0KD8y5djxId+IUIVUiI2pFRRInvG/amf7zU4k=' },
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

  it('calcUploadBlockPercentage', () => {
    const examples = [
      {
        blockId: 0,
        totalBlocks: 6,
        expectedPercentage: 17,
      },
      {
        blockId: 1,
        totalBlocks: 6,
        expectedPercentage: 33,
      },
      {
        blockId: 2,
        totalBlocks: 6,
        expectedPercentage: 50,
      },
      {
        blockId: 3,
        totalBlocks: 6,
        expectedPercentage: 67,
      },
      {
        blockId: 4,
        totalBlocks: 6,
        expectedPercentage: 83,
      },
      {
        blockId: 5,
        totalBlocks: 6,
        expectedPercentage: 100,
      },
      {
        blockId: 0,
        totalBlocks: 0,
        expectedPercentage: 0,
      },
      {
        blockId: 0,
        totalBlocks: -5,
        expectedPercentage: 0,
      },
      {
        blockId: -1,
        totalBlocks: 1,
        expectedPercentage: 0,
      },
    ]

    for (const example of examples) {
      expect(calcUploadBlockPercentage(example.blockId, example.totalBlocks)).toEqual(example.expectedPercentage)
    }
  })
})
