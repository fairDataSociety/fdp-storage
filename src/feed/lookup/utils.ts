import { Epoch } from '../epoch'
import { getUnixTimestamp } from '../../utils/time'

/**
 * Gets next epoch
 */
export function getNextEpoch(epoch: Epoch): Epoch {
  return epoch.getNextEpoch(getUnixTimestamp())
}
