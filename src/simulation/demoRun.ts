import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import type {
  DemoMetrics,
  DemoPhase,
  DemoRun,
  DemoSnapshot,
  GraphEdge,
  GraphNode,
  FixtureIntegrityResult,
  TransferState,
} from './types'

const encoder = new TextEncoder()
const baselineLength = 145.22
const payload = [...encoder.encode('APERTURE-0')]
const scrambleKey = 0xa7
const trustedExperimentId = 'APR-DEMO-000001'
const trustedMode = 'GEOMETRY_CALIBRATION'
const trustedNotice = 'KNOWN TOY MODEL — NOT A DISCOVERY'
const trustedPhaseOrder: DemoPhase[] = ['ISOLATED', 'CORRELATING', 'OPEN', 'CLOSED']
// External trust anchor for this exact preregistered fixture. Do not derive it from `run`.
const trustedTerminalHash = '40348678487fd0df72a2a04888e4e325fb8bf993f1df882a4f6cb2df7b4bde93'

const nodes: GraphNode[] = [
  { id: 'A0', domain: 'A', x: 10, y: 45 },
  { id: 'A1', domain: 'A', x: 23, y: 25 },
  { id: 'A2', domain: 'A', x: 26, y: 68 },
  { id: 'I0', domain: 'INTERIOR', x: 43, y: 43 },
  { id: 'I1', domain: 'INTERIOR', x: 56, y: 57 },
  { id: 'B0', domain: 'B', x: 75, y: 35 },
  { id: 'B1', domain: 'B', x: 88, y: 53 },
  { id: 'B2', domain: 'B', x: 77, y: 72 },
]

const worldEdges: GraphEdge[] = [
  { source: 'A0', target: 'A1', weight: 8, kind: 'CAUSAL', active: true },
  { source: 'A0', target: 'A2', weight: 11, kind: 'CAUSAL', active: true },
  { source: 'B0', target: 'B1', weight: 13, kind: 'CAUSAL', active: true },
  { source: 'B1', target: 'B2', weight: 7, kind: 'CAUSAL', active: true },
]

interface PhaseDefinition {
  phase: DemoPhase
  geodesicLength: number
  mutualInformation: number | null
  internalVolume: number | null
  throatCapacityBits: number
  correlationActive: boolean
  apertureActive: boolean
}

const phaseDefinitions: PhaseDefinition[] = [
  {
    phase: 'ISOLATED',
    geodesicLength: 145.22,
    mutualInformation: 0,
    internalVolume: 0,
    throatCapacityBits: 0,
    correlationActive: false,
    apertureActive: false,
  },
  {
    phase: 'CORRELATING',
    geodesicLength: 48.14,
    mutualInformation: 0.21,
    internalVolume: 1.82,
    throatCapacityBits: 0,
    correlationActive: true,
    apertureActive: false,
  },
  {
    phase: 'OPEN',
    geodesicLength: 4.92,
    mutualInformation: 0.72,
    internalVolume: 6.41,
    throatCapacityBits: 8,
    correlationActive: true,
    apertureActive: true,
  },
  {
    phase: 'CLOSED',
    geodesicLength: 49.88,
    mutualInformation: null,
    internalVolume: null,
    throatCapacityBits: 0,
    correlationActive: true,
    apertureActive: false,
  },
]

function round(value: number, places = 3): number {
  const scale = 10 ** places
  return Math.round(value * scale) / scale
}

function metricsFor(definition: PhaseDefinition): DemoMetrics {
  return {
    geodesicLength: definition.geodesicLength,
    geodesicReductionRatio: round(
      (baselineLength - definition.geodesicLength) / baselineLength,
      6,
    ),
    mutualInformation: definition.mutualInformation,
    internalVolume: definition.internalVolume,
    throatCapacityBits: definition.throatCapacityBits,
  }
}

