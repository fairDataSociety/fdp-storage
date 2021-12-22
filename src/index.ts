import { FairdriveProtocol } from './fairdrive-protocol'
// import { BeeDebug } from './bee-debug'
//
// export * as Utils from './utils/expose'
// export * from './types'
// export * from './utils/error'
// export { SUPPORTED_BEE_VERSION, SUPPORTED_BEE_VERSION_EXACT } from './modules/debug/status'
// export { Bee, BeeDebug }
export { FairdriveProtocol }

// for require-like imports
declare global {
  interface Window {
    // bound as 'FairdriveProtocol' via Webpack
    FairdriveProtocol: {
      FairdriveProtocol: typeof import('./fairdrive-protocol').FairdriveProtocol
      // Bee: typeof import('./bee').Bee
      // BeeDebug: typeof import('./bee-debug').BeeDebug
      // Utils: typeof import('./utils/expose')
      // BeeError: typeof import('./utils/error').BeeError
      // BeeRequestError: typeof import('./utils/error').BeeRequestError
      // BeeResponseError: typeof import('./utils/error').BeeResponseError
      // BeeArgumentError: typeof import('./utils/error').BeeArgumentError
    }
  }
}
