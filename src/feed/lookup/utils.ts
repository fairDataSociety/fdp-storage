import { Epoch } from './epoch'
import { getUnixTimestamp } from '../../utils/time'

/**
 * Gets next epoch if epoch is defined
 */
export function getNextEpoch(epoch: Epoch | undefined): Epoch | undefined {
  return epoch ? epoch.getNextEpoch(getUnixTimestamp()) : undefined
}
