import './shim/crypto'
import { FairDataProtocol } from './fair-data-protocol'
import { AccountData } from './account/account-data'
import { PersonalStorage } from './pod/personal-storage'

export { FairDataProtocol, AccountData, PersonalStorage }

// for require-like imports
declare global {
  interface Window {
    // bound as 'fdp' via Webpack
    fdp: {
      FairDataProtocol: typeof import('./fair-data-protocol').FairDataProtocol
      AccountData: typeof import('./account/account-data').AccountData
      PersonalStorage: typeof import('./pod/personal-storage').PersonalStorage
    }
  }
}
