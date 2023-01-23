import { JsonPod, Pod, JsonSharedPod, SharedPod } from './types'
import {
  assertPods,
  assertPodsMetadata,
  assertSharedPods,
  jsonPodToPod,
  jsonSharedPodToSharedPod,
  podToJsonPod,
  sharedPodToJsonSharedPod,
} from './utils'
import { jsonParse } from '../utils/json'

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
   * Prepares data to convert to a JSON string
   */
  toJSON(): unknown {
    return {
      pods: this.pods.map(item => podToJsonPod(item)),
      sharedPods: this.sharedPods.map(item => sharedPodToJsonSharedPod(item)),
    }
  }

  /**
   * Creates pods list from JSON string
   *
   * @param json {pods: Pod[], sharedPods: SharedPod[]}
   */
  static fromJSON(json: string): List {
    const object = jsonParse(json, 'pod list')
    assertPodsMetadata(object)
    const pods = object.pods.map((item: JsonPod) => jsonPodToPod(item))
    const sharedPods = object.sharedPods.map((item: JsonSharedPod) => jsonSharedPodToSharedPod(item))
    assertPods(pods)
    assertSharedPods(sharedPods)

    return new List(pods, sharedPods)
  }
}
