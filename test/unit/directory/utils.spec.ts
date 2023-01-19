import {
  assertDirectoryName,
  combine,
  FileInfo,
  FileSystemType,
  filterBrowserRecursiveFiles,
  filterDotFiles,
  browserFileListToFileInfoList,
  getDirectoriesToCreate,
  getNodeFileInfoList,
  getPathFromParts,
  getPathParts,
  getUploadPath,
} from '../../../src/directory/utils'
import path from 'path'
import { makeFileList } from '../../utils'

describe('directory/utils', () => {
  it('getUploadPath', () => {
    const paths1 = [
      {
        input: {
          fileSystemType: FileSystemType.browser,
          fullPath: '',
          relativePath: 'file2.txt',
          relativePathWithBase: 'test/file2.txt',
        },
        includeBase: true,
        output: '/test/file2.txt',
      },
      {
        input: {
          fileSystemType: FileSystemType.browser,
          fullPath: '',
          relativePath: 'file2.txt',
          relativePathWithBase: 'test/file2.txt',
        },
        includeBase: false,
        output: '/file2.txt',
      },
      {
        input: {
          fileSystemType: FileSystemType.browser,
          fullPath: '',
          relativePath: 'test-1/file1.txt',
          relativePathWithBase: 'test/test-1/file1.txt',
        },
        includeBase: true,
        output: '/test/test-1/file1.txt',
      },
      {
        input: {
          fileSystemType: FileSystemType.browser,
          fullPath: '',
          relativePath: 'test-1/file1.txt',
          relativePathWithBase: 'test/test-1/file1.txt',
        },
        includeBase: false,
        output: '/test-1/file1.txt',
      },
    ]

    for (const item of paths1) {
      expect(getUploadPath(item.input, item.includeBase)).toEqual(item.output)
    }
  })

  it('filterBrowserRecursiveFiles', () => {
    const paths1 = [
      {
        fileSystemType: FileSystemType.browser,
        fullPath: '',
        relativePath: 'file1.txt',
        relativePathWithBase: 'test/file1.txt',
      },
      {
        fileSystemType: FileSystemType.browser,
        fullPath: '',
        relativePath: 'file2.txt',
        relativePathWithBase: 'test/file2.txt',
      },
      {
        fileSystemType: FileSystemType.browser,
        fullPath: '',
        relativePath: 'test-1/file1.txt',
        relativePathWithBase: 'test/test-1/file1.txt',
      },
      {
        fileSystemType: FileSystemType.browser,
        fullPath: '',
        relativePath: 'test-1/.file1.txt',
        relativePathWithBase: 'test/test-1/.file1.txt',
      },
      {
        fileSystemType: FileSystemType.browser,
        fullPath: '',
        relativePath: 'test-1/test-2/.DS_Store',
        relativePathWithBase: 'test/test-1/test-2/.DS_Store',
      },
    ]

    const result1 = filterBrowserRecursiveFiles(paths1)
    expect(result1).toHaveLength(2)
    expect(result1.find(item => item.relativePath === 'file1.txt')).toBeDefined()
    expect(result1.find(item => item.relativePath === 'file2.txt')).toBeDefined()
  })

  it('filterFileInfoStartingWithDot', () => {
    const paths1 = [
      {
        fileSystemType: FileSystemType.browser,
        fullPath: '',
        relativePath: 'file1.txt',
        relativePathWithBase: 'test/file1.txt',
      },
      {
        fileSystemType: FileSystemType.browser,
        fullPath: '',
        relativePath: 'file2.txt',
        relativePathWithBase: 'test/file2.txt',
      },
      {
        fileSystemType: FileSystemType.browser,
        fullPath: '',
        relativePath: 'test-1/file1.txt',
        relativePathWithBase: 'test/test-1/file1.txt',
      },
      {
        fileSystemType: FileSystemType.browser,
        fullPath: '',
        relativePath: '.file1.txt',
        relativePathWithBase: 'test/.file1.txt',
      },
      {
        fileSystemType: FileSystemType.browser,
        fullPath: '',
        relativePath: 'test-1/.file1.txt',
        relativePathWithBase: 'test/test-1/.file1.txt',
      },
      {
        fileSystemType: FileSystemType.browser,
        fullPath: '',
        relativePath: 'test-1/test-2/.DS_Store',
        relativePathWithBase: 'test/test-1/test-2/.DS_Store',
      },
    ]

    const result1 = filterDotFiles(paths1)
    expect(result1).toHaveLength(3)
    expect(result1.find(item => item.relativePath === 'file1.txt')).toBeDefined()
    expect(result1.find(item => item.relativePath === 'file2.txt')).toBeDefined()
    expect(result1.find(item => item.relativePath === 'test-1/file1.txt')).toBeDefined()
  })

  it('getDirectoriesToCreate', () => {
    const paths1 = [
      'hello/world/test/file1.txt',
      'hello/world/test/file2.txt',
      'hello/world/file1.txt',
      'hello/file1.txt',
    ]
    const paths2 = [
      'three/four/five/file4.txt',
      'one/file1.txt',
      'two/file2.txt',
      'three/file3.txt',
      'three/four/file4.txt',
    ]
    const paths3 = ['three/four/five/file4.txt']
    const paths4 = ['file4.txt']
    const result1 = getDirectoriesToCreate(paths1)
    expect(result1).toEqual(['/hello', '/hello/world', '/hello/world/test'])

    const result2 = getDirectoriesToCreate(paths2)
    expect(result2).toEqual(['/three', '/three/four', '/three/four/five', '/one', '/two'])

    const result3 = getDirectoriesToCreate(paths3)
    expect(result3).toEqual(['/three', '/three/four', '/three/four/five'])

    const result4 = getDirectoriesToCreate(paths4)
    expect(result4).toEqual([])

    expect(getDirectoriesToCreate([])).toEqual([])
  })

  it('getBrowserFileInfoList for browser', async () => {
    const file1 = {
      webkitRelativePath: 'test/file1.txt',
    } as File
    const file2 = {
      webkitRelativePath: 'test/file2.txt',
    } as File
    const file3 = {
      webkitRelativePath: 'test/test-1/file1.txt',
    } as File
    const fileIncorrect1 = {
      webkitRelativePath: 'file1.txt',
    } as File
    const fileIncorrect2 = {} as File

    expect(browserFileListToFileInfoList(makeFileList([]))).toEqual([])
    expect(() => browserFileListToFileInfoList(makeFileList([fileIncorrect1]))).toThrow(
      `"webkitRelativePath" does not contain base path part: "file1.txt"`,
    )
    expect(() => browserFileListToFileInfoList(makeFileList([fileIncorrect2]))).toThrow(
      '"webkitRelativePath" property should be a string',
    )

    const files = makeFileList([file1, file2, file3])
    const result1 = browserFileListToFileInfoList(files)
    expect(result1).toEqual([
      {
        fileSystemType: FileSystemType.browser,
        fullPath: '',
        relativePath: 'file1.txt',
        relativePathWithBase: 'test/file1.txt',
        browserFile: file1,
      },
      {
        fileSystemType: FileSystemType.browser,
        fullPath: '',
        relativePath: 'file2.txt',
        relativePathWithBase: 'test/file2.txt',
        browserFile: file2,
      },
      {
        fileSystemType: FileSystemType.browser,
        fullPath: '',
        relativePath: 'test-1/file1.txt',
        relativePathWithBase: 'test/test-1/file1.txt',
        browserFile: file3,
      },
    ])
  })

  it('getNodeFileInfoList for node', async () => {
    const fullPath = path.resolve(__dirname, '../../data-unit/directory-utils')
    const fullPathIncorrect = path.resolve(__dirname, '../../data-unit/778899')
    const listNoRecursive = await getNodeFileInfoList(fullPath, false)
    const expectData1 = [
      {
        fileSystemType: FileSystemType.node,
        fullPath: `${fullPath}/file1.txt`,
        relativePath: 'file1.txt',
        relativePathWithBase: 'directory-utils/file1.txt',
      },
      {
        fileSystemType: FileSystemType.node,
        fullPath: `${fullPath}/file2.txt`,
        relativePath: 'file2.txt',
        relativePathWithBase: 'directory-utils/file2.txt',
      },
    ] as FileInfo[]
    expect(listNoRecursive).toEqual(expectData1)

    const listRecursive = await getNodeFileInfoList(fullPath, true)
    expect(listRecursive).toEqual([
      {
        fileSystemType: FileSystemType.node,
        fullPath: `${fullPath}/dir1/dir1-1/file1-1-1.txt`,
        relativePath: 'dir1/dir1-1/file1-1-1.txt',
        relativePathWithBase: 'directory-utils/dir1/dir1-1/file1-1-1.txt',
      },
      {
        fileSystemType: FileSystemType.node,
        fullPath: `${fullPath}/dir2/file2-1.txt`,
        relativePath: 'dir2/file2-1.txt',
        relativePathWithBase: 'directory-utils/dir2/file2-1.txt',
      },
      {
        fileSystemType: FileSystemType.node,
        fullPath: `${fullPath}/file1.txt`,
        relativePath: 'file1.txt',
        relativePathWithBase: 'directory-utils/file1.txt',
      },
      {
        fileSystemType: FileSystemType.node,
        fullPath: `${fullPath}/file2.txt`,
        relativePath: 'file2.txt',
        relativePathWithBase: 'directory-utils/file2.txt',
      },
    ])
    await expect(getNodeFileInfoList(fullPathIncorrect, true)).rejects.toThrow(
      `Directory does not exist: "${fullPathIncorrect}"`,
    )
    await expect(getNodeFileInfoList('', true)).rejects.toThrow(`Directory does not exist: ""`)
  })

  it('getPathParts', () => {
    const examples = [
      {
        data: '',
        error: 'Path is empty',
      },
      {
        data: 'a/b/c',
        error: 'Incorrect path',
      },
      {
        data: 'a',
        error: 'Incorrect path',
      },
      {
        data: '/',
        result: ['/'],
      },
      {
        data: '/a/b/c',
        result: ['/', 'a', 'b', 'c'],
      },
    ]

    for (const example of examples) {
      if (example.error) {
        expect(() => getPathParts(example.data)).toThrow(example.error)
      } else {
        expect(getPathParts(example.data)).toEqual(example.result)
      }
    }
  })

  it('getPathFromParts', () => {
    const examples = [
      {
        data: {
          parts: ['/', 'a', 'b', 'c'],
          minus: 1,
        },
        result: '/a/b',
      },
      {
        data: {
          parts: ['/', 'a', 'b', 'c'],
          minus: 3,
        },
        result: '/',
      },
      {
        data: {
          parts: ['/', 'a', 'b', 'c'],
          minus: 0,
        },
        result: '/a/b/c',
      },
      {
        data: {
          parts: ['/'],
          minus: 0,
        },
        result: '/',
      },
      {
        data: {
          parts: ['a', 'b', 'c'],
          minus: 0,
        },
        error: 'Path parts must start with "/"',
      },
      {
        data: {
          parts: ['/', 'a', 'b', 'c'],
          minus: 4,
        },
        error: 'Incorrect parts count',
      },
      {
        data: {
          parts: ['/'],
          minus: 1,
        },
        error: 'Incorrect parts count',
      },
      {
        data: {
          parts: [],
          minus: 3,
        },
        error: 'Parts list is empty',
      },
    ]

    for (const example of examples) {
      if (example.error) {
        expect(() => getPathFromParts(example.data.parts, example.data.minus)).toThrow(example.error)
      } else {
        expect(getPathFromParts(example.data.parts, example.data.minus)).toEqual(example.result)
      }
    }
  })

  it('combine', () => {
    const examples = [
      // root parent + root
      {
        data: ['', '/'],
        result: '/',
      },
      // directories + file
      {
        data: ['a', 'b', 'c', 'test.txt'],
        result: '/a/b/c/test.txt',
      },
      // root + directory
      {
        data: ['/', 'one'],
        result: '/one',
      },
      // parent + directory
      {
        data: ['/one', 'one_1'],
        result: '/one/one_1',
      },
    ]

    for (const example of examples) {
      expect(combine(...example.data)).toEqual(example.result)
    }
  })

  it('assertDirectoryName', () => {
    const examples = [
      {
        data: 'hello',
      },
      {
        data: 'hello ',
      },
      {
        data: ' hello',
      },
      {
        data: 'he  llo',
      },
      {
        data: 'john-doe.txt',
      },
      {
        data: 'john/doe.txt',
        error: 'Name contains "/" symbol',
      },
    ]

    for (const example of examples) {
      if (example.error) {
        expect(() => assertDirectoryName(example.data)).toThrow(example.error)
      } else {
        assertDirectoryName(example.data)
      }
    }
  })
})
