import { access, readFile, writeFile } from 'fs/promises'
import { runCommand } from '../../utils/system'

async function removePuppeteerDependency() {
  const packageJsonPath = 'test/fdp-storage/package.json'
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))

  delete packageJson.devDependencies['@types/expect-puppeteer']
  delete packageJson.devDependencies['@types/jest-environment-puppeteer']
  delete packageJson.devDependencies['jest-puppeteer']
  delete packageJson.devDependencies['puppeteer']

  await writeFile(packageJsonPath, JSON.stringify(packageJson))
}

export async function installFdpStorageV1() {
  try {
    await access('test/fdp-storage')

    return
    // eslint-disable-next-line no-empty
  } catch (error) {}

  await runCommand(`cd test && git clone -b test/v1-test-branch https://github.com/fairDataSociety/fdp-storage.git`)

  await removePuppeteerDependency()

  await runCommand('cd test/fdp-storage && npm install')

  await runCommand('cd test/fdp-storage && npm run compile:node && npm run compile:types')
}
