// eslint-disable-next-line no-console
console.log('process.env.PUPPETEER_EXEC_PATH', process.env.PUPPETEER_EXEC_PATH)
/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer.
  // cacheDirectory: join(__dirname, '.cache', 'puppeteer-data'),
  executablePath: process.env.PUPPETEER_EXEC_PATH,
}
