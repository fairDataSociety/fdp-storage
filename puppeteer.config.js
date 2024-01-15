// const executablePath = `/usr/bin/${process.env.PUPPETEER_EXEC_PATH}`
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { executablePath } = require('puppeteer')
// eslint-disable-next-line no-console
console.log('process.env.PUPPETEER_EXEC_PATH', executablePath)
/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer-data'),
  skipDownload: false,
  executablePath: executablePath(),
}
