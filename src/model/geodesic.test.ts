import { describe, expect, it } from 'vitest'
import {
  buildInformationGeometryGraph,
  shortestPath,
} from './geodesic'
import type { WeightedEdge } from './geodesic'

describe('information-geometric shortest path', () => {
  it('returns the preregistered path, edge witness, and golden lengths', () => {
    const isolatedGraph = buildInformationGeometryGraph(1, false)
    const isolated = shortestPath(isolatedGraph, 'A_BOUNDARY', 'B_BOUNDARY')
    expect(isolated).toEqual({
      distance: 100,
      nodeIds: ['A_BOUNDARY', 'B_BOUNDARY'],
      edgeIds: ['GE-DIRECT'],
    })

    const correlating = shortestPath(
      buildInformationGeometryGraph(0.7219280948873621, true),
      'A_BOUNDARY',
      'B_BOUNDARY',
    )
    expect(correlating.distance).toBeCloseTo(74.97352853986258, 12)
    expect(correlating.nodeIds).toEqual(['A_BOUNDARY', 'INTERIOR', 'B_BOUNDARY'])
    expect(correlating.edgeIds).toEqual(['GE-A-I', 'GE-I-B'])
  })

  it('chooses the lexicographically smallest complete path on equal cost', () => {
    const graph: WeightedEdge[] = [
      { edgeId: 'Z-1', sourceNodeId: 'A', targetNodeId: 'Z', weight: 1 },
      { edgeId: 'Z-2', sourceNodeId: 'Z', targetNodeId: 'D', weight: 1 },
      { edgeId: 'B-1', sourceNodeId: 'A', targetNodeId: 'B', weight: 1 },
      { edgeId: 'B-2', sourceNodeId: 'B', targetNodeId: 'D', weight: 1 },
    ]

    expect(shortestPath(graph, 'A', 'D').nodeIds).toEqual(['A', 'B', 'D'])

    const nonAsciiTie: WeightedEdge[] = [
      { edgeId: 'Z-1', sourceNodeId: 'A', targetNodeId: 'z', weight: 1 },
      { edgeId: 'Z-2', sourceNodeId: 'z', targetNodeId: 'D', weight: 1 },
      { edgeId: 'U-1', sourceNodeId: 'A', targetNodeId: 'ä', weight: 1 },
      { edgeId: 'U-2', sourceNodeId: 'ä', targetNodeId: 'D', weight: 1 },
    ]
    expect(shortestPath(nonAsciiTie, 'A', 'D').nodeIds).toEqual(['A', 'z', 'D'])
  })

  it('fails closed for invalid graph inputs', () => {
    expect(() => buildInformationGeometryGraph(-0.1, true)).toThrow(/distance/i)
    expect(() => shortestPath([
      { edgeId: 'BAD', sourceNodeId: 'A', targetNodeId: 'B', weight: -1 },
    ], 'A', 'B')).toThrow(/non-negative/i)
    expect(() => shortestPath([], 'A', 'B')).toThrow(/path/i)
  })
})
