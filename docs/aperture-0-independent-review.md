# Aperture-0 Independent Review

## Verdict

**INCOMPLETE (as an implementation of v0.4) / PASS (as what it actually claims to be: a Phase 0 reference fixture)**

The deployed application is not the "MVP" defined in spec §19, and does not attempt to be. It is a small, honestly-scoped **Phase 0 reference fixture** (per `docs/phase-0-architecture.md`) that intentionally implements only four hard-coded demo states, a client-side XOR scramble/recover toy, and a SHA-256 hash-chain "replay" check against one hard-coded fixture run. Judged against v0.4 in full, almost every major subsystem (Boundary Ω, Feasible Set, Null Aperture, tensor network, Event Flight Recorder, Scene Archive, Deterministic Replay of computed state, Controlled Rerun, endpoint hierarchy, sequential testing, change-point detection) is **not implemented and not claimed to be implemented**. Within that narrow, disclosed scope, the code is internally consistent, honestly labeled, and does not mislead about being a "discovery." I did not find any case where a mock/fixture value is dressed up as a live measurement without an on-screen disclaimer. I did find one real Firebase Hosting cache-control misconfiguration and one dead/uncomputed-but-unused metric — see Findings.

## Exact Reviewed State

- **HEAD**: `e81936d5ada331379c0af360cf49d1cc49f5102e` (branch `main`, tracking `origin/main`, up to date)
- **Working tree**: clean, no staged/unstaged/untracked changes at review start
- **Recent commits**: `e81936d` docs: add usage guide to README → `65cf8ef` docs: translate README into Japanese → `b7a4a87` feat: add Phase 0 calibration observatory (the entire application, single commit)
- **Build artifact (fresh local build)**: `dist/assets/index-qBkh7_L5.js`, `dist/assets/index-CPziHoR5.css`, `dist/index.html`
- **Deployed version correspondence**: The live site at `https://aperture-0.web.app/` serves assets with the **identical content-hashed filenames** (`index-qBkh7_L5.js`, `index-CPziHoR5.css`) as a fresh `npm run build` of HEAD, and `.firebase/hosting.ZGlzdA.cache` lists the same filenames with matching SHA-256 digests. This is strong evidence the deployed site == HEAD, though it is not a cryptographic proof of the server-side build environment.
- **Runtime versions**: Node v24.15.0, npm 11.12.1, Python 3.14.4 (unused by this repo — no Python code exists), git 2.53.0
- **Firebase config**: `firebase.json` — Hosting only (`public: dist`, SPA rewrite, CSP/HSTS/security headers). No `firestore.rules`, `storage.rules`, `functions/`, or `firebase.json` sections for Firestore/Functions/Storage/Auth. `node_modules` contains no `firebase` package — the client bundle has **zero Firebase SDK code**.
- **Build config**: Vite 8.2.0 + React 19.2.8 + TypeScript 6.0.3 (`tsc -b` project references), Vitest 4.1.10, ESLint 10.8.0. No sourcemap flag set (Vite default `sourcemap: false` — confirmed no `.map` files in `dist/`).
- **Spec file reviewed**: `docs/aperture-0-spec-v0.4.md`, SHA-256 `7e733cedcbdf9bd066678dc6e56f18d5cb029a15f266e4d074413b2fb4ea6bcd`, 2130 lines.
- No code was modified during this review.

## Executive Summary

1. The live app and the repo at HEAD match (same content-hashed build).
2. What's implemented is small and self-declared: a 4-state fixture sequence (`ISOLATED → CORRELATING → OPEN → CLOSED`), hard-coded metric values lifted verbatim from the spec's own §20 demo scenario, a genuine (if trivial) client-side XOR scramble/recover, and a SHA-256 hash-chain check against one hard-coded "trusted" run.
3. `docs/phase-0-architecture.md` explicitly scopes out Boundary Ω, Feasible Set, external completion, threshold sealing, and unknown-boundary claims — and the code honors that: `grep` for Ω/Boundary/Feasible across `src/` returns only a UI disclaimer string ("NO Ω BOUNDARY"), never a data structure.
4. Every number that isn't the two genuinely-derived values (the XOR scramble bytes, and an unused reduction-ratio field) is a constant from a lookup table (`phaseDefinitions` in `demoRun.ts:53-90`), not a measurement. The UI never claims otherwise — units read "not specified in v0.4" for the two `null` fields, and the app is labeled "REFERENCE FIXTURE SNAPSHOT" / "LOCAL DETERMINISTIC FIXTURE" throughout.
5. Nothing persists: no `localStorage`, `sessionStorage`, cookies, or service worker on the live site — confirmed via live JS execution. Reload always restarts at `ISOLATED`, step 0. There is no experiment log, no Event Flight Recorder ring buffer, no Scene Archive, no Null Aperture mode. None of this is hidden — the UI never claims a log is being kept.
6. "Deterministic Replay" and "Rerun" as spec-defined concepts (§14.5, §14.6) do not exist. What exists is a single hard-coded-anchor hash-chain integrity check (`replayDemoRun` in `demoRun.ts:204-257`) run once against one fixture. It is a legitimate anti-tamper check for that fixture, not deterministic replay of computed state, and the UI's "REPLAY: VERIFIED" label borrows spec vocabulary for a materially smaller thing.
7. I found one real, reproducible bug: the Firebase Hosting `Cache-Control: no-cache` header intended for `/index.html` (`firebase.json`) does **not** apply to the SPA's actual entry path `/`, because Firebase Hosting matches headers before the SPA rewrite. Root `/` is served with `Cache-Control: max-age=3600` and is CDN-cached (`x-cache: HIT`) — see Findings/High.
8. `geodesicReductionRatio`, the one metric `phase-0-architecture.md` calls out as genuinely derived, is computed (`demoRun.ts:100-102`) but never rendered anywhere in `App.tsx` — dead code / disconnected feature.

