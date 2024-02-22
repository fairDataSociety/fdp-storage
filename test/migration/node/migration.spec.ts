import { batchId, beeUrl, createFdp, generateUser } from '../../utils'
import { wrapBytesWithHelpers } from '../../../src/utils/bytes'
import { installFdpStorageV1 } from './fdp-storage-v1-install'
import { runCommand } from '../../utils/system'

describe('Migration tests', () => {
  beforeAll(async () => {
    await installFdpStorageV1()
  })

  it('V1 pods, directories and files should be migrated to V2', async () => {
    const fdp = createFdp()
    const { mnemonic } = generateUser(fdp)

    await runCommand(`node test/migration/node/prepare-data.ts "${mnemonic}" "${beeUrl()}" "${batchId()}"`)

    const pods = await fdp.personalStorage.list()

    expect(pods.pods.length).toEqual(2)

    const pod = pods.pods[0]

    const folder1 = await fdp.directory.read(pod.name, '/folder1')

    expect(folder1.directories.length).toEqual(1)
    expect(folder1.directories[0].name).toEqual('folder2')

    expect(folder1.files.length).toEqual(1)
    expect(folder1.files[0].name).toEqual('file2.txt')

    const folder2 = await fdp.directory.read(pod.name, '/folder1/folder2')

    expect(folder2.directories.length).toEqual(1)
    expect(folder2.files.length).toEqual(0)

    const root = await fdp.directory.read(pod.name, '/')

    expect(root.directories.length).toEqual(1)
    expect(root.directories[0].name).toEqual('folder1')

    expect(root.files.length).toEqual(1)
    expect(root.files[0].name).toEqual('file1.txt')

    const file1 = await fdp.file.downloadData(pod.name, '/file1.txt')

    expect(wrapBytesWithHelpers(file1).text()).toEqual('nakamoto\n')

    let deepDir = await fdp.directory.read(pod.name, '/folder1/folder2/3/4/5')

    expect(deepDir.directories.length).toEqual(0)
    expect(deepDir.files.length).toEqual(1)
    expect(deepDir.files[0].name).toEqual('file2.txt')

    deepDir = await fdp.directory.read(pod.name, '/folder1/folder2/3')

    expect(deepDir.directories.length).toEqual(1)
    expect(deepDir.files.length).toEqual(0)
  })
})
