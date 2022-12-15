export const CHUNK_ALREADY_EXISTS_ERROR = 'Conflict: chunk already exists'

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
 * Gets correct type of error
 */
export function getError(e: unknown): Error | undefined {
  if (e instanceof Error) {
    return e as Error
  } else {
    return undefined
  }
}

/**
 * Checks that error message starts with the text
 */
export function errorStartWith(e: unknown, text: string): boolean {
  return getError(e)?.message?.startsWith(text) || false
}
