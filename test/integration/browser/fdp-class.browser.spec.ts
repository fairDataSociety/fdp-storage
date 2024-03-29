import { join } from 'path'
import { batchId, beeUrl, createFdp, fdpOptions, generateRandomHexString, generateUser } from '../../utils'
import '../../../src'
import '../../index'
import { FdpStorage, MAX_POD_NAME_LENGTH } from '../../../src'
import { Pod, PodShareInfo, RawFileMetadata } from '../../../src/pod/types'
import { FileShareInfo } from '../../../src/file/types'
import { BatchId, Reference } from '@ethersphere/bee-js'
import { ETH_ADDR_HEX_LENGTH } from '../../../src/utils/type'

jest.setTimeout(400000)
describe('Fair Data Protocol class - in browser', () => {
  const BEE_URL = beeUrl()

  beforeAll(async () => {
    await jestPuppeteer.resetPage()
    const testPage = join(__dirname, '..', 'testpage', 'testpage.html')
    await page.goto(`file://${testPage}`)

    await page.exposeFunction(
      'initFdp',
      (): string =>
        `window.shouldFail = async (
            method,
            message,
            failMessage = 'Method should fail',
          ) => {
            try {
              await method
              fail(failMessage)
            } catch (e) {
              if (e instanceof Error && e.message === message) {
                return
              }

              throw e
            }
        };

        window.topUpAddress = async (fdp) => {
            if (!fdp.account.wallet?.address) {
              throw new Error('Address is not defined')
            }

            const account = (await fdp.ens.provider.listAccounts())[0]
            const txHash = await fdp.ens.provider.send('eth_sendTransaction', [
              {
                from: account,
                to: fdp.account.wallet.address,
                value: '0x2386f26fc10000', // 0.01 ETH
              },
            ])

            await fdp.ens.provider.waitForTransaction(txHash)
        }

        new window.fdp.FdpStorage('${BEE_URL}', '${batchId()}', ${JSON.stringify(fdpOptions)})`,
    )
  })

  it('should strip trailing slash', async () => {
    const urls = await page.evaluate(async (batchId: BatchId) => {
      const fdp = new window.fdp.FdpStorage('http://localhost:1633/', batchId)

      return {
        beeUrl: fdp.connection.bee.url,
      }
    }, batchId())

    expect(urls.beeUrl).toBe('http://localhost:1633')
  })

  it('fdp-contracts is not empty', async () => {
    const result = await page.evaluate(async () => {
      const fdpContracts = window.fdp.FdpContracts

      return {
        isFdpContractsEmpty: !Boolean(fdpContracts),
        isENSEmpty: !Boolean(fdpContracts.ENS),
      }
    })

    expect(result.isFdpContractsEmpty).toBe(false)
    expect(result.isENSEmpty).toBe(false)
  })

  describe('Registration', () => {
    it('should create account wallet', async () => {
      const result = await page.evaluate(async () => {
        const fdp = eval(await window.initFdp()) as FdpStorage

        const wallet = fdp.account.createWallet()
        await window.shouldFail((async () => fdp.account.createWallet())(), 'Wallet already created')

        return { address: wallet.address, privateKey: wallet.privateKey }
      })

      expect(result.address).toBeDefined()
      expect(result.privateKey).toBeDefined()
    })

    it('should fail on zero balance', async () => {
      const user = generateUser()

      await page.evaluate(async user => {
        user = JSON.parse(user)
        const fdp = eval(await window.initFdp()) as FdpStorage

        fdp.account.createWallet()
        await window.shouldFail(
          fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password)),
          'Not enough funds',
        )
      }, JSON.stringify(user))
    })

    it('should register users', async () => {
      const usersList = [generateUser(), generateUser()]
      const createdUsers = await page.evaluate(async users => {
        users = JSON.parse(users)
        const fdp = eval(await window.initFdp()) as FdpStorage

        await window.shouldFail(
          fdp.account.register(fdp.account.createRegistrationRequest('username', 'password')),
          'Account wallet not found',
        )

        const result: { reference: Reference }[] = []
        for (const user of users) {
          const fdp = eval(await window.initFdp()) as FdpStorage

          fdp.account.createWallet()
          await window.topUpAddress(fdp)
          const data = await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
          result.push({
            reference: data,
          })

          await fdp.account.login(user.username, user.password)
        }

        return result
      }, JSON.stringify(usersList))

      for (const createdUser of createdUsers) {
        expect(createdUser).toBeDefined()
      }
    })

    it('should throw when registering already registered user', async () => {
      await page.evaluate(async user => {
        user = JSON.parse(user)
        const fdp = eval(await window.initFdp()) as FdpStorage
        fdp.account.createWallet()
        await window.topUpAddress(fdp)

        await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
        await window.shouldFail(
          fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password)),
          `ENS: Username ${user.username} is not available`,
        )
      }, JSON.stringify(generateUser()))
    })
  })

  describe('Login', () => {
    it('should login with existing user', async () => {
      const user = generateUser()
      const answer = await page.evaluate(async user => {
        user = JSON.parse(user)
        const result = {} as {
          result1: { address: string }
          result2: { address: string }
          createdWallet: { address: string }
        }
        const fdp = eval(await window.initFdp()) as FdpStorage
        const fdp1 = eval(await window.initFdp()) as FdpStorage
        const wallet = fdp.account.createWallet()
        result.createdWallet = { address: wallet.address }
        await window.topUpAddress(fdp)

        const data = await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))
        result.result1 = { address: data }

        const data2 = await fdp1.account.login(user.username, user.password)
        result.result2 = { address: data2.address }

        return result
      }, JSON.stringify(user))

      expect(answer.result1.address).toBeDefined()
      expect(answer.result2.address).toEqual(answer.createdWallet.address)
    })

    it('should throw when username is not registered', async () => {
      const user = generateUser()

      await page.evaluate(async fakeUser => {
        fakeUser = JSON.parse(fakeUser)
        const fdp = eval(await window.initFdp()) as FdpStorage

        await window.shouldFail(
          fdp.account.login(fakeUser.username, fakeUser.password),
          `Username "${fakeUser.username}" does not exist`,
        )
      }, JSON.stringify(user))
    })

    it('should throw when password is not correct', async () => {
      const user = generateUser()
      const user1 = generateUser()

      await page.evaluate(
        async (user, user1) => {
          user = JSON.parse(user)
          user1 = JSON.parse(user1)
          const fdp = eval(await window.initFdp()) as FdpStorage
          fdp.account.createWallet()
          await window.topUpAddress(fdp)

          await fdp.account.register(fdp.account.createRegistrationRequest(user.username, user.password))

          await window.shouldFail(fdp.account.login(user.username, user1.password), 'Incorrect password')
          await window.shouldFail(fdp.account.login(user.username, ''), 'Incorrect password')
        },
        JSON.stringify(user),
        JSON.stringify(user1),
      )
    })
  })

  describe('Pods', () => {
    it('should get empty pods list', async () => {
      const answer = await page.evaluate(async () => {
        const fdp = eval(await window.initFdp()) as FdpStorage
        fdp.account.createWallet()

        return (await fdp.personalStorage.list()).pods
      })

      expect(answer).toEqual([])
    })

    it('should create pods', async () => {
      const longPodName = generateRandomHexString(MAX_POD_NAME_LENGTH + 1)
      const commaPodName = generateRandomHexString() + ', ' + generateRandomHexString()

      interface IterationResult {
        result: { name: string; index: number }
        example: {
          name: string
          index: number
        }
        list: unknown[]
      }

      const { result, mnemonic } = await page.evaluate(
        async (longPodName: string, commaPodName: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          const wallet = fdp.account.createWallet()

          await window.shouldFail(fdp.personalStorage.create(longPodName), 'Pod name is too long')
          await window.shouldFail(fdp.personalStorage.create(commaPodName), 'Pod name cannot contain commas')
          await window.shouldFail(fdp.personalStorage.create(''), 'Pod name is too short')

          return {
            result: (await fdp.personalStorage.list()).pods,
            mnemonic: wallet.mnemonic!.phrase,
          }
        },
        longPodName,
        commaPodName,
      )

      expect(result).toHaveLength(0)

      const examples = [
        { name: generateRandomHexString(), index: 1 },
        { name: generateRandomHexString(), index: 2 },
        { name: generateRandomHexString(), index: 3 },
        { name: generateRandomHexString(), index: 4 },
        { name: generateRandomHexString(), index: 5 },
      ]

      const result1 = await page.evaluate(
        async (examples, mnemonic: string) => {
          examples = JSON.parse(examples)
          const fdp = eval(await window.initFdp()) as FdpStorage
          fdp.account.setAccountFromMnemonic(mnemonic)

          const iterations: {
            result: Pod
            example: unknown
            list: unknown
          }[] = []
          for (let i = 0; examples.length > i; i++) {
            const example = examples[i] as unknown as { name: string; index: number }
            const out = await fdp.personalStorage.create(example.name)
            const list = await fdp.personalStorage.list()

            iterations.push({
              result: out,
              example,
              list,
            })
          }

          const failPod = examples[0] as unknown as { name: string; index: number }
          await window.shouldFail(
            fdp.personalStorage.create(failPod.name),
            `Pod with name "${failPod.name}" already exists`,
          )

          return iterations as unknown as IterationResult[]
        },
        JSON.stringify(examples),
        mnemonic,
      )

      expect(result1).toHaveLength(examples.length)

      for (let i = 0; result1.length > i; i++) {
        const item = result1[i]
        expect(item.result.name).toEqual(item.example.name)
        expect(item.result.index).toEqual(item.example.index)
      }
    })

    it('should delete pods', async () => {
      const podName = generateRandomHexString()
      const podName1 = generateRandomHexString()
      const notExistsPod = generateRandomHexString()

      const { list, mnemonic } = await page.evaluate(
        async (podName: string, podName1: string, notExistsPod: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          const wallet = fdp.account.createWallet()

          await fdp.personalStorage.create(podName)
          await fdp.personalStorage.create(podName1)

          await window.shouldFail(fdp.personalStorage.delete(notExistsPod), `Pod "${notExistsPod}" does not exist`)

          return {
            list: (await fdp.personalStorage.list()).pods,
            mnemonic: wallet.mnemonic.phrase,
          }
        },
        podName,
        podName1,
        notExistsPod,
      )

      expect(list).toHaveLength(2)

      const list2 = await page.evaluate(
        async (podName: string, mnemonic: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          fdp.account.setAccountFromMnemonic(mnemonic)

          await fdp.personalStorage.delete(podName)

          return (await fdp.personalStorage.list()).pods
        },
        podName,
        mnemonic,
      )

      expect(list2).toHaveLength(1)

      const list3 = await page.evaluate(
        async (podName: string, mnemonic: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          fdp.account.setAccountFromMnemonic(mnemonic)

          await fdp.personalStorage.delete(podName)

          return (await fdp.personalStorage.list()).pods
        },
        podName1,
        mnemonic,
      )

      expect(list3).toHaveLength(0)
    })

    it('should share a pod', async () => {
      const podName = generateRandomHexString()

      const { sharedReference, sharedData, walletAddress } = await page.evaluate(async (podName: string) => {
        const fdp = eval(await window.initFdp()) as FdpStorage
        const wallet = fdp.account.createWallet()

        await fdp.personalStorage.create(podName)
        const sharedReference = await fdp.personalStorage.share(podName)
        const sharedData = (await fdp.connection.bee.downloadData(sharedReference)).json() as unknown as PodShareInfo

        return {
          sharedReference,
          sharedData,
          walletAddress: wallet.address,
        }
      }, podName)

      expect(sharedReference).toBeDefined()
      expect(sharedData.podName).toEqual(podName)
      expect(sharedData.podAddress).toHaveLength(ETH_ADDR_HEX_LENGTH)
      expect(sharedData.userAddress).toEqual(walletAddress.toLowerCase().replace('0x', ''))
    })

    it('should receive shared pod info', async () => {
      const podName = generateRandomHexString()

      const { sharedReference, sharedData, walletAddress } = await page.evaluate(async (podName: string) => {
        const fdp = eval(await window.initFdp()) as FdpStorage
        const wallet = fdp.account.createWallet()

        await fdp.personalStorage.create(podName)
        const sharedReference = await fdp.personalStorage.share(podName)
        const sharedData = await fdp.personalStorage.getSharedInfo(sharedReference)

        return {
          sharedReference,
          sharedData,
          walletAddress: wallet.address,
        }
      }, podName)

      expect(sharedReference).toBeDefined()
      expect(sharedData.podName).toEqual(podName)
      expect(sharedData.podAddress).toHaveLength(ETH_ADDR_HEX_LENGTH)
      expect(sharedData.userAddress).toEqual(walletAddress.toLowerCase().replace('0x', ''))
    })

    it('should save shared pod', async () => {
      const podName = generateRandomHexString()
      const newPodName = generateRandomHexString()

      const {
        listBeforeSave,
        podAfterCreate,
        listAfterCreate,
        savedPod,
        savedPodCustom,
        listAfterSaveCustom,
        podAfterSaveCustom,
      } = await page.evaluate(
        async (podName: string, newPodName: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          const fdp1 = eval(await window.initFdp()) as FdpStorage
          fdp.account.createWallet()
          fdp1.account.createWallet()

          await fdp.personalStorage.create(podName)
          const sharedReference = await fdp.personalStorage.share(podName)
          const list0 = await fdp1.personalStorage.list()
          const pod = await fdp1.personalStorage.saveShared(sharedReference)
          const list = await fdp1.personalStorage.list()
          const savedPod = list.sharedPods[0]
          await window.shouldFail(
            fdp1.personalStorage.saveShared(sharedReference),
            `Shared pod with name "${podName}" already exists`,
          )

          const pod1 = await fdp1.personalStorage.saveShared(sharedReference, {
            name: newPodName,
          })

          const list1 = await fdp1.personalStorage.list()
          const savedPod1 = list1.sharedPods[1]

          return {
            listBeforeSave: {
              pods: list0.pods,
              sharedPods: list0.sharedPods,
            },
            podAfterCreate: pod,
            listAfterCreate: {
              pods: list.pods,
              sharedPods: list.sharedPods,
            },
            savedPod,
            savedPodCustom: pod1,
            listAfterSaveCustom: {
              pods: list1.pods,
              sharedPods: list1.sharedPods,
            },
            podAfterSaveCustom: savedPod1,
          }
        },
        podName,
        newPodName,
      )

      expect(listBeforeSave.pods).toHaveLength(0)
      expect(listBeforeSave.sharedPods).toHaveLength(0)
      expect(podAfterCreate.name).toEqual(podName)
      expect(Object.keys(podAfterCreate.address)).toHaveLength(ETH_ADDR_HEX_LENGTH)
      expect(listAfterCreate.pods).toHaveLength(0)
      expect(listAfterCreate.sharedPods).toHaveLength(1)
      expect(savedPod.name).toEqual(podName)
      expect(savedPod.address).toHaveLength(ETH_ADDR_HEX_LENGTH)
      expect(savedPod.address).toStrictEqual(podAfterCreate.address)
      expect(savedPodCustom.name).toEqual(newPodName)
      expect(savedPodCustom.address).toHaveLength(ETH_ADDR_HEX_LENGTH)
      expect(savedPodCustom.address).toStrictEqual(savedPod.address)
      expect(listAfterSaveCustom.pods).toHaveLength(0)
      expect(listAfterSaveCustom.sharedPods).toHaveLength(2)
      expect(podAfterSaveCustom.name).toEqual(newPodName)
      expect(podAfterSaveCustom.address).toHaveLength(ETH_ADDR_HEX_LENGTH)
      expect(podAfterSaveCustom.address).toStrictEqual(savedPod.address)
    })
  })

  describe('Directory', () => {
    it('should create directories after deletion', async () => {
      const pod = generateRandomHexString()
      const path1Name = generateRandomHexString()
      const path1Full = `/${path1Name}`

      const { listFiles1, listFiles2, listFiles3 } = await page.evaluate(
        async (pod: string, path1Full: string) => {
          const reuploadTimes = 3
          const fdp = eval(await window.initFdp()) as FdpStorage
          fdp.account.createWallet()

          await fdp.personalStorage.create(pod)
          await fdp.directory.create(pod, path1Full)
          const list1 = await fdp.directory.read(pod, '/')

          let list2
          let list3
          for (let i = 0; i < reuploadTimes; i++) {
            await fdp.directory.delete(pod, path1Full)
            list2 = await fdp.directory.read(pod, '/')

            await fdp.directory.create(pod, path1Full)
            list3 = await fdp.directory.read(pod, '/')
          }

          return {
            listFiles1: list1.directories,
            listFiles2: list2?.directories,
            listFiles3: list3?.directories,
          }
        },
        pod,
        path1Full,
      )

      expect(listFiles1).toHaveLength(1)
      expect(listFiles2).toHaveLength(0)
      expect(listFiles3).toHaveLength(1)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(listFiles3[0].name).toEqual(path1Name)
    })

    it('should create new directory', async () => {
      const pod = generateRandomHexString()
      const directoryName = generateRandomHexString()
      const directoryFull = '/' + directoryName
      const directoryName1 = generateRandomHexString()
      const directoryFull1 = '/' + directoryName + '/' + directoryName1

      const { list, directoryInfo, directoryInfo1, subDirectoriesLength } = await page.evaluate(
        async (pod: string, directoryFull: string, directoryFull1: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          fdp.account.createWallet()

          await fdp.personalStorage.create(pod)
          await window.shouldFail(fdp.directory.create(pod, directoryFull1), 'Parent directory does not exist')

          await fdp.directory.create(pod, directoryFull)
          await window.shouldFail(
            fdp.directory.create(pod, directoryFull),
            `Directory "${directoryFull}" already listed in the parent directory list`,
          )
          await fdp.directory.create(pod, directoryFull1)
          await window.shouldFail(
            fdp.directory.create(pod, directoryFull1),
            `Directory "${directoryFull1}" already listed in the parent directory list`,
          )

          const list = await fdp.directory.read(pod, '/', true)
          const directoryInfo = list.directories[0]
          const subDirectoriesLength = directoryInfo.directories.length
          const directoryInfo1 = directoryInfo.directories[0]

          return {
            list,
            directoryInfo,
            directoryInfo1,
            subDirectoriesLength,
          }
        },
        pod,
        directoryFull,
        directoryFull1,
      )

      expect(list.directories).toHaveLength(1)
      expect(subDirectoriesLength).toEqual(1)
      expect(directoryInfo.name).toEqual(directoryName)
      expect(directoryInfo1.name).toEqual(directoryName1)
    })

    it('should delete a directory', async () => {
      const pod = generateRandomHexString()
      const directoryName = generateRandomHexString()
      const directoryFull = '/' + directoryName

      const { list, listAfter } = await page.evaluate(
        async (pod: string, directoryFull: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          fdp.account.createWallet()

          await fdp.personalStorage.create(pod)
          await fdp.directory.create(pod, directoryFull)
          const list = await fdp.directory.read(pod, '/', true)

          await fdp.directory.delete(pod, directoryFull)
          const listAfter = await fdp.directory.read(pod, '/', true)

          return {
            list,
            listAfter,
          }
        },
        pod,
        directoryFull,
      )

      expect(list.directories).toHaveLength(1)
      expect(listAfter.files).toHaveLength(0)
    })

    it('should serialize and deserialize directories list and pods', async () => {
      const fdp = createFdp()
      generateUser(fdp)
      const pod = generateRandomHexString()
      const directoriesToCreate = ['/one', '/two', '/three', '/one/one-one', '/one/one-one/one-one-one', '/two/two-one']
      const filesToCreate = [
        {
          path: '/file1.txt',
          data: generateRandomHexString(),
        },
        {
          path: '/file2.txt',
          data: generateRandomHexString(),
        },
        {
          path: '/one/file-in-one-1.txt',
          data: generateRandomHexString(),
        },
        {
          path: '/one/file-in-one-2.txt',
          data: generateRandomHexString(),
        },
      ]

      const { counts } = await page.evaluate(
        async (pod: string, directoriesToCreate: string[], filesToCreate: { path: string; data: string }[]) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          const { DirectoryItem } = window.fdp
          fdp.account.createWallet()

          await fdp.personalStorage.create(pod)
          const pods1 = await fdp.personalStorage.list()
          const pods1Serialized = JSON.stringify(pods1)
          const pods1Deserialized = JSON.parse(pods1Serialized)
          const firstPod = pods1.pods[0]
          const firstPodDeserialized = pods1Deserialized.pods[0]

          for (const directoryToCreate of directoriesToCreate) {
            await fdp.directory.create(pod, directoryToCreate)
          }

          for (const fileToCreate of filesToCreate) {
            await fdp.file.uploadData(pod, fileToCreate.path, fileToCreate.data)
          }

          const list1 = await fdp.directory.read(pod, '/', true)
          const serialized = JSON.stringify(list1)
          const recovered = JSON.parse(serialized) as typeof DirectoryItem
          const recoveredDirOne1 = recovered.directories.find(item => item.name === 'one')
          const recoveredDirOneOne1 = recoveredDirOne1?.directories.find(item => item.name === 'one-one')
          const recoveredDirTwo1 = recovered.directories.find(item => item.name === 'two')

          const dirOne1Length = recoveredDirOne1?.directories.length
          const dirOneOne1Length = recoveredDirOneOne1?.directories.length
          const dirOneOne1FilesLength = recoveredDirOneOne1?.files.length
          const dirOne1FilesLength = recoveredDirOne1?.files.length
          const dirTwo1Length = recoveredDirTwo1?.directories.length

          return {
            counts: {
              dir1Length: recovered.directories.length,
              files1Length: recovered.files.length,
              dirOne1Length,
              dirOneOne1Length,
              dirOneOne1FilesLength,
              dirOne1FilesLength,
              dirTwo1Length,
              pods1PodsLength: pods1.pods.length,
              pods1SharedPodsLength: pods1.sharedPods.length,
              deserializedPods1PodsLength: pods1Deserialized.pods.length,
              deserializedPods1SharedPodsLength: pods1Deserialized.sharedPods.length,
              pods1Name: firstPod.name,
              pods1Index: firstPod.index,
              pods1Password: firstPod.password,
              deserializedPods1Name: firstPodDeserialized.name,
              deserializedPods1Index: firstPodDeserialized.index,
              deserializedPods1Password: firstPodDeserialized.password,
            },
          }
        },
        pod,
        directoriesToCreate,
        filesToCreate,
      )

      expect(counts.dir1Length).toEqual(3)
      expect(counts.files1Length).toEqual(2)
      expect(counts.dirOne1Length).toEqual(1)
      expect(counts.dirOneOne1Length).toEqual(1)
      expect(counts.dirOneOne1FilesLength).toEqual(0)
      expect(counts.dirOne1FilesLength).toEqual(2)
      expect(counts.dirTwo1Length).toEqual(1)

      // pods checking
      expect(counts.pods1PodsLength).toStrictEqual(counts.deserializedPods1PodsLength)
      expect(counts.pods1SharedPodsLength).toStrictEqual(counts.deserializedPods1SharedPodsLength)
      expect(counts.pods1Name).toStrictEqual(counts.deserializedPods1Name)
      expect(counts.pods1Index).toStrictEqual(counts.deserializedPods1Index)
      expect(counts.pods1Password).toStrictEqual(counts.deserializedPods1Password)
    })
  })

  describe('File', () => {
    it('should upload files after deletion', async () => {
      const pod = generateRandomHexString()
      const fileSizeSmall = 100
      const fileSizeSmall1 = 10
      const fileSizeSmall2 = 1000
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall
      const contentSamples = [
        // the same content
        contentSmall,
        // less data
        generateRandomHexString(fileSizeSmall1),
        // more data
        generateRandomHexString(fileSizeSmall2),
      ]

      const { listFiles1, listFiles2, listFiles3, results } = await page.evaluate(
        async (
          pod: string,
          filenameSmall: string,
          fullFilenameSmallPath: string,
          contentSmall: string,
          contentSamples: string[],
        ) => {
          const reuploadTimes = 3
          const fdp = eval(await window.initFdp()) as FdpStorage
          const { wrapBytesWithHelpers } = window.fdp.Utils
          fdp.account.createWallet()

          await fdp.personalStorage.create(pod)
          await fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall)
          const list1 = await fdp.directory.read(pod, '/')

          let list2
          let list3
          const results: string[] = []
          for (let i = 0; i < reuploadTimes; i++) {
            await fdp.file.delete(pod, fullFilenameSmallPath)
            list2 = await fdp.directory.read(pod, '/')

            await fdp.file.uploadData(pod, fullFilenameSmallPath, contentSamples[i])
            list3 = await fdp.directory.read(pod, '/')
            results.push(wrapBytesWithHelpers(await fdp.file.downloadData(pod, fullFilenameSmallPath)).text())
          }

          return {
            listFiles1: list1.files,
            listFiles2: list2?.files,
            listFiles3: list3?.files,
            results,
          }
        },
        pod,
        filenameSmall,
        fullFilenameSmallPath,
        contentSmall,
        contentSamples,
      )

      expect(listFiles1).toHaveLength(1)
      expect(listFiles2).toHaveLength(0)
      expect(listFiles3).toHaveLength(1)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(listFiles3[0].name).toEqual(filenameSmall)
      expect(results).toEqual(contentSamples)
    })

    it('should upload small text data as a file', async () => {
      const pod = generateRandomHexString()
      const fileSizeSmall = 100
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall

      const { dataSmall, fdpList, fileInfoSmall } = await page.evaluate(
        async (pod: string, fullFilenameSmallPath: string, contentSmall: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          const { wrapBytesWithHelpers } = window.fdp.Utils
          fdp.account.createWallet()

          await fdp.personalStorage.create(pod)
          await fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall)
          await window.shouldFail(
            fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall),
            `File "${fullFilenameSmallPath}" already listed in the parent directory list`,
          )

          const dataSmall = wrapBytesWithHelpers(await fdp.file.downloadData(pod, fullFilenameSmallPath)).text()
          const fdpList = await fdp.directory.read(pod, '/', true)
          const fileInfoSmall = fdpList.files[0]

          return {
            dataSmall,
            fdpList,
            fileInfoSmall,
          }
        },
        pod,
        fullFilenameSmallPath,
        contentSmall,
      )

      expect(dataSmall).toEqual(contentSmall)
      expect(fdpList.files.length).toEqual(1)
      expect(fileInfoSmall.name).toEqual(filenameSmall)
      expect(fileInfoSmall.size).toEqual(fileSizeSmall)
    })

    it('should upload big text data as a file', async () => {
      const pod = generateRandomHexString()
      const incorrectPod = generateRandomHexString()
      const fileSizeBig = 5000005
      const contentBig = generateRandomHexString(fileSizeBig)
      const filenameBig = generateRandomHexString() + '.txt'
      const fullFilenameBigPath = '/' + filenameBig
      const incorrectFullPath = fullFilenameBigPath + generateRandomHexString()

      const { dataBig, fdpList, fileInfoBig } = await page.evaluate(
        async (
          pod: string,
          fullFilenameBigPath: string,
          contentBig: string,
          incorrectPod: string,
          incorrectFullPath: string,
        ) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          const { wrapBytesWithHelpers } = window.fdp.Utils
          fdp.account.createWallet()

          await fdp.personalStorage.create(pod)
          await window.shouldFail(
            fdp.file.uploadData(incorrectPod, fullFilenameBigPath, contentBig),
            `Pod "${incorrectPod}" does not exist`,
          )
          await fdp.file.uploadData(pod, fullFilenameBigPath, contentBig)
          await window.shouldFail(fdp.file.downloadData(pod, incorrectFullPath), 'Data not found')
          const dataBig = wrapBytesWithHelpers(await fdp.file.downloadData(pod, fullFilenameBigPath)).text()
          const fdpList = await fdp.directory.read(pod, '/', true)
          const fileInfoBig = fdpList.files[0]

          return {
            dataBig,
            fdpList,
            fileInfoBig,
          }
        },
        pod,
        fullFilenameBigPath,
        contentBig,
        incorrectPod,
        incorrectFullPath,
      )

      expect(dataBig).toEqual(contentBig)
      expect(fdpList.files.length).toEqual(1)
      expect(fileInfoBig.name).toEqual(filenameBig)
      expect(fileInfoBig.size).toEqual(fileSizeBig)
    })

    it('should delete a file', async () => {
      const pod = generateRandomHexString()
      const fileSizeSmall = 100
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall

      const { fdpList, fdpListAfter } = await page.evaluate(
        async (pod: string, fullFilenameSmallPath: string, contentSmall: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          fdp.account.createWallet()

          await fdp.personalStorage.create(pod)
          await fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall)

          const fdpList = await fdp.directory.read(pod, '/', true)
          await fdp.file.delete(pod, fullFilenameSmallPath)
          const fdpListAfter = await fdp.directory.read(pod, '/', true)

          return {
            fdpList,
            fdpListAfter,
          }
        },
        pod,
        fullFilenameSmallPath,
        contentSmall,
      )

      expect(fdpList.files.length).toEqual(1)
      expect(fdpListAfter.files.length).toEqual(0)
    })

    it('should share a file', async () => {
      const pod = generateRandomHexString()
      const fileSizeSmall = 100
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall

      const { sharedReference, sharedData } = await page.evaluate(
        async (pod: string, fullFilenameSmallPath: string, contentSmall: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          fdp.account.createWallet()

          await fdp.personalStorage.create(pod)
          await fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall)

          const sharedReference = await fdp.file.share(pod, fullFilenameSmallPath)
          const sharedData = (await fdp.connection.bee.downloadData(sharedReference)).json() as unknown as FileShareInfo

          return {
            sharedReference,
            sharedData,
          }
        },
        pod,
        fullFilenameSmallPath,
        contentSmall,
      )

      expect(sharedReference).toHaveLength(128)
      expect(sharedData.meta).toBeDefined()
    })

    it('should receive information about shared file', async () => {
      const pod = generateRandomHexString()
      const fileSizeSmall = 100
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall

      const { sharedData } = await page.evaluate(
        async (pod: string, fullFilenameSmallPath: string, contentSmall: string) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          fdp.account.createWallet()

          await fdp.personalStorage.create(pod)
          await fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall)

          const sharedReference = await fdp.file.share(pod, fullFilenameSmallPath)
          const sharedData = await fdp.file.getSharedInfo(sharedReference)

          return {
            sharedData,
          }
        },
        pod,
        fullFilenameSmallPath,
        contentSmall,
      )

      expect(sharedData.meta).toBeDefined()
      expect(sharedData.meta.filePath).toEqual('/')
      expect(sharedData.meta.fileName).toEqual(filenameSmall)
      expect(sharedData.meta.fileSize).toEqual(fileSizeSmall)
    })

    it('should save shared file to a pod', async () => {
      const pod = generateRandomHexString()
      const pod1 = generateRandomHexString()
      const fileSizeSmall = 100
      const contentSmall = generateRandomHexString(fileSizeSmall)
      const filenameSmall = generateRandomHexString() + '.txt'
      const fullFilenameSmallPath = '/' + filenameSmall
      const newFilePath = '/'
      const customName = 'NewCustomName.txt'

      const { sharedData, files, fileInfo, meta, data, sharedData1, data1, files1 } = await page.evaluate(
        async (
          pod: string,
          pod1: string,
          fullFilenameSmallPath: string,
          contentSmall: string,
          newFilePath: string,
          customName: string,
        ) => {
          const fdp = eval(await window.initFdp()) as FdpStorage
          const fdp1 = eval(await window.initFdp()) as FdpStorage
          const { wrapBytesWithHelpers } = window.fdp.Utils
          fdp.account.createWallet()
          fdp1.account.createWallet()

          await fdp.personalStorage.create(pod)
          await fdp1.personalStorage.create(pod1)
          await fdp.file.uploadData(pod, fullFilenameSmallPath, contentSmall)
          const sharedReference = await fdp.file.share(pod, fullFilenameSmallPath)
          const sharedData = await fdp1.file.saveShared(pod1, newFilePath, sharedReference)

          const list = await fdp1.directory.read(pod1, '/')
          const files = list.files
          const fileInfo = files[0]
          const meta = fileInfo.raw as RawFileMetadata
          const data = wrapBytesWithHelpers(await fdp1.file.downloadData(pod1, fullFilenameSmallPath)).text()

          // checking saving with custom name
          const sharedData1 = await fdp1.file.saveShared(pod1, newFilePath, sharedReference, { name: customName })
          const data1 = wrapBytesWithHelpers(await fdp1.file.downloadData(pod1, '/' + customName)).text()
          const list1 = await fdp1.directory.read(pod1, '/')
          const files1 = list1.files

          return {
            sharedData,
            files,
            fileInfo,
            meta,
            data,
            sharedData1,
            data1,
            files1,
          }
        },
        pod,
        pod1,
        fullFilenameSmallPath,
        contentSmall,
        newFilePath,
        customName,
      )

      expect(sharedData.filePath).toEqual(newFilePath)
      expect(sharedData.fileName).toEqual(filenameSmall)
      expect(sharedData.fileSize).toEqual(fileSizeSmall)
      expect(files).toHaveLength(1)
      expect(fileInfo.name).toEqual(filenameSmall)
      expect(fileInfo.size).toEqual(fileSizeSmall)
      expect(meta.fileName).toEqual(filenameSmall)
      expect(meta.fileSize).toEqual(fileSizeSmall)
      expect(data).toEqual(contentSmall)
      expect(sharedData1.filePath).toEqual(newFilePath)
      expect(sharedData1.fileName).toEqual(customName)
      expect(sharedData1.fileSize).toEqual(fileSizeSmall)
      expect(data1).toEqual(contentSmall)
      expect(files1).toHaveLength(2)
    })
  })
})
