export {}

declare global {
  interface Window {
    initFdp: () => Promise<string>
    shouldFail: (method: Promise<unknown>, message: string, failMessage?: string) => Promise<void>
    shouldFailString: () => Promise<string>
  }
}
