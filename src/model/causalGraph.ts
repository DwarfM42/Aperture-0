import type {
  CausalEdge,
  CausalGraphValidation,
  ModelEvent,
} from './types'

function eventMapFor(events: ModelEvent[]): Map<string, ModelEvent> {
  const eventById = new Map<string, ModelEvent>()
  for (const event of events) {
    if (eventById.has(event.eventId)) throw new Error(`duplicate event ID: ${event.eventId}`)
    eventById.set(event.eventId, event)
  }
  return eventById
}

function validateDomainPolicy(source: ModelEvent, target: ModelEvent, edgeId: string): void {
  if (source.domainId === target.domainId) {
    if (source.domainId !== 'INTERIOR') {
      if (source.localTimeAfter === null || target.localTimeBefore === null
        || source.localTimeAfter > target.localTimeBefore) {
        throw new Error(`same-domain local time regresses: ${edgeId}`)
      }
    }
    return
  }

  const isOpenSendToInterior = source.eventId === 'OPEN-SEND'
    && source.domainId === 'WORLD_A'
    && target.eventId === 'OPEN-INTERIOR'
    && target.domainId === 'INTERIOR'
  const isOpenInteriorToReceive = source.eventId === 'OPEN-INTERIOR'
    && source.domainId === 'INTERIOR'
    && target.eventId === 'OPEN-RECEIVE'
    && target.domainId === 'WORLD_B'
  if (!isOpenSendToInterior && !isOpenInteriorToReceive) {
    throw new Error(`cross-domain causal edge is not the explicit OPEN route: ${edgeId}`)
  }
}

export function validateCausalGraph(
  events: ModelEvent[],
  edges: CausalEdge[],
): CausalGraphValidation {
  const eventById = eventMapFor(events)
  const schedulerOrdinals = new Set<number>()
  for (const event of events) {
    if (event.domainId !== 'WORLD_A'
      && event.domainId !== 'WORLD_B'
      && event.domainId !== 'INTERIOR') {
      throw new Error(`unsupported event domain: ${String(event.domainId)}`)
    }
    if (event.domainId === 'INTERIOR') {
      if (event.localTimeBefore !== null || event.localTimeAfter !== null) {
        throw new Error(`INTERIOR event local time must be null: ${event.eventId}`)
      }
    } else {
      if (!Number.isInteger(event.localTimeBefore)
        || !Number.isInteger(event.localTimeAfter)
        || event.localTimeBefore! < 0
        || event.localTimeAfter! < event.localTimeBefore!) {
        throw new Error(`invalid or regressing event local time: ${event.eventId}`)
      }
    }
    if (!Number.isInteger(event.schedulerOrdinal) || event.schedulerOrdinal <= 0) {
      throw new Error(`invalid scheduler ordinal: ${event.eventId}`)
    }
    if (schedulerOrdinals.has(event.schedulerOrdinal)) {
      throw new Error(`duplicate scheduler ordinal: ${event.schedulerOrdinal}`)
    }
    schedulerOrdinals.add(event.schedulerOrdinal)
  }
  const outgoing = new Map(events.map(({ eventId }) => [eventId, [] as string[]]))
  const indegree = new Map(events.map(({ eventId }) => [eventId, 0]))
  const edgeIds = new Set<string>()

  for (const edge of edges) {
    if (edgeIds.has(edge.edgeId)) throw new Error(`duplicate causal edge ID: ${edge.edgeId}`)
    edgeIds.add(edge.edgeId)
    const source = eventById.get(edge.sourceEventId)
    const target = eventById.get(edge.targetEventId)
    if (!source || !target) throw new Error(`causal edge endpoint does not exist: ${edge.edgeId}`)
    if (source.eventId === target.eventId) throw new Error(`causal cycle at self-edge: ${edge.edgeId}`)
    if (source.schedulerOrdinal >= target.schedulerOrdinal) {
      throw new Error(`backwards-scheduler causal edge: ${edge.edgeId}`)
    }
    validateDomainPolicy(source, target, edge.edgeId)
    outgoing.get(source.eventId)?.push(target.eventId)
    indegree.set(target.eventId, (indegree.get(target.eventId) ?? 0) + 1)
  }

  for (const targets of outgoing.values()) targets.sort()
  const ready = [...indegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([eventId]) => eventId)
    .sort()
  const topologicalOrder: string[] = []

  while (ready.length > 0) {
    const eventId = ready.shift()
    if (eventId === undefined) break
    topologicalOrder.push(eventId)
    for (const targetId of outgoing.get(eventId) ?? []) {
      const nextDegree = (indegree.get(targetId) ?? 0) - 1
      indegree.set(targetId, nextDegree)
      if (nextDegree === 0) {
        ready.push(targetId)
        ready.sort()
      }
    }
  }

  if (topologicalOrder.length !== events.length) throw new Error('causal graph contains a cycle')
  return { valid: true, topologicalOrder }
}

export function isReachable(
  events: ModelEvent[],
  edges: CausalEdge[],
  sourceEventId: string,
  targetEventId: string,
): boolean {
  validateCausalGraph(events, edges)
  const eventById = eventMapFor(events)
  if (!eventById.has(sourceEventId) || !eventById.has(targetEventId)) {
    throw new Error('reachability endpoint does not exist')
  }
  const outgoing = new Map(events.map(({ eventId }) => [eventId, [] as string[]]))
  for (const edge of edges) outgoing.get(edge.sourceEventId)?.push(edge.targetEventId)
  for (const targets of outgoing.values()) targets.sort()

  const pending = [sourceEventId]
  const visited = new Set<string>()
  while (pending.length > 0) {
    const current = pending.shift()
    if (current === undefined) break
    if (current === targetEventId) return true
    if (visited.has(current)) continue
    visited.add(current)
    pending.push(...(outgoing.get(current) ?? []).filter((id) => !visited.has(id)))
  }
  return false
}
