# Design conformance — the per-chart checklist

> Source: corpus `design-principles.md` (Okabe-Ito, ONS type, WCAG, Datawrapper defaults, Tufte). Credited.

A produced chart MUST satisfy:

1. **Title = the insight**, sentence case ("Unemployment is at a five-year low", not "Unemployment 2018-2023").
2. **Colour**: only the Okabe-Ito colorblind-safe set —
   `#0072B2 #E69F00 #009E73 #D55E00 #CC79A7 #56B4E9 #F0E442 #000000`. **≤2 colours.** Blue `#0072B2` is the default single-series colour.
3. **Direct labels** over legends where the chart supports value labels.
4. **Number formatting**: strip noise, abbreviate (`12.8k`, not `12,831`).
5. **Source cited**: name + url.
6. **Alt text = the insight, not the structure** (WCAG 1.1.1) → goes to DW `aria-description`.
7. **Contrast** WCAG ≥ 4.5:1 for text (DW defaults satisfy this; don't override to low-contrast).

DW field mapping (used by `spec-to-metadata.ts`): title→`title`; insight→`describe.intro`;
alt→`describe.aria-description`; source→`describe.source-name`/`source-url`; number format→`describe.number-format`;
single colour→`visualize.base-color`; direct labels→`visualize.value-labels.show`.
