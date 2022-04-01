/**
 * Removes 0x prefix from Ethereum address
 *
 * @param address Ethereum address for preparation
 */
export function prepareEthAddress(address: string): string {
  return address.replace('0x', '')
}