function edgesFor(definition: PhaseDefinition): GraphEdge[] {
  return [
    ...worldEdges,
    {
      source: 'A2',
      target: 'I0',
      weight: 20,
      kind: 'CORRELATION',
      active: definition.correlationActive,
    },
    {
      source: 'I0',
      target: 'I1',
      weight: 8,
      kind: 'CORRELATION',
      active: definition.correlationActive,
    },
    {
      source: 'I1',
      target: 'B0',
      weight: 20,
      kind: definition.apertureActive ? 'APERTURE' : 'CORRELATION',
      active: definition.correlationActive,
    },
  ]
}

function transferFor(apertureActive: boolean): TransferState {
  const scrambled = apertureActive ? payload.map((byte) => byte ^ scrambleKey) : []
  const recovered = apertureActive
    ? scrambled.map((byte) => byte ^ scrambleKey)
    : null

  return {
    input: apertureActive ? [...payload] : [],
    scrambled,
    recovered,
    verified:
      recovered !== null && recovered.every((byte, index) => byte === payload[index]),
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function hashSnapshot(
  experimentId: string,
  snapshot: Omit<DemoSnapshot, 'hash'>,
): string {
  return bytesToHex(
    sha256(encoder.encode(canonicalJson({ experimentId, snapshot }))),
  )
}

export function createDemoRun(experimentId: string): DemoRun {
  let previousHash: string | null = null
  const snapshots = phaseDefinitions.map((definition, index): DemoSnapshot => {
    const unsigned: Omit<DemoSnapshot, 'hash'> = {
      step: index,
      phase: definition.phase,
      classification: 'KNOWN CALIBRATION',
      clocks: [
        { domainId: 'WORLD_A', localTime: index + 1 },
        { domainId: 'WORLD_B', localTime: (index + 1) * 2 },
      ],
      nodes: nodes.map((node) => ({ ...node })),
      edges: edgesFor(definition),
      metrics: metricsFor(definition),
      transfer: transferFor(definition.apertureActive),
      previousHash,
    }
    const snapshot = { ...unsigned, hash: hashSnapshot(experimentId, unsigned) }
    previousHash = snapshot.hash
    return snapshot
  })

  return {
    experimentId,
    mode: 'GEOMETRY_CALIBRATION',
    notice: 'KNOWN TOY MODEL — NOT A DISCOVERY',
    snapshots,
    snapshotHashes: snapshots.map(({ hash }) => hash),
  }
}

export async function verifyFixtureIntegrity(run: DemoRun): Promise<FixtureIntegrityResult> {
  let previousHash: string | null = null
  const verifiedHashes: string[] = []

  const headerMismatch = run.experimentId !== trustedExperimentId
    || run.mode !== trustedMode
    || run.notice !== trustedNotice
  const lengthMismatch = run.snapshots.length !== trustedPhaseOrder.length
    || run.snapshotHashes.length !== trustedPhaseOrder.length

  if (headerMismatch || lengthMismatch) {
    return {
      status: 'DIVERGED',
      snapshotHashes: verifiedHashes,
      firstMismatchStep: headerMismatch
        ? 0
        : Math.min(run.snapshots.length, run.snapshotHashes.length),
    }
  }

  if (run.snapshotHashes.at(-1) !== trustedTerminalHash) {
    return {
      status: 'DIVERGED',
      snapshotHashes: verifiedHashes,
      firstMismatchStep: trustedPhaseOrder.length - 1,
    }
  }

  for (const [index, snapshot] of run.snapshots.entries()) {
    const { hash, ...unsigned } = snapshot
    const verifiedHash = hashSnapshot(run.experimentId, { ...unsigned, previousHash })
    verifiedHashes.push(verifiedHash)
    if (
      snapshot.step !== index
      || snapshot.phase !== trustedPhaseOrder[index]
      || hash !== verifiedHash
      || hash !== run.snapshotHashes[index]
      || snapshot.previousHash !== previousHash
    ) {
      return {
        status: 'DIVERGED',
        snapshotHashes: verifiedHashes,
        firstMismatchStep: index,
      }
    }
    previousHash = verifiedHash
  }

  return {
    status: 'VERIFIED',
    snapshotHashes: verifiedHashes,
    firstMismatchStep: null,
  }
}

export type { DemoRun, DemoSnapshot } from './types'
