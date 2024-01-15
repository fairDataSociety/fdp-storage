// eslint-disable-next-line @typescript-eslint/no-var-requires
const { join } = require('path')

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer-data'),
  skipDownload: false,
}
