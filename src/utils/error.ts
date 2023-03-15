import { CHUNK_ALREADY_EXISTS_ERROR } from '../account/utils'

/**
 * Axios' error structure which comes from bee-js library
 */
export interface AxiosError {
  response?: {
    data?: {
      message?: string
    }
  }
}

export class BeeError extends Error {
  public constructor(message: string) {
    super(message)
  }
}

export class BeeArgumentError extends BeeError {
  public constructor(message: string, readonly value: unknown) {
    super(message)
  }
}

/**
 * Checks `chunk already exists` error
 */
export function isChunkAlreadyExistsError(e: unknown): boolean {
  const axiosError = e as AxiosError

  return Boolean(axiosError?.response?.data?.message?.startsWith(CHUNK_ALREADY_EXISTS_ERROR))
}
