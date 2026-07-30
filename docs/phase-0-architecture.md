# Phase 0 Architecture Decision

## Scope

Aperture-0 starts with an executable reference-fixture slice of the v0.4 specification's Phase 0 / known-domain MVP. It represents World A and World B, independent local time, causal structure, a deterministic four-state sequence, the specification's predefined demo metric values where supplied, a known-domain aperture opening/closing sequence, OPEN-only payload scramble/recovery, and verification of the exact preregistered run against a fixed terminal-hash trust anchor.

Boundary Ω, Feasible Set F, external completion, threshold sealing, unknown-boundary claims, and any AI-generated boundary value are explicitly out of scope until the prerequisite phases in the specification are complete.

## Web architecture

The first executable is a static React + TypeScript application hosted by Firebase Hosting. Its framework-independent TypeScript module emits typed, recorded fixture snapshots, and the UI renders those snapshots rather than maintaining separate decorative state. Numeric information-geometry values are predefined v0.4 demo fixtures where the specification supplies them; CLOSED mutual information and internal volume are explicitly null and rendered as `N/A`. Only the geodesic reduction ratio and OPEN-state transfer transformation are derived here. Numerical information-geometry computation is not implemented in this slice. This keeps the first vertical slice deployable without enabling Firestore, Functions, Authentication, Storage, or billing-dependent services.

The numerical research backend recommended by the specification (Python, NumPy/SciPy, NetworkX, PyTorch, cvxpy) remains a later service boundary. Phase 0 establishes typed snapshot and ledger contracts that can be transported over an API without changing the UI's scientific vocabulary.

## Non-negotiable invariants

1. The UI never displays a portal or unknown-domain claim.
2. Every visual change is derived from a recorded simulation snapshot.
3. The demo uses only known World A / World B toy models and is labelled as calibration, not discovery.
4. Aperture closure makes transfer capacity zero.
5. Replay accepts only the exact trusted experiment identity, four-state order, record length, hash chain, manifest, and fixed terminal hash; coordinated truncation or resealing fails closed.
6. Null/control behavior will use the same rendering path as the active run.
7. Boundary Ω cannot be introduced before the v0.4 Phase 1.5 prerequisites are implemented and sealed.

## Phase 0 acceptance criteria

- Four deterministic states: ISOLATED, CORRELATING, OPEN, CLOSED.
- The v0.4 demo metric fixtures are represented explicitly as reference values, not model-computed observations; unspecified metrics remain null and display as `N/A`.
- A payload is injected, scrambled, and recoverable only in OPEN.
- Each snapshot includes domain clocks, graph state, metrics, transfer state, and a content hash.
- Verifying the exact preregistered run against its fixed trust anchor returns VERIFIED; rewritten, reordered, rebound, or truncated records return DIVERGED.
- The web UI can step, play, pause, and reset through the recorded sequence.
- Firebase Hosting serves the production build as an SPA.
- Unit/UI tests, type checking, linting, and production build pass.
