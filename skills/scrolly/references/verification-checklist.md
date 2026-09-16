# Verification checklist — measure, do not eyeball

`bun skills/scrolly/scripts/verify-scrolly.mjs <file.html>` drives a real browser through a
CONTINUOUS scroll (never a series of jumps — see the gotcha in `SKILL.md`) at all three widths and
checks every item below. Screenshot each step too and LOOK at it: driving the seed is what found the
inert sticky offset, a tick label clipped by the frame's own left edge, and a dashed rule striking
through the words of the label that names it — none of which any test noticed.

- the active frame settles at a clean `opacity: 1` (every other frame `0`) — never a blend;
- **THE ELEMENT EVOLVES BETWEEN BOUNDARIES.** Read `data-progress` off the root on every frame: it
  must change on the frames where the active step does not. A visual that only reads the step class
  can only ever catch up at the handover, which reads as a slideshow with a fade;
- **EVERY CARD MOVES.** Its top must change on every scroll-advancing animation frame, and it must
  enter the frame at the bottom edge and leave past the top. A guard that only asks which step is
  showing stays green on a page whose words have stopped — that is exactly what shipped once, and
  the owner is who found it;
- **the card is CENTRED on the graphic and OVER it** — its horizontal centre is the graphic's own at
  every frame, its box lies inside the graphic's, and it reaches the graphic's vertical middle at
  some point. A card that drifts to a side is a column in disguise;
- **the card is ONE OF TWO WIDTHS** — at most 70% of the frame, or the whole of it. The shape between
  them puts a vertical edge where a frame keeps its axis furniture;
- the graphic fills the frame and its box is IDENTICAL at every recorded frame;
- the document itself has no scroll distance, and the card layer has all of it;
- the card's own computed background and colour, read live: fully opaque, one colour for the whole
  pass, and at least 4.5:1 between them;
- JavaScript disabled: the default frame and EVERY step's prose survive;
- `prefers-reduced-motion: reduce`: every sampled opacity is exactly 0 or 1;
- ~375px: nothing clips, the page never scrolls horizontally.

## Why sampling scroll positions is not verification

Five rounds of this format shipped corrections verified by teleporting to 25 offsets, waiting for
the page to settle, and reading the state — and every number came back perfect: one frame at opacity
1, every other at 0, one panel at a time, all four steps in order, 25 out of 25, at three widths, on
five beats. Driven CONTINUOUSLY instead, fourteen of those fifteen runs never painted at least one
step's frame at all, and the graphic lagged the prose by up to 1,800px of a 3,300px track. The owner
needed three words for it: *le scrolly est buggé pour tous*. A teleport hands an
`IntersectionObserver` every panel in one callback, so a rule that decides from the delta set is
accidentally right exactly under the instrument that checks it. Install a `requestAnimationFrame`
recorder BEFORE touching the scroll position — `scripts/verify-scrolly.mjs` is that, and
`test/scroll-integrity.test.ts` walks it over every scrolly on disk.

Full reasoning and the fixed-graphic / travelling-card / no-band-reserved model this checklist
verifies: `references/scrolly-discipline.md`.
