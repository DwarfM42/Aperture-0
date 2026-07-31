import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { isReachable, validateCausalGraph } from './causalGraph'
import {
  deriveChannelCertificate,
  verifyChannelCertificate,
  type ChannelCertificate,
  type ChannelPhase,
} from './channel'
import { createTransitionEvent } from './events'
import {
  buildInformationGeometryGraph,
  shortestPath,
  type InformationGeometryGraphConfiguration,
  type ShortestPathResult,
} from './geodesic'
import {
  mutualInformation,
  mutualInformationDistance,
  normalizedMutualInformation,
} from './information'
import {
  canonicalStringify,
  createCalculationRecord,
  type CalculationRecord,
} from './provenance'
import {
  contractClosedTensorNetwork,
  createClosedTensorNetwork,
  validateClosedTensorNetwork,
  type ClosedNetworkValidation,
  type NamedTensor,
  type TensorContractionResult,
} from './tensorNetwork'
import { attemptTransfer, type TransferResult } from './transfer'
import type {
  CausalEdge,
  CausalGraphValidation,
  ModelEvent,
  WorldState,
} from './types'
import { advanceWorld, createWorld } from './world'

export type Phase1Phase = 'ISOLATED' | 'CORRELATING' | 'OPEN' | 'CLOSED'

interface PhaseInput {
  phase: Phase1Phase
  jointDistribution: number[][]
  coupling: number
  includeInteriorPath: boolean
}

interface WorldInputConfiguration {
  domainId: 'WORLD_A' | 'WORLD_B'
  initialLocalTime: 0
  initialSignal: number
  transition: { kind: 'ADD' | 'DOUBLE_THEN_ADD'; operand: number }
}

interface TensorNetworkInput {
  phase: ChannelPhase
  tensors: NamedTensor[]
}

interface Phase1InputConfiguration {
  worldA: WorldInputConfiguration
  worldB: WorldInputConfiguration
  transfer: {
    payloadUtf8: 'A0'
    payloadBytes: number[]
    xorKeyBytes: number[]
    channelUses: 16
  }
  geodesic: InformationGeometryGraphConfiguration
  phases: PhaseInput[]
  tensorNetworks: TensorNetworkInput[]
}

interface TensorEvidence {
  tensors: NamedTensor[]
  validation: ClosedNetworkValidation
  contractionOrder: ['A×I→M', 'M×B→scalar']
}

export interface Phase1Metrics {
  mutualInformation: number
  normalizedMutualInformation: number
  mutualInformationDistance: number
  geodesicLength: number
  geodesicReductionRatio: number
  contractionScalar: number
  singularValues: number[]
  internalVolume: number
  capacityBitsPerUse: number
  routedBits: number
  channelUses: number
}

export interface DisplayMetricBinding {
  recordId: string
  value: number
  unit: string
}

export interface Phase1Snapshot {
  phase: Phase1Phase
  worldA: WorldState
  worldB: WorldState
  metrics: Phase1Metrics
  geodesicWitness: ShortestPathResult
  tensorEvidence: TensorEvidence | null
  certificate: ChannelCertificate | null
  transfer: TransferResult | null
  displayedMetrics: DisplayMetricBinding[]
}

export interface CalculationManifest {
  schemaVersion: 'phase1-manifest/1'
  modelVersion: 'closed-aperture-toy/1.0.0'
  notice: 'KNOWN TOY MODEL — NOT A DISCOVERY'
  classification: 'KNOWN_DOMAIN_COMPUTED_TOY_MODEL'
  inputConfiguration: Phase1InputConfiguration
  inputDigest: string
  snapshots: Phase1Snapshot[]
  events: ModelEvent[]
  edges: CausalEdge[]
  causalValidation: CausalGraphValidation
  reachabilityEvidence: {
    openSendToReceive: boolean
    closedAttemptToWorldB: boolean
  }
  records: CalculationRecord[]
}

