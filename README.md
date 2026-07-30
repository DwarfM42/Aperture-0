# Aperture-0

A web-based **known-domain information-geometry calibration observatory**, implementing the first executable slice of [`docs/aperture-0-spec-v0.4.md`](docs/aperture-0-spec-v0.4.md).

> **Known toy model — not a discovery.** This version does not implement Boundary Ω, external completion, anomaly claims, or representative values for an unknown boundary.

## Current scope

- Deterministic World A / World B calibration sequence
- Four recorded states: `ISOLATED → CORRELATING → OPEN → CLOSED`
- Snapshot-driven graph and telemetry visualization
- Predefined v0.4 metric fixtures, with metrics omitted where the specification provides no value, clearly separated from future numerical model computation
- Payload injection, scramble, and recovery only while the known-domain aperture is open
- SHA-256 snapshot chain verified against the trusted experiment identity, state order, record length, manifest, and fixed terminal hash
- Firebase Hosting SPA configuration for project `aperture-0`

Architecture boundaries and acceptance criteria are documented in [`docs/phase-0-architecture.md`](docs/phase-0-architecture.md).

This slice does **not** calculate information-geometry metrics from the displayed graph. The numeric values shown are deterministic reference fixtures taken from v0.4 and used to validate the UI, typed snapshot contract, transfer gate, and record-verification path. CLOSED mutual information and internal volume are displayed as `N/A` because v0.4 does not specify them.

## Development

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

Quality gates:

```bash
npm test
npm run lint
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Firebase Hosting

The repository is configured for Firebase project `aperture-0` and serves `dist/` as a single-page application.

```bash
npm run build
firebase deploy --only hosting
```

Deployment is intentionally a separate explicit action; building locally does not publish the site.
