import { getFeedData } from '../feed/api'
import { RawDirectoryMetadata, FileMetadata } from '../pod/types'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'
import { Bee } from '@ethersphere/bee-js'
import { combine } from './utils'
import { DirectoryItem } from './directory-item'

/**
 * Get raw metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address Ethereum address of the pod which owns the path
 */
export async function getRawMetadata(bee: Bee, path: string, address: EthAddress): Promise<unknown> {
  return (await getFeedData(bee, path, address)).data.chunkContent().json()
}

/**
 * Get directory metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address
 */
export async function getRawDirectoryMetadata(
  bee: Bee,
  path: string,
  address: EthAddress,
): Promise<RawDirectoryMetadata> {
  return (await getRawMetadata(bee, path, address)) as Promise<RawDirectoryMetadata>
}

/**
 * Get file metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address Ethereum address of the pod which owns the path
 */
export async function getRawFileMetadata(bee: Bee, path: string, address: EthAddress): Promise<FileMetadata> {
  return (await getRawMetadata(bee, path, address)) as Promise<FileMetadata>
}

/**
 * Get files and directories under path with recursion or not
 *
 * @param bee Bee instance
 * @param path path to start searching from
 * @param address Ethereum address of the pod which owns the path
 * @param isRecursively search with recursion or not
 */
export async function readDirectory(
  bee: Bee,
  path: string,
  address: EthAddress,
  isRecursively?: boolean,
): Promise<DirectoryItem> {
  const rootRawDirectoryMetadata = await getRawDirectoryMetadata(bee, path, address)
  const fileKey = '_F_'
  const directoryKey = '_D_'

  const resultDirectoryItem = DirectoryItem.fromRawDirectoryMetadata(rootRawDirectoryMetadata)

  if (!rootRawDirectoryMetadata.FileOrDirNames) {
    return resultDirectoryItem
  }

  for (let item of rootRawDirectoryMetadata.FileOrDirNames) {
    const isFile = item.startsWith(fileKey)
    const isDirectory = item.startsWith(directoryKey)

    if (isFile) {
      item = combine(path, item.substring(fileKey.length))
      const rawFileMeta = await getRawFileMetadata(bee, item, address)
      resultDirectoryItem.content.push(DirectoryItem.fromRawFileMetadata(rawFileMeta))
    } else if (isDirectory) {
      item = combine(path, item.substring(directoryKey.length))
      const rawDirectoryMetadata = await getRawDirectoryMetadata(bee, item, address)

      const currentMetadata = DirectoryItem.fromRawDirectoryMetadata(rawDirectoryMetadata)

      if (isRecursively) {
        currentMetadata.content = (await readDirectory(bee, item, address, isRecursively)).content
      }

      resultDirectoryItem.content.push(currentMetadata)
    }
  }

  return resultDirectoryItem
}
