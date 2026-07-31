import { describe, expect, it } from 'vitest'
import {
  deriveChannelCertificate,
  verifyChannelCertificate,
} from './channel'
import { createClosedTensorNetwork } from './tensorNetwork'

describe('tensor-derived channel certificate', () => {
  it('seals the validated A-I-B route and derives transport enablement from phase', () => {
    const network = createClosedTensorNetwork(0.9)
    const first = deriveChannelCertificate(network, 'OPEN')
    const second = deriveChannelCertificate(network, 'OPEN')

    expect(first).toEqual(second)
    expect(first).toMatchObject({
      phase: 'OPEN',
      tensorRoute: ['A', 'I', 'B'],
      bondRoute: ['b', 'c'],
      routeBondDimensions: [2, 2],
      transportEnabled: true,
    })
    expect(first.networkInputDigest).toMatch(/^[0-9a-f]{64}$/)
    expect(first.certificateDigest).toMatch(/^[0-9a-f]{64}$/)
    expect(verifyChannelCertificate(first)).toBe(true)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first.tensorRoute)).toBe(true)
    expect(Object.isFrozen(first.bondRoute)).toBe(true)
    expect(Object.isFrozen(first.routeBondDimensions)).toBe(true)
  })

  it('disables transport outside OPEN and rejects a mutated certificate', () => {
    const closed = deriveChannelCertificate(createClosedTensorNetwork(0.3), 'CLOSED')
    expect(closed.transportEnabled).toBe(false)
    expect(verifyChannelCertificate(closed)).toBe(true)

    const forged = {
      ...closed,
      phase: 'OPEN' as const,
      transportEnabled: true,
    }
    expect(verifyChannelCertificate(forged)).toBe(false)
  })

  it('rejects an unissued structural copy even when every public field and digest match', () => {
    const certificate = deriveChannelCertificate(createClosedTensorNetwork(0.9), 'OPEN')
    const structuralCopy = { ...certificate }

    expect(verifyChannelCertificate(structuralCopy)).toBe(false)
  })

  it('refuses to issue a route certificate for an unrelated closed topology', () => {
    const values = [1, 0, 0, 1]
    const unrelated = [
      { tensorId: 'X', indices: ['b', 'c'], dimensions: [2, 2], values },
      { tensorId: 'Y', indices: ['c', 'd'], dimensions: [2, 2], values },
      { tensorId: 'Z', indices: ['d', 'b'], dimensions: [2, 2], values },
    ]

    expect(() => deriveChannelCertificate(unrelated, 'OPEN')).toThrow(/A, I, and B|topology|route/i)
  })

  it('issues certificates only for the preregistered phase-bound network', () => {
    const wrongDimensions = createClosedTensorNetwork(0.9).map((tensor) => ({
      ...tensor,
      dimensions: [3, 3],
      values: Array(9).fill(1),
    }))
    expect(() => deriveChannelCertificate(wrongDimensions, 'OPEN')).toThrow(/preregistered|dimension|network/i)

    const alteredFixedTensor = createClosedTensorNetwork(0.9)
    alteredFixedTensor[0].values[0] = 2
    expect(() => deriveChannelCertificate(alteredFixedTensor, 'OPEN')).toThrow(/preregistered|network/i)

    expect(() => deriveChannelCertificate(createClosedTensorNetwork(0.4), 'OPEN'))
      .toThrow(/phase|preregistered|network/i)
    expect(() => deriveChannelCertificate(
      createClosedTensorNetwork(0.9),
      'BOGUS' as never,
    )).toThrow(/phase/i)
  })

  it('rejects coercible phases and any non-preregistered tensor container content', () => {
    const coerciblePhase = Object.create(null) as { toString?: () => string }
    Object.defineProperty(coerciblePhase, 'toString', {
      value: () => 'OPEN',
      enumerable: false,
    })
    expect(() => deriveChannelCertificate(
      createClosedTensorNetwork(0.9),
      coerciblePhase as never,
    )).toThrow(/phase/i)

    const extraTensorProperty = createClosedTensorNetwork(0.9)
    Object.defineProperty(extraTensorProperty[0], 'hidden', { value: true })
    expect(() => deriveChannelCertificate(extraTensorProperty, 'OPEN'))
      .toThrow(/property|preregistered|tensor/i)

    const decoratedValues = createClosedTensorNetwork(0.9)
    Object.defineProperty(decoratedValues[0].values, 'hidden', { value: true })
    expect(() => deriveChannelCertificate(decoratedValues, 'OPEN'))
      .toThrow(/property|array|preregistered/i)

    const customPrototype = createClosedTensorNetwork(0.9)
    Object.setPrototypeOf(customPrototype[0], { inherited: true })
    expect(() => deriveChannelCertificate(customPrototype, 'OPEN'))
      .toThrow(/prototype|preregistered|tensor/i)
  })
})
