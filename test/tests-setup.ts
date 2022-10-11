import { createUsableBatch, setCachedBatchId } from './utils'

export default async function testsSetup(): Promise<void> {
  setCachedBatchId(await createUsableBatch())
}
