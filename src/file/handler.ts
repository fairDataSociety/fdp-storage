import { wrapBytesWithHelpers } from '../utils/bytes'
import { Bee, Data, RequestOptions, Utils } from '@ethersphere/bee-js'
import { EthAddress } from '@ethersphere/bee-js/dist/types/utils/eth'
import { downloadBlocksManifest } from './utils'
import { FileMetadata } from '../pod/types'
import { rawFileMetadataToFileMetadata } from './adapter'
import { assertRawFileMetadata } from '../directory/utils'
import { getRawMetadata } from '../content-items/utils'
import { decryptBytes, PodPasswordBytes } from '../utils/encryption'
import { bytesToHex } from '../utils/hex'

/**
 * File prefix
 */
export const FILE_TOKEN = '_F_'
/**
 * Directory prefix
 */
export const DIRECTORY_TOKEN = '_D_'

/**
 * Get converted metadata by path
 *
 * @param bee Bee client
 * @param path path with information
 * @param address Ethereum address of the pod which contains the path
 * @param podPassword bytes for data encryption from pod metadata
 * @param downloadOptions options for downloading
 */
export async function getFileMetadata(
  bee: Bee,
  path: string,
  address: EthAddress,
  podPassword: PodPasswordBytes,
  downloadOptions?: RequestOptions,
): Promise<FileMetadata> {
  const data = (await getRawMetadata(bee, path, address, podPassword, downloadOptions)).metadata
  assertRawFileMetadata(data)

  return rawFileMetadataToFileMetadata(data)
}

/**
 * Downloads file parts and compile them into Data
 *
 * @param bee Bee client
 * @param fullPath full path to the file
 * @param address address of the pod
 * @param podPassword bytes for data encryption from pod metadata
 * @param downloadOptions download options
 */
export async function downloadData(
  bee: Bee,
  fullPath: string,
  address: EthAddress,
  podPassword: PodPasswordBytes,
  downloadOptions?: RequestOptions,
): Promise<Data> {
  const fileMetadata = await getFileMetadata(bee, fullPath, address, podPassword, downloadOptions)
  podPassword = fileMetadata.sharedPassword ? Utils.hexToBytes(fileMetadata.sharedPassword) : podPassword

  if (fileMetadata.compression) {
    // TODO: implement compression support
    throw new Error('Compressed data is not supported yet')
  }

  const blocks = await downloadBlocksManifest(bee, podPassword, fileMetadata.blocksReference, downloadOptions)

  let totalLength = 0
  for (const block of blocks.blocks) {
    totalLength += block.size
  }

  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const block of blocks.blocks) {
    const data = decryptBytes(bytesToHex(podPassword), await bee.downloadData(block.reference, downloadOptions))
    result.set(data, offset)
    offset += data.length
  }

  return wrapBytesWithHelpers(result)
}

/**
 * Generate block name by block number
 */
export function generateBlockName(blockNumber: number): string {
  return 'block-' + blockNumber.toString().padStart(5, '0')
}
