// eslint-disable-next-line @typescript-eslint/no-var-requires
const { executablePath } = require('puppeteer')
console.log('executablePath', executablePath())
module.exports = {
  launch: {
    dumpio: true, // Forwards browser console into test console for easier debugging
    headless: 'new', // Opt-in to the new headless mode for Chrome
    executablePath: executablePath(),
  },
}
