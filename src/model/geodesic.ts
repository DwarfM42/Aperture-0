export interface WeightedEdge {
  edgeId: string
  sourceNodeId: string
  targetNodeId: string
  weight: number
}

export interface ShortestPathResult {
  distance: number
  nodeIds: string[]
  edgeIds: string[]
}

export interface InformationGeometryGraphConfiguration {
  boundaryEdgeLength: number
  interiorBaseLength: number
  interiorDistanceScale: number
}

const DEFAULT_GRAPH_CONFIGURATION: InformationGeometryGraphConfiguration = {
  boundaryEdgeLength: 100,
  interiorBaseLength: 10,
  interiorDistanceScale: 90,
}

const EPSILON = 1e-12

function codeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

export function buildInformationGeometryGraph(
  mutualInformationDistance: number,
  includeInteriorPath: boolean,
  configuration: InformationGeometryGraphConfiguration = DEFAULT_GRAPH_CONFIGURATION,
): WeightedEdge[] {
  if (!Number.isFinite(mutualInformationDistance)
    || mutualInformationDistance < 0
    || mutualInformationDistance > 1) {
    throw new Error('mutual-information distance must be finite and within [0, 1]')
  }
  if (!Number.isFinite(configuration.boundaryEdgeLength)
    || !Number.isFinite(configuration.interiorBaseLength)
    || !Number.isFinite(configuration.interiorDistanceScale)
    || configuration.boundaryEdgeLength < 0
    || configuration.interiorBaseLength < 0
    || configuration.interiorDistanceScale < 0) {
    throw new Error('geodesic configuration must contain finite non-negative lengths')
  }

  const edges: WeightedEdge[] = [{
    edgeId: 'GE-DIRECT',
    sourceNodeId: 'A_BOUNDARY',
    targetNodeId: 'B_BOUNDARY',
    weight: configuration.boundaryEdgeLength,
  }]
  if (includeInteriorPath) {
    const interiorWeight = (configuration.interiorBaseLength
      + configuration.interiorDistanceScale * mutualInformationDistance) / 2
    edges.push(
      { edgeId: 'GE-A-I', sourceNodeId: 'A_BOUNDARY', targetNodeId: 'INTERIOR', weight: interiorWeight },
      { edgeId: 'GE-I-B', sourceNodeId: 'INTERIOR', targetNodeId: 'B_BOUNDARY', weight: interiorWeight },
    )
  }
  return edges
}

function comparePath(left: string[], right: string[]): number {
  const sharedLength = Math.min(left.length, right.length)
  for (let index = 0; index < sharedLength; index += 1) {
    const comparison = codeUnitCompare(left[index], right[index])
    if (comparison !== 0) return comparison
  }
  return left.length - right.length
}

export function shortestPath(
  edges: WeightedEdge[],
  sourceNodeId: string,
  targetNodeId: string,
): ShortestPathResult {
  const edgeIds = new Set<string>()
  const outgoing = new Map<string, WeightedEdge[]>()
  for (const edge of edges) {
    if (edgeIds.has(edge.edgeId)) throw new Error(`duplicate weighted edge ID: ${edge.edgeId}`)
    edgeIds.add(edge.edgeId)
    if (!Number.isFinite(edge.weight) || edge.weight < 0) {
      throw new Error(`edge weight must be finite and non-negative: ${edge.edgeId}`)
    }
    const list = outgoing.get(edge.sourceNodeId) ?? []
    list.push(edge)
    outgoing.set(edge.sourceNodeId, list)
  }
  for (const list of outgoing.values()) {
    list.sort((left, right) => codeUnitCompare(left.targetNodeId, right.targetNodeId)
      || codeUnitCompare(left.edgeId, right.edgeId))
  }

  interface Candidate extends ShortestPathResult { currentNodeId: string }
  const pending: Candidate[] = [{
    currentNodeId: sourceNodeId,
    distance: 0,
    nodeIds: [sourceNodeId],
    edgeIds: [],
  }]
  const best = new Map<string, { distance: number; nodeIds: string[] }>()

  while (pending.length > 0) {
    pending.sort((left, right) => left.distance - right.distance
      || comparePath(left.nodeIds, right.nodeIds))
    const candidate = pending.shift()
    if (!candidate) break
    const prior = best.get(candidate.currentNodeId)
    if (prior && (candidate.distance > prior.distance + EPSILON
      || (Math.abs(candidate.distance - prior.distance) <= EPSILON
        && comparePath(candidate.nodeIds, prior.nodeIds) >= 0))) {
      continue
    }
    best.set(candidate.currentNodeId, {
      distance: candidate.distance,
      nodeIds: candidate.nodeIds,
    })
    if (candidate.currentNodeId === targetNodeId) {
      return {
        distance: candidate.distance,
        nodeIds: candidate.nodeIds,
        edgeIds: candidate.edgeIds,
      }
    }
    for (const edge of outgoing.get(candidate.currentNodeId) ?? []) {
      if (candidate.nodeIds.includes(edge.targetNodeId)) continue
      pending.push({
        currentNodeId: edge.targetNodeId,
        distance: candidate.distance + edge.weight,
        nodeIds: [...candidate.nodeIds, edge.targetNodeId],
        edgeIds: [...candidate.edgeIds, edge.edgeId],
      })
    }
  }
  throw new Error(`no path from ${sourceNodeId} to ${targetNodeId}`)
}
