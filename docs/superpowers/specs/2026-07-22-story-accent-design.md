# S3 · Story accent — Design

> Pillar S3 of AUDIT #2 (§4, Colorimétrie), the "palette-story" lever, scoped by the CVD-first decision below.
> Branch `feat/story-accent` off `main` (@ 7bd84c2).

## 0. The reframe (read first)

The planned lever was "une palette au niveau story" — derive categorical series colours from the newsroom
brand palette. Grounding + a design decision narrowed it hard, correctly:

- **Categorical series stay Okabe-Ito** (maintainer decision): a categorical encoding is exactly where
  colour-blind readers must distinguish series, and Okabe-Ito is purpose-built for that; an arbitrary brand
  palette is not guaranteed CVD-distinguishable. So palette-story must NOT override categorical colours.
- **Sequential** (heatmap/choropleth) already derives from the house `baseColor` (S3-slice-1 OKLCH ramp). Done.
- **Furniture** already tints toward `baseColor` (S3-slice-3 + fan-out). Done (the 11 no-baseColor charts'
  furniture is a separate fan-out residual, out of scope here).
- **Semantic role colours** (diverging +blue/−vermillion, waterfall increase/decrease/total, Likert warm/cool)
  are *signs*, validated by their own guards — never overridden.

What is genuinely unimplemented: the brand profile's **`accent`** hue is parsed and stored
(`brand-profile.ts:20-21,93`) but **never threaded to charts** — `mergeProfileDefaults` seeds only `baseColor`
(from `palette[0]`). Every editorial-emphasis chart hard-codes its accent (`OKABE_ITO.vermillion`/`orange`). So
a newsroom's designated emphasis colour is dead. This slice makes it live: **the story accent.**

## 1. Goal

When a brand profile sets `accent`, it becomes the editorial-emphasis hue across the charts whose emphasis is a
single hard-coded accent — so emphasis is brand-consistent story-wide. Absent `accent`, every chart is
byte-identical. Categorical, sequential, role, and subject-highlight colouring are untouched.

## 2. Scope — the editorial-accent charts

Threaded (each currently hard-codes a single "the one accent" hue):
| Chart | current hard-coded accent | becomes |
|---|---|---|
| `SlopeChart` | `SLOPE_LINE_COLORS[1]` = vermillion (the bucking line) | `config.accent ?? vermillion` |
| `LollipopChart` | `ACCENT = OKABE_ITO.vermillion` (the highlight) | `config.accent ?? vermillion` |
| `HistogramChart` | `MEDIAN = OKABE_ITO.vermillion` (the median line) | `config.accent ?? vermillion` |
| `BumpChart` | orange peak accent (default palette) | `config.accent ?? orange` |
| `RadialBarChart` | orange PEAK accent | `config.accent ?? orange` |

**NOT threaded** (already brand or must stay fixed):
- `ConnectedScatterChart` / bar / scatter / beeswarm — emphasis is already `config.baseColor` (subject hue).
- Categorical `SERIES_COLORS`/`GROUPED`/`STACKED` (Okabe-Ito, CVD).
- `DIVERGING_SIGN_COLORS`, `WATERFALL_ROLE_COLORS`, Likert ramp — semantic role signs, guard-validated.

## 3. Architecture

### 3.1 Seed the accent (`skills/splash/src/brand-profile.ts`)

`mergeProfileDefaults` already seeds `baseColor` from `profile.palette[0]`. It gains a sibling: when
`profile.accent` is set, seed `spec.accent = profile.accent` onto chart specs (it is already a `BrandProfile`
field). The spec type it operates on gains `accent?: string`. Absent `profile.accent`, nothing is set →
byte-identical. (A journalist's explicit per-element `accent` on the spec, if such a field is ever authored,
wins — same precedence idea as `baseColorExplicit`; not built now, just not clobbered.)

### 3.2 The charts read `config.accent`

Each of the 5 charts replaces its hard-coded accent constant usage with `config.accent ?? <the current
default>`. The config type of each gains `accent?: string`. One-line change per chart; the default keeps the
exact current hue so no-accent renders are byte-identical.

### 3.3 a11y — reuse the existing brand-colour concern (NOT a new gate)

The produce-conformance brand-colour guard (`chart-native/src/core/conformance.ts:103-128`) already downgrades
a `brandExplicit` colour that is not CVD-safe or fails contrast to a **non-fatal render-review concern**
("kept per the newsroom's house style"). The seeded story accent is a brand colour → it flows through the SAME
mechanism: a brand accent that is not colour-blind-distinguishable from the context or fails its contrast floor
is applied-as-chosen and **flagged**, never rejected (policy b, mirroring `baseColor`). The extension needed:
ensure the guard evaluates the `accent` colour (not only `baseColor`) for the charts that render it — verify at
implementation whether the existing guard already sees the rendered accent or needs the accent passed in.

## 4. Data flow

`profile.accent` → `mergeProfileDefaults` seeds `spec.accent` → the 5 charts paint their emphasis with
`config.accent ?? default` → produce-conformance flags it if not CVD-safe/low-contrast (non-fatal). No accent
in the profile → no `spec.accent` → every chart byte-identical.

## 5. Testing

- **`brand-profile` seeding**: `mergeProfileDefaults` with a profile `{accent:"#7A1FA2"}` sets `spec.accent`;
  without an accent field, `spec.accent` is absent (byte-identity guard). Independent assertion, not a
  re-export comparison.
- **Per-chart default fallback**: for each of the 5 charts' config→geometry, `accent` absent → the current
  hard-coded hue is used (byte-identical); `accent` present → it is used. Assert on the resolved emphasis
  colour in the geometry/config output (not a pixel).
- **a11y flag**: a profile accent that is not Okabe-Ito / low-contrast produces the existing render-review
  concern string, not a hard failure.
- Golden/structural, independent oracles (audit T1). No categorical/role test changes.

## 6. Render-proof (acceptance)

A slope or lollipop rendered with a profile `accent` (e.g. a purple `#7A1FA2`) shows its emphasis line/mark in
that brand accent instead of vermillion, while the context/series are unchanged — maintainer-judged. Confirm a
no-accent render is unchanged.

## 7. Non-goals

- Deriving categorical series colours from the palette (CVD decision — categorical stays Okabe-Ito).
- Overriding semantic role colours.
- Furniture tint for the 11 no-baseColor charts (fan-out residual).
- A general CVD-distinguishability checker for a colour SET (only the existing per-colour brand concern is used).

## 8. Risks

- **A brand accent collides with the subject `baseColor`** (both brand hues, hard to tell apart) → the render
  is judged at §6; the a11y concern surfaces a non-CVD-safe accent, but same-hue-as-subject is an editorial
  call the newsroom owns (policy b). Not mechanically blocked.
- **Byte-identity break** for no-accent renders → §3.2 keeps the exact current default; §5 byte-identity guard.
- **The guard doesn't see the accent** → §3.3 verify-at-implementation step; if it only reads `baseColor`, pass
  the accent to it for the 5 charts.
