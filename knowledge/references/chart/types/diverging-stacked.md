---
id: diverging-stacked
engines:
  chart-native: diverging-stacked
intent: [deviation]
shape: wide
formats: [static, interactive, video]
bestFor:
  - "ordered categorical responses (agreement, satisfaction, frequency) across several items, to compare the balance of sentiment item to item"
notFor:
  - "unordered categories — there is no left/right meaning; use a plain stacked bar"
  - "a single item — one stacked bar is enough"
  - "exact value reading of the middle categories — only the bars' ends align across rows; use grouped bars if exact middles matter"
---

# Diverging stacked bar / Likert — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "deviation" diverging stacked bar · data-to-viz.com ·
> survey-viz convention (Robbins/Heiberger, the Likert centre). credited.
> Inherits: `global/dataviz.md` (L0). A centred, ordered-categorical stacked layout.

A diverging stacked bar plots an **ordered** set of responses per item, split at a CENTRE so the
negative categories extend left and the positive extend right (a neutral straddles 0). It is the
standard chart for **Likert / survey sentiment** — it reads **net balance and composition at once**:
how much of each item leans agree vs disagree.

## When to use / when NOT — read the caveats first

- **Use** for: ordered categorical responses (agreement, satisfaction, frequency) across several items
  — compare the BALANCE of sentiment, item to item.
- **Not** for: unordered categories — there's no left/right meaning; use a plain stacked bar.
- **Not** for: a single item — one stacked bar is enough.
- **Not** for: exact value reading of the middle categories — only the bars' ENDS align across rows;
  inner segments float, so they're hard to compare (use grouped bars if exact middles matter).

## Correctness "de base" (diverging-stacked-specific)

1. **A meaningful centre at 0** — negatives left, positives right; a neutral category straddles it
   (half each side). State where the centre sits. → `checkDivergingStackedConformance`.
2. **Responses sum to 100%** per item (a real composition).
3. **Ordered diverging colours** — warm (vermillion→orange) for negative, neutral grey, cool
   (skyblue→blue) for positive; all CVD-safe (Okabe-Ito). A legend in response order.
4. **Label every item**; consider sorting rows by net-positive so the gradient of balance reads.

## data-to-viz / survey-viz caveats (credited)

- The CENTRE choice changes the story: putting all of "neutral" on one side, or splitting it, shifts
  every bar. Split the neutral at 0 and say so. Inner segments don't share a baseline across rows —
  only the ends do — so don't ask readers to compare middle widths precisely.

## Motion grammar (how it *builds*)

See `formats/video.md`; the gesture:

- the centre line + percent axis wipe in first (chrome);
- each bar **grows from the centre outward** — left segments extend left, right segments extend right,
  the neutral splits both ways, eased, staggered by item; the legend fades in with the chrome.
A segment grows from the centre, never from an edge, so frame N is a pure function of the frame.
