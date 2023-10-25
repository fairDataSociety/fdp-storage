import crypto from 'crypto'
import { isNode } from './utils'

const getRandomValuesNode = <T extends ArrayBufferView | null>(array: T): T => {
  const isUint32Array = array instanceof Uint32Array

  if (!(array instanceof Uint8Array || isUint32Array)) {
    throw new TypeError('Expected Uint8Array or Uint32Array')
  }

  if (array.length > 65536) {
    const e = new Error()
    e.message = `Failed to execute 'getRandomValues' on 'Crypto': The ArrayBufferView's byte length (${array.length}) exceeds the number of bytes of entropy available via this API (65536).`
    e.name = 'QuotaExceededError'
    throw e
  }

  if (isUint32Array) {
    array.set(new Uint32Array(crypto.randomBytes(array.byteLength).buffer))
  } else {
    array.set(crypto.randomBytes(array.length))
  }

  return array
}

if (isNode() && globalThis) {
  globalThis.crypto = { ...globalThis.crypto, getRandomValues: getRandomValuesNode }
}