export interface Phase1Run {
  notice: CalculationManifest['notice']
  snapshots: Phase1Snapshot[]
  events: ModelEvent[]
  edges: CausalEdge[]
  causalValidation: CausalGraphValidation
  manifest: CalculationManifest
  manifestDigest: string
}

const encoder = new TextEncoder()

const INPUTS: PhaseInput[] = [
  { phase: 'ISOLATED', jointDistribution: [[0.25, 0.25], [0.25, 0.25]], coupling: 0, includeInteriorPath: false },
  { phase: 'CORRELATING', jointDistribution: [[0.4, 0.1], [0.1, 0.4]], coupling: 0.4, includeInteriorPath: true },
  { phase: 'OPEN', jointDistribution: [[0.49, 0.01], [0.01, 0.49]], coupling: 0.9, includeInteriorPath: true },
  { phase: 'CLOSED', jointDistribution: [[0.35, 0.15], [0.15, 0.35]], coupling: 0.3, includeInteriorPath: true },
]

function digest(value: unknown): string {
  return bytesToHex(sha256(encoder.encode(canonicalStringify(value))))
}

function buildInputConfiguration(): Phase1InputConfiguration {
  const phases = INPUTS.map((input) => ({
    ...input,
    jointDistribution: input.jointDistribution.map((row) => [...row]),
  }))
  return {
    worldA: { domainId: 'WORLD_A', initialLocalTime: 0, initialSignal: 0, transition: { kind: 'ADD', operand: 1 } },
    worldB: { domainId: 'WORLD_B', initialLocalTime: 0, initialSignal: 1, transition: { kind: 'DOUBLE_THEN_ADD', operand: 1 } },
    transfer: {
      payloadUtf8: 'A0',
      payloadBytes: Array.from(encoder.encode('A0')),
      xorKeyBytes: [0xa7, 0x3c],
      channelUses: 16,
    },
    geodesic: {
      boundaryEdgeLength: 100,
      interiorBaseLength: 10,
      interiorDistanceScale: 90,
    },
    phases,
    tensorNetworks: phases
      .filter((input): input is PhaseInput & { phase: ChannelPhase } => input.phase !== 'ISOLATED')
      .map((input) => ({
        phase: input.phase,
        tensors: createClosedTensorNetwork(input.coupling),
      })),
  }
}

