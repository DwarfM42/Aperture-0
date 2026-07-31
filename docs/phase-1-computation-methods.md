# Phase 1 Closed Aperture Computation Methods

> Status: preregistered implementation contract for Step 2<br>
> Scope: known World A / World B toy model only<br>
> Notice: **KNOWN TOY MODEL — NOT A DISCOVERY**
> This document fixes the Phase 1 formulas and golden vectors before production model code is written. Results must not be fitted to the Phase 0 reference fixture.

## 1. Scope and exclusions

Phase 1 replaces the Phase 0 telemetry fixture with a deterministic, pure-TypeScript **computed toy model** for a known closed domain. It implements independent world transitions, events and a causal DAG, Shannon mutual information, mutual-information distance, a weighted shortest path, a fully closed tensor network, deterministic contraction, effective-rank internal volume, bond-dimension throat capacity, and an OPEN/CLOSED transfer control.

Phase 1 does not implement or claim:

- Boundary Ω, open tensor indices, Feasible Set, external/future completion
- Null-distribution collection, thresholds, anomaly detection, or discovery
- persistence, Event Flight Recorder, Scene Archive, sealing, or deterministic replay
- unknown domains, portal/contact claims, AI-generated values, or random completion

The Phase 0 fixture remains available as a separate reference display. Phase 1 values must be labelled `PHASE 1 COMPUTED TOY MODEL`; Phase 0 values remain `REFERENCE FIXTURE`.

## 2. Determinism and numeric policy

- All algorithms are pure functions of explicit JSON-serializable inputs.
- No wall clock, locale-sensitive ordering, random source, browser state, network input, or mutable module singleton participates in a result.
- IDs and adjacency lists are processed in lexical order. Equal-cost path ties are resolved by the lexicographically smallest complete node-ID path.
- Floating-point results use JavaScript IEEE-754 binary64.
- Production calculations retain full binary64 precision. Rounding is presentation-only.
- Tests compare analytic/golden values with absolute tolerance `1e-12`, except serialized manifests, which compare exact canonical content.
- Invalid probability distributions, non-finite values, negative edge weights, inconsistent tensor index dimensions, dangling tensor indices, causal cycles, and backwards-time causal edges fail closed by throwing a typed error.

## 3. Model inputs

The preregistered known-domain run has four phases:

| Phase | Joint distribution P(A,B) | Interior coupling c | Correlation path | Channel |
|---|---|---:|---|---|
| ISOLATED | `[[0.25,0.25],[0.25,0.25]]` | 0.0 | absent | closed |
| CORRELATING | `[[0.40,0.10],[0.10,0.40]]` | 0.4 | present | closed |
| OPEN | `[[0.49,0.01],[0.01,0.49]]` | 0.9 | present | open |
| CLOSED | `[[0.35,0.15],[0.15,0.35]]` | 0.3 | present residual | closed |

These are declared model inputs, not observed data and not outputs copied from the v0.4 Phase 0 fixture.

World transition rules are independent immutable updates:

- World A: `nextSignal = currentSignal + 1`, `localTime += 1` per A tick.
- World B: `nextSignal = currentSignal * 2 + 1`, `localTime += 1` per B tick.
- Advancing one world receives and returns only that world's state. It cannot mutate or advance the other world.
- The preregistered initial states are World A `(localTime=0, signal=0)` and World B `(localTime=0, signal=1)`.
- Each phase advances each world by exactly one local tick. The cumulative golden states are:

| Snapshot | World A `(time, signal)` | World B `(time, signal)` |
|---|---|---|
| ISOLATED | `(1, 1)` | `(1, 3)` |
| CORRELATING | `(2, 2)` | `(2, 7)` |
| OPEN | `(3, 3)` | `(3, 15)` |
| CLOSED | `(4, 4)` | `(4, 31)` |

- The run scheduler calls each immutable world transition separately. The equal tick counts in this one run do not couple the clocks; unit tests must also advance only one world and prove the other is unchanged.

## 4. Events and causal graph

An event contains:

- stable event ID
- `WORLD_A`, `WORLD_B`, or `INTERIOR` domain ID
- local time before and after the transition for world events; `null` for an interior routing event
- a unique positive integer `schedulerOrdinal` used only as this deterministic run's causal-ordering certificate
- state-before and state-after SHA-256 digests
- payload digest, or `null` when no payload participates

