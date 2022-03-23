/**
 * Removes Ethereum address for internal using
 *
 * @param address Ethereum address for preparation
 */
export function prepareEthAddress(address: string): string {
  return address.replace('0x', '')
}