function buildEvents(configuration: Phase1InputConfiguration): {
  events: ModelEvent[]
  edges: CausalEdge[]
  worlds: Array<[WorldState, WorldState]>
} {
  let worldA = createWorld(configuration.worldA)
  let worldB = createWorld(configuration.worldB)
  const payload = Uint8Array.from(configuration.transfer.payloadBytes)
  const events: ModelEvent[] = []
  const worlds: Array<[WorldState, WorldState]> = []

  const nextA = advanceWorld(worldA)
  events.push(createTransitionEvent('A-E-01', 1, worldA, nextA, null))
  worldA = nextA
  const nextB = advanceWorld(worldB)
  events.push(createTransitionEvent('B-E-01', 2, worldB, nextB, null))
  worldB = nextB
  worlds.push([worldA, worldB])

  const correlatingA = advanceWorld(worldA)
  events.push(createTransitionEvent('A-E-02', 3, worldA, correlatingA, null))
  worldA = correlatingA
  const correlatingB = advanceWorld(worldB)
  events.push(createTransitionEvent('B-E-02', 4, worldB, correlatingB, null))
  worldB = correlatingB
  worlds.push([worldA, worldB])

  const openA = advanceWorld(worldA)
  events.push(createTransitionEvent('A-E-03', 5, worldA, openA, null))
  worldA = openA
  const send = createTransitionEvent('OPEN-SEND', 6, worldA, worldA, payload)
  events.push(send)
  const openCertificate = deriveChannelCertificate(createClosedTensorNetwork(0.9), 'OPEN')
  events.push({
    eventId: 'OPEN-INTERIOR',
    schedulerOrdinal: 7,
    domainId: 'INTERIOR',
    localTimeBefore: null,
    localTimeAfter: null,
    stateBeforeDigest: openCertificate.networkInputDigest,
    stateAfterDigest: openCertificate.certificateDigest,
    payloadDigest: send.payloadDigest,
  })
  events.push(createTransitionEvent('OPEN-RECEIVE', 8, worldB, worldB, payload))
  const openB = advanceWorld(worldB)
  events.push(createTransitionEvent('B-E-03', 9, worldB, openB, null))
  worldB = openB
  worlds.push([worldA, worldB])

  const closedA = advanceWorld(worldA)
  events.push(createTransitionEvent('A-E-04', 10, worldA, closedA, null))
  worldA = closedA
  events.push(createTransitionEvent('CLOSED-ATTEMPT', 11, worldA, worldA, payload))
  const closedB = advanceWorld(worldB)
  events.push(createTransitionEvent('B-E-04', 12, worldB, closedB, null))
  worldB = closedB
  worlds.push([worldA, worldB])

  const edgePairs: Array<[string, string]> = [
    ['A-E-01', 'A-E-02'],
    ['A-E-02', 'A-E-03'],
    ['A-E-03', 'OPEN-SEND'],
    ['OPEN-SEND', 'A-E-04'],
    ['A-E-04', 'CLOSED-ATTEMPT'],
    ['B-E-01', 'B-E-02'],
    ['B-E-02', 'OPEN-RECEIVE'],
    ['OPEN-RECEIVE', 'B-E-03'],
    ['B-E-03', 'B-E-04'],
    ['OPEN-SEND', 'OPEN-INTERIOR'],
    ['OPEN-INTERIOR', 'OPEN-RECEIVE'],
  ]
  const edges = edgePairs.map(([sourceEventId, targetEventId], index) => ({
    edgeId: `CE-${String(index + 1).padStart(2, '0')}`,
    sourceEventId,
    targetEventId,
  }))
  return { events, edges, worlds }
}

function zeroContraction(): TensorContractionResult {
  return {
    contractionOrder: ['A×I→M', 'M×B→scalar'],
    scalar: 0,
    singularValues: [0, 0],
    internalVolume: 0,
  }
}

function makeRecords(
  input: PhaseInput,
  worldA: WorldState,
  worldB: WorldState,
  metrics: Phase1Metrics,
  transfer: TransferResult | null,
): { records: CalculationRecord[]; bindings: DisplayMetricBinding[] } {
  const values: Array<[string, number, string, string]> = [
    ['worldA.localTime', worldA.localTime, 'ticks', 'immutable world A transition count'],
    ['worldB.localTime', worldB.localTime, 'ticks', 'immutable world B transition count'],
    ['mutualInformation', metrics.mutualInformation, 'bits', 'sum p(a,b) log2(p(a,b)/(p(a)p(b)))'],
    ['normalizedMutualInformation', metrics.normalizedMutualInformation, 'ratio', 'MI/max(H(A),H(B))'],
    ['mutualInformationDistance', metrics.mutualInformationDistance, 'edge weight', '1-NMI'],
    ['geodesicLength', metrics.geodesicLength, 'units', 'shortest weighted path'],
    ['geodesicReductionRatio', metrics.geodesicReductionRatio, 'ratio', '1-geodesic/100'],
    ['contractionScalar', metrics.contractionScalar, 'scalar', 'trace(A I B)'],
    ['internalVolume', metrics.internalVolume, 'effective rank', 'exp(entropy(singular-value energy))'],
    ['capacityBitsPerUse', metrics.capacityBitsPerUse, 'bits/use', 'OPEN ? log2(min route bond dimension) : 0'],
    ['routedBits', metrics.routedBits, 'bits', 'count(transfer route records that traversed b then c)'],
    ['channelUses', metrics.channelUses, 'uses', 'preregistered transfer channel uses'],
  ]
  const records = values.map(([metric, value, unit, formula]) => createCalculationRecord({
    recordId: `${input.phase}.${metric}`,
    metric,
    value,
    unit,
    algorithm: 'closed-aperture-phase-computation',
    algorithmVersion: '1.0.0',
    formula,
    inputIds: [`INPUT.${input.phase}`],
    inputs: { input, worldA, worldB, transfer, channelUses: metrics.channelUses },
  }))
  return {
    records,
    bindings: records.map(({ recordId, value, unit }) => ({ recordId, value, unit })),
  }
}

