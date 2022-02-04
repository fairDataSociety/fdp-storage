export { FairdriveProtocol } from './fairdrive-protocol'

// for require-like imports
declare global {
  interface Window {
    // bound as 'FairdriveProtocol' via Webpack
    FairdriveProtocol: {
      FairdriveProtocol: typeof import('./fairdrive-protocol').FairdriveProtocol
    }
  }
}
