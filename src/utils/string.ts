/**
 * Replace all occurrences of a string with another string
 *
 * @param data input string
 * @param search string to search for
 * @param replacement string to replace with
 */
export function replaceAll(data: string, search: string, replacement: string): string {
  return data.replace(new RegExp(search, 'g'), replacement)
}
