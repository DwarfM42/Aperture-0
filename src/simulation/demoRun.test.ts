import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { describe, expect, it } from 'vitest'
import { createDemoRun, replayDemoRun } from './demoRun'
import type { DemoRun, DemoSnapshot } from './demoRun'

const encoder = new TextEncoder()

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function resealRun(run: DemoRun): void {
  let previousHash: string | null = null
  for (const [index, snapshot] of run.snapshots.entries()) {
    snapshot.step = index
    snapshot.previousHash = previousHash
    const { hash: discardedHash, ...unsigned } = snapshot
    void discardedHash
    const resealedHash = bytesToHex(
      sha256(encoder.encode(canonicalJson({ experimentId: run.experimentId, snapshot: unsigned }))),
    )
    snapshot.hash = resealedHash
    previousHash = resealedHash
  }
  run.snapshotHashes = run.snapshots.map(({ hash }) => hash)
}

function cloneSnapshot(snapshot: DemoSnapshot): DemoSnapshot {
  return structuredClone(snapshot)
}

describe('Aperture-0 deterministic Phase 0 run', () => {
  it('produces the four preregistered known-domain demo states in order', () => {
    const run = createDemoRun('APR-DEMO-000001')

    expect(run.snapshots.map((snapshot) => snapshot.phase)).toEqual([
      'ISOLATED',
      'CORRELATING',
      'OPEN',
      'CLOSED',
    ])
    expect(run.snapshots.map((snapshot) => snapshot.metrics.geodesicLength)).toEqual([
      145.22,
      48.14,
      4.92,
      49.88,
    ])
    expect(run.snapshots.map((snapshot) => snapshot.metrics.throatCapacityBits)).toEqual([
      0,
      0,
      8,
      0,
    ])
    expect(run.snapshots[3].metrics.mutualInformation).toBeNull()
    expect(run.snapshots[3].metrics.internalVolume).toBeNull()
  })

  it('scrambles and restores the payload only while the known-domain aperture is open', () => {
    const run = createDemoRun('APR-DEMO-000001')
    const open = run.snapshots[2]

    expect(open.transfer.scrambled).not.toEqual(open.transfer.input)
    expect(open.transfer.recovered).toEqual(open.transfer.input)
    expect(open.transfer.verified).toBe(true)

    for (const snapshot of run.snapshots.filter(({ phase }) => phase !== 'OPEN')) {
      expect(snapshot.transfer.input).toEqual([])
      expect(snapshot.transfer.scrambled).toEqual([])
      expect(snapshot.transfer.recovered).toBeNull()
      expect(snapshot.transfer.verified).toBe(false)
    }
  })

  it('rejects a record rebound to a different experiment identifier', async () => {
    const rebound = createDemoRun('APR-DEMO-FORGED')

    const replay = await replayDemoRun(rebound)

    expect(replay.status).toBe('DIVERGED')
    expect(replay.firstMismatchStep).toBe(0)
  })

  it('rejects truncated and empty records', async () => {
    const truncated = createDemoRun('APR-DEMO-000001')
    truncated.snapshots = truncated.snapshots.slice(0, 3)
    truncated.snapshotHashes = truncated.snapshotHashes.slice(0, 3)
    expect((await replayDemoRun(truncated)).status).toBe('DIVERGED')

    const empty = createDemoRun('APR-DEMO-000001')
    empty.snapshots = []
    expect((await replayDemoRun(empty)).status).toBe('DIVERGED')
  })

  it('rejects a coordinated snapshot and manifest rewrite after resealing', async () => {
    const forged = createDemoRun('APR-DEMO-000001')
    forged.snapshots[1].metrics.mutualInformation = 0.99
    resealRun(forged)

    expect(forged.snapshotHashes.at(-1)).not.toBe(
      '30866afa6b16c3e721a905f69f8c59e4f022c3b525a5aba2372f5c7d0dd77e2d',
    )
    expect((await replayDemoRun(forged)).status).toBe('DIVERGED')
  })

  it('rejects reordered phases even when steps, links, and hashes are resealed', async () => {
    const forged = createDemoRun('APR-DEMO-000001')
    const correlating = cloneSnapshot(forged.snapshots[1])
    forged.snapshots[1] = cloneSnapshot(forged.snapshots[2])
    forged.snapshots[2] = correlating
    resealRun(forged)

    expect(forged.snapshots.map(({ phase }) => phase)).toEqual([
      'ISOLATED',
      'OPEN',
      'CORRELATING',
      'CLOSED',
    ])
    expect((await replayDemoRun(forged)).status).toBe('DIVERGED')
  })

  it('rejects a forged terminal snapshot when the manifest spoofs the trusted anchor', async () => {
    const forged = createDemoRun('APR-DEMO-000001')
    const trustedTerminalHash = forged.snapshotHashes.at(-1) as string
    forged.snapshots[3].metrics.internalVolume = 999
    resealRun(forged)
    expect(forged.snapshots[3].hash).not.toBe(trustedTerminalHash)
    forged.snapshotHashes[3] = trustedTerminalHash

    const replay = await replayDemoRun(forged)

    expect(replay.status).toBe('DIVERGED')
    expect(replay.firstMismatchStep).toBe(3)
  })

  it('rejects disagreement with the recorded hash manifest', async () => {
    const run = createDemoRun('APR-DEMO-000001')
    run.snapshotHashes[2] = '0'.repeat(64)

    const replay = await replayDemoRun(run)

    expect(replay.status).toBe('DIVERGED')
    expect(replay.firstMismatchStep).toBe(2)
  })

  it('replays to the same hash chain without mutating the original record', async () => {
    const run = createDemoRun('APR-DEMO-000001')
    expect(run.snapshotHashes.at(-1)).toBe('30866afa6b16c3e721a905f69f8c59e4f022c3b525a5aba2372f5c7d0dd77e2d')
    const replay = await replayDemoRun(run)

    expect(replay.status).toBe('VERIFIED')
    expect(replay.snapshotHashes).toEqual(run.snapshotHashes)
    expect(run.snapshots).toHaveLength(4)
  })
})
