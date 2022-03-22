export { FairDataProtocol } from './fair-data-protocol'

// for require-like imports
declare global {
  interface Window {
    // bound as 'fdp' via Webpack
    fdp: {
      FairDataProtocol: typeof import('./fair-data-protocol').FairDataProtocol
    }
  }
}