function createSnapshots(
  worlds: Array<[WorldState, WorldState]>,
  configuration: Phase1InputConfiguration,
): {
  snapshots: Phase1Snapshot[]
  records: CalculationRecord[]
} {
  const records: CalculationRecord[] = []
  const payload = Uint8Array.from(configuration.transfer.payloadBytes)
  const key = Uint8Array.from(configuration.transfer.xorKeyBytes)
  const snapshots = configuration.phases.map((input, index): Phase1Snapshot => {
    const [worldA, worldB] = worlds[index]
    const information = mutualInformation(input.jointDistribution)
    const normalized = normalizedMutualInformation(input.jointDistribution)
    const distance = mutualInformationDistance(input.jointDistribution)
    const witness = shortestPath(
      buildInformationGeometryGraph(distance, input.includeInteriorPath, configuration.geodesic),
      'A_BOUNDARY',
      'B_BOUNDARY',
    )
    const networkInput = configuration.tensorNetworks.find(({ phase }) => phase === input.phase)
    const contraction = input.phase === 'ISOLATED'
      ? zeroContraction()
      : contractClosedTensorNetwork(networkInput!.tensors)
    const certificate = input.phase === 'ISOLATED'
      ? null
      : deriveChannelCertificate(
        networkInput!.tensors,
        input.phase,
      )
    const transfer = input.phase === 'OPEN' || input.phase === 'CLOSED'
      ? attemptTransfer({
        payload,
        key,
        certificate: certificate!,
        channelUses: configuration.transfer.channelUses,
      })
      : null
    const metrics: Phase1Metrics = {
      mutualInformation: information,
      normalizedMutualInformation: normalized,
      mutualInformationDistance: distance,
      geodesicLength: witness.distance,
      geodesicReductionRatio: 1 - witness.distance / configuration.geodesic.boundaryEdgeLength,
      contractionScalar: contraction.scalar,
      singularValues: input.phase === 'ISOLATED' ? [] : [...contraction.singularValues],
      internalVolume: contraction.internalVolume,
      capacityBitsPerUse: transfer?.capacityBitsPerUse ?? 0,
      routedBits: transfer?.routeRecords.length ?? 0,
      channelUses: configuration.transfer.channelUses,
    }
    const provenance = makeRecords(input, worldA, worldB, metrics, transfer)
    records.push(...provenance.records)
    return {
      phase: input.phase,
      worldA,
      worldB,
      metrics,
      geodesicWitness: witness,
      tensorEvidence: networkInput
        ? {
          tensors: networkInput.tensors.map((tensor) => ({
            ...tensor,
            indices: [...tensor.indices],
            dimensions: [...tensor.dimensions],
            values: [...tensor.values],
          })),
          validation: validateClosedTensorNetwork(networkInput.tensors),
          contractionOrder: [...contraction.contractionOrder],
        }
        : null,
      certificate,
      transfer,
      displayedMetrics: provenance.bindings,
    }
  })
  return { snapshots, records }
}

function assertUnique<T>(items: T[], identify: (item: T) => string | number, label: string): void {
  const seen = new Set<string | number>()
  for (const item of items) {
    const id = identify(item)
    if (seen.has(id)) throw new Error(`duplicate ${label}: ${String(id)}`)
    seen.add(id)
  }
}

