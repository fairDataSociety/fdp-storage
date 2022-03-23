import { Pod } from './types'
import { assertActiveAccount } from '../account/utils'
import { Data } from '@ethersphere/bee-js'
import { getFeedData } from '../feed/api'
import AccountData from '../account/account-data'

export const POD_TOPIC = 'Pods'

export class PersonalStorage {
  constructor(private accountData: AccountData) {}

  /**
   * Gets the list of pods for the active account
   *
   * @returns Promise<Pod[]> List of pods
   */
  async list(): Promise<Pod[]> {
    assertActiveAccount(this.accountData)
    let result: Data
    try {
      result = await getFeedData(this.accountData.bee, POD_TOPIC, this.accountData.wallet!.address)
    } catch (e) {
      return []
    }

    return result
      .text()
      .split('\n')
      .filter(item => Boolean(item.trim()))
      .map(item => {
        const parts = item.split(',')

        if (parts.length !== 2) {
          throw new Error('Pod information: incorrect length')
        }

        return { name: parts[0], index: Number(parts[1]) } as Pod
      })
  }
}
