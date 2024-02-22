/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
const fdpV1 = require('../../fdp-storage/dist/index.js')
const path = require('path')
const { readFileSync } = require('fs')

const filesPath = path.resolve(__dirname, '../../data-unit/directory-utils')

async function run() {
  const mnemonic = process.argv[2]
  const beeUrl = process.argv[3]
  const batchId = process.argv[4]

  const fdp = new fdpV1.FdpStorage(beeUrl, batchId)

  fdp.account.setAccountFromMnemonic(mnemonic)

  await fdp.personalStorage.create('pod1')

  await fdp.personalStorage.create('pod2')

  await fdp.file.uploadData('pod1', '/file1.txt', readFileSync(filesPath + '/file1.txt'))

  await fdp.directory.create('pod1', '/folder1')

  await fdp.file.uploadData('pod1', '/folder1/file2.txt', readFileSync(filesPath + '/file2.txt'))

  await fdp.directory.create('pod1', '/folder1/folder2')
}

run()
  .then(() => {
    console.log('Success')
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
