import { Bee, Reference } from '@ethersphere/bee-js'
import { Wallet } from 'ethers'
import { encrypt } from './encryption'
import { uploadEncryptedMnemonic } from './mnemonic'

interface UserAccount {
  wallet: Wallet
  mnemonic: string
  encryptedMnemonic: string
}

export interface UserAccountWithReference extends UserAccount {
  reference: Reference
}

async function createUserAccount(password: string, mnemonic?: string): Promise<UserAccount> {
  // todo validate password
  if (!mnemonic) {
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
  username: string,
  password: string,
  mnemonic = '',
): Promise<UserAccountWithReference> {
  const account = await createUserAccount(password, mnemonic)
  const reference = await uploadEncryptedMnemonic(bee, account.wallet, username, account.encryptedMnemonic)

  return { ...account, reference }
}