A directed causal edge is valid only when both endpoints exist and `source.schedulerOrdinal < target.schedulerOrdinal`. Same-world transition events must additionally be non-decreasing in that world's local time. **Local times from different domains are never numerically compared.** Self-edges are forbidden. The full graph must be acyclic.

Validation uses deterministic Kahn topological sorting with lexically ordered ready IDs. Reachability is directed. A causal edge may cross known domains only in OPEN and only through the explicit interior route.

The complete preregistered event schedule is:

| Ordinal | Event ID | Domain | Local time | Meaning |
|---:|---|---|---|---|
| 1 | `A-E-01` | WORLD_A | `0→1` | ISOLATED A transition |
| 2 | `B-E-01` | WORLD_B | `0→1` | ISOLATED B transition |
| 3 | `A-E-02` | WORLD_A | `1→2` | CORRELATING A transition |
| 4 | `B-E-02` | WORLD_B | `1→2` | CORRELATING B transition |
| 5 | `A-E-03` | WORLD_A | `2→3` | OPEN A transition |
| 6 | `OPEN-SEND` | WORLD_A | `3→3` | A-side payload send |
| 7 | `OPEN-INTERIOR` | INTERIOR | `null` | channel route |
| 8 | `OPEN-RECEIVE` | WORLD_B | `2→2` | B-side receive before its transition |
| 9 | `B-E-03` | WORLD_B | `2→3` | OPEN B transition |
| 10 | `A-E-04` | WORLD_A | `3→4` | CLOSED A transition |
| 11 | `CLOSED-ATTEMPT` | WORLD_A | `4→4` | blocked same-payload attempt |
| 12 | `B-E-04` | WORLD_B | `3→4` | CLOSED B transition |

Same-world chain edges connect consecutive A events and consecutive B events. OPEN additionally has exactly `OPEN-SEND → OPEN-INTERIOR → OPEN-RECEIVE`. `CLOSED-ATTEMPT` has no path to any B event. Event IDs, ordinals, edges, and reachability booleans are part of the golden manifest.

## 5. Information measures

For a discrete probability vector `p`, Shannon entropy in bits is:

```text
H(p) = -Σ pᵢ log₂(pᵢ), omitting pᵢ = 0 terms
```

For normalized joint distribution `P(X,Y)`:

```text
I(X;Y) = Σₓᵧ P(x,y) log₂(P(x,y) / (P(x)P(y)))
```

Normalized mutual information is:

```text
NMI(X,Y) = I(X;Y) / max(H(X), H(Y))
```

Zero case: when `max(H(X),H(Y)) = 0`, `NMI = 0`. A pair of deterministic variables therefore does not become maximally close merely because neither contains measurable uncertainty.

The primary Phase 1 normalized dissimilarity is dimensionless:

```text
d_MI(X,Y) = 1 - NMI(X,Y)
```

`d_MI` is a preregistered symmetric edge-weight transform. This ADR does **not** claim that it satisfies the triangle inequality or is a mathematical metric on arbitrary distributions. “Geodesic” below means a shortest path in the explicitly weighted toy graph, not a proof of an ambient information-geometric manifold.

The implementation validates probabilities before calculation:

- rectangular, non-empty matrix
- every entry finite and non-negative
- total probability equals 1 within `1e-12`
- every denominator used by a positive joint cell is positive

Expected invariants:

- `I(X;Y) >= 0` up to numeric tolerance
- symmetry under transpose
- independent distributions have `I = 0`
- perfectly correlated uniform binary variables have `I = 1`, `NMI = 1`, `d_MI = 0`
- `NMI` and `d_MI` are clamped only for sub-`1e-12` floating noise at the [0,1] boundaries; material out-of-range results fail closed

## 6. Geodesic graph

The weighted telemetry graph is separate from causal transfer reachability.

Preregistered parameters:

```text
base separation                       100 geometry-units
interior endpoint overhead              5 geometry-units per side
interior information scale             45 geometry-units per side
```

The always-present comparison edge is:

```text
A_BOUNDARY → B_BOUNDARY, weight = 100
```

When an interior correlation path exists, it contains:

```text
A_BOUNDARY → INTERIOR, weight = 5 + 45 d_MI
INTERIOR → B_BOUNDARY, weight = 5 + 45 d_MI
```

Thus the complete interior route costs:

```text
L_interior = 10 + 90 d_MI
```

The geodesic length is the minimum non-negative directed path cost. Dijkstra traversal uses lexical tie-breaking and returns both node IDs and edge IDs as a witness.

