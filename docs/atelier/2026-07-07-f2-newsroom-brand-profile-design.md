# F2 — Newsroom brand profile (house style) — DESIGN for sign-off

## The gap
Atelier's goal is "a visual for **every newsroom**", yet every visual is auto-coloured (subject-fit
Okabe-Ito). A newsroom's house palette is never collected — CADRAGE Q4 ("house palette") is skipped as
"not relevant" (T1/T4) — and no producer accepts one. A newsroom won't publish off-brand charts, so
on-brand output is close to essential for adoption. Auto-colour is a good DEFAULT; it must not be the
only option.

## The hard part: brand × a11y
A newsroom's brand colour (a house red, a specific blue) may not be CVD-safe or may fail the value-label
contrast the engines enforce at produce-time. We therefore CANNOT just "use the brand colour" — we must
reconcile brand fidelity with the accessibility floor the whole system defends (every gate protects it).
Three candidate policies:

- **(a) Strict a11y, nearest-safe mapping + transparency** — apply the brand palette; if a colour fails
  CVD-safety / contrast, map it to the nearest CVD-safe & contrast-safe variant and TELL the journalist
  ("we nudged your house red to a colour-blind-safe shade"). a11y wins; brand approximated. *(reco)*
- **(b) Brand-first, warn** — apply the brand colour as-is; surface an a11y concern at the render-review;
  the journalist decides. Brand wins; a11y advisory.
- **(c) Hybrid** — brand palette for DECORATIVE furniture (accent, header) only; data-encoding colours
  stay from a CVD-safe ramp *seeded* by the brand hue.

**DECIDED (Rémy): policy (b) — brand-first + warning.** The newsroom's brand is applied as chosen; a
non-CVD-safe / low-contrast brand colour is NOT nudged — instead the render-review surfaces the a11y
concern and the journalist (the editor) decides. **Key implication to build:** the hard produce-time a11y
guards (produce-conformance, snap-contrast) must DOWNGRADE to a render-review concern **only** for a
colour the journalist explicitly set via the brand profile; the AUTO (no-brand) path stays hard-guarded.
So a11y is hard by default, overridable only by a conscious brand choice, with the tradeoff surfaced.
*(My earlier reco was (a) strict-nearest-safe; overridden — recorded for honesty.)*

## Mechanism: a per-newsroom brand profile, set once (install-model)
Mirror the fly.io host model ("install 1× puis boucle"): the newsroom sets a brand profile ONCE; it
applies to every visual thereafter.
- **Where:** a `brand.json` in the newsroom's atelier project (per-newsroom, like `.env`). Fields:
  `palette` (ordered brand hues), optional `accent`. `logo` / `font` DEFERRED (fonts touch every
  producer's typography — a separate lot).
- **Onboarding:** a one-time "set up your house style" step (like the fly.io setup); CADRAGE offers
  "use your house palette?" when a brand profile exists.
- **Threading:** the suggester, instead of auto-choosing a subject-fit hue, SEEDS from the brand palette
  (`baseColor` / `seriesColors` drawn from it), passed through the a11y reconciliation (policy a). The
  producers already accept `baseColor`/`seriesColors`, so the thread is short:
  `brand.json → suggester seeds brand hue → reconcile a11y → spec → producer`.
- **Fallback:** no brand profile → today's subject-fit auto-colour, unchanged.

## Scope (first cut)
- Colours only (palette + accent). Fonts/logo deferred.
- Reconciliation = policy (a): nearest CVD-safe / contrast-safe mapping + a render-review note.
- Profile = a per-project `brand.json`, loaded by the suggester; CADRAGE offers it when present.
- New helper: `nearestSafeHue(brandHex)` (CVD-safe + ≥4.5:1-capable) — pure, tested; reused by every producer path.

## Open questions for sign-off
1. **Reconciliation policy:** (a) strict-a11y-nearest-safe **[reco]**, (b) brand-first-warn, (c) hybrid?
2. **First-cut scope:** colours only **[reco]**, or also accent-for-furniture now?
3. **Where the profile lives:** `brand.json` in the project **[reco]** vs env vs a hosted profile.
