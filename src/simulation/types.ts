export type DemoPhase = 'ISOLATED' | 'CORRELATING' | 'OPEN' | 'CLOSED'

export interface DomainClock {
  domainId: 'WORLD_A' | 'WORLD_B'
  localTime: number
}

export interface GraphNode {
  id: string
  domain: 'A' | 'B' | 'INTERIOR'
  x: number
  y: number
}

export interface GraphEdge {
  source: string
  target: string
  weight: number
  kind: 'CAUSAL' | 'CORRELATION' | 'APERTURE'
  active: boolean
}

export interface DemoMetrics {
  geodesicLength: number
  geodesicReductionRatio: number
  mutualInformation: number | null
  internalVolume: number | null
  throatCapacityBits: number
}

export interface TransferState {
  input: number[]
  scrambled: number[]
  recovered: number[] | null
  verified: boolean
}

export interface DemoSnapshot {
  step: number
  phase: DemoPhase
  classification: 'KNOWN CALIBRATION'
  clocks: [DomainClock, DomainClock]
  nodes: GraphNode[]
  edges: GraphEdge[]
  metrics: DemoMetrics
  transfer: TransferState
  previousHash: string | null
  hash: string
}

export interface DemoRun {
  experimentId: string
  mode: 'GEOMETRY_CALIBRATION'
  notice: 'KNOWN TOY MODEL — NOT A DISCOVERY'
  snapshots: DemoSnapshot[]
  snapshotHashes: string[]
}

export interface FixtureIntegrityResult {
  status: 'VERIFIED' | 'DIVERGED'
  snapshotHashes: string[]
  firstMismatchStep: number | null
}
