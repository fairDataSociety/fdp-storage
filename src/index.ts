export { FairDataProtocol } from './fair-data-protocol'

// for require-like imports
declare global {
  interface Window {
    // bound as 'FairDataProtocol' via Webpack
    FairDataProtocol: {
      FairDataProtocol: typeof import('./fair-data-protocol').FairDataProtocol
    }
  }
}
