import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { createDemoRun, verifyFixtureIntegrity } from './simulation/demoRun'
import type { DemoSnapshot, FixtureIntegrityResult, GraphEdge } from './simulation/types'
import { createPhase1Run, type Phase1Snapshot } from './model/phase1Run'

const phaseCopy = {
  ISOLATED: {
    index: '01',
    title: 'Disconnected domains',
    description: 'World A and World B evolve on independent clocks. No traversable channel exists.',
  },
  CORRELATING: {
    index: '02',
    title: 'Correlation formation',
    description: 'An information-geometric interior forms, but its throat capacity remains zero.',
  },
  OPEN: {
    index: '03',
    title: 'Known-domain aperture',
    description: 'The calibrated channel opens. Scrambled input is reconstructed and verified in World B.',
  },
  CLOSED: {
    index: '04',
    title: 'Residual interior',
    description: 'The connection is closed. Interior structure remains visible, but transfer is impossible.',
  },
} as const

const run = createDemoRun('APR-DEMO-000001')
const computedRun = createPhase1Run()

function edgeClass(edge: GraphEdge, snapshot: DemoSnapshot): string {
  const classes = ['graph-edge', edge.kind.toLowerCase()]
  if (!edge.active) classes.push('inactive')
  if (snapshot.phase === 'OPEN' && edge.active && edge.kind !== 'CAUSAL') classes.push('energized')
  return classes.join(' ')
}

function MetricCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <article className="metric-card">
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      {unit && <span className="metric-unit">{unit}</span>}
    </article>
  )
}

function formatMetric(value: number | null): string {
  return value === null ? 'N/A' : value.toFixed(2)
}

function DomainGraph({ snapshot }: { snapshot: DemoSnapshot }) {
  const nodeById = new Map(snapshot.nodes.map((node) => [node.id, node]))
  return (
    <svg className="domain-graph" viewBox="0 0 100 92" role="img" aria-label={`Known-domain graph: ${snapshot.phase}`}>
      <defs>
        <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path className="domain-orbit domain-a" d="M4,15 Q24,5 35,19 L34,76 Q17,87 4,72 Z" />
      <path className="domain-orbit domain-b" d="M67,14 Q86,5 96,21 L96,76 Q80,88 66,72 Z" />
      <text className="domain-label" x="7" y="12">WORLD A</text>
      <text className="domain-label" x="70" y="12">WORLD B</text>
      <text className="interior-label" x="40" y="16">INTERIOR</text>
      {snapshot.edges.map((edge) => {
        const source = nodeById.get(edge.source)
        const target = nodeById.get(edge.target)
        if (!source || !target) return null
        return <line key={`${edge.source}-${edge.target}`} className={edgeClass(edge, snapshot)} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />
      })}
      {snapshot.nodes.map((node) => (
        <g key={node.id} className={`graph-node node-${node.domain.toLowerCase()}`} transform={`translate(${node.x} ${node.y})`}>
          <circle r={node.domain === 'INTERIOR' ? 2.4 : 2.8} />
          <text x="0" y="-4.7">{node.id}</text>
        </g>
      ))}
      {snapshot.phase === 'OPEN' && <circle className="aperture-pulse" cx="50" cy="50" r="12" />}
    </svg>
  )
}

