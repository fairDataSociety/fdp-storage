export function prepareEthAddress(address: string): string {
  return address.replace('0x', '')
}
