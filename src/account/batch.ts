import { BeeDebug } from '@ethersphere/bee-js'

export async function getBatchId(beeDebug: BeeDebug): Promise<string> {
  const batches = await beeDebug.getAllPostageBatch()

  if (batches.length === 0) {
    throw new Error('Postage batch not exists')
  }

  const batchId = batches.pop()?.batchID

  if (!batchId) {
    throw new Error('Incorrect batch id found')
  }

  return batchId
}
