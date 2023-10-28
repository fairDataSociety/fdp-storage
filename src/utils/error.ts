import { ERROR_CHUNK_ALREADY_EXISTS, ERROR_INSUFFICIENT_FUNDS } from '../account/utils'

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

/**
 * RPC error structure which comes from `fdp-contracts-js` library
 */
export interface RpcError {
  error?: {
    message?: string
  }
}

export class BeeError extends Error {
  public constructor(message: string) {
    super(message)
  }
}

export class BeeArgumentError extends BeeError {
  public constructor(
    message: string,
    readonly value: unknown,
  ) {
    super(message)
  }
}

/**
 * Checks `chunk already exists` error
 */
export function isChunkAlreadyExistsError(e: unknown): boolean {
  const axiosError = e as AxiosError

  return Boolean(axiosError?.response?.data?.message?.startsWith(ERROR_CHUNK_ALREADY_EXISTS))
}

/**
 * Checks insufficient funds error
 */
export function isInsufficientFundsError(e: unknown): boolean {
  const axiosError = e as RpcError

  return Boolean(axiosError?.error?.message?.startsWith(ERROR_INSUFFICIENT_FUNDS))
}
