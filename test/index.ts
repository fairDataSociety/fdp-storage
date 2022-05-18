import { FdpStorage } from '../src'

export {}

declare global {
  interface Window {
    initFdp: () => Promise<string>
    topUpAddress: (fdp: FdpStorage) => Promise<void>
    shouldFail: (method: Promise<unknown>, message: string, failMessage?: string) => Promise<void>
    shouldFailString: () => Promise<string>
  }
}
