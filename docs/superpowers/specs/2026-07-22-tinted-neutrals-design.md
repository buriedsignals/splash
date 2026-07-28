# S3-slice-3 · Tinted neutrals — Design

> Pillar S3 of AUDIT #2 (`docs/splash/audit-2026-07-21-orchestration-and-quality.md` §4, Colorimétrie),
> third slice. Branch `feat/tinted-neutrals` off `main`. Follows the OKLCH ramp slice (`hueRampOklch`,
> `rampUniformityIssues`, muted-chroma cap — merged) and the accent/neutral finding below.

## 0. The reframe (read first)

The planned S3 lever after the OKLCH ramp was **accent/neutral discipline** ("1 accent, rest grey"). Grounding
showed it is **already implemented wherever it cleanly applies** in this codebase — `barColor` (highlight →
accent baseColor, rest → `C.muted`), `SlopeChart` (`[muted, vermillion]`), single-series `LineChart`/
`ScatterChart` (one subject hue). The rainbow palettes are used only by `StackedBarChart` (composition —
correctly exempt) and `GroupedBarChart` (the one subject-type still rainbow; the multi-grey case, deferred).
Building a full cycle to re-systematise working code is YAGNI. So this slice pivots to the §4 lever that is
**genuinely unimplemented and visible everywhere: tinted neutrals** — the furniture greys carry a whisper of
the newsroom's house hue instead of a dead neutral grey (a classic "pro" polish).

## 1. Goal

Furniture greys (`muted`, `axis`, `grid`) derive as **house-hue-tinted neutrals** — the grey's own lightness
with the house hue at a very low chroma — instead of pure neutral greys, when a house/subject colour is set.
Contrast-preserving by construction (lightness unchanged). Byte-identical when no house hue is set.

## 2. Architecture

Two `lib/core` changes + one wrapper thread; the tint reuses the OKLCH round-trip already in `house-ramp.ts`.

### 2.1 Export the OKLCH round-trip (`lib/core/house-ramp.ts`)

`hexToOklch` and `oklchToHex` are today module-local in `house-ramp.ts`. Export them (pure primitives, no
behaviour change) so `theme.ts` can reuse them. (No new module; both live in `house-ramp.ts` already. A later
cleanup could extract them to `lib/core/oklch.ts`, but that is out of scope here.)

### 2.2 `tintNeutral` + tinted `deriveFurniture` (`lib/core/theme.ts`)

```ts
const TINT_CHROMA = 0.015; // OKLCH chroma of a tinted neutral — a whisper of the house hue, not a colour.
//                            A render-proof knob (spec §5); low enough to read as "grey", enough to cohere.

// A tinted neutral: the input grey's OWN OKLCH lightness, re-hued to the house hue at a low chroma.
// Lightness is unchanged, so WCAG luminance-based contrast is preserved — the grey keeps its a11y role,
// it just stops being dead-neutral. Returns the input unchanged if houseHue is not a #rrggbb.
export function tintNeutral(greyHex: string, houseHue: string, chroma = TINT_CHROMA): string {
  if (!/^#[0-9a-f]{6}$/i.test(houseHue.trim())) return greyHex;
  const L = hexToOklch(greyHex).L;
  const h = hexToOklch(houseHue).h;
  return oklchToHex({ L, C: chroma, h });
}
```

`deriveFurniture` gains an optional house hue:
```ts
export function deriveFurniture(bg?: string, houseHue?: string): ColorTokens
```
- The `ink`, `bg`, `line`, `head`, `headGlow` fields are UNCHANGED (ink stays a max-contrast neutral for
  legibility; bg is the ground; line/head carry the series hue already).
- When `houseHue` is a valid `#rrggbb`, the three grey fields become tinted:
  `muted: tintNeutral(_mix(fg, b, 0.3), houseHue)`, `axis: tintNeutral(_mix(fg, b, 0.72), houseHue)`,
  `grid: tintNeutral(_mix(fg, b, 0.86), houseHue)`.
- When `houseHue` is absent/invalid, the greys are the current `_mix(...)` values — **byte-identical** to
  today (every existing chart without a house hue renders unchanged; the light `COLORS` default path is
  untouched).

### 2.3 Thread through the wrapper (`skills/chart-native/src/core/tokens.ts`)

```ts
export function themeColors(themeBg?: string, houseHue?: string): ColorTokens {
  return deriveFurniture(themeBg, houseHue);
}
```
Byte-identical for existing `themeColors(config.themeBg)` calls (houseHue undefined).

