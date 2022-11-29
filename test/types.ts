/**
 * FairOS dirLs answer
 */
export interface FairOSDirectoryItems {
  files: FairOSDirectoryItem[]
  dirs: FairOSFileItem[]
}

/**
 * FairOS dirLs directory item answer
 */
export interface FairOSDirectoryItem {
  name: string
  size: string
  contentType: string
  blockSize: string
  creationTime: string
  modificationTime: string
  accessTime: string
}

/**
 * FairOS dirLs file item answer
 */
export interface FairOSFileItem {
  name: string
  contentType: string
  creationTime: string
  modificationTime: string
  accessTime: string
}
