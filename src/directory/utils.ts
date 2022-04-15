/**
 * Combine two parts of path to full path
 *
 * @param partOne first part of path
 * @param partTwo second part of path
 */
export function combine(partOne: string, partTwo: string): string {
  if (!partOne.endsWith('/')) {
    partOne = partOne + '/'
  }

  return partOne + partTwo
}
