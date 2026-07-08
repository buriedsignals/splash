# Render-review — the editorial second pair of eyes (Gate 3, Layer 2)

A MANDATORY editorial pass on every PRODUCED visual, run BEFORE the journalist's "ship it".
It reads the ACTUAL rendered visual (the `static.png` / a video frame / the interactive) together
with the article + the data + the emitted spec, and flags editorial defects that deterministic code
cannot see. Its concerns are **advisory** — surfaced to the journalist, who decides — but running it
is **mandatory**: `assertShippable` refuses to export a visual with no review record. Honest scope: the
record is a **checkpoint that a review ran**, not mechanical proof of its substance (unlike Gate 2b, whose
trigger is upstream provenance data) — a self-attested record from the host that wrote the spec can
rubber-stamp its own error. What makes it real is **independence**, below.

Why it exists: the spine gates catch mechanical faults (an invalid spec), but the most damaging faults
are editorial and need the article as ground truth — a title that misstates the metric, a fabricated
source, a misleading encoding. In the test campaign these shipped from otherwise-clean runs.

## Independence (the point)
Review with a FRESH pair of eyes, not the reasoning that produced the spec — a self-review by the
author rubber-stamps its own error (the false "cinq fois plus de jeunes au chômage" title looked fine
to the host that wrote it). **Never spawn an Agent/Task sub-agent to get that fresh pair of eyes** —
during a live journalist-facing atelier run this is a hard rule: atelier ONLY sequences, gates, and
invokes producer scripts/sub-skills; a stray Agent/Task call leaks internal plumbing (an agentId) into
the journalist-facing conversation. Always review **adversarially** yourself instead: actively try to
FALSIFY the visual against each criterion, default to flagging — but be honest that this single-agent
review does NOT deliver true independence and carries residual rubber-stamp risk; it is a known,
accepted limitation, not a reason to spawn a background agent mid-flow.

## Criteria — flag a concern for each that fails
1. **Title honesty.** The title states exactly what the data shows. A RATE title must not assert a COUNT
   or VOLUME ("cinq fois plus de jeunes au chômage" over a rate, "deux fois plus d'emballages" over a %
   are both false). The insight must be literally true of the data. It must ALSO match the takeaway the
   journalist confirmed at CADRAGE (Gate 1, Q2) — not a narrower or different claim: a specific multiplier
   ("2x") standing in for a confirmed "widening gap" insight, or a scope word ("Nordic countries") that
   excludes an entity the visual actually shows (e.g. an Alpine country on the same map), are both false
   even if each number is individually correct. If the data supports more than the title states, widen
   the title rather than shipping the narrower claim.
2. **Source traceability.** The displayed source is supported by the article/data, and is COMPLETE — a
   NAMED dataset/publication (e.g. "Eurostat") MUST carry both its label AND a real, verifiable URL; a
   bare name with no URL is incomplete and must be flagged even when the name itself is genuine. An
   attribution the article never gave — a dataset name and/or URL invented for unattributed figures — is
   a **fabrication**; flag it hard. Prose figures → "Chiffres tels que rapportés dans cet article" (or the
   outlet the journalist names) is the one legitimate name-only case (it cites no separate dataset), never
   a fabricated dataset. If the source is missing, incomplete, or unclear, it must be corrected by asking
   the journalist directly — as ONE free-text prompt collecting the label and URL together, never a
   single-select (a URL cannot be one of a few fixed menu options) — before shipping.
3. **Honest encoding.** No two differently-denominated series sharing one axis; a majority/threshold that
   carries the story is drawn (a 50% line for a yes/no); a two-point change is a slope/dumbbell, not a
   line; a ranking is a bar, not a map.
4. **Earns its place.** The visual shows more than the sentence already says. A two-value "chart" that
   reads as a sentence → recommend no-chart (or a callout), not a chart.
5. **Legibility & a11y.** Readable at a glance at the target size; value labels clear 4.5:1; furniture
   (title, source, unit/legend) present, in the article's language, numbers localized (FR "1 900", "19,3").
   For a chart-scrolly, this includes the caption wording itself — ordinals ("2e" not "2nd") and
   connective phrases ("en tête", "Le plus bas"), not just numbers (`chart-native/src/chart-story.ts`
   branches on `spec.lang`, same convention as `core/locale.ts`).
6. **Fidelity.** The emphasis the journalist accepted (a highlighted region, a labelled outlier) is
   actually in the render.

## Record it (this is what makes export possible)
```bash
bun skills/atelier/scripts/review-gate.mjs exports/<slug>/report.json <id> [concern...]
```
Each trailing arg is one concern; no args = a clean review. Then show the render to the journalist
**together with** these concerns, and proceed to the "ship it" approval (`gate-render.mjs`). The concerns
never hard-block — the journalist is the editor.
