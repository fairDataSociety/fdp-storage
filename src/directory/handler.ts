import { getFeedData } from '../feed/api'
import { DirectoryMetadata, FileMetadata } from '../pod/types'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'
import { Bee } from '@ethersphere/bee-js'
import { DirectoryContent } from './directory-content'
import { combine } from './utils'

/**
 * Get raw metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address Ethereum address of the pod which owns the path
 */
export async function getMetadata(bee: Bee, path: string, address: EthAddress): Promise<unknown> {
  return (await getFeedData(bee, path, address)).data.chunkContent().json()
}

/**
 * Get directory metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address
 */
export async function getDirectoryMetadata(bee: Bee, path: string, address: EthAddress): Promise<DirectoryMetadata> {
  return (await getMetadata(bee, path, address)) as Promise<DirectoryMetadata>
}

/**
 * Get file metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address Ethereum address of the pod which owns the path
 */
export async function getFileMetadata(bee: Bee, path: string, address: EthAddress): Promise<FileMetadata> {
  return (await getMetadata(bee, path, address)) as Promise<FileMetadata>
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
): Promise<DirectoryContent> {
  const rootDirectoryMetadata = await getDirectoryMetadata(bee, path, address)
  const directoriesMeta: DirectoryMetadata[] = []
  const filesMeta: FileMetadata[] = []
  const fileKey = '_F_'
  const directoryKey = '_D_'

  if (!rootDirectoryMetadata.FileOrDirNames) {
    return new DirectoryContent(rootDirectoryMetadata, filesMeta, directoriesMeta)
  }

  for (let item of rootDirectoryMetadata.FileOrDirNames) {
    const isFile = item.startsWith(fileKey)
    const isDirectory = item.startsWith(directoryKey)

    if (isFile) {
      item = combine(path, item.substring(fileKey.length))
      filesMeta.push(await getFileMetadata(bee, item, address))
    } else if (isDirectory) {
      item = combine(path, item.substring(directoryKey.length))
      const directoryMetadata = await getDirectoryMetadata(bee, item, address)

      if (isRecursively) {
        directoryMetadata.content = await readDirectory(bee, item, address, isRecursively)
      }

      directoriesMeta.push(directoryMetadata)
    }
  }

  return new DirectoryContent(rootDirectoryMetadata, filesMeta, directoriesMeta)
}
