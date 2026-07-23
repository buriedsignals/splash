# T1 · lib/core golden-value hardening (slice 2) — Design

> Test-debt T1 of AUDIT #2, continuation of slice-1. Audits the remaining cross-module-parity `lib/core`
> test files and hardens the tautological ones. Branch `feat/t1-slice-2-golden` off `main`.

## 0. The audit (grounded, this is the scope decision)

Each remaining `lib/core/*.test.ts` importing from `skills/*` was classified — is the imported symbol a **pure
re-export** of the lib/core function (tautological parity, cannot fail) or an **independent/integration** import
(legitimate)?

| File | Imported from skills/* | Verdict |
|---|---|---|
| `locale.test.ts` | chart-native + map-native `core/locale` — both `export * from "../../../../lib/core/locale"` | **TAUTOLOGICAL** → harden (17 parity assertions) |
| `text-fit.test.ts` | chart-native `core/text` — `export * from "../../../../lib/core/text-fit"` | **TAUTOLOGICAL** → harden (21 parity assertions) |
| `house-ramp.test.ts` | map-native `theme/house-ramp` — "thin re-export shim" of lib/core primitives | **TAUTOLOGICAL** → harden (`shim.*` parity) |
| `contrast.test.ts` | chart-native `core/conformance` — `export { relativeLuminance, contrastRatio }` (both imported from lib/core/contrast) | **TAUTOLOGICAL** → harden (4 parity assertions) |
| `conformance-l0.test.ts` | chart-native `checkGlobalConformance` + map-native `checkGlobalMapConformance` — INDEPENDENT functions that WRAP `conformanceL0` | **LEAVE** — legit cross-impl parity; already has real golden assertions (`toEqual([])`, `toBe(true)`) |
| `i18n-furniture.test.ts` | dw-chart/map-dw `furniture-i18n` (`export *` of lib/core) + `spec-to-metadata` (dw-specific) | **LEAVE** — already has an explicit re-export IDENTITY guard (`expect(dwSourceLabels).toBe(core.SOURCE_LABELS)`) + a golden bytes table; well-designed, the behavioural parities are backed by that identity guard |

**Scope = the 4 tautological files** (`locale`, `text-fit`, `house-ramp`, `contrast`). `conformance-l0` and
`i18n-furniture` are correctly built and left as-is.

## 1. Goal

Replace the tautological (self-comparing) parity assertions in the 4 files with **golden-value / analytic**
assertions that pin lib/core's actual behaviour and are proven to catch a real mutation — same method as slice-1.

## 2. Method (per file, identical to slice-1)

1. Remove the `skills/*` re-export import(s) the parity compares against.
2. Replace each parity assertion with a golden: an INDEPENDENTLY-DERIVED value where the function is a pure
   formula (contrast = WCAG luminance/ratio, analytic), or a CAPTURED-then-mutation-proven golden table for the
   richer functions (locale strings, text-fit measurements, house-ramp hex arrays).
3. Run the file → pass.
4. **Mutation-verify**: inject one representative mutation into the lib/core SOURCE for each hardened function,
   confirm the golden FAILS, then revert. Record the mutation + failing line.

## 3. Per-file specifics

- **`contrast.test.ts`** — `relativeLuminance`/`contrastRatio` are pure WCAG formulas → assert ANALYTIC goldens
  (independent): e.g. `relativeLuminance("#ffffff")===1`, `relativeLuminance("#000000")===0`,
  `contrastRatio("#000000","#ffffff")===21`, `contrastRatio("#0072B2","#ffffff")≈5.1854` (toBeCloseTo).
  Mutation: change a channel coefficient / the `(L1+0.05)/(L2+0.05)` constant.
- **`locale.test.ts`** — pin the exact formatted strings per language (fr narrow-nbsp U+202F thousands, de/it
  separators, "Source:/Quelle:/Fonte:" labels). Capture from `core` + mutation-prove. Mutation: change a
  separator or a label byte.
- **`text-fit.test.ts`** — pin the exact measurement/fit outputs (numbers) for representative inputs. Capture +
  mutation-prove. Mutation: change a width/px constant in the fit logic.
- **`house-ramp.test.ts`** — pin the exact hex ramp arrays for representative (hue, n) inputs. Capture +
  mutation-prove. Mutation: change a ramp L endpoint / chroma.

## 4. Constraints

- **TEST-ONLY**: no lib/core SOURCE behaviour change; source touched only transiently for mutation proof, always
  reverted. `git diff main -- lib/core/<name>.ts` empty at the end.
- Keep any EXISTING real (non-parity) assertions in these files untouched — only the tautological parity ones change.
- Analytic floats → `toBeCloseTo(v, precision)`; hex/string → exact `toBe`/`toEqual`.
- The 4 files are disjoint → implemented in parallel (worktree-isolated), cherry-picked onto the branch.

## 5. Non-goals

- `conformance-l0` / `i18n-furniture` (correctly built — left).
- A mutation framework (manual/targeted mutation proof, as slice-1).
- Deleting the skills/* re-exports (behaviour pinned in lib/core; re-exports stay).
