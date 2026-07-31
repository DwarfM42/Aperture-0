import { describe, expect, it } from 'vitest'
import {
  assertProvenanceCoverage,
  canonicalStringify,
  createCalculationRecord,
} from './provenance'

describe('calculation provenance', () => {
  it('canonicalizes object keys and produces stable input digests', () => {
    expect(canonicalStringify({ z: 1, a: { d: 2, b: 3 } }))
      .toBe('{"a":{"b":3,"d":2},"z":1}')

    const first = createCalculationRecord({
      recordId: 'OPEN.MI',
      metric: 'MUTUAL_INFORMATION',
      value: 0.8585594574581792,
      unit: 'bits',
      algorithm: 'shannon-mutual-information',
      algorithmVersion: '1.0.0',
      formula: 'sum pxy log2(pxy/(px*py))',
      inputIds: ['OPEN.JOINT'],
      inputs: { z: 1, a: 2 },
    })
    const second = createCalculationRecord({
      recordId: 'OPEN.MI',
      metric: 'MUTUAL_INFORMATION',
      value: 0.8585594574581792,
      unit: 'bits',
      algorithm: 'shannon-mutual-information',
      algorithmVersion: '1.0.0',
      formula: 'sum pxy log2(pxy/(px*py))',
      inputIds: ['OPEN.JOINT'],
      inputs: { a: 2, z: 1 },
    })

    expect(first).toEqual(second)
    expect(first.source).toBe('COMPUTED')
    expect(first.inputDigest).toMatch(/^[0-9a-f]{64}$/)
  })

  it('uses locale-independent code-unit key order and rejects ambiguous structures', () => {
    expect(canonicalStringify({ ä: 1, z: 2 })).toBe('{"z":2,"ä":1}')
    expect(() => canonicalStringify(-0)).toThrow(/negative zero/i)

    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(() => canonicalStringify(cyclic)).toThrow(/cyclic/i)

    const sparse = new Array(2)
    sparse[1] = 1
    expect(() => canonicalStringify(sparse)).toThrow(/sparse/i)

    const symbolKeyed = { visible: 1 } as Record<PropertyKey, unknown>
    symbolKeyed[Symbol('hidden')] = 2
    expect(() => canonicalStringify(symbolKeyed)).toThrow(/symbol/i)

    const decoratedArray = [1, 2] as number[] & { hidden?: number }
    decoratedArray.hidden = 3
    expect(() => canonicalStringify(decoratedArray)).toThrow(/property|array/i)

    const symbolArray = [1, 2] as unknown[] & Record<PropertyKey, unknown>
    symbolArray[Symbol('hidden')] = 3
    expect(() => canonicalStringify(symbolArray)).toThrow(/symbol/i)

    const symbolBytes = structuredClone(new Uint8Array([1, 2])) as Uint8Array & Record<PropertyKey, unknown>
    symbolBytes[Symbol('hidden')] = 3
    expect(() => canonicalStringify(symbolBytes)).toThrow(/symbol/i)

    const customPrototypeArray = [1, 2]
    Object.setPrototypeOf(customPrototypeArray, { inherited: true })
    expect(() => canonicalStringify(customPrototypeArray)).toThrow(/prototype/i)

    const customPrototypeBytes = structuredClone(new Uint8Array([1, 2]))
    Object.setPrototypeOf(customPrototypeBytes, { inherited: true })
    expect(() => canonicalStringify(customPrototypeBytes)).toThrow(/prototype/i)

    const nullPrototypeObject = Object.assign(Object.create(null), { visible: 1 })
    expect(() => canonicalStringify(nullPrototypeObject)).toThrow(/prototype/i)

    const hiddenProperty = { visible: 1 }
    Object.defineProperty(hiddenProperty, 'hidden', { value: 2 })
    expect(() => canonicalStringify(hiddenProperty)).toThrow(/property|enumerable/i)

    const accessorArray = [1, 2]
    Object.defineProperty(accessorArray, '0', { enumerable: true, get: () => 1 })
    expect(() => canonicalStringify(accessorArray)).toThrow(/accessor|property/i)

    const clonedBytes = structuredClone(new Uint8Array([1, 2]))
    expect(canonicalStringify(clonedBytes)).toBe('[1,2]')
  })

  it('requires exactly one COMPUTED record for every displayed Phase 1 metric', () => {
    const record = createCalculationRecord({
      recordId: 'OPEN.GEODESIC',
      metric: 'GEODESIC_LENGTH',
      value: 22.72964882876387,
      unit: 'geometry-units',
      algorithm: 'dijkstra-lexical',
      algorithmVersion: '1.0.0',
      formula: 'min(100, 10 + 90*d_MI)',
      inputIds: ['OPEN.D_MI'],
      inputs: { distance: 0.1414405425418208 },
    })

    expect(() => assertProvenanceCoverage(['OPEN.GEODESIC'], [record])).not.toThrow()
    expect(() => assertProvenanceCoverage(['OPEN.MISSING'], [record])).toThrow(/missing provenance/i)
    expect(() => assertProvenanceCoverage(['OPEN.GEODESIC'], [record, record])).toThrow(/duplicate provenance/i)
  })

  it('fails closed for non-finite displayed values', () => {
    expect(() => createCalculationRecord({
      recordId: 'BAD', metric: 'BAD', value: Number.NaN, unit: 'none',
      algorithm: 'bad', algorithmVersion: '1', formula: 'bad', inputIds: [], inputs: {},
    })).toThrow(/finite/i)
  })
})
