# Spec — the 3 deferred render gates (#12 follow-up "D")

> Follow-up to Tier-2 #12, which shipped only the **reduced-motion** slice. The other three render-quality
> gates from the audit's rubrics (VOLET B) were deferred because each carries a design tradeoff that wants an
> editorial call rather than an autonomous ship. This spec captures the recommended approach + the decision
> for each, so the maintainer can green-light the right variant.

## Why these were deferred (not shipped autonomously)
The audit's own framing: chart-type↔intent fit and palette-fit are **`[M+H]`** axes — the mechanical MATCH is
checkable, but the **defensibility** is human. A hard mechanical gate on a semantic-defensible axis risks
**false-blocking a legitimate editorial choice** — the opposite failure mode from the one it fixes, and worse
(it stops a correct visual from shipping). So the recommendation below leans WARN-not-fail wherever a
defensible-but-atypical choice is reachable, hard-fail only on universally-wrong constructs.

---

## D1 — FT-taxonomy intent→type gate

**Goal (audit S1):** encode the FT Visual Vocabulary's relationship taxonomy (change-over-time · ranking ·
magnitude · part-to-whole · distribution · correlation · spatial · flow) → the chart/map types that serve each,
and catch a type that doesn't fit the declared intent.

**Prerequisite:** the suggester must emit (or the pipeline must derive) an **`intent`** field per proposal (the
FT relationship the visual serves). Today `suggest-chart` emits type + "why" but no clean machine `intent`.
This field is the real work; without it the gate has nothing to check against.

**Design — two tiers of strictness (the recommended split):**
- **Hard-fail** ONLY on universally-wrong constructs, no defensibility case exists:
  - pie/donut for a **ranking** intent, or with **>6 slices**, or for anything that isn't part-to-whole;
  - 3D encodings; a bubble whose **radius** (not area) encodes value.
  These are dataviz errors under every FT/Cleveland-McGill reading — safe to hard-fail.
- **Warn (Gate-3a review concern), never hard-fail** on a **defensible-but-atypical** type↔intent pairing
  (e.g. a bar for a distribution, a line for a ranking-over-time). Surface "unusual type for `<intent>` — FT
  suggests `<types>`; confirm this serves the story" as an editorial concern the journalist can accept.

**Decision for the maintainer:**
1. Add the `intent` field to `suggest-chart`'s contract? (yes = enables the gate; the field is the cost.)
2. The hard-fail set above (pie-for-ranking / pie>6 / 3D / radius-bubble) — agree it's universally-wrong-only?
3. Warn vs hard-fail boundary: keep everything else WARN (recommended) or hard-fail a broader set?

**Effort:** medium (the `intent` field + an `allowedTypes(intent)` map + the two-tier check wired into
suggest-chart's deterministic guardrails + produce-time re-check via guardrail-parity).

---

## D2 — Mobile-first invariant

**Goal (audit I6):** at narrow width (360px), no clipped chart/map, hover→fixed-annotation on touch,
in-viewport tooltip at every breakpoint.

**Already exists (partial):** chart-native has `snap-responsive.mjs` + `snap-tooltip-viewport.mjs`
(the Tier-1 P3 label-fit work runs at 360/1100). map-native interactive has `snap-a11y`. So the invariant is
~60% covered for chart-native; the gaps are **map-native interactive + scrolly at 360px** (no dedicated
narrow-width clip/tooltip snap) and a **consolidated named "mobile invariant"** rather than scattered snaps.

**Design (low risk — extends existing):** a `snap-mobile.mjs` (or extend `snap-responsive`) that, at 360px,
asserts for interactive/scrolly on **all** engines: (a) no `<text>`/mark clipped past the frame; (b) tooltip
renders in-viewport (reuse the existing tooltip-viewport check); (c) on an emulated touch device, hover
affordances degrade to a fixed annotation (not a hover-only tooltip). Wire fail-hard into produce for
interactive/scrolly.

**Decision for the maintainer:** worth the effort given chart-native is already ~60% covered? The clear
marginal win is **map-native interactive + scrolly narrow-width coverage** (currently unguarded). Recommend:
ship the map-native/scrolly narrow-width clip+tooltip extension; skip re-consolidating chart-native's existing
snaps (no bug there).

**Effort:** low-medium (mostly extending the existing snap pattern to 2 more engines).

---

## D3 — Object-constancy / meaningful-transition

**Goal (audit I4/V4):** state changes ANIMATE persistent objects (no teleport/hard-cut), no scroll-scrubbing;
video tweens persistent objects between scenes rather than cutting.

**The honest limitation:** true object-constancy (tracking that element *identity* is preserved across a
transition/frames) is **not cleanly mechanizable** — it needs to reason about which object at time T is "the
same" object at T+1. A snap can't judge that without a semantic model. This is why it was deferred.

**Design — a LIGHT mechanical PROXY (the realistic version), not the full property:**
- **scrolly:** assert transitions are animated, not instant hard-cuts — checkable via the existing scrolly
  mechanism (beats drive `easeTo`/tween, not `jumpTo`, except where reduced-motion is active). Partially in
  `checkScrollyConformance` already (bookends/temporal). Extend: flag a beat that swaps state with `jumpTo`
  on the default (non-reduced-motion) path.
- **no scroll-scrubbing:** assert narration advances in discrete triggered beats (scrollama-style), not a
  continuous 1:1 scrub — checkable from the scrolly config (beat count / trigger model).
- **video:** the frame-gating + reveal-staging snaps (`snap-video`) already assert progression; add a check
  that persistent marks don't *disappear+reappear* between adjacent scenes (a proxy for "tween, don't cut").

**Decision for the maintainer:** accept the light proxy (ships a partial, honest check), OR leave
object-constancy as an **editorial-only** axis (a named human sign-off item, like palette-fit) since the full
property is un-mechanizable. Recommend: the light scrolly proxy (jumpTo-on-default-path flag + scrub check)
is cheap and real; the video persistent-mark proxy is more speculative — spec it, ship only if it doesn't
false-fire on legitimate scene changes.

**Effort:** low for the scrolly proxy; medium + false-fire risk for the video proxy.

---

## Summary — recommended dispositions
| Gate | Recommendation |
|---|---|
| D1 FT-taxonomy | Add `intent` field; **hard-fail universally-wrong only** (pie-for-ranking/>6/3D/radius-bubble), **warn** the rest. Needs maintainer OK on the field + the hard-fail set. |
| D2 Mobile invariant | Ship the **map-native interactive + scrolly narrow-width** clip+tooltip extension (the real gap); chart-native already covered. Low risk. |
| D3 Object-constancy | Ship the **light scrolly proxy** (jumpTo-on-default flag + no-scrub); leave full object-constancy **editorial-only**; video persistent-mark proxy = spec, ship only if no false-fire. |

None of these is shipped in this follow-up pass — they await the maintainer's call on the tradeoffs above
(especially D1's warn-vs-fail boundary, which touches the journalist flow).
