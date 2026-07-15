# F2 — Newsroom brand profile (house style) — DESIGN for sign-off

## The gap
Splash's goal is "a visual for **every newsroom**", yet every visual is auto-coloured (subject-fit
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
- **Where:** a `brand.json` in the newsroom's splash project (per-newsroom, like `.env`). Fields:
  `palette` (ordered brand hues), optional `accent`. `logo` / `font` DEFERRED (fonts touch every
  producer's typography — a separate lot).
- **Onboarding:** a one-time "set up your house style" step (like the fly.io setup); CADRAGE offers
  "use your house palette?" when a brand profile exists.
- **Threading:** the suggester, instead of auto-choosing a subject-fit hue, SEEDS from the brand palette
  (`baseColor` / `seriesColors` drawn from it), passed through the a11y reconciliation (policy a). The
  producers already accept `baseColor`/`seriesColors`, so the thread is short:
  `brand.json → suggester seeds brand hue → reconcile a11y → spec → producer`.
- **Fallback:** no brand profile → today's subject-fit auto-colour, unchanged.

## Scope (first cut) — reconciled to the DECIDED policy (b)
- Colours only (palette + accent). Fonts/logo deferred.
- Reconciliation = **policy (b), brand-first + warning**: apply the brand colour as chosen; when it fails
  CVD-safety / contrast, DOWNGRADE the produce-time a11y guard (produce-conformance / snap-contrast) to a
  render-review **concern** — but ONLY for a colour the journalist explicitly set via the brand profile.
  The AUTO (no-brand) path stays hard-guarded exactly as today.
- Profile = a per-project `brand.json`, loaded by the suggester; CADRAGE offers it when present.
- New mechanism: a **`brand-explicit` bypass flag** threaded from the brand profile → spec → the produce
  guards, so they emit a render-review concern instead of a hard failure for that colour (never a global
  relaxation). No colour is silently rewritten (that was policy (a), rejected).

## Resolved (sign-off)
1. **Reconciliation policy:** DECIDED = (b) brand-first + warning (see above).
2. **First-cut scope:** colours only (palette + accent). *(open: add accent-for-furniture in cut 1?)*
3. **Where the profile lives:** `brand.json` in the project. *(open: env vs hosted profile later.)*
