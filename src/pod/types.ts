/**
 * Pod information
 */
export interface Pod {
  name: string
  index: number
}

/**
 * Metadata information for pod directory
 */
export interface Metadata {
  Version: number
  Path: string
  Name: string
  CreationTime: number
  ModificationTime: number
  AccessTime: number
}
