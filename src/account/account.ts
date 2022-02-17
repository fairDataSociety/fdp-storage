import { Bee, BeeDebug, Reference } from '@ethersphere/bee-js'
import { Wallet } from 'ethers'
import { encrypt } from './encryption'
import { uploadEncryptedMnemonic } from './mnemonic'
import { validateMnemonic, validatePassword } from './utils'

interface UserAccount {
  wallet: Wallet
  mnemonic: string
  encryptedMnemonic: string
}

export interface UserAccountWithReference extends UserAccount {
  reference: Reference
}

async function createUserAccount(password: string, mnemonic?: string): Promise<UserAccount> {
  validatePassword(password)

  if (mnemonic) {
    validateMnemonic(mnemonic)
  } else {
    mnemonic = Wallet.createRandom().mnemonic.phrase
  }

  const wallet = Wallet.fromMnemonic(mnemonic)
  const encryptedMnemonic = encrypt(password, mnemonic)

  return {
    wallet,
    mnemonic,
    encryptedMnemonic,
  }
}

export async function createUser(
  bee: Bee,
  beeDebug: BeeDebug,
  username: string,
  password: string,
  mnemonic = '',
): Promise<UserAccountWithReference> {
  const account = await createUserAccount(password, mnemonic)
  const reference = await uploadEncryptedMnemonic(bee, beeDebug, account.wallet, username, account.encryptedMnemonic)

  return { ...account, reference }
}