function Phase1View() {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const snapshot: Phase1Snapshot = computedRun.snapshots[phaseIndex]
  const transfer = snapshot.transfer
  const routedBits = snapshot.metrics.routedBits
  const channelUses = snapshot.metrics.channelUses
  const recovered = transfer?.recovered === null || transfer?.recovered === undefined
    ? null
    : new TextDecoder().decode(new Uint8Array(transfer.recovered))

  return (
    <section className="workspace phase1-workspace" aria-label="Phase 1 computed model">
      <aside className="phase-rail" aria-label="Phase 1 computed snapshots">
        <span className="rail-title">COMPUTED SEQUENCE</span>
        {computedRun.snapshots.map((item, index) => (
          <button
            className={index === phaseIndex ? 'phase-button active' : 'phase-button'}
            key={item.phase}
            onClick={() => setPhaseIndex(index)}
            aria-label={`Open Phase 1 ${item.phase} snapshot`}
            aria-pressed={index === phaseIndex}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <i />
            <b>{item.phase}</b>
          </button>
        ))}
      </aside>

      <section className="observation-panel">
        <div className="panel-heading">
          <div>
            <span className="step-kicker">{snapshot.phase} · CLOSED APERTURE COMPUTATION</span>
            <h1>PHASE 1 COMPUTED TOY MODEL</h1>
            <p>Deterministic values computed from preregistered known-domain inputs. Not Phase 0 fixture telemetry.</p>
          </div>
          <div className="clock-readout">
            <div><span>tA</span><strong>{snapshot.worldA.localTime.toFixed(2)}</strong></div>
            <div><span>tB</span><strong>{snapshot.worldB.localTime.toFixed(2)}</strong></div>
          </div>
        </div>
        <div className="graph-frame phase1-evidence">
          <h2>{snapshot.phase}</h2>
          <p>Shortest path: {snapshot.geodesicWitness.nodeIds.join(' → ')}</p>
          <p>Manifest {computedRun.manifestDigest.slice(0, 16)}…</p>
          <p>{computedRun.manifest.records.length} provenance records verified</p>
        </div>
      </section>

      <aside className="telemetry-panel">
        <div className="telemetry-heading"><span>PHASE 1 COMPUTED TELEMETRY</span><i /></div>
        <div className="metric-grid">
          <MetricCard label="GEODESIC LENGTH" value={snapshot.metrics.geodesicLength.toFixed(2)} unit="units" />
          <MetricCard label="GEODESIC REDUCTION" value={`${(snapshot.metrics.geodesicReductionRatio * 100).toFixed(2)}%`} unit="computed" />
          <MetricCard label="MUTUAL INFORMATION" value={snapshot.metrics.mutualInformation.toFixed(6)} unit="bits" />
          <MetricCard label="INTERNAL VOLUME" value={snapshot.metrics.internalVolume.toFixed(6)} unit="effective rank" />
          <MetricCard label="THROAT CAPACITY" value={`${snapshot.metrics.capacityBitsPerUse.toFixed(2)} bits/use`} />
        </div>
        <section className="transfer-card">
          <div className="section-label"><span>CERTIFICATE-BOUND TRANSFER</span><b>{transfer?.status ?? 'NOT ATTEMPTED'}</b></div>
          <div className="bitstream">
            {routedBits > 0 ? `${routedBits} / ${channelUses} BITS ROUTED b→c` : 'NO CERTIFICATE ROUTE USED'}
          </div>
          <strong className={transfer?.verified ? 'verified' : 'blocked'}>
            {transfer?.verified ? `${recovered} RECOVERED` : 'NO B-SIDE RECOVERY'}
          </strong>
        </section>
        <section className="ledger-card">
          <div className="section-label"><span>CALCULATION MANIFEST</span><b>SHA-256</b></div>
          <dl>
            <div><dt>SCHEMA</dt><dd>{computedRun.manifest.schemaVersion}</dd></div>
            <div><dt>MODEL</dt><dd>{computedRun.manifest.modelVersion}</dd></div>
            <div><dt>CLASS</dt><dd>{computedRun.manifest.classification}</dd></div>
          </dl>
        </section>
      </aside>
    </section>
  )
}

