import { describe, expect, it } from 'vitest'
import { createTransitionEvent } from './events'
import { advanceWorld, createWorld } from './world'

describe('transition events', () => {
  it('records stable state digests and local-time boundaries', () => {
    const before = createWorld({
      domainId: 'WORLD_A',
      initialSignal: 0,
      transition: { kind: 'ADD', operand: 1 },
    })
    const after = advanceWorld(before, 1)

    const first = createTransitionEvent('A-E-000001', 1, before, after, null)
    const second = createTransitionEvent('A-E-000001', 1, before, after, null)

    expect(first).toEqual(second)
    expect(first).toMatchObject({
      eventId: 'A-E-000001',
      schedulerOrdinal: 1,
      domainId: 'WORLD_A',
      localTimeBefore: 0,
      localTimeAfter: 1,
      payloadDigest: null,
    })
    expect(first.stateBeforeDigest).toMatch(/^[0-9a-f]{64}$/)
    expect(first.stateAfterDigest).toMatch(/^[0-9a-f]{64}$/)
    expect(first.stateAfterDigest).not.toBe(first.stateBeforeDigest)
  })

  it('canonicalizes state keys before computing event digests', () => {
    const canonical = createWorld({
      domainId: 'WORLD_A',
      initialSignal: 0,
      transition: { kind: 'ADD', operand: 1 },
    })
    const reordered = {
      transition: { operand: 1, kind: 'ADD' as const },
      signal: 0,
      localTime: 0,
      domainId: 'WORLD_A' as const,
    }
    const after = advanceWorld(canonical, 1)

    const first = createTransitionEvent('CANONICAL-1', 1, canonical, after, null)
    const second = createTransitionEvent('CANONICAL-2', 2, reordered, after, null)
    expect(second.stateBeforeDigest).toBe(first.stateBeforeDigest)
  })

  it('rejects an event whose transition changes domains or goes backwards', () => {
    const worldA = createWorld({
      domainId: 'WORLD_A',
      initialSignal: 0,
      transition: { kind: 'ADD', operand: 1 },
    })
    const worldB = createWorld({
      domainId: 'WORLD_B',
      initialSignal: 0,
      transition: { kind: 'ADD', operand: 1 },
    })

    expect(() => createTransitionEvent('BAD-DOMAIN', 1, worldA, worldB, null)).toThrow(/domain/i)
    expect(() => createTransitionEvent('BAD-TIME', 1, advanceWorld(worldA, 1), worldA, null)).toThrow(/time/i)
    expect(() => createTransitionEvent('BAD-ORDINAL', 0, worldA, advanceWorld(worldA, 1), null)).toThrow(/ordinal/i)
  })
})
