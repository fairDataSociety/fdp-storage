import { createUsableBatch } from './utils'

export default async function testsSetup(): Promise<void> {
  // internal env param for caching batch id
  process.env.CACHED_BEE_BATCH_ID = await createUsableBatch()
}
