import { utils } from 'ethers'
import b from 'benny'

/**
 * Get Hierarchal Deterministic Wallet from seed by index
 *
 * @param seed data for wallet creation
 * @param index wallet index
 */
function getWalletByIndex(seed: Uint8Array, index: number): utils.HDNode {
  const node = utils.HDNode.fromSeed(seed)

  return node.derivePath(`m/44'/60'/0'/0/${index}`)
}

/**
 * Converts string representation of private key to bytes representation
 *
 * @param privateKey string representation of private key
 */
function privateKeyToBytes(privateKey: string): any {
  return utils.arrayify(privateKey)
}

/**
 * Converts mnemonic to seed bytes
 *
 * @param mnemonic mnemonic phrase
 */
function mnemonicToSeed(mnemonic: string): Uint8Array {
  return utils.arrayify(utils.mnemonicToSeed(mnemonic))
}

/**
 * Converts string to Ethereum address in form of bytes
 *
 * @param address Ethereum address for preparation
 */
function prepareEthAddress(address: string | Uint8Array): any {
  return utils.arrayify(address)
}

/**
 * Converts private key from to bytes
 *
 * @param privateKey string representation of private key
 */
function preparePrivateKey(privateKey: string): any {
  return utils.arrayify(privateKey)
}

b.suite(
  'Prepare address vs initial calculated variable',

  b.add('Calculate prepareEthAddress', () => {
    prepareEthAddress('0x0000000000000000000000000000000000000000')
  }),

  b.add('Initialized prepareEthAddress variable', () => {
    const prepareEthAddress = '0x0000000000000000000000000000000000000000'
  }),

  b.cycle(),
  b.complete(),
  b.save({ file: 'reduce', version: '1.0.0' }),
  b.save({ file: 'reduce', format: 'chart.html' }),
)

b.suite(
  'Create wallet vs wallet variable in memory',

  b.add('Create getWalletByIndex', () => {
    getWalletByIndex(
      utils.arrayify(
        `0x5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4`,
      ),
      0,
    )
  }),

  b.add('Initialized wallet variable', () => {
    const seed = '0x0000000000000000000000000000000000000000'
  }),

  b.cycle(),
  b.complete(),
  b.save({ file: 'reduce', version: '1.0.0' }),
  b.save({ file: 'reduce', format: 'chart.html' }),
)
