# Design conformance — the per-chart checklist

> Source: corpus `design-principles.md` (Okabe-Ito, ONS type, WCAG, Datawrapper defaults, Tufte). Credited.

A produced chart MUST satisfy:

1. **Title = the insight**, sentence case ("Unemployment is at a five-year low", not "Unemployment 2018-2023").
2. **Colour — chosen by subject, not defaulted to blue** (palette-freedom principle: free choice guarded by
   CVD-safety + contrast). Categorical charts: only the Okabe-Ito colorblind-safe set —
   `#0072B2 #E69F00 #009E73 #D55E00 #CC79A7 #56B4E9 #F0E442 #000000`, **≤2 colours** — but CHOOSE the hue that
   fits the subject (energy/solar → amber `#E69F00`, environment → green `#009E73`, heat → vermilion
   `#D55E00`, water/cold → blue `#0072B2`, **housing/rent/cost-of-living → amber `#E69F00`**,
   **labour market/cross-border commuting/migration/transport-flow → vermilion `#D55E00`**). Blue is the
   default ONLY for water/cold/sky/marine subjects; a declared `subject` left on the default blue FAILS the
   guard. **"Blue" for this rule means the WHOLE blue family — `#0072B2` AND `#56B4E9` (sky) — not just the
   exact library default**; picking the lighter sky-blue for a non-blue-fit subject is the same "left it
   blue" defect with a different hex (regression found live: a "cross-border commuting" chart shipped
   `#56B4E9`). Never leave `baseColor`/`palette` unset for a chart with a clear subject either — an absent
   colour silently falls back to the same blue default (regression found live: a housing/rent chart shipped
   with no colour field at all). Never invent a hex outside the eight Okabe-Ito colours above. Choropleths:
   pick `scaleType` from the data semantic (magnitude → sequential; signed-around-a-midpoint → diverging)
   and a subject-fit `palette` from the `map-native` registry (`blues/greens/oranges/purples`,
   `rdbu/brbg/puor/orbu`) — every registry ramp is vetted CVD-safe; the conformance guard fails a
   semantic↔scaleType mismatch, a non-CVD-safe ramp, and a clear subject on the default palette.
3. **Direct labels** over legends where the chart supports value labels.
4. **Number formatting**: strip noise, abbreviate (`12.8k`, not `12,831`).
5. **Source cited**: name + a real URL. A NAMED dataset/publication (e.g. "Eurostat", "INSEE") MUST
   carry both — never ship the name alone, and never fabricate a URL to fill the field. If the true URL
   is unknown, ask the journalist for it rather than shipping incomplete or invented. The only name-only
   exception is the honest prose fallback ("Figures as reported in this article" / the outlet's own name)
   when there is no separate dataset being cited.

**Language (suggester-enforced, not a code guard):** every reader-facing string — title, intro,
direct labels, annotations, alt text, the source label — is written in the **article's / journalist's
language**, detected upstream; never default the furniture to English. Authored text, so it is enforced
by `suggest-article` / `suggest-chart`, not by the conformance code (proper nouns and data values keep
their original form).
6. **Alt text = the insight, not the structure** (WCAG 1.1.1) → goes to DW `aria-description` (dw-chart:
   `spec.altInsight`, hard-required by `validateChartSpec`). Mandatory on **every** producer's spec, dw-chart
   or native — a spec that never sets `altInsight` ships a visual with no accessible description at all
   (regression found live: a shipped beeswarm spec had no `altInsight` field anywhere). `chart-native`'s
   `checkGlobalConformance` (`skills/chart-native/src/core/conformance.ts`) enforces the same requirement
   when a caller threads the spec's `altInsight` through it, mirroring dw-chart's guard.
7. **Contrast** WCAG ≥ 4.5:1 for text (DW defaults satisfy this; don't override to low-contrast).
   **Label text carries the value, the MARK carries the hue.** A text label (direct label, annotation,
   highlighted-row label) must meet 4.5:1 on its background → it uses a text-safe near-black ink, NOT a
   data hue that fails contrast. Emphasise a highlighted label by weight/position and by colouring its
   MARK (dot, line, bar), not by colouring the label text. Several Okabe-Ito hues fail 4.5:1 as TEXT on
   white (e.g. vermillion `#D55E00` = 3.87:1) — valid as marks, not as label text; a data-hue label must
   itself be ≥ 4.5:1 or carry a credited halo (which the conformance check does not model today).
   Enforced at produce for chart-native via `resolveConformanceColors` + the per-type checks.

DW field mapping (used by `spec-to-metadata.ts`): title→`title`; insight→`describe.intro`;
alt→`describe.aria-description`; source→`describe.source-name`/`source-url`; number format→`describe.number-format`;
single colour→`visualize.base-color`; direct labels→`visualize.value-labels.show`.