function buildCalculationManifest(): CalculationManifest {
  const inputConfiguration = buildInputConfiguration()
  const { events, edges, worlds } = buildEvents(inputConfiguration)
  const causalValidation = validateCausalGraph(events, edges)
  const { snapshots, records } = createSnapshots(worlds, inputConfiguration)
  const worldBEventIds = events
    .filter(({ domainId }) => domainId === 'WORLD_B')
    .map(({ eventId }) => eventId)
  return {
    schemaVersion: 'phase1-manifest/1',
    modelVersion: 'closed-aperture-toy/1.0.0',
    notice: 'KNOWN TOY MODEL — NOT A DISCOVERY',
    classification: 'KNOWN_DOMAIN_COMPUTED_TOY_MODEL',
    inputConfiguration,
    inputDigest: digest(inputConfiguration),
    snapshots,
    events,
    edges,
    causalValidation,
    reachabilityEvidence: {
      openSendToReceive: isReachable(events, edges, 'OPEN-SEND', 'OPEN-RECEIVE'),
      closedAttemptToWorldB: worldBEventIds.some((eventId) => (
        isReachable(events, edges, 'CLOSED-ATTEMPT', eventId)
      )),
    },
    records,
  }
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || ArrayBuffer.isView(value)) return value
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key])
  }
  return Object.freeze(value)
}

function deepClone<T>(value: T): T {
  if (value instanceof Uint8Array) return Uint8Array.from(value) as T
  if (Array.isArray(value)) return value.map((entry) => deepClone(entry)) as T
  if (value !== null && typeof value === 'object') {
    if (Object.hasOwn(value, 'certificateDigest')
      && verifyChannelCertificate(value as unknown as ChannelCertificate)) return value
    const clone: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value)) clone[key] = deepClone(entry)
    return clone as T
  }
  return value
}

export function validateCalculationManifest(manifest: CalculationManifest): void {
  const canonicalManifest = canonicalStringify(manifest)
  if (manifest.schemaVersion !== 'phase1-manifest/1') throw new Error('unsupported manifest schema')
  if (manifest.modelVersion !== 'closed-aperture-toy/1.0.0') throw new Error('unsupported model version')
  if (manifest.notice !== 'KNOWN TOY MODEL — NOT A DISCOVERY') throw new Error('manifest notice mismatch')
  if (manifest.classification !== 'KNOWN_DOMAIN_COMPUTED_TOY_MODEL') {
    throw new Error('manifest classification mismatch')
  }
  if (manifest.inputDigest !== digest(manifest.inputConfiguration)) throw new Error('input digest mismatch')
  assertUnique(manifest.events, (event) => event.eventId, 'event ID')
  assertUnique(manifest.events, (event) => event.schedulerOrdinal, 'scheduler ordinal')
  assertUnique(manifest.edges, (edge) => edge.edgeId, 'edge ID')
  assertUnique(manifest.records, (record) => record.recordId, 'record ID')
  const causalValidation = validateCausalGraph(manifest.events, manifest.edges)
  if (canonicalStringify(manifest.causalValidation) !== canonicalStringify(causalValidation)) {
    throw new Error('causal validation mismatch')
  }

  const records = new Map(manifest.records.map((record) => [record.recordId, record]))
  for (const snapshot of manifest.snapshots) {
    for (const binding of snapshot.displayedMetrics) {
      const record = records.get(binding.recordId)
      if (!record) throw new Error(`missing provenance for displayed metric: ${binding.recordId}`)
      if (record.value !== binding.value || record.unit !== binding.unit) {
        throw new Error(`provenance value mismatch: ${binding.recordId}`)
      }
    }
  }

  const expected = buildCalculationManifest()
  if (canonicalManifest !== canonicalStringify(expected)) {
    throw new Error('manifest content does not match the computed toy model')
  }
}

export function createPhase1Run(): Phase1Run {
  const mutableManifest = buildCalculationManifest()
  validateCalculationManifest(mutableManifest)
  const manifest = deepFreeze(mutableManifest)
  const run = {
    notice: manifest.notice,
    snapshots: deepFreeze(deepClone(manifest.snapshots)),
    events: deepFreeze(deepClone(manifest.events)),
    edges: deepFreeze(deepClone(manifest.edges)),
    causalValidation: deepFreeze(deepClone(manifest.causalValidation)),
    manifest,
    manifestDigest: digest(manifest),
  }
  return deepFreeze(run)
}
