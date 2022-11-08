import { JsonPod, Pod, JsonSharedPod, SharedPod } from './types'
import { assertPods, assertPodsMetadata, assertSharedPods, jsonPodToPod, jsonSharedPodToSharedPod } from './utils'

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
    let object: unknown
    try {
      object = JSON.parse(json)
    } catch (e) {
      const error = e as Error

      throw new Error(`Can't parse json pods list: ${error.message}`)
    }
    assertPodsMetadata(object)
    const pods = object.pods.map((item: JsonPod) => jsonPodToPod(item))
    const sharedPods = object.sharedPods.map((item: JsonSharedPod) => jsonSharedPodToSharedPod(item))
    assertPods(pods)
    assertSharedPods(sharedPods)

    return new List(pods, sharedPods)
  }
}
