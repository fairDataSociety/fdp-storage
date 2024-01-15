// eslint-disable-next-line @typescript-eslint/no-var-requires
const { join } = require('path')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { executablePath } = require('puppeteer')

// eslint-disable-next-line no-console
console.log('executablePath2', executablePath())

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer-data'),
  skipDownload: false,
}
