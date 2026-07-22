# T1 · lib/core golden-value hardening (slice 1) — Design

> Test-debt T1 of AUDIT #2 (§6, agent 6: "~40% des parités `lib/core` sont TAUTOLOGIQUES,
> `theme.test` et `video-verify.test` = 0 vraie assertion"). Foundation of S4's rigorous certification —
> a cert that counts dead tests as coverage is theater. Branch `feat/t1-lib-core-golden-tests` off `main`.

## 0. The debt (read first, grounded)

Several `lib/core/*.test.ts` files assert `core.X() toEqual reExport.X()`, where the `reExport` is a
**pure re-export of `core.X` itself** — so the test compares a function to itself and **cannot fail**:

- `skills/chart-native/src/core/video-verify.ts:6` is literally `export * from "../../../../lib/core/video-verify"`.
  → **all 6 `it` blocks** in `lib/core/video-verify.test.ts` (tuning-knob `toBe`, meanAbsDiff/lumaVariance/
  diffRatio `toBeCloseTo`, two `verifyVideo` `toEqual`) compare lib/core to its own re-export. Zero real assertion.
- `skills/chart-native/src/core/tokens.ts` and `skills/map-native/src/theme/map-tokens.ts` re-export lib/core's
  `deriveFurniture`/`resolveFrameColors`. → `theme.test.ts:11,18` (the two `matches on every background` parity
  `it`s) are tautological. (The rest of `theme.test.ts` was made real this session — golden byte-identity,
  L-preservation, WCAG sweep, tint tests.)

**Nuance (agent 6):** the real behavioural value is protected ELSEWHERE (`frame-furniture-derive`, `snap-video`),
so these are **dead noise, not bare primitives** — no bug hides behind them. This slice converts the dead noise
into live, mutation-resistant coverage in `lib/core` itself (where the primitive lives), so `lib/core`'s own
suite pins its own behaviour.

## 1. Goal

Replace the tautological parity assertions in the two worst files with **golden-value / independent-oracle**
assertions that pin `lib/core`'s actual behaviour and are proven to catch a real mutation. A minimal structural
"is still re-exported" guard may remain (one assertion per module), but behaviour is pinned to golden values,
not to a self-comparison.

## 2. Scope

**In:**
- `lib/core/video-verify.test.ts` — all 6 `it` blocks re-authored against golden values / analytic oracles.
- `lib/core/theme.test.ts` — the 2 parity `it`s (lines 11, 18) re-authored against the golden furniture tables
  (below). The other `theme.test.ts` tests are already real — untouched.

**Out (deferred T1-slice-2, documented, not silently dropped):** the other cross-module-parity files
(`conformance-l0`, `contrast`, `house-ramp`, `i18n-furniture`, `locale`, `text-fit`) — each has 1-4 cross-module
imports that must be individually classified (tautological re-export vs legitimate integration import) before
hardening. That audit + hardening is slice 2.

## 3. The golden values (independent oracles)

### 3.1 `deriveFurniture` (theme.test.ts) — pinned table

```
#ffffff → {line:"#0072B2",head:"#FFFFFF",headGlow:"#0072B2",ink:"#1A1A1A",muted:"#6B6B6B",grid:"#E6E6E6",axis:"#CFCFCF",bg:"#FFFFFF"}
#0b1220 → {line:"#56B4E9",head:"#FFFFFF",headGlow:"#56B4E9",ink:"#F4F4F5",muted:"#aeb0b5",axis:"#4c515c",grid:"#2c323e",bg:"#0B1220"}
#f4c9d7 → {line:"#0072B2",head:"#FFFFFF",headGlow:"#0072B2",ink:"#1A1A1A",muted:"#5b4f53",axis:"#b798a2",grid:"#d5b1bd",bg:"#F4C9D7"}
#36454f → {line:"#56B4E9",head:"#FFFFFF",headGlow:"#56B4E9",ink:"#F4F4F5",muted:"#bbc0c3",axis:"#6b767d",grid:"#515e66",bg:"#36454F"}
#71717a → {line:"#0072B2",head:"#FFFFFF",headGlow:"#0072B2",ink:"#FFFFFF",muted:"#d4d4d7",axis:"#99999f",grid:"#85858d",bg:"#71717A"}
#009e73 → {line:"#0072B2",head:"#FFFFFF",headGlow:"#0072B2",ink:"#1A1A1A",muted:"#124235",axis:"#07795a",grid:"#048c67",bg:"#009E73"}
```

