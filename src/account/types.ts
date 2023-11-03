import { ServiceRequest } from '@fairdatasociety/fdp-contracts-js/build/types/model/service-request.model'
import { RegisterUsernameRequestData } from '@fairdatasociety/fdp-contracts-js'

/**
 * This objects encapsulates state of registration process.
 */
export interface RegistrationRequest {
  username: string
  password: string
  ensCompleted: boolean
  ensRequest?: ServiceRequest<RegisterUsernameRequestData>
}

/**
 * Assert account options
 */
export interface AssertAccountOptions {
  /**
   * Check if write access is required
   */
  writeRequired?: boolean
}
