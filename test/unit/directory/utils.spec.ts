import { combine, getPathFromParts, getPathParts } from '../../../src/directory/utils'

describe('directory/utils', () => {
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
})
