import { describe, expect, it } from 'vitest'
import { isReachable, validateCausalGraph } from './causalGraph'
import type { CausalEdge, ModelEvent } from './types'

const events: ModelEvent[] = [
  {
    eventId: 'A-E-1', schedulerOrdinal: 1, domainId: 'WORLD_A', localTimeBefore: 0, localTimeAfter: 1,
    stateBeforeDigest: 'a'.repeat(64), stateAfterDigest: 'b'.repeat(64), payloadDigest: null,
  },
  {
    eventId: 'A-E-2', schedulerOrdinal: 2, domainId: 'WORLD_A', localTimeBefore: 1, localTimeAfter: 2,
    stateBeforeDigest: 'b'.repeat(64), stateAfterDigest: 'c'.repeat(64), payloadDigest: null,
  },
  {
    eventId: 'B-E-1', schedulerOrdinal: 3, domainId: 'WORLD_B', localTimeBefore: 0, localTimeAfter: 1,
    stateBeforeDigest: 'd'.repeat(64), stateAfterDigest: 'e'.repeat(64), payloadDigest: null,
  },
  {
    eventId: 'OPEN-SEND', schedulerOrdinal: 4, domainId: 'WORLD_A', localTimeBefore: 2, localTimeAfter: 2,
    stateBeforeDigest: 'c'.repeat(64), stateAfterDigest: 'c'.repeat(64), payloadDigest: 'f'.repeat(64),
  },
  {
    eventId: 'OPEN-INTERIOR', schedulerOrdinal: 5, domainId: 'INTERIOR', localTimeBefore: null, localTimeAfter: null,
    stateBeforeDigest: '1'.repeat(64), stateAfterDigest: '2'.repeat(64), payloadDigest: 'f'.repeat(64),
  },
  {
    eventId: 'OPEN-RECEIVE', schedulerOrdinal: 6, domainId: 'WORLD_B', localTimeBefore: 1, localTimeAfter: 1,
    stateBeforeDigest: 'e'.repeat(64), stateAfterDigest: 'e'.repeat(64), payloadDigest: 'f'.repeat(64),
  },
  {
    eventId: 'CLOSED-ATTEMPT', schedulerOrdinal: 7, domainId: 'WORLD_A', localTimeBefore: 2, localTimeAfter: 2,
    stateBeforeDigest: 'c'.repeat(64), stateAfterDigest: 'c'.repeat(64), payloadDigest: 'f'.repeat(64),
  },
]

const edges: CausalEdge[] = [
  { edgeId: 'CE-1', sourceEventId: 'A-E-1', targetEventId: 'A-E-2' },
  { edgeId: 'CE-2', sourceEventId: 'OPEN-SEND', targetEventId: 'OPEN-INTERIOR' },
  { edgeId: 'CE-3', sourceEventId: 'OPEN-INTERIOR', targetEventId: 'OPEN-RECEIVE' },
]

describe('causal graph', () => {
  it('returns a deterministic topological order and directed reachability', () => {
    const result = validateCausalGraph(events, edges)

    expect(result.valid).toBe(true)
    expect(isReachable(events, edges, 'OPEN-SEND', 'OPEN-RECEIVE')).toBe(true)
    expect(isReachable(events, edges, 'CLOSED-ATTEMPT', 'B-E-1')).toBe(false)
  })

  it('rejects local-time regression and every cross-domain route except the explicit OPEN interior path', () => {
    const regressing = events.map((event) => event.eventId === 'A-E-2'
      ? { ...event, localTimeBefore: -1, localTimeAfter: 0 }
      : event)
    expect(() => validateCausalGraph(regressing, [edges[0]])).toThrow(/local time/i)

    expect(() => validateCausalGraph(events, [
      { edgeId: 'DIRECT', sourceEventId: 'A-E-2', targetEventId: 'B-E-1' },
    ])).toThrow(/cross-domain/i)

    const laterReceive = events.map((event) => event.eventId === 'OPEN-RECEIVE'
      ? { ...event, schedulerOrdinal: 8 }
      : event)
    expect(() => validateCausalGraph(laterReceive, [
      { edgeId: 'CLOSED-LEAK', sourceEventId: 'CLOSED-ATTEMPT', targetEventId: 'OPEN-RECEIVE' },
    ])).toThrow(/cross-domain/i)
  })

  it('rejects malformed event-local clocks even when an event has no edges', () => {
    const internallyRegressing = [{
      ...events[0], localTimeBefore: 2, localTimeAfter: 1,
    }]
    expect(() => validateCausalGraph(internallyRegressing, [])).toThrow(/local time/i)

    const nonFinite = [{
      ...events[0], localTimeBefore: Number.NaN, localTimeAfter: Number.NaN,
    }]
    expect(() => validateCausalGraph(nonFinite, [])).toThrow(/local time|finite/i)

    const malformedInterior = [{
      ...events.find(({ eventId }) => eventId === 'OPEN-INTERIOR')!,
      localTimeBefore: 0,
    }]
    expect(() => validateCausalGraph(malformedInterior, [])).toThrow(/interior|local time/i)

    const unknownDomain = [{
      ...events[0], domainId: 'BOGUS',
    }] as unknown as ModelEvent[]
    expect(() => validateCausalGraph(unknownDomain, [])).toThrow(/domain/i)
  })

  it('rejects unknown endpoints, backwards-scheduler edges, duplicate ordinals, and cycles', () => {
    expect(() => validateCausalGraph(events, [
      { edgeId: 'UNKNOWN', sourceEventId: 'A-E-1', targetEventId: 'missing' },
    ])).toThrow(/endpoint/i)

    expect(() => validateCausalGraph(events, [
      { edgeId: 'BACK', sourceEventId: 'B-E-1', targetEventId: 'A-E-1' },
    ])).toThrow(/backwards-scheduler/i)

    expect(() => validateCausalGraph([
      events[0],
      { ...events[1], schedulerOrdinal: 1 },
    ], [])).toThrow(/duplicate scheduler ordinal/i)

    const simultaneous: ModelEvent[] = events.map((event) => ({
      ...event,
      localTimeBefore: event.domainId === 'INTERIOR' ? null : 1,
      localTimeAfter: event.domainId === 'INTERIOR' ? null : 1,
    }))
    expect(() => validateCausalGraph(simultaneous, [
      { edgeId: 'CYCLE-1', sourceEventId: 'A-E-1', targetEventId: 'A-E-2' },
      { edgeId: 'CYCLE-2', sourceEventId: 'A-E-2', targetEventId: 'A-E-1' },
    ])).toThrow(/cycle/i)
  })
})
