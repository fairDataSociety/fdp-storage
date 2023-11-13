/**
 * Detects current environment is node or not
 */
export function isNode(): boolean {
  // `process.versions.node` is defined for Node.js
  // most of js frameworks have no `process.versions` property, but in some there is an empty object in `process.versions`
  return typeof process !== 'undefined' && Boolean(process?.versions?.node)
}