### 2.4 Apply at the workhorse charts (scope of THIS slice)

Thread `config.baseColor` into `themeColors` at the workhorse subject charts that carry a `baseColor` and a
house-colour use case — **`LineChart`, `BarChart`, `ScatterChart`** (`themeColors(config.themeBg,
config.baseColor)`). These get render-proven. The remaining ~26 `themeColors` call sites and the map
furniture (`resolveFrameColors`) are the fan-out (§7).

## 3. Data flow

`config.baseColor` (house/subject hue) + `config.themeBg`
→ `themeColors(themeBg, baseColor)` → `deriveFurniture(themeBg, baseColor)`
→ `muted/axis/grid` = `tintNeutral(grey, baseColor)` (OKLCH L preserved, house hue at 0.015 chroma)
→ the component paints axis labels / gridlines / secondary text in a house-tinted neutral.
No new config field; `baseColor` already exists on these configs.

## 4. Contrast (preserved by construction)

`tintNeutral` keeps the grey's OKLCH **L** and only changes hue/chroma. WCAG contrast is luminance-based, and
OKLCH L tracks luminance monotonically, so a tinted neutral's contrast against ink/bg is ~unchanged. The
existing `produce-conformance` furniture-contrast guard still runs on the derived furniture and will catch any
real drift. §6 adds a unit assertion that the tinted `muted` stays within a small delta of the untinted
`muted`'s contrast (and still clears its 4.5:1 floor on the presets).

## 5. Render-proof (acceptance)

Output changes intentionally (furniture greys gain a whisper of hue), so acceptance is a **rendered PNG**,
maintainer-judged:
- A workhorse chart (line or bar) WITH a saturated house `baseColor` (e.g. a green or pink newsroom), rendered
  before vs after — the axis/gridlines/secondary labels should read as *the same grey* but subtly cohere with
  the series hue; NOT visibly coloured.
- `TINT_CHROMA` is dialled here (§2.2) if the first render reads too colourful (lower) or too dead (higher).
- Confirm on both a light and a dark ground.

## 6. Testing (golden/structural, non-tautological — audit T1)

- **`lib/core/theme.test.ts`** (extend): `tintNeutral` — assert the output's OKLCH L equals the input grey's L
  (contrast-preserving, independent oracle), its OKLCH hue equals the house hue's, its chroma ≈ `TINT_CHROMA`;
  assert an invalid house hue returns the grey unchanged.
- **`deriveFurniture` byte-identity**: `deriveFurniture(bg)` (no houseHue) deep-equals the current output for a
  spread of grounds — the regression guard that existing charts don't move.
- **Tinting on**: `deriveFurniture(bg, houseHue)` leaves `ink`/`bg`/`line` byte-identical to the untinted call
  and changes ONLY `muted`/`axis`/`grid`. Contrast is L-preserved but WCAG luminance ≠ OKLCH L, so the delta is
  small-but-nonzero: assert each tinted grey's contrast vs `bg` is **within ±0.2 of the untinted grey's**, and
  the tinted `muted` still clears **4.5:1** on the `#FFFFFF` and `#18181B` presets (axis/grid are hairlines,
  no text floor). Test across saturated house hues (green/pink/blue) where a hue shift could move luminance most.
- Golden values pinned from the first green run alongside the structural invariants (not self-comparison).

## 7. Non-goals (fan-out / later)

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

- Threading `baseColor` into the remaining ~26 `themeColors` sites (universal furniture consistency).
- Map furniture (`resolveFrameColors`) tinted neutrals — mirror `deriveFurniture`.
- Tinting composition-chart furniture (stacked/pie) from a **story-level** house colour (those configs may lack
  `baseColor`) — belongs with the "palette-story" lever.
- The remaining §4 levers: saturation-as-f(background), palette-story.

## 8. Risks

- **A tinted grey reads as coloured** → §5 render-tune `TINT_CHROMA` (0.015 default is a whisper); the L-preserve
  keeps it grey-valued.
- **Contrast drift on an odd ground** → §4/§6: L is preserved so drift is near-zero; the produce guard + the unit
  delta assertion catch any real case; a mid-grey ground that already fails the muted floor still fails (not
  masked by the tint).
- **Byte-identity break for existing charts** → §2.2/§6 byte-identity guard on the no-houseHue path.
- **Tautological tests** → §6 independent L/hue oracle + pinned goldens.
