import Long from 'long'
import { Epoch } from './epoch'
import { Lookup, LowestLevel, NoClue, worstHint } from './lookup'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import RWMutex from 'rwmutex'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Context from '@kriskowal/context'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { defer } from 'golike-defer'

const Millisecond = 1000000
const LongEarthLookaheadDelay = 250 * Millisecond
const LongEarthLookbackDelay = 250 * Millisecond

