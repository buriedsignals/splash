# Workflow end-to-end test — round 6 (the new chart-scrolly + untested producers)

Six briefs chosen to exercise the **chart scrolly** (line / bar / scatter — built this cycle,
never routed to end-to-end before) plus a chart-video ranking, a part-to-whole, and a
sans-rien fetch. Each ran through the real ② routing gates (applied by an agent **not told the
expected producer** — the honest test of whether the system actually selects the new track),
then produce → render-verify. Data levels spread across with-data / article-only / nothing.

## Cases + deliverables

| # | Article / topic | Data level | Routing (gate outcome) | Producer / type | Deliverable |
|---|-----------------|-----------|------------------------|-----------------|-------------|
| 21 | Global fertility halved since 1960 | with data | Gate 3 scrolly + non-geographic | **chart-scrolly LINE** | `/tmp/r6-case21/scrolly.html` |
| 22 | A few countries drive most CO₂ | with data | Gate 3 scrolly + ranked magnitude | **chart-scrolly BAR** | `/tmp/r6-case22/scrolly.html` |
| 23 | Health spend vs longevity | **article-only** (prose) | Gate 3 scrolly + correlation | **chart-scrolly SCATTER** | `/tmp/r6-case23/scrolly.html` |
| 24 | World's most valuable brands 2024 | with data | Gate 4B video (social) → chart-native | **chart-native BAR** (static+interactive verified; video path) | `/tmp/r6-case24/static.png` |
| 25 | Where the EU budget goes | **article-only** (prose) | part-to-whole; pie REJECTED (4 shares too close) → sorted bars | **dw-chart d3-bars** | https://datawrapper.dwcdn.net/uIGLV/1/ |
| 26 | "Is the world becoming more urban?" | **nothing** (bare topic) | named + used real World Bank series → static line | **dw-chart d3-lines** | https://datawrapper.dwcdn.net/1r0EJ/1/ |

**The headline result:** cases 21/22/23 all routed to the chart-scrolly (line/bar/scatter) —
the new track is reachable end-to-end through the real gates, not just in isolation. Case 25
shows the part-to-whole judgment working (a 5-slice pie is at the numeric limit but four
adjacent shares defeat angle-reading → sorted bars). Case 26 is an honest from-nothing
deliverable (named the real indicator SP.URB.TOTL.IN.ZS, used real values, no fabrication).

## Findings (each fixed at the system layer with a guardrail)

- **F13 — the line scrolly head LAGGED the caption by ~one step.** `ScrollyChart` built the
  reveal checkpoints per REVEAL, but `scrollProgress` is normalised over the RENDERED cards
  (title + reveals + takeaway, minus collapsed duplicates) — two different index spaces, so
  the head reached a data point later than that point's caption centred (probe: caption
  "2023 — 2.2" shown while the head was at ~1995). Fix: `Scrolly.tsx` (which owns the
  collapsed-card structure) builds a per-card target array and passes it as `lineCardTargets`;
  the head now lands on the captioned point as its card centres. This was the user's original
  point 3 ("the line must follow the captioned data") — now correct for any card count.
  Guardrail: the chart-scrolly smoke asserts the head does not lag the centred reveal ordinal.

- **F14 — captions repeated the long axis label.** The bar caption read "United States — 14
  Share of global CO₂ (%), 2nd" — clumsy, and a redundant repeat of the axis subtitle. Root
  cause: `fmt()` appended the full `unit`. Fix: captions use a short `valueUnit` ("%" → "14%"),
  fall back to a short `unit`, and omit a long one (the axis carries it). `NativeSpec` gains
  `valueUnit`; the routing doc emits it. Guardrail: `chart-story.test.ts` (caption uses
  valueUnit, never the long label).

- **F15 — routing wired for the chart track + graceful degradation.** The ② doc still called
  chart scrolly "a future slice"; it now documents the track with a HARD line/bar/scatter
  constraint, and `Scrolly.tsx` degrades (clear message, no render crash) for an unsupported
  type. Guardrail: a pie-scrolly fixture in the smoke. (Committed with the routing work.)

- **F16 — a long text-annotation clips at mobile; the dw responsive guardrail REJECTED it.**
  Case 26's annotation ("World crosses 50% urban for the first time, c. 2007", 51 chars)
  clipped and overlapped the "50.0" label at 340 px → the label-safety guardrail refused to
  publish. The guardrail worked ("validated == delivered"); the emission was at fault. Fix
  (emission guidance): the ② Annotations guardrail now caps annotation text at ≈30 chars
  (elaboration goes in the intro). With a terse annotation the chart published clean at all
  widths. Enforcement remains the existing `checkResponsive` gate.

## Minor (noted, non-blocking)

- **Bar interactive tooltip** concatenates value + label without a separator
  ("574 $bn brand valueApple"). Chart-native interactive polish; not a static/scrolly issue.
- Scatter captions from prose drop the unit ("United States — 12500, 76"); the axis titles
  carry x/y meaning. Acceptable, but a short `valueUnit` per axis could read better.

## Coverage after round 6

Chart scrolly (line/bar/scatter) is now tested end-to-end through routing + render, with the
head-tracking and caption defects fixed and guarded. Combined with rounds 2–5, every producer
(dw-chart, chart-native static/interactive/video, all 7 map-native types, map-dw, map scrolly,
chart scrolly) has been exercised across the three data levels.