The reduction ratio uses the ISOLATED baseline calculated by the same algorithm:

```text
reduction = (L_isolated - L_current) / L_isolated
```

Zero case: if the calculated baseline is zero or non-finite, reduction is unavailable and the model fails closed rather than emitting a fabricated value.

## 7. Closed tensor network

Phase 1 uses known World A and World B tensors. It does not contain Boundary Ω or open legs.

Named-index tensors:

```text
A[a,b] = [[1.00, 0.00],
          [0.00, 0.50]]

I[b,c] = [[1.00, c],
          [c,    1.00]]

B[c,a] = [[0.75, 0.25],
          [0.25, 0.75]]
```

Every index name must occur exactly twice and have one consistent dimension. For the preregistered network, `a`, `b`, and `c` each have dimension 2, so dangling/open index count is zero.

Contraction order is fixed and recorded:

```text
M[a,c] = Σ_b A[a,b] I[b,c]
scalar = Σ_a,c M[a,c] B[c,a] = trace(A I B)
```

No optimizer chooses a contraction path at runtime.

ISOLATED has no interior tensor network and reports contraction scalar and internal volume as zero. CORRELATING, OPEN, and CLOSED construct and validate the complete network before contraction.

## 8. Internal volume

`INTERNAL VOLUME` is a dimensionless effective rank of the preregistered intermediate operator `M = A I`. It is not physical volume.

Let singular values of M be `sᵢ` in descending order:

```text
pᵢ = sᵢ² / Σⱼ sⱼ²
H_s = -Σᵢ pᵢ ln(pᵢ)
internal_volume = exp(H_s)
```

Zero case: if `Σ sᵢ² = 0`, internal volume is 0.

The two-by-two singular values are calculated deterministically from the eigenvalues of `MᵀM`; negative eigenvalues within `1e-12` of zero are clamped to zero, while material negative values fail closed.

## 9. Throat capacity and channel certificate

For each non-ISOLATED phase, the implementation first validates the tensor network and derives an immutable `ChannelCertificate` from that validated topology. The certificate contains the network input digest, ordered route tensor IDs `[A, I, B]`, ordered bond IDs `[b, c]`, their dimensions, the authoritative phase, and whether that phase enables transport. Callers cannot supply an unrelated boolean and bond-dimension array to the transfer function.

Transport is enabled only when the authoritative phase is exactly `OPEN`; it is derived rather than supplied as an independent input. The joint distribution, tensor coupling, and phase remain explicit preregistered inputs and are not falsely claimed to be derivable from one another.

Throat capacity is derived from the certificate's minimum route-bond dimension:

```text
capacity_per_use = log₂(min route bond dimension) bits/use
```

For the preregistered validated network both route bonds have dimension 2. Therefore the OPEN certificate has capacity 1 bit/use. CORRELATING and CLOSED retain validated topology but have capacity exactly 0. ISOLATED has no interior certificate and capacity 0.

A non-integer or non-positive route-bond dimension is invalid. Capacity is not inferred from transfer success.

## 10. Transfer and closure control

The same explicit payload and transform configuration is attempted in OPEN and CLOSED controls.

Preregistered transfer input:

```text
payload UTF-8: "A0" (16 bits)
XOR key bytes: [0xA7, 0x3C]
channel uses: 16
```

Scrambling is deterministic bytewise XOR with the repeating key. Recovery applies the same transform.

The transfer consumes only a `ChannelCertificate`. It splits the scrambled payload into one-bit symbols, maps each symbol to basis index `0` or `1`, routes each symbol over certificate bonds `b` then `c`, and records the per-symbol route. This is a deterministic topology/capacity transport model; it does not claim that the scalar tensor contraction is a byte codec. B-side recovery is constructed only from symbols that completed the certified route.

Transfer succeeds only when all conditions hold:

```text
certificate phase is OPEN and transport is enabled
AND capacity_per_use × channel_uses >= payload_bits
AND every routed symbol traversed certificate bonds [b,c]
AND recovered bytes exactly equal input bytes
```

In CLOSED, the attempted input and scrambled bytes remain available on the A side for audit, but B-side `recovered` is `null`, `verified` is false, and status is `BLOCKED_CLOSED_CHANNEL`. The model must never copy input into B-side output when capacity is zero.

## 11. Provenance and export manifest

Every displayed Phase 1 scientific metric and clock value has a `CalculationRecord` containing:

```text
recordId
metric
value
unit
source = COMPUTED
algorithm
algorithmVersion
formula
inputIds[]
inputDigest
```

