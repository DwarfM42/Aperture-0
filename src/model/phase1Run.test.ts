import { describe, expect, it } from 'vitest'
import { isReachable } from './causalGraph'
import {
  createPhase1Run,
  validateCalculationManifest,
} from './phase1Run'
import { verifyChannelCertificate } from './channel'
import { computeThroatCapacity } from './transfer'

const expected = {
  ISOLATED: [0, 1, 100, 0, 0, 0],
  CORRELATING: [
    0.27807190511263785,
    0.7219280948873621,
    74.97352853986258,
    1.275,
    1.3609211851696628,
    0,
  ],
  OPEN: [
    0.8585594574581792,
    0.1414405425418208,
    22.72964882876387,
    1.4625,
    1.0130447438368164,
    1,
  ],
  CLOSED: [
    0.1187091007693073,
    0.8812908992306927,
    89.31618093076234,
    1.2374999999999998,
    1.4656772669577116,
    0,
  ],
} as const

describe('integrated Phase 1 closed-aperture run', () => {
  it('computes every phase from preregistered inputs and independent worlds', () => {
    const run = createPhase1Run()

    expect(run.notice).toBe('KNOWN TOY MODEL — NOT A DISCOVERY')
    expect(run.snapshots.map(({ phase }) => phase)).toEqual([
      'ISOLATED', 'CORRELATING', 'OPEN', 'CLOSED',
    ])
    expect(run.snapshots.map(({ worldA }) => [worldA.localTime, worldA.signal])).toEqual([
      [1, 1], [2, 2], [3, 3], [4, 4],
    ])
    expect(run.snapshots.map(({ worldB }) => [worldB.localTime, worldB.signal])).toEqual([
      [1, 3], [2, 7], [3, 15], [4, 31],
    ])

    for (const snapshot of run.snapshots) {
      const values = expected[snapshot.phase]
      expect(snapshot.metrics.mutualInformation).toBeCloseTo(values[0], 12)
      expect(snapshot.metrics.mutualInformationDistance).toBeCloseTo(values[1], 12)
      expect(snapshot.metrics.geodesicLength).toBeCloseTo(values[2], 12)
      expect(snapshot.metrics.contractionScalar).toBeCloseTo(values[3], 12)
      expect(snapshot.metrics.internalVolume).toBeCloseTo(values[4], 12)
      expect(snapshot.metrics.capacityBitsPerUse).toBeCloseTo(values[5], 12)
    }
  })

  it('exports the complete event schedule and only the OPEN cross-domain route', () => {
    const run = createPhase1Run()
    expect(run.events.map(({ schedulerOrdinal, eventId }) => [schedulerOrdinal, eventId])).toEqual([
      [1, 'A-E-01'], [2, 'B-E-01'], [3, 'A-E-02'], [4, 'B-E-02'],
      [5, 'A-E-03'], [6, 'OPEN-SEND'], [7, 'OPEN-INTERIOR'],
      [8, 'OPEN-RECEIVE'], [9, 'B-E-03'], [10, 'A-E-04'],
      [11, 'CLOSED-ATTEMPT'], [12, 'B-E-04'],
    ])
    expect(isReachable(run.events, run.edges, 'OPEN-SEND', 'OPEN-RECEIVE')).toBe(true)
    expect(isReachable(run.events, run.edges, 'CLOSED-ATTEMPT', 'B-E-04')).toBe(false)
    expect(run.causalValidation.valid).toBe(true)
  })

  it('routes all 16 OPEN bits but exposes no CLOSED B-side recovery', () => {
    const run = createPhase1Run()
    const open = run.snapshots[2].transfer
    const closed = run.snapshots[3].transfer

    expect(open).toMatchObject({ status: 'TRANSFERRED', verified: true })
    expect(open?.routeRecords).toHaveLength(16)
    expect(open?.routeRecords.every(({ traversedBonds }) => traversedBonds.join(',') === 'b,c')).toBe(true)
    expect(new TextDecoder().decode(new Uint8Array(open?.recovered ?? []))).toBe('A0')

    expect(closed).toMatchObject({
      status: 'BLOCKED_CLOSED_CHANNEL',
      verified: false,
      routeRecords: [],
      recovered: null,
    })
    expect(Array.from(closed?.input ?? [])).toEqual(Array.from(open?.input ?? []))
  })

  it('produces a deterministic canonical manifest and rejects incomplete coverage', () => {
    const first = createPhase1Run()
    const second = createPhase1Run()

    expect(first.manifest.schemaVersion).toBe('phase1-manifest/1')
    expect(first.manifest.modelVersion).toBe('closed-aperture-toy/1.0.0')
    expect(first.manifestDigest).toMatch(/^[0-9a-f]{64}$/)
    expect(second.manifestDigest).toBe(first.manifestDigest)
    expect(() => validateCalculationManifest(first.manifest)).not.toThrow()

    const missing = {
      ...first.manifest,
      records: first.manifest.records.slice(1),
    }
    expect(() => validateCalculationManifest(missing)).toThrow(/missing provenance/i)

    const duplicateEvent = {
      ...first.manifest,
      events: [...first.manifest.events, first.manifest.events[0]],
    }
    expect(() => validateCalculationManifest(duplicateEvent)).toThrow(/duplicate event/i)
  })

  it('fails closed for altered or self-consistent-looking manifest content', () => {
    const { manifest } = createPhase1Run()
    const clone = <T,>(value: T): T => structuredClone(value)

    const empty = { ...clone(manifest), snapshots: [], records: [] }
    expect(() => validateCalculationManifest(empty)).toThrow()

    const wrongNotice = clone(manifest)
    ;(wrongNotice as { notice: string }).notice = 'KNOWN TOY MODEL'
    expect(() => validateCalculationManifest(wrongNotice)).toThrow(/notice|manifest/i)

    const alteredMetric = clone(manifest)
    alteredMetric.snapshots[0].metrics.geodesicLength = 99
    expect(() => validateCalculationManifest(alteredMetric)).toThrow(/manifest|snapshot|metric/i)

    const alteredRecord = clone(manifest)
    alteredRecord.records[0].inputDigest = '0'.repeat(64)
    expect(() => validateCalculationManifest(alteredRecord)).toThrow(/digest|manifest|record/i)

    const falseValidation = clone(manifest)
    falseValidation.causalValidation.topologicalOrder = []
    expect(() => validateCalculationManifest(falseValidation)).toThrow(/causal|manifest/i)

    const alteredWorldRule = clone(manifest)
    alteredWorldRule.inputConfiguration.worldB.transition.operand = 2
    expect(() => validateCalculationManifest(alteredWorldRule)).toThrow(/input digest|manifest/i)

    const alteredInitialClock = clone(manifest)
    ;(alteredInitialClock.inputConfiguration.worldA as { initialLocalTime: number }).initialLocalTime = 1
    expect(() => validateCalculationManifest(alteredInitialClock)).toThrow(/input digest|manifest/i)

    const alteredTensorInput = clone(manifest)
    alteredTensorInput.inputConfiguration.tensorNetworks[1].tensors[0].values[3] = 0.75
    expect(() => validateCalculationManifest(alteredTensorInput)).toThrow(/input digest|manifest/i)

    const alteredTensorEvidence = clone(manifest)
    ;(alteredTensorEvidence.snapshots[2].tensorEvidence!.validation as {
      danglingIndexCount: number
    }).danglingIndexCount = 1
    expect(() => validateCalculationManifest(alteredTensorEvidence)).toThrow(/manifest|snapshot/i)

    const falseReachability = clone(manifest)
    falseReachability.reachabilityEvidence.closedAttemptToWorldB = true
    expect(() => validateCalculationManifest(falseReachability)).toThrow(/manifest/i)

    const customSnapshotPrototype = clone(manifest)
    Object.setPrototypeOf(customSnapshotPrototype.snapshots, { inherited: true })
    expect(() => validateCalculationManifest(customSnapshotPrototype)).toThrow(/prototype/i)

    const nullSnapshotPrototype = clone(manifest)
    Object.setPrototypeOf(nullSnapshotPrototype.snapshots[0], null)
    expect(() => validateCalculationManifest(nullSnapshotPrototype)).toThrow(/prototype/i)

    const hiddenSnapshotProperty = clone(manifest)
    Object.defineProperty(hiddenSnapshotProperty.snapshots[0], 'hidden', { value: true })
    expect(() => validateCalculationManifest(hiddenSnapshotProperty)).toThrow(/property|enumerable/i)

    const negativeZeroMetric = clone(manifest)
    negativeZeroMetric.snapshots[0].metrics.mutualInformation = -0
    expect(() => validateCalculationManifest(negativeZeroMetric)).toThrow(/negative zero/i)

    const negativeZeroEventClock = clone(manifest)
    negativeZeroEventClock.events[0].localTimeBefore = -0
    expect(() => validateCalculationManifest(negativeZeroEventClock)).toThrow(/negative zero/i)

    const negativeZeroInitialClock = clone(manifest)
    negativeZeroInitialClock.inputConfiguration.worldA.initialLocalTime = -0
    expect(() => validateCalculationManifest(negativeZeroInitialClock)).toThrow(/negative zero/i)

    const negativeZeroProvenance = clone(manifest)
    const zeroRecord = negativeZeroProvenance.records.find(({ value }) => Object.is(value, 0))!
    const zeroBinding = negativeZeroProvenance.snapshots
      .flatMap(({ displayedMetrics }) => displayedMetrics)
      .find(({ recordId }) => recordId === zeroRecord.recordId)!
    zeroRecord.value = -0
    zeroBinding.value = -0
    expect(() => validateCalculationManifest(negativeZeroProvenance)).toThrow(/negative zero/i)
  })

  it('returns frozen validated containers rather than mutable aliases', () => {
    const run = createPhase1Run()
    expect(Object.isFrozen(run)).toBe(true)
    expect(Object.isFrozen(run.manifest)).toBe(true)
    expect(Object.isFrozen(run.snapshots)).toBe(true)
    expect(Object.isFrozen(run.snapshots[0].metrics)).toBe(true)
    expect(Object.isFrozen(run.snapshots[2].transfer?.input)).toBe(true)
    expect(Object.isFrozen(run.snapshots[2].transfer?.recovered)).toBe(true)
    expect(Object.isFrozen(run.manifest.records)).toBe(true)
    expect(Object.isFrozen(run.manifest.records[0])).toBe(true)
    expect(run.snapshots).not.toBe(run.manifest.snapshots)
    expect(run.events).not.toBe(run.manifest.events)
    expect(run.edges).not.toBe(run.manifest.edges)
  })

  it('exports complete preregistered inputs, tensor validation, and reachability evidence', () => {
    const run = createPhase1Run()
    expect(run.manifest.inputConfiguration).toMatchObject({
      worldA: { domainId: 'WORLD_A', initialLocalTime: 0, initialSignal: 0, transition: { kind: 'ADD', operand: 1 } },
      worldB: { domainId: 'WORLD_B', initialLocalTime: 0, initialSignal: 1, transition: { kind: 'DOUBLE_THEN_ADD', operand: 1 } },
      transfer: { payloadBytes: [0x41, 0x30], xorKeyBytes: [0xa7, 0x3c], channelUses: 16 },
      geodesic: { boundaryEdgeLength: 100, interiorBaseLength: 10, interiorDistanceScale: 90 },
    })
    expect(run.manifest.inputConfiguration.tensorNetworks).toHaveLength(3)
    expect(run.manifest.inputConfiguration.tensorNetworks[1].tensors[0].values).toEqual([1, 0, 0, 0.5])

    for (const snapshot of run.manifest.snapshots.filter(({ phase }) => phase !== 'ISOLATED')) {
      expect(snapshot.tensorEvidence).toMatchObject({
        validation: { valid: true, danglingIndexCount: 0 },
        contractionOrder: ['A×I→M', 'M×B→scalar'],
      })
      expect(snapshot.tensorEvidence?.tensors).toHaveLength(3)
    }
    expect(run.manifest.reachabilityEvidence).toEqual({
      openSendToReceive: true,
      closedAttemptToWorldB: false,
    })
    const open = run.manifest.snapshots.find(({ phase }) => phase === 'OPEN')!
    const closed = run.manifest.snapshots.find(({ phase }) => phase === 'CLOSED')!
    expect(open.metrics).toMatchObject({ routedBits: 16, channelUses: 16 })
    expect(closed.metrics).toMatchObject({ routedBits: 0, channelUses: 16 })
    expect(open.displayedMetrics.map(({ recordId }) => recordId)).toEqual(expect.arrayContaining([
      'OPEN.routedBits',
      'OPEN.channelUses',
    ]))
  })

  it('returns issued certificates that remain verifier-valid and authoritative for capacity', () => {
    const run = createPhase1Run()
    const openCertificate = run.snapshots.find(({ phase }) => phase === 'OPEN')?.certificate
    expect(openCertificate).not.toBeNull()
    expect(verifyChannelCertificate(openCertificate!)).toBe(true)
    expect(computeThroatCapacity(openCertificate!)).toBe(1)
    expect(run.manifest.snapshots.find(({ phase }) => phase === 'OPEN')?.certificate)
      .toBe(openCertificate)
  })
})
