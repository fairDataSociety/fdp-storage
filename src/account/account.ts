import { Reference } from '@ethersphere/bee-js'
import { Wallet } from 'ethers'
import { encrypt } from './encryption'
import { uploadEncryptedMnemonic } from './mnemonic'
import { assertMnemonic, assertPassword } from './utils'
import { AccountData } from './account-data'

interface UserAccount {
  wallet: Wallet
  mnemonic: string
  encryptedMnemonic: string
}

export interface UserAccountWithReference extends UserAccount {
  reference: Reference
}

/**
 * Creates a new user account based on the passed mnemonic phrase or without it, encrypted with a password
 *
 * @param password FDP password
 * @param mnemonic mnemonic phrase
 */
async function createUserAccount(password: string, mnemonic?: string): Promise<UserAccount> {
  assertPassword(password)

  if (mnemonic) {
    assertMnemonic(mnemonic)
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

/**
 * Creates a new user and uploads the encrypted account to the network
 *
 * @param accountData connection information for data uploading
 * @param username FDP username
 * @param password FDP password
 * @param mnemonic mnemonic phrase
 */
export async function createUser(
  accountData: AccountData,
  username: string,
  password: string,
  mnemonic?: string,
): Promise<UserAccountWithReference> {
  const account = await createUserAccount(password, mnemonic)
  const reference = await uploadEncryptedMnemonic(accountData, account.wallet, username, account.encryptedMnemonic)

  return { ...account, reference }
}