The run exports a canonical `CalculationManifest` containing:

- schema and model version
- notice and known-domain classification
- exact input configuration and its SHA-256 digest
- world transition/event records
- causal DAG validation result
- per-phase information measures
- geodesic path and edge witness
- tensor shapes, named indices, dangling-index count, fixed contraction order, scalar, and singular values
- transfer attempt and OPEN/CLOSED result
- all `CalculationRecord` entries

Canonical serialization recursively sorts object keys lexically, preserves array order, rejects `undefined`, functions, symbols, bigint, sparse arrays, cycles, and non-finite numbers, and serializes with UTF-8 JSON scalar spelling. The manifest schema version is `phase1-manifest/1`, model version is `closed-aperture-toy/1.0.0`, and SHA-256 is computed over those canonical UTF-8 bytes. Duplicate record IDs, event IDs, edge IDs, scheduler ordinals, or missing displayed-record coverage fail closed.

The UI must not render a Phase 1 metric unless a matching provenance record exists. Phase 0 fixture provenance remains typed separately as `REFERENCE_FIXTURE` or `DERIVED_FIXTURE` and must not be relabelled `COMPUTED`.

## 12. Golden vectors

The following values were calculated independently from the formulas above before production implementation. Tests use the unrounded values shown here with absolute tolerance `1e-12`.

| Phase | MI bits | NMI | d_MI | Geodesic | Reduction | Contraction scalar | Singular values | Internal volume | Capacity bits/use |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| ISOLATED | 0 | 0 | 1 | 100 | 0 | 0 | `[]` | 0 | 0 |
| CORRELATING | 0.27807190511263785 | 0.27807190511263785 | 0.7219280948873621 | 74.97352853986258 | 0.25026471460137417 | 1.275 | `[1.1471497813164107, 0.36612481372574524]` | 1.3609211851696628 | 0 |
| OPEN | 0.8585594574581792 | 0.8585594574581792 | 0.1414405425418208 | 22.72964882876387 | 0.7727035117123613 | 1.4625 | `[1.5028319906126897, 0.06321398572389308]` | 1.0130447438368164 | 1 |
| CLOSED | 0.1187091007693073 | 0.1187091007693073 | 0.8812908992306927 | 89.31618093076234 | 0.10683819069237657 | 1.2374999999999998 | `[1.0900812727609095, 0.4174000704072239]` | 1.4656772669577116 | 0 |

Additional analytic vectors:

| Joint distribution | Expected MI | Expected NMI | Expected distance |
|---|---:|---:|---:|
| `[[0.25,0.25],[0.25,0.25]]` | 0 | 0 | 1 |
| `[[0.5,0],[0,0.5]]` | 1 | 1 | 0 |
| `[[1,0],[0,0]]` | 0 | 0 | 1 |
| `[[0.5,0.5],[0,0]]` (one zero-entropy marginal) | 0 | 0 | 1 |

The asymmetric vector `[[0.60,0.10],[0.20,0.10]]` and its transpose must produce the same MI within `1e-12`; this guards against symmetry tests that only use symmetric matrices.

Tensor contraction analytic checks:

- at `c=0.4`, `trace(A I B) = 1.275`
- at `c=0.9`, `trace(A I B) = 1.4625`
- at `c=0.3`, `trace(A I B) = 1.2375` mathematically; the binary64 result may be `1.2374999999999998`

## 13. Acceptance gates

Phase 1 is accepted only when:

1. Each production behavior was introduced by a focused failing test and observed RED before GREEN.
2. Independent world advancement, causal validation/reachability, MI invariants, shortest-path witness, closed-network validation, fixed contraction, effective rank, capacity, and transfer closure have unit/golden/property tests.
3. The integrated run computes every telemetry value from declared inputs and algorithms without importing Phase 0 fixture output constants.
4. OPEN routes all 16 scrambled bits over the topology-derived `[b,c]` certificate and recovers `A0`; CLOSED attempts the same payload but has no enabled certificate route and exposes no B-side recovery.
5. Every displayed Phase 1 number resolves to a provenance record in the exportable manifest.
6. UI labels Phase 0 and Phase 1 unambiguously and preserves `KNOWN TOY MODEL — NOT A DISCOVERY`.
7. `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm audit --omit=dev` pass under Node 22.
8. The exact staged candidate receives an independent scientific and implementation review with zero Blocker/High/Medium findings before commit, push, or deploy.