function App() {
  const [modelView, setModelView] = useState<'PHASE0' | 'PHASE1'>('PHASE0')
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [integrityStatus, setIntegrityStatus] = useState<FixtureIntegrityResult['status'] | 'CHECKING'>('CHECKING')
  const snapshot = run.snapshots[step]
  const copy = phaseCopy[snapshot.phase]

  useEffect(() => {
    let cancelled = false
    void verifyFixtureIntegrity(run).then((result) => {
      if (!cancelled) setIntegrityStatus(result.status)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current >= run.snapshots.length - 1) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, 1800)
    return () => window.clearInterval(timer)
  }, [playing])

  const decodedInput = useMemo(
    () => new TextDecoder().decode(new Uint8Array(snapshot.transfer.input)),
    [snapshot],
  )

  const reset = () => {
    setPlaying(false)
    setStep(0)
  }

  return (
    <main className="app-shell">
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {modelView === 'PHASE1'
          ? 'Phase 1 computed toy model. Calculation manifest verified.'
          : `Snapshot ${snapshot.phase}. ${snapshot.transfer.input.length > 0 ? 'Calibration input injected.' : 'No input injected.'} Fixture integrity ${integrityStatus}.`}
      </span>

      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <div>
            <span className="eyebrow">INFORMATION GEOMETRY OBSERVATORY</span>
            <span className="brand">APERTURE—0</span>
          </div>
        </div>
        <div className="run-meta">
          <button
            onClick={() => setModelView((current) => current === 'PHASE0' ? 'PHASE1' : 'PHASE0')}
            aria-label={modelView === 'PHASE0' ? 'Show Phase 1 computed model' : 'Show Phase 0 reference fixture'}
          >
            {modelView === 'PHASE0' ? 'PHASE 1 COMPUTED' : 'PHASE 0 FIXTURE'}
          </button>
          <span>{modelView === 'PHASE0' ? `RUN ${run.experimentId}` : computedRun.manifest.modelVersion}</span>
          <span className="status-dot">{modelView === 'PHASE0' ? 'FIXTURE LOADED' : 'MANIFEST VERIFIED'}</span>
        </div>
      </header>

      <div className="calibration-banner">
        <span>CALIBRATION MODE</span>
        <strong>{run.notice}</strong>
        <span>NO Ω BOUNDARY</span>
      </div>

      {modelView === 'PHASE1' ? <Phase1View /> : (
      <section className="workspace">
        <aside className="phase-rail" aria-label="Reference fixture snapshots">
          <span className="rail-title">SEQUENCE</span>
          {run.snapshots.map((item, index) => (
            <button
              className={index === step ? 'phase-button active' : 'phase-button'}
              key={item.phase}
              onClick={() => { setPlaying(false); setStep(index) }}
              aria-label={`Open ${item.phase} snapshot`}
              aria-pressed={index === step}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <i />
              <b>{item.phase}</b>
            </button>
          ))}
        </aside>

        <section className="observation-panel">
          <div className="panel-heading">
            <div>
              <span className="step-kicker">STATE {copy.index} · {copy.title}</span>
              <h1>{snapshot.phase}</h1>
              <p>{copy.description}</p>
            </div>
            <div className="clock-readout">
              <div><span>tA</span><strong>{snapshot.clocks[0].localTime.toFixed(2)}</strong></div>
              <div><span>tB</span><strong>{snapshot.clocks[1].localTime.toFixed(2)}</strong></div>
            </div>
          </div>

          <div className="graph-frame">
            <div className="coordinate-ticks" aria-hidden="true" />
            <DomainGraph snapshot={snapshot} />
            <span className="frame-index">FIG. {copy.index} / KNOWN DOMAINS</span>
          </div>

          <div className="controls">
            <span>Snapshot {String(step + 1).padStart(2, '0')} / 04</span>
            <div className="transport-controls">
              <button onClick={reset} aria-label="Reset run">↺</button>
              <button
                className="play-button"
                onClick={() => {
                  if (step === run.snapshots.length - 1) setStep(0)
                  setPlaying((current) => !current)
                }}
                aria-label={playing ? 'Pause run' : 'Play run'}
              >{playing ? 'Ⅱ' : '▶'}</button>
              <button
                onClick={() => { setPlaying(false); setStep((current) => Math.min(current + 1, run.snapshots.length - 1)) }}
                disabled={step === run.snapshots.length - 1}
                aria-label="Next snapshot"
              >→</button>
            </div>
            <span>{playing ? 'PLAYING' : 'PAUSED'}</span>
          </div>
        </section>

        <aside className="telemetry-panel">
          <div className="telemetry-heading">
            <span>REFERENCE FIXTURE SNAPSHOT</span>
            <i />
          </div>
          <div className="metric-grid">
            <MetricCard label="GEODESIC LENGTH" value={snapshot.metrics.geodesicLength.toFixed(2)} unit="units" />
            <MetricCard label="GEODESIC REDUCTION" value={`${(snapshot.metrics.geodesicReductionRatio * 100).toFixed(2)}%`} unit="derived from reference fixture" />
            <MetricCard label="MUTUAL INFORMATION" value={formatMetric(snapshot.metrics.mutualInformation)} unit={snapshot.metrics.mutualInformation === null ? 'not specified in v0.4' : 'normalized'} />
            <MetricCard label="INTERNAL VOLUME" value={formatMetric(snapshot.metrics.internalVolume)} unit={snapshot.metrics.internalVolume === null ? 'not specified in v0.4' : 'effective rank'} />
            <MetricCard label="THROAT CAPACITY" value={`${snapshot.metrics.throatCapacityBits.toFixed(2)} bits`} />
          </div>

          <section className="transfer-card">
            <div className="section-label"><span>TRANSFER PROBE</span><b>{snapshot.transfer.verified ? 'PASS' : 'IDLE'}</b></div>
            <code>{decodedInput}</code>
            <div className="bitstream">
              {snapshot.transfer.scrambled.length > 0
                ? snapshot.transfer.scrambled.slice(0, 8).map((byte) => byte.toString(16).padStart(2, '0')).join(' ')
                : 'NO INPUT INJECTED'}
            </div>
            <strong className={snapshot.transfer.verified ? 'verified' : 'blocked'}>
              {snapshot.transfer.verified ? 'FIXTURE TRANSFORM MATCH' : 'NO TRAVERSABLE CHANNEL'}
            </strong>
          </section>

          <section className="ledger-card">
            <div className="section-label"><span>FIXTURE INTEGRITY</span><b>SHA-256</b></div>
            <dl>
              <div><dt>CLASS</dt><dd>{snapshot.classification}</dd></div>
              <div><dt>HASH</dt><dd>{snapshot.hash.slice(0, 16)}…</dd></div>
              <div><dt>HASH CHAIN</dt><dd>{snapshot.previousHash ? 'LINKED' : 'GENESIS'}</dd></div>
              <div><dt>CHECK</dt><dd>{integrityStatus}</dd></div>
            </dl>
          </section>
        </aside>
      </section>
      )}

      <footer>
        <span>APERTURE-0 · SPEC v0.4</span>
        <span>KNOWN-DOMAIN CALIBRATION ONLY</span>
        <span>{modelView === 'PHASE0' ? 'LOCAL DETERMINISTIC FIXTURE' : 'LOCAL DETERMINISTIC COMPUTATION'}</span>
      </footer>
    </main>
  )
}

export default App