### 3.2 `resolveFrameColors` (theme.test.ts) — pinned table

```
#ffffff → {pill:"rgba(255,255,255,0.92)",ink:"#1a1a1a",muted:"#5f5f5f"}
#0b1220 → {pill:"rgba(11,18,32,0.82)",ink:"#f4f4f5",muted:"#c1c2c6"}
#f4c9d7 → {pill:"rgba(244,201,215,0.82)",ink:"#1a1a1a",muted:"#4a4144"}
#36454f → {pill:"rgba(54,69,79,0.82)",ink:"#f4f4f5",muted:"#caced0"}
#71717a → {pill:"rgba(113,113,122,0.82)",ink:"#ffffff",muted:"#e0e0e2"}
#009e73 → {pill:"rgba(0,158,115,0.82)",ink:"#1a1a1a",muted:"#14372e"}
```

### 3.3 `video-verify` primitives — analytic where possible

- `meanAbsDiff(a, b)` = mean over channels of `|a−b|`. For solid frames it is analytic (e.g. two solids
  differing by Δ per channel → meanAbsDiff = Δ). Assert against the hand-computed value, not a re-call.
- `lumaVariance(frame)` = variance of per-pixel luma (Rec.601). A solid frame → 0; a two-tone frame → a
  computable value. Assert against the analytic/hand-computed number.
- `diffRatio(a, b, tol)` = fraction of pixels differing beyond `tol`. Construct frames with a known number of
  differing pixels → assert the exact ratio.
- `verifyVideo(input)` — pin the exact verdict object for one healthy and one broken synthetic input (capture
  once, then mutation-verify it constrains behaviour). The tuning-knob constants (`REVEAL_MIN_MEAN_DIFF` etc.)
  are pinned to their literal numbers (a knob drift is a deliberate change that must update the golden).

## 4. Mutation verification (the acceptance that a golden is real)

A captured golden is only trustworthy if it FAILS on a real mutation. For each hardened function, during
implementation: inject one representative mutation into the SOURCE (`lib/core/video-verify.ts` /
`lib/core/theme.ts`), run the test, confirm it now FAILS, then revert the mutation and confirm PASS. Record the
mutation + the observed failure in the task report. Examples:
- `meanAbsDiff`: change the divisor / drop the `abs` → the analytic golden must fail.
- `deriveFurniture`: change the muted mix ratio → the golden table must fail.
- `verifyVideo`: flip a threshold comparison → the pinned verdict must fail.

## 5. Testing

- The re-authored tests ARE the tests. No new test file.
- `bun test lib/core/video-verify.test.ts` and `bun test lib/core/theme.test.ts` pass.
- Full `bun test lib/core` passes (no regression in the untouched files).
- The task report carries the mutation-verification evidence for each hardened function (§4).

## 6. Non-goals

- Slice-2 files (conformance-l0/contrast/house-ramp/i18n-furniture/locale/text-fit) — separate audit + slice.
- Introducing a mutation-testing FRAMEWORK (Stryker etc.) — out of scope; mutation-verify is manual/targeted here.
- Changing any `lib/core` source behaviour — this is test-only (source touched ONLY transiently for mutation-verify, always reverted).
- The chart-native/map-native re-exports themselves — they stay as-is; we pin behaviour in lib/core, not delete the re-exports.

## 7. Risks

- **A pinned golden encodes a current BUG** (pins wrong behaviour) → mitigated: the golden tables come from the
  same functions whose behaviour is already validated by the OTHER (real) tests in the suite + the render-proofs;
  mutation-verify proves the golden constrains, and the analytic oracles (meanAbsDiff/lumaVariance/diffRatio) are
  independently derived, not captured.
- **Golden brittleness** (a legitimate refactor must update the table) → acceptable and intended: a behaviour
  change SHOULD force a conscious golden update; that is the point of a change-detector-free golden.
- **Rounding in float goldens** → use `toBeCloseTo` with an explicit precision for the analytic float oracles,
  exact `toBe`/`toEqual` for the hex/string tables.
