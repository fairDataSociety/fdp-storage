/**
 * Base64 polyfill for Node.js environments
 *
 * This provides atob/btoa compatibility for Node.js < 18
 * Node.js 18+ has these built-in, but webpack bundling may not expose them properly
 *
 * Fixes: https://github.com/fairDataSociety/fdp-storage/issues/244
 */

// Only polyfill if not already available
if (typeof globalThis.atob === 'undefined') {
  globalThis.atob = (str: string): string => {
    return Buffer.from(str, 'base64').toString('binary')
  }
}

if (typeof globalThis.btoa === 'undefined') {
  globalThis.btoa = (str: string): string => {
    return Buffer.from(str, 'binary').toString('base64')
  }
}

export {}
