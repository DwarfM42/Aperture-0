import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { canonicalStringify } from './provenance'
import type { ModelEvent, WorldState } from './types'

const encoder = new TextEncoder()

function digest(value: unknown): string {
  return bytesToHex(sha256(encoder.encode(canonicalStringify(value))))
}

export function createTransitionEvent(
  eventId: string,
  schedulerOrdinal: number,
  before: WorldState,
  after: WorldState,
  payload: Uint8Array | null,
): ModelEvent {
  if (!Number.isInteger(schedulerOrdinal) || schedulerOrdinal <= 0) {
    throw new Error('scheduler ordinal must be a positive integer')
  }
  if (before.domainId !== after.domainId) {
    throw new Error('transition event cannot change domain')
  }
  if (after.localTime < before.localTime) {
    throw new Error('transition event cannot move backwards in time')
  }

  return {
    eventId,
    schedulerOrdinal,
    domainId: before.domainId,
    localTimeBefore: before.localTime,
    localTimeAfter: after.localTime,
    stateBeforeDigest: digest(before),
    stateAfterDigest: digest(after),
    payloadDigest: payload === null ? null : bytesToHex(sha256(payload)),
  }
}
