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
  content_type: string
  block_size: string
  creation_time: string
  modification_time: string
  access_time: string
}

/**
 * FairOS dirLs file item answer
 */
export interface FairOSFileItem {
  name: string
  content_type: string
  creation_time: string
  modification_time: string
  access_time: string
}
