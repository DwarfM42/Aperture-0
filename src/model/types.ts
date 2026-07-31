export type DomainId = 'WORLD_A' | 'WORLD_B'
export type EventDomainId = DomainId | 'INTERIOR'

export type TransitionRule =
  | { kind: 'ADD'; operand: number }
  | { kind: 'DOUBLE_THEN_ADD'; operand: number }

export interface WorldState {
  domainId: DomainId
  localTime: number
  signal: number
  transition: TransitionRule
}

export interface ModelEvent {
  eventId: string
  schedulerOrdinal: number
  domainId: EventDomainId
  localTimeBefore: number | null
  localTimeAfter: number | null
  stateBeforeDigest: string
  stateAfterDigest: string
  payloadDigest: string | null
}

export interface CausalEdge {
  edgeId: string
  sourceEventId: string
  targetEventId: string
}

export interface CausalGraphValidation {
  valid: true
  topologicalOrder: string[]
}
