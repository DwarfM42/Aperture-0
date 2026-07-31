import { describe, expect, it } from 'vitest'
import { advanceWorld, createWorld } from './world'

describe('independent world state and time', () => {
  it('advances World A without mutating or advancing World B', () => {
    const worldA = createWorld({
      domainId: 'WORLD_A',
      initialSignal: 0,
      transition: { kind: 'ADD', operand: 1 },
    })
    const worldB = createWorld({
      domainId: 'WORLD_B',
      initialSignal: 1,
      transition: { kind: 'DOUBLE_THEN_ADD', operand: 1 },
    })

    const nextA = advanceWorld(worldA, 2)

    expect(nextA).toMatchObject({ domainId: 'WORLD_A', localTime: 2, signal: 2 })
    expect(worldA).toMatchObject({ localTime: 0, signal: 0 })
    expect(worldB).toMatchObject({ localTime: 0, signal: 1 })
  })

  it('applies World B transition rules independently and deterministically', () => {
    const worldB = createWorld({
      domainId: 'WORLD_B',
      initialSignal: 1,
      transition: { kind: 'DOUBLE_THEN_ADD', operand: 1 },
    })

    expect(advanceWorld(worldB, 3)).toMatchObject({
      domainId: 'WORLD_B',
      localTime: 3,
      signal: 15,
    })
    expect(advanceWorld(worldB, 3)).toEqual(advanceWorld(worldB, 3))
  })

  it('fails closed for invalid tick counts and non-finite state', () => {
    const worldA = createWorld({
      domainId: 'WORLD_A',
      initialSignal: 0,
      transition: { kind: 'ADD', operand: 1 },
    })

    expect(() => advanceWorld(worldA, -1)).toThrow(/tick/i)
    expect(() => advanceWorld(worldA, 1.5)).toThrow(/tick/i)
    expect(() => createWorld({
      domainId: 'WORLD_A',
      initialSignal: Number.NaN,
      transition: { kind: 'ADD', operand: 1 },
    })).toThrow(/finite/i)
  })
})
