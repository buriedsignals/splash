# A directed type beat is choreographed, not replayed

A directed scrolly beat (`proof/scrolly-<type>-…`) tells the same subject as its static sibling, from the
same frozen data and the same asserted claim. It is **not** that plate with cards laid over it and its
marks switched on one at a time. The static plate is the floor — data, claim, words, colour rules, the
family's own treatments — never the ceiling.

The owner's words, on the first calendar heatmap built the other way (2026-09-13): the page "fait
presque rien apparaître alors qu'il y a plein de façons d'animer … ça ne s'arrête pas à juste
reproduire un static, c'est le même sujet rendu sur des formats différents".

## The rule

1. **Write the choreography before the code**, card by card, in the beat's `BRIEF.md`: what the card
   says, which gesture the picture makes, and what the reader sees move.
2. **Every card changes the picture.** `renderScrolly` refuses a card whose state equals the one before
   it (`assets/reveal.mjs`, `assertStates`). A sentence that needs no gesture of its own belongs in the
   card before it.
3. **Motion follows position.** Every gesture is interpolated from the scaffold's continuous
   `data-progress`, so it is scrubbed by the reader's own scroll, both directions, and snaps under
   reduced motion. Nothing plays on a timer.
4. **A derived mark is allowed, and it is asserted.** A count, a monthly mean, a rank, a difference —
   computed from the frozen file in the runner, and refused there when the data stops supporting the
   sentence that names it, exactly like the static plate's own claims.
5. **The reader without a script gets the complete plate.** The component renders the last card's
   state; the driver sets the first card's state on load.

## The repertoire

Pick what serves the claim; a beat rarely needs more than four.

| gesture | what the reader sees | reach for it when |
| --- | --- | --- |
| **Reveal in order** | data appear one by one in their natural order — days, years, ranks | the order is itself meaningful (time, rank) |
| **Filter** | the subset the claim is about keeps its ink, the rest steps back to a neutral | the claim is about some of the data, not all |
| **Zoom / focus** | a region grows to fill the frame and prints values the overview cannot; then pulls back | the decisive detail is too small at the overview's scale |
| **Reorder / re-sort** | the same marks move into the order that answers the question | the default order hides the answer |
| **Rescale** | an axis travels to a new domain, marks glide with it | one scale cannot show both the shape and the event |
| **Count up** | a figure climbs as the marks it counts appear | the claim is a number the picture accumulates |
| **Compare** | two parts are set side by side or summarised next to each other | the claim is "this, not that" |
| **Trace** | a line, outline or path draws itself in the order of its data | a run, a route or a streak is the subject |
| **Name** | a case is ringed and labelled at the moment the card names it | a single datum carries the sentence |
| **Pull back** | the frame returns to the whole with what the reader learned still marked | the last card restates the claim on the full picture |

## Precision still applies

Every gesture lands on a composition measured in the reader's own pixels: labels seated after the frame
is laid out, no text rotated or cut, a zoom that prints values only where a cell can hold them, and the
same verifier (`scripts/verify-scrolly.mjs`) on every direction at every width.
