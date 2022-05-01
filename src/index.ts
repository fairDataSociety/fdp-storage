import './shim/crypto'
import { FDPStorage } from './fdp-storage'
import { AccountData } from './account/account-data'
import { PersonalStorage } from './pod/personal-storage'
import { Directory } from './directory/directory'

export { FDPStorage, AccountData, PersonalStorage, Directory }

// for require-like imports
declare global {
  interface Window {
    // bound as 'fdp' via Webpack
    fdp: {
      FDPStorage: typeof import('./fdp-storage').FDPStorage
      AccountData: typeof import('./account/account-data').AccountData
      PersonalStorage: typeof import('./pod/personal-storage').PersonalStorage
      Directory: typeof import('./directory/directory').Directory
    }
  }
}
