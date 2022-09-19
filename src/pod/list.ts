import { Pod, SharedPod } from './types'
import { assertPodList, assertSharedPodList } from './utils'

/**
 * List of created and shared pods
 */
export class List {
  constructor(private pods: Pod[], private sharedPods: SharedPod[]) {}

  /**
   * Gets the list of created pods
   */
  getPods(): Pod[] {
    return this.pods
  }

  /**
   * Gets the list of shared pods
   */
  getSharedPods(): SharedPod[] {
    return this.sharedPods
  }

  /**
   * Creates pods list from JSON string
   *
   * @param json {pods: Pod[], sharedPods: SharedPod[]}
   */
  static fromJSON(json: string): List {
    const object = JSON.parse(json)
    assertPodList(object.pods)
    assertSharedPodList(object.sharedPods)

    return new List(object.pods, object.sharedPods)
  }
}