## What Is Actually Implemented

- A static React 19 + TypeScript SPA, no backend, no Firebase SDK usage, deployed to Firebase Hosting as `dist/`.
- Four fixed simulation "snapshots" (`ISOLATED`, `CORRELATING`, `OPEN`, `CLOSED`) built once at module load by `createDemoRun()` (`src/simulation/demoRun.ts:173-202`).
- A fixed 8-node / up-to-7-edge graph rendered as SVG (`DomainGraph` in `App.tsx:52-82`); node positions and edge topology are constants (`demoRun.ts:25-41`), not computed from any geometry.
- A real, working XOR scramble/recover of the literal string `"APERTURE-0"` (`payload`/`scrambleKey` in `demoRun.ts:14-17`, `transferFor()` at `demoRun.ts:136-149`), gated so it only runs when `apertureActive` is true (i.e., only in the `OPEN` state) and empty/`null` otherwise. Verified live: the OPEN-state scrambled bytes on the deployed site (`e6 f7 e2 f5 f3 f2 f5 e2`) match `0x41 ^ 0xa7 = 0xe6` etc., confirming this runs client-side rather than being a pasted constant.
- A canonical-JSON + SHA-256 hash chain over the four snapshots (`canonicalJson`/`hashSnapshot`, `demoRun.ts:151-171`), each snapshot's hash depending on the previous snapshot's hash (`previousHash`), displayed in the UI as CHAIN: GENESIS/LINKED.
- A one-shot "replay" check (`replayDemoRun`, `demoRun.ts:204-257`) that recomputes the hash chain from a passed-in `DemoRun` object and compares it against (a) a hard-coded expected header (`experimentId`, `mode`, `notice`), (b) a hard-coded expected phase order, and (c) one hard-coded 65-hex-char `trustedTerminalHash` constant. This is a genuine and reasonably well-tested (`demoRun.test.ts`) tamper-detection check for the one fixture, correctly rejecting rebinding, truncation, reordering, and reseal-after-tamper attempts.
- Step/Play/Pause/Reset transport controls over the 4 fixed snapshots, driven by real React state (not decorative — `step`/`playing` state genuinely gates which snapshot's data renders).
- An `aria-live` status region announcing snapshot/replay state changes; keyboard-operable buttons with `aria-pressed`/`aria-label`.
- 16 passing unit/component tests (`vitest`), passing `tsc -b`, passing `eslint`, and a successful production `vite build`.
- Firebase Hosting config with a real, reasonably strict CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and immutable long-cache headers for hashed `/assets/**`.

## What Is Mocked or Decorative

| Item | Classification | Evidence |
| --- | --- | --- |
| Geodesic Length, Mutual Information, Internal Volume, Throat Capacity (all 4 states) | **Fixed value** (copied from spec §20 demo scenario, not computed) | `demoRun.ts:53-90` (`phaseDefinitions` table); values are byte-identical to spec `docs/aperture-0-spec-v0.4.md:1970-2011` |
| Domain clocks `tA`/`tB` | **Fixed value** (`index+1`, `(index+1)*2`) | `demoRun.ts:181-182` — not an independent per-domain clock simulation |
| Graph node positions / topology | **Fixed value** | `demoRun.ts:25-41` — static coordinates and edge list, not derived from any geometry or distance metric |
| "Geodesic Reduction Ratio" | **Real calculation, but unused/not displayed** | Computed `demoRun.ts:100-102`; no reference in `App.tsx` (`grep` confirms) — dead/unconnected |
| Payload scramble/recover (OPEN only) | **Real computation** (trivial XOR, not cryptographic, not information-geometric) | `demoRun.ts:136-149`; live-verified against deployed site |
| Snapshot SHA-256 hash chain | **Real computation** | `demoRun.ts:151-171`, uses `@noble/hashes` |
| "Replay" verification | **Real computation, but against one hard-coded fixture/anchor, not deterministic replay of a live-computed run** | `demoRun.ts:204-257`; `trustedTerminalHash` is a literal constant (`demoRun.ts:23`), not derived independently at replay time |
| Aperture pulse animation, glow filter, edge "energized" styling | **Display-only decoration** | `App.tsx:79`, `App.css` — cosmetic, correctly gated on real `phase`/`edge.active` state but carries no numeric meaning |
| Boundary Ω, Feasible Set, Null Aperture, Event Flight Recorder ring buffer, Scene Archive, Threshold Record, Morph Signature, tensor network / contraction, PELT change-point detection, endpoint hierarchy (primary/secondary/exploratory), sequential testing / Expected False Alarm Rate, Consecutive Null counter | **Not implemented / not present in code at all** | Zero matches for `omega|boundary|feasible|tensor|contraction|morph|pelt|rerun|archive|freeze|excess|consecutive` (case-insensitive) anywhere in `src/`, confirmed by direct grep |
| Any "discovery," "anomaly," or unknown-boundary claim | **Absent** — actively disclaimed | UI banner "CALIBRATION MODE / KNOWN TOY MODEL — NOT A DISCOVERY / NO Ω BOUNDARY" (`App.tsx:142-146`), footer "KNOWN-DOMAIN CALIBRATION ONLY" |

No case was found where a fixed/mock/random value is presented to the user **without** an accompanying disclaimer (`N/A` + "not specified in v0.4" for the two null metrics; "REFERENCE FIXTURE SNAPSHOT" heading over the whole telemetry panel; "LOCAL DETERMINISTIC FIXTURE" in the footer). This is the single most important compliance-relevant fact: whatever the app lacks, it does not appear to lie about what it is.

## Specification Compliance Matrix

| Requirement | Status | Evidence | Severity |
| --- | --- | --- | --- |
| 3.1 異世界を生成しない (no fictional-world generation) | PASS | No world/culture/persona generation anywhere in `src/`; UI shows only "WORLD A"/"WORLD B" labels over fixed geometry | — |
| 3.2 答えを作らない / 3.2.1 代表点禁止則 (no representative-point completion) | NOT TESTABLE | Rule only applies once Ω/Feasible Set exist; neither exists (§5.5/5.5.1 not implemented) | — |
| 3.3 演出と計算を分離する (separate spectacle from computation) | PARTIAL | Real computations (XOR, hash chain) are correctly gated by real state; but 4 of 4 phases' headline metrics are fixture constants displayed with no visual distinction from a "measured" value (same `MetricCard` styling) | Medium |
| Boundary Ω (§5.5) / Omega Write Guard | NOT IMPLEMENTED (explicitly, by design) | `docs/phase-0-architecture.md:7,23`; zero occurrences of Ω-as-data in `src/` | — (correctly deferred, not a defect) |
| Feasible Set F (§5.5.1) | NOT IMPLEMENTED | same as above | — |
| Domain / independent local time (§5.1, MVP §19) | PARTIAL | `DomainClock` type exists and is rendered (`App.tsx:174-175`), but values are arithmetic constants, not simulated independent clocks | Medium |
| Event / Causal Edge as real data (§5.2/5.3) | PARTIAL | `GraphEdge`/`GraphNode` types are real, typed data structures rendered directly from data (not randomly generated per render — confirmed no `Math.random()` anywhere in `src/`), but the edge set itself is a hand-authored constant, not derived from any causal or information-geometric model | Medium |
| 情報幾何: 距離・曲率・内部体積 (§6.1-6.3) | NOT IMPLEMENTED (values are fixture constants) | `demoRun.ts:53-90`; no distance/curvature/volume computation exists | High (relative to MVP §19 "相互情報量による距離" requirement) |
| §9 テンソルネットワーク層 (tensor network, open index, contraction) | NOT IMPLEMENTED | No tensor/contraction code anywhere; graph is presentation-only SVG | High (MVP §19 requires "簡易テンソルネットワーク") |
| §10 形態共鳴層 (Morph Signature, netLSD, Control Signature) | NOT IMPLEMENTED | Zero matches for "morph"/"netlsd" in `src/` | — (correctly out of MVP-required core, but listed as MVP-adjacent in §19 not required) |
| §11.9 Null Aperture (UI-indistinguishable control mode) | NOT IMPLEMENTED | No control/null mode exists; the app has exactly one run, always the same fixture | High (explicit MVP §19 requirement) |
| §11.3 Null Distribution Collection | NOT IMPLEMENTED | No session batching, no H0 construction, no τ derivation code | — (Phase 1.5, correctly out of scope pre-MVP) |
| §12.1 Endpoint hierarchy (primary/secondary/exploratory) | NOT IMPLEMENTED | No endpoint/threshold concept in code; the app performs no statistical judgment at all | High (relative to MVP §19 "測地距離（primaryとして明示）") — geodesic length is shown but never labeled "primary" nor compared to any threshold |
| §12.3 常時運転における逐次検定 / Expected False Alarm Rate | NOT IMPLEMENTED | No continuous-run mode exists; app has no time-based background execution | — (Phase 1.5/always-on, correctly out of MVP) |
| §12.4 判定に使用しない量 (excluded-quantities list) | NOT TESTABLE | No judgment/decision logic exists at all to check compliance against | — |
| §14 Event Flight Recorder (ring buffer, Hot/Warm/Cold, backpressure, RNG enumeration) | NOT IMPLEMENTED | Zero matches for freeze/archive/backpressure/RNG-state code; "FLIGHT RECORDER" UI panel (`App.tsx:232-240`) shows only class/hash/chain/replay of the one fixture, not a recorder | High (MVP §19 explicitly requires "Event Flight Recorder（短時間リングバッファ）") — **UI panel is labeled "FLIGHT RECORDER" but implements none of §14's recorder semantics; this is the closest thing to a naming/expectation mismatch found** |
| §14.5 Deterministic Replay (two-layer checkpoint, bit-exact + tolerance, DIVERGED detection) | PARTIAL | A working DIVERGED-detecting hash-chain check exists (`demoRun.ts:204-257`, exercised by 6 adversarial tests in `demoRun.test.ts`) but only against one hard-coded fixture with a literal trust anchor, not a two-layer (discrete/continuous) replay of independently computed state | Medium |
| §14.6 Controlled Rerun (Exact/New-Random/Cross-Machine/Morph/Null classes) | NOT IMPLEMENTED | No rerun classes exist | High (MVP §19 requires none of the Rerun classes explicitly, but does require "実験再生" (experiment replay) which is only partially met) |
| §14.7 Anomaly Scene Archive | NOT IMPLEMENTED | No manifest/pre-roll/post-roll/Merkle-root code | High (MVP §19 explicitly requires "Anomaly Scene Archive最小版") |
| §14.9 CONSECUTIVE NULL counter | NOT IMPLEMENTED | No such counter anywhere | High (explicit MVP §19 requirement) |
| §15 Data structures (Experiment, Domain State, Boundary State, Geometry Snapshot, Threshold Record, Anomaly Record) | PARTIAL | Only an ad hoc `DemoSnapshot`/`DemoRun` shape exists (`types.ts`), covering a subset of "Geometry Snapshot"-like fields; no Threshold Record, Boundary State, or Anomaly Record types exist | Medium |
| §13 UI concept / 表示禁止 (display prohibitions: no persona, no portal, no discovery claim) | PASS | No violations found; disclaimers present throughout, confirmed live | — |
| Persistence / ログ保存 (MVP §19 "全ログ保存") | NOT IMPLEMENTED | Live-verified: `localStorage`/`sessionStorage`/cookies all empty, no service worker; reload discards all state | High |
| Deterministic build/lint/typecheck/test | PASS | All four commands exit 0, see Test Results | — |
| Firebase Hosting-only, no billing-risk services enabled | PASS | `firebase.json` has only a `hosting` key; no `firebase` npm package in the client bundle; no Firestore/Auth/Storage/Functions code | — |

## Findings

### Blocker

None found. There is no case where a mock, fixed, or pseudo-random value is presented as a live research measurement without a disclaimer, and no case where the UI implies discovery, anomaly, or unknown-boundary content. Given how early-stage this build self-describes as being (Phase 0 fixture, not even the spec's own MVP), the "Blocker" bar (results/behavior not trustworthy) does not apply — nothing here is being represented as trustworthy research output in the first place.

### High

1. **"FLIGHT RECORDER" UI panel and vocabulary substantially overstate what exists.**
   - Problem: The right-rail panel is titled "FLIGHT RECORDER" (`App.tsx:232`) and shows `REPLAY: VERIFIED`, borrowing §14's Event Flight Recorder / Deterministic Replay vocabulary. What actually runs is a one-shot hash-chain integrity check of one hard-coded fixture, with no ring buffer, no Hot/Warm/Cold tiers, no backpressure, no RNG-state capture, and nothing to freeze or archive.
   - Evidence: `src/App.tsx:232-240`, `src/simulation/demoRun.ts:204-257`; spec requirements at `docs/aperture-0-spec-v0.4.md:1014-1431` (§14) are entirely unaddressed.
   - Reproduction: Load the site, observe "FLIGHT RECORDER … REPLAY VERIFIED"; there is no way to trigger a freeze, inspect a ring buffer, or browse recorded events, because none exist.
   - Impact: A reader unfamiliar with the code could reasonably believe a recording/replay subsystem per §14 exists. It does not. This is a labeling/expectation risk, not a data-integrity risk — the hash check itself is real and correctly implemented for what it does.
   - Minimal fix: Rename the panel/label to something scoped to what it verifies (e.g., "FIXTURE INTEGRITY CHECK" / "SNAPSHOT HASH CHAIN"), and keep "Deterministic Replay" / "Flight Recorder" terminology reserved for when §14 is actually implemented.
   - Files: `src/App.tsx:232-240`.

2. **No persistence / no experiment log, though MVP §19 requires "全ログ保存" (full log persistence).**
   - Problem: The app holds all state in React memory; nothing is written to `localStorage`, `IndexedDB`, a backend, or any file. A reload always resets to `ISOLATED`, step 0, with a fresh (though numerically identical) `DemoRun` object.
   - Evidence: live JS execution on `https://aperture-0.web.app/` returned `{"localStorage":[],"sessionStorage":[],"cookies":"","sw":0}`; confirmed no Firebase SDK / storage backend exists in the bundle.
   - Reproduction: Open the live site, step through states, reload — all progress and any notion of a "run" is gone.
   - Impact: There is no artifact a user or reviewer could point to as "the experiment log of this run" beyond re-deriving the same fixture from source, which defeats the purpose of a log.
   - Minimal fix: Not urgent for the current fixture (nothing non-deterministic happens, so nothing is lost), but should be tracked as an explicit gap before any phase that produces genuinely observed data.
   - Files: n/a (absence, not a specific file).

3. **Null Aperture, Anomaly Scene Archive, Consecutive Null counter — explicit MVP §19 requirements — are entirely absent.**
   - Problem: §19 lists these as required for "the first MVP," not later phases. None exist in any form.
   - Evidence: zero matches for null-aperture/archive/consecutive-null concepts anywhere in `src/` (see grep results above).
   - Impact: The app cannot currently be called the spec's "MVP" under any reading, only a narrower, self-declared Phase 0 slice (which the repo itself correctly calls out in `docs/phase-0-architecture.md` — this is a spec-vs-repo-claim gap, not a repo-vs-README gap; the README and UI do not claim MVP status).
   - Minimal fix: None required immediately; tracked as the primary "next phase" work in Recommended Next Phase below.
   - Files: n/a.

### Medium

1. **Firebase Hosting `Cache-Control: no-cache` for `index.html` does not apply to the SPA's actual entry path `/`.**
   - Problem: `firebase.json` sets `Cache-Control: no-cache` for `source: "/index.html"`. Firebase Hosting matches header rules against the *requested* path, before the SPA rewrite (`source: "**" → "/index.html"`) is applied for serving. A request to the literal path `/index.html` gets `no-cache` (verified), but a request to `/` — what every real visitor hits — gets the default `Cache-Control: max-age=3600` and is CDN-cached (`x-cache: HIT` observed on second fetch).
   - Evidence: Live `fetch()` from the deployed site: `GET /` → `cache-control: max-age=3600`, `x-cache: HIT`; `GET /index.html` → `cache-control: no-cache`, `x-cache: MISS`. Config: `firebase.json` headers block, `source: "/index.html"`.
   - Reproduction: `curl -sD - https://aperture-0.web.app/ -o /dev/null` vs `curl -sD - https://aperture-0.web.app/index.html -o /dev/null` — compare `cache-control`.
   - Impact: After a future deploy that changes the hashed asset filenames, any browser or CDN edge that cached the old root HTML (up to 1 hour) will request the old, now-removed hashed JS/CSS filenames and fail to load — a self-resolving but real "broken page after deploy" window. Low likelihood of triggering, but easy to fix.
   - Minimal fix: In `firebase.json`, change the header source to match the rewritten path's actual serving behavior — Firebase Hosting evaluates headers against the original request path, so add a second header rule with `source: "**"` (or specifically `"/"`) applying the same `no-cache` value used for `/index.html`, or set the SPA-shell no-cache rule as the catch-all and scope the long-cache rule only to `/assets/**` (already present) so it naturally wins by specificity.
   - Files: `firebase.json` (headers array).

2. **`geodesicReductionRatio` is computed but never displayed — a disconnected feature.**
   - Problem: `phase-0-architecture.md` states "Only the geodesic reduction ratio and OPEN-state transfer transformation are derived here," i.e., this field is meant to be the one visible proof of real computation beyond the transfer probe. It is computed in `metricsFor()` (`demoRun.ts:100-102`) but `grep` confirms it is never read or rendered by `App.tsx`.
   - Evidence: `src/simulation/demoRun.ts:23-29` (type includes the field), `:97-107` (computed), no reference in `src/App.tsx` or `src/App.css`.
   - Reproduction: Search `App.tsx` for `geodesicReductionRatio` / `ReductionRatio` — no matches.
   - Impact: The one metric the architecture doc singles out as "actually derived, not fixture" is invisible to any user or reviewer looking only at the UI, undermining exactly the "separate spectacle from computation" (§3.3) property the doc claims for it.
   - Minimal fix: Add a `MetricCard` for it in the telemetry panel (`App.tsx:212-217`), or remove it from the type/computation if it's not meant to ship yet.
   - Files: `src/App.tsx:212-217`, `src/simulation/demoRun.ts:97-107`.

3. **No CI / no automated gate on `test`/`lint`/`build`/`typecheck`.**
   - Problem: No `.github/workflows` or other CI config exists. All four quality gates (`npm test`, `npm run lint`, `tsc -b`, `npm run build`) are currently green, but nothing prevents a future commit from breaking them before a manual `firebase deploy`.
   - Evidence: `find .github -type f` → no such directory.
   - Impact: Low today (single-commit, single-maintainer repo), but a real gap before this scales past Phase 0.
   - Minimal fix: Add a CI workflow running `npm ci && npm test && npm run lint && npm run build` on push/PR.
   - Files: n/a (absence).

4. **`DomainClock` / `GraphEdge` data model exists but is fed only by hand-authored constants, not any simulation.**
   - Problem: The typed data structures the eventual v0.4 implementation will need (`DomainClock`, `GraphNode`, `GraphEdge`) are already in place and rendered from real data (good architectural choice per `phase-0-architecture.md`'s "renders those snapshots rather than maintaining separate decorative state" claim, which I verified holds), but nothing computes their values yet.
   - Evidence: `src/simulation/demoRun.ts:25-41`, `:181-182`.
   - Impact: Not a defect against the declared Phase 0 scope; flagged only because the compliance matrix needs it recorded against MVP §19's "各Worldの独立時間"/"因果グラフ" requirements.
   - Minimal fix: n/a for Phase 0; tracked as Phase 1 work.
   - Files: `src/simulation/demoRun.ts`.

### Low

1. **README "現在の実装範囲" list is accurate but could more explicitly cross-reference which MVP §19 items are still missing**, to reduce the risk of a future contributor assuming Phase 0 == MVP. (`README.md:9-21`)
2. **No explicit test asserting `localStorage`/persistence is intentionally absent** — would make the current "no persistence" state a documented, tested decision rather than an implicit one. (`src/App.test.tsx`)
3. **No CSP `report-uri`/`report-to`** — CSP is otherwise solid (`default-src 'self'`, no `unsafe-inline`/`unsafe-eval`); adding a report endpoint would help catch future regressions, though this requires a backend and is reasonably deferred given "no billing-risk services" is a stated goal. (`firebase.json`)
4. **Responsive/multi-viewport behavior and multi-tab behavior were only spot-checked**, not exhaustively verified across breakpoints (see Runtime Verification — scope note).

## Runtime Verification

Performed against the live deployment `https://aperture-0.web.app/` (not a local dev server), using a headless browser session with console/network/JS-eval access:

- **Initial load**: 200 OK, no console errors, no console warnings, no failed requests. Network log shows exactly 3 requests: `/`, `/assets/index-qBkh7_L5.js`, `/assets/index-CPziHoR5.css` — all 200. No WebSocket, no XHR, no third-party calls (consistent with `connect-src 'self'` CSP and no backend).
- **Accessibility tree read** (full page): confirms initial state `ISOLATED`, `aria-live` status region reads "Snapshot ISOLATED. No input injected. Replay VERIFIED.", matching visible content.
- **Storage/SW check** (live JS eval): `localStorage: []`, `sessionStorage: []`, `cookies: ""`, `serviceWorker registrations: 0`.
- **Navigation to `OPEN` state** (clicked "Open OPEN snapshot"): metrics updated to `4.92 / 0.72 / 6.41 / 8.00 bits`; Transfer Probe switched to `PASS`, showed decoded text `APERTURE-0` and scrambled hex `e6 f7 e2 f5 f3 f2 f5 e2`. Manually verified `0x41 ('A') XOR 0xa7 = 0xe6` — confirms the scramble runs client-side against the real UTF-8 bytes of "APERTURE-0", not a pasted constant.
- **Header check** (live `fetch()`): confirmed CSP, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` all present and served as configured; confirmed the `/` vs `/index.html` cache-control discrepancy documented in Findings/Medium.
- **SPA rewrite / 404 handling**: `GET /some-random-nonexistent-path-xyz` → 200, `text/html`, served the SPA shell (expected Firebase Hosting rewrite behavior for a client-rendered app; there is no server-side 404 for arbitrary paths, which is standard for this architecture and not itself a defect).
- **Source map exposure**: none — `dist/` contains only `index.html`, `assets/index-*.css`, `assets/index-*.js`; no `.map` files; Vite's default (`sourcemap: false`) was not overridden.
- Not independently re-verified live: `Play`/`Pause` auto-advance timing, `Reset` button, multi-tab isolation, and cross-viewport-size layout — these were code-reviewed (`App.tsx:99-121` play timer; `App.tsx:118-121` reset) and exercised via the local `vitest` component tests (which do cover reset, next/step, and CLOSED-state `N/A` rendering), but not manually re-clicked on the live deployment for every case. Given the component logic is identical between local and deployed builds (verified by matching content hashes), I did not judge re-testing this by hand on the live site as adding independent evidence.

## Calculation Trace

| Displayed value | Source | Trace |
| --- | --- | --- |
| Geodesic Length | Fixed value | `phaseDefinitions[i].geodesicLength` (`demoRun.ts:53-90`) → `metricsFor()` (`:97-107`) → `snapshot.metrics.geodesicLength` → `App.tsx:213` `.toFixed(2)`. Values are the literal numbers from spec §20 (`145.22 / 48.14 / 4.92 / 49.88`). |
| Geodesic Reduction Ratio | Real arithmetic, unused | `round((baselineLength - geodesicLength) / baselineLength)` (`demoRun.ts:100-102`); computed into every snapshot's `metrics` object but never read by `App.tsx` — dead value. |
| Mutual Information | Fixed value (or `null` for CLOSED) | `phaseDefinitions[i].mutualInformation` → `App.tsx:214`, formatted via `formatMetric()` (`App.tsx:48-50`) which renders `N/A` for `null`. |
| Internal Volume | Fixed value (or `null` for CLOSED) | Same path as Mutual Information, `App.tsx:215`. |
| Throat Capacity | Fixed value | `phaseDefinitions[i].throatCapacityBits` → `App.tsx:216`. |
| Runtime clocks (tA/tB) | Fixed arithmetic (`step+1`, `(step+1)*2`) | `demoRun.ts:181-182` → `App.tsx:174-175`. Not an independent simulated clock. |
| Interior shape / causal graph | Fixed topology | `nodes`/`worldEdges` constants (`demoRun.ts:25-41`) + phase-conditional `edgesFor()` (`:109-134`) → `DomainGraph` SVG (`App.tsx:52-82`). Edge activation/kind (`CORRELATION`→`APERTURE`) is state-driven, not randomly or independently computed. |
| Transfer bytes (scrambled/recovered) | Real computation | XOR of literal UTF-8 bytes of `"APERTURE-0"` with constant `0xa7`, only when `apertureActive` (`demoRun.ts:136-149`). Live-verified against the deployed site's byte output. |
| Snapshot HASH / CHAIN | Real computation | SHA-256 of canonical JSON of each snapshot including `previousHash` (`demoRun.ts:151-171`), via `@noble/hashes`. |
| REPLAY status | Real computation, fixture-scoped | `replayDemoRun()` (`demoRun.ts:204-257`) recomputes the same hash chain from the passed-in run and compares to a hard-coded header/order/terminal-hash trust anchor (`trustedExperimentId`/`trustedMode`/`trustedNotice`/`trustedPhaseOrder`/`trustedTerminalHash`, `demoRun.ts:18-23`). It is not comparing against an independently-derived "expected" computation — the anchor is a literal constant matching the one fixture the app always constructs. |
| "Freeze Count" / "Expected" / "Excess" / "Consecutive Null" | **Not present in the UI or code at all** | These labels from the review checklist do not appear anywhere in the app; there is nothing to trace. |
| Replay Status / Rerun Status distinction | Only "Replay" exists; "Rerun" does not | See §14.5/14.6 rows in the Compliance Matrix. |

## Replay / Rerun Verification

- **Deterministic Replay, as implemented**: `replayDemoRun()` is exercised by 6 adversarial unit tests in `demoRun.test.ts` (rebind to different experiment ID, truncate/empty, coordinated reseal after tampering a metric, reorder phases + reseal, forge terminal snapshot while spoofing the manifest hash, disagree with recorded hash manifest) — all correctly return `DIVERGED` with a non-null `firstMismatchStep` where applicable, and one positive-path test confirms `VERIFIED` without mutating the original record. This is solid coverage **for the mechanism that exists**: a manifest/hash-chain tamper check against one fixed fixture.
- **What this is not**: §14.5's Deterministic Replay is specified as replaying an independently-computed run from recorded inputs/RNG state and checking bit-exact (layer A) / tolerance-bound (layer B) agreement against the *original execution*, with environment-determinism controls (torch determinism flags, `CUBLAS_WORKSPACE_CONFIG`, thread-count pinning, contraction-path fixing, etc. per §14.5.2). None of that machinery exists, because there is no numerical computation to replay in the first place — every "computed" value here is either a constant or a one-line XOR/hash. I could not test §14.5.1/§14.5.2 requirements because their preconditions (Phase 1.75 Flight Recorder Validation, §18) are not reached.
- **Controlled Rerun**: no `EXACT_RERUN` / `NEW_RANDOM_RERUN` / `CROSS_MACHINE_RERUN` / `MORPH_RERUN` / `NULL_RERUN` classes exist in any form (code or UI). Not testable.
- I did not attempt to artificially perturb the deployed site's runtime state to force a `DIVERGED` result (that would require modifying the served bundle or intercepting network responses, which I treated as out of scope for a read-only live-site review); instead I verified `DIVERGED`-path correctness via the existing unit tests, which directly construct forged/tampered `DemoRun` objects and assert `DIVERGED` — this is equivalent evidence and I judged re-deriving it against the live site as not adding independent value.

## Firebase and Security Review

- **Hosting**: only Hosting is configured (`firebase.json`); no Firestore, Storage, Functions, or Authentication sections exist, and the client bundle contains no Firebase SDK — so there is no Firestore/Storage write-permission surface, no anonymous-auth destructive-write risk, and no billing-relevant service enabled. This matches the architecture doc's stated goal ("keeps the first vertical slice deployable without enabling Firestore, Functions, Authentication, Storage, or billing-dependent services").
- **CSP**: `default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'none'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'` — no `unsafe-inline`/`unsafe-eval`, no wildcard hosts, `form-action 'none'` and `frame-ancestors 'none'` are both good defaults for a page with no forms and no intended embedding. Verified as actually served (live header fetch), not just configured.
- **Other security headers**: `Strict-Transport-Security: max-age=31556926; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), geolocation=(), microphone=()` — all present and reasonable for a page with no forms, no camera/mic/geolocation use.
- **Cache-Control bug**: see Findings/Medium #1 — `/` does not receive the intended `no-cache` treatment; `/assets/**` correctly receives `public,max-age=31536000,immutable` (appropriate given content-hashed filenames).
- **No API keys or secrets found**: `grep` across the repo for common secret patterns and the only "key"-like value is `scrambleKey = 0xa7`, a trivial single-byte XOR constant, not a credential.
- **No source maps published.**
- **CORS**: not applicable — the app makes no cross-origin requests (`connect-src 'self'` and confirmed empty network log beyond same-origin asset fetches).
- **Service Worker / stale-version risk**: none registered, so there's no SW-cache-staleness class of bug; the only staleness risk is the CDN/browser HTML caching bug noted above.
- **Deploy target vs. local HEAD**: content-hash match confirms current correspondence (see Exact Reviewed State); I did not have access to Firebase project IAM/billing settings and did not attempt to check them (out of scope for a code-only reviewer without console access) — **this should be independently confirmed by whoever holds Firebase console access**.

## Test Results

All commands run from repo root at HEAD `e81936d`, no code modified:

| Command | Result |
| --- | --- |
| `npm run test -- --run` (vitest) | **PASS** — 2 test files, 16 tests, all passed, 2.21s |
| `npm run lint` (eslint) | **PASS** — no output, exit clean |
| `npx tsc -b` (typecheck) | **PASS** — exit 0, no diagnostics |
| `npm run build` (`tsc -b && vite build`) | **PASS** — built in 128ms, emitted `dist/index.html` (0.58 kB), `dist/assets/index-CPziHoR5.css` (9.12 kB), `dist/assets/index-qBkh7_L5.js` (206.90 kB) |

**Test categories from the review checklist and their status**:

| Category | Status |
| --- | --- |
| build | Exists, passes |
| lint | Exists, passes |
| typecheck | Exists, passes |
| unit test | Exists (16 tests across `App.test.tsx` + `demoRun.test.ts`), passes |
| integration test | **Does not exist** as a distinct category — the "unit" tests are React Testing Library component tests, which is the closest analog for this codebase's size; no separate integration layer |
| browser smoke test | **Does not exist as automation** — performed manually during this review against the live deployment (see Runtime Verification); no automated Playwright/Cypress/etc. config found |
| deterministic test | Exists — `demoRun.test.ts` asserts fixed metric values and byte-for-byte transfer behavior |
| replay test | Exists, for the fixture-hash-chain mechanism only (6 adversarial cases, see Replay/Rerun Verification) |
| freeze test | **Does not exist** — no Event Freeze feature to test |
| null test | **Does not exist** — no Null Aperture feature to test |
| persistence test | **Does not exist** — no persistence feature to test |
| storage capacity test | **Does not exist** — no ring buffer / storage tiering to test |
| backpressure test | **Does not exist** — no write path to backpressure |
| reload test | **Does not exist as automation**; manually verified live (reload discards state, as expected for a stateless SPA) |

## Recommended Next Phase

**1. Fix now (Blocker-tier urgency despite no Blocker findings):**
- None required immediately. The Medium-tier cache-control bug (Findings/Medium #1) is the only item I'd fix before the next deploy, since it's a one-line `firebase.json` change with a clear, if low-probability, user-facing failure mode.

**2. Needed to reach the spec's own MVP (§19), not yet started or only partially started:**
- Real information-geometric distance (mutual-information-based), replacing the fixed `geodesicLength`/`mutualInformation` table.
- A minimal tensor-network layer with genuine open-index contraction (§9), replacing the decorative SVG-only interior.
- Null Aperture: a second, UI-indistinguishable "no connection" run mode (§11.9) — currently entirely absent.
- Event Flight Recorder: an actual short ring buffer (§14.2), not just a hash chain over 4 fixed snapshots — and the "FLIGHT RECORDER" UI label should either be earned or renamed in the meantime (Findings/High #1).
- Anomaly Scene Archive minimal version (§14.7) and a `CONSECUTIVE NULL` counter (§14.9) — both explicit MVP requirements, currently absent.
- Persistence of the experiment log (MVP "全ログ保存") — currently nothing survives a reload.
- Wire up or remove the already-computed but unused `geodesicReductionRatio` (Findings/Medium #2).

**3. Conditions before Phase 1.5 (Null Distribution):**
- Not reachable yet — Phase 1.5 presupposes a working Closed Aperture (Phase 1) with real information transfer and real threat/geometry computation, none of which exists yet. Per spec §18, Phase 1.5 must be completed and its Threshold Record sealed *before* Phase 2 or any always-on operation; the current repo hasn't reached Phase 1 yet, so this is a future gate, not a current one.

**4. Conditions before Phase 2 (Missing Boundary / Boundary Ω):**
- Explicitly and correctly not attempted. Per spec §18/§21 and `phase-0-architecture.md:23`, Ω must not be introduced before Phase 1.5's prerequisites are sealed. Nothing in the current code violates this — Ω does not exist in any form, which is the correct state for this phase.

## Final Assessment

1. **Is the current public version an Aperture-0 MVP?** No. It implements a strict subset of even the spec's own "first MVP" (§19) requirements — most notably lacking Null Aperture, Event Flight Recorder (as a recorder, not a hash check), Anomaly Scene Archive, Consecutive Null counter, persisted logs, and any real information-geometric computation. The repo's own `docs/phase-0-architecture.md` correctly describes it as a narrower "Phase 0 reference fixture," not an MVP, and neither the README nor the UI claims MVP status.
2. **Are the displayed values real computation or spectacle?** Almost entirely fixed reference values taken verbatim from the spec's own demo scenario (§20), openly labeled as such ("REFERENCE FIXTURE SNAPSHOT," "not specified in v0.4," "LOCAL DETERMINISTIC FIXTURE"). The two genuinely-computed values are a trivial client-side XOR scramble/recover and a SHA-256 hash chain — both real, both correctly gated by real UI state, neither claimed to be more than what it is, except that the hash-chain check borrows "Flight Recorder"/"Replay" vocabulary from a much larger spec concept it does not implement (Findings/High #1).
3. **Is Null Aperture functioning?** No — it does not exist in any form.
4. **Is Replay verifiable?** Only in the narrow sense of "does the hash chain of this one hard-coded fixture verify against a hard-coded trust anchor, and does tampering correctly flip it to DIVERGED" — yes, and this is well-tested (6 adversarial cases). It is not §14.5 Deterministic Replay of independently-computed state, and that distinction matters: nothing here has been "replayed" from recorded inputs, because nothing here was originally computed from inputs in the first place.
5. **Is it safe to run continuously ("常時運転")?** Not applicable — there is no continuous/always-on execution mode at all; the app only renders four static snapshots on demand. The question of always-on statistical validity (§12.3, expected false-alarm rate, sequential testing) has no current subject to apply to.
6. **Should this proceed to unknown-connection experiments?** No, and nothing in the current code attempts to. Per the spec's own phase gates (§18, §21) and the architecture doc's explicit self-restriction, unknown-boundary/Ω work is correctly not started. The honest thing to say about where this project actually is: it has built a clean, well-tested, honestly-labeled *shell* (state machine, snapshot typing, hash-chain integrity pattern, UI vocabulary) that Phase 1 onward will need to fill with real computation — but as of HEAD `e81936d`, essentially none of the scientific content of v0.4 (distance, tensor network, Null Aperture, recorder, archive, endpoint/threshold logic) exists yet.
