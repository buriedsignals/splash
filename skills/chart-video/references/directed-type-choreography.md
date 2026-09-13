# A directed video beat is choreographed, not replayed

A directed video beat (`proof/video-<type>-…`) tells the same subject as its static sibling, from
the same frozen data and the same asserted claim. It is **not** that plate rendered once and stepped
through on a timer with its marks switched on one at a time. The static plate is the floor — data,
claim, words, colour rules, the family's own treatments — never the ceiling.

The owner's words, on the first beat built the other way (2026-09-13): « ça ne s'arrête pas à juste
reproduire un static, c'est le même sujet rendu sur des formats différents ».

## The rule

1. **Write the choreography before the code**, shot by shot, in the beat's `BRIEF.md`: what the shot
   says, the gesture the picture makes, what the viewer sees move, and which event of the timing
   contract (`establish`, `reference`, `reveal`, `subject`, `conclusion`, `hold` —
   `shared/chart-video/timing.ts`) it belongs to.
2. **Every event changes the picture.** `assertEventStates` (`scripts/choreography.mjs`) refuses an
   event whose computed state equals the one before it. A shot that needs no gesture of its own
   belongs in the event before it, not as a fifth one added to hit a count.
3. **Motion follows the timing contract, not the clock.** Every gesture is interpolated from
   `progressOf(frame, event)`, never from a bare frame number. On a time axis the reveal is linear —
   easing it makes 1994 and 1995 occupy different amounts of screen time, which lies about the pace
   of the data (`doctrine/references/motion-grammar.md`, "The order is chronological, or it is
   argumentative"). Easing is for things that *arrive* — a dot, a label, an opacity, a window closing
   in — never for the traversal of a measured axis. The `hold` event plays no gesture at all: it is
   the frame a viewer actually reads, held long enough to read it.
4. **A derived mark is allowed, and it is asserted.** A count, a cumulative total, a rank, a
   difference — computed from the frozen data in the runner, and refused there when the data stops
   supporting the sentence that names it, exactly like the static plate's own claims.

## The repertoire

Pick what serves the claim; a beat rarely needs more than four.

| gesture | what the viewer sees | reach for it when |
| --- | --- | --- |
| **Reveal in order** | marks appear one by one in their natural order — time, rank, sequence | the order is itself meaningful (time, rank) |
| **Filter** | the subset the claim is about keeps its ink, the rest steps back to a neutral | the claim is about some of the data, not all |
| **Zoom / focus** | a region enlarges to print values the overview cannot, evidence arriving, not energy; then may pull back | the decisive detail is too small at the overview's scale (`motion-grammar.md`'s zoom admission) |
| **Reorder** | the same marks move into the order that answers the question | the default order hides the answer |
| **Rescale** | an axis travels to a new domain, marks glide with it | one scale cannot show both the shape and the event |
| **Count up** | a figure climbs as the marks it counts appear | the claim is a number the picture accumulates |
| **Compare** | two parts are set side by side or summarised next to each other | the claim is "this, not that" |
| **Trace** | a line, outline or path draws itself in the order of its data | a run, a route or a streak is the subject |
| **Name** | a mark is ringed and labelled at the moment its event lands | a single datum carries the sentence |
| **Pull back** | the frame returns to the whole with what the viewer learned still marked | the `conclusion` or `hold` event restates the claim on the full picture |

## Precision still applies

Every gesture lands on a composition measured in the reader's own pixels, at the same standard the
static plate is held to:

- **Layout is measured in Bun**, not guessed in Chrome — `registerOf` for the six resolved registers,
  `measureText` / `measureTextBand` for line breaks, gutters and the mark's drawn size, on the same
  font files the composition embeds.
- **Width agreement is checked in Chrome**: each laid-out line's Bun measurement is compared against
  `SVGTextElement.getComputedTextLength()` at render time, and the render is refused past the agreed
  tolerance.
- **Floors hold**: `assertTypeFloor` measures the rendered type against the video size table
  (`scripts/sizes.mjs`) and refuses a size under its plancher.
- **The safe zone holds in portrait**: nothing a gesture moves may cross the safe band a portrait
  delivery reserves.

A gesture that cannot be measured this precisely is not ready to ship, no matter how well it reads on
the screen it was drafted on.
