import { Pod, SharedPod } from './types'

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
}
