import { Wallet } from 'ethers'
import { encrypt } from './encryption'
import { Bee } from '@ethersphere/bee-js'
import { uploadEncryptedMnemonic } from './mnemonic'

// todo return {mnemonic: string, encryptedMnemonic: string}, describe it like interface somewhere?
export async function createUserAccount(password: string, mnemonic = ''): Promise<any> {
  // todo validate password
  if (!mnemonic) {
    mnemonic = Wallet.createRandom().mnemonic.phrase
  }

  const wallet = Wallet.fromMnemonic(mnemonic)
  const encryptedMnemonic = encrypt(password, mnemonic)

  return {
    wallet: wallet,
    mnemonic,
    encryptedMnemonic,
  }
}

export async function createUser(bee: Bee, username: string, password: string, mnemonic = ''): any {
  const account = await createUserAccount(password, mnemonic)
  const reference = await uploadEncryptedMnemonic(
    bee,
    account.wallet,
    username,
    account.wallet.address,
    account.encryptedMnemonic,
  )

  return { ...account, reference }
}
