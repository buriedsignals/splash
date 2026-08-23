---
family: "Helvetica, Arial, sans-serif"
origin: default
---

# The typeface this story draws in

`proposeTypeface` measured both faces `NEWSROOM.md` records before anything was written.
Space Grotesk does not resolve on this machine — the probe produced identical ink in that family and
in a nonsense one, which is what a silent fallback looks like from the outside — so it is refused
rather than quietly swapped. Courier New does resolve, and is offered but not recommended: a
monospaced typewriter face sets every digit on the same grid, which is a virtue in code and a
distraction in a chart whose whole content is numbers.

That leaves the substrate's own stack, recorded as a choice with the gap named. `origin: default` is
the honest word: nobody chose this, it is what Chrome falls back to on its own.

**A limit of that measurement, for this format specifically.** The face this page is drawn in
resolves in the READER's browser, not on the machine that rendered the HTML. The measurement above
is about this machine. It is the right answer here for the wrong reason: the page ships no embedded
font file, so a reader without Space Grotesk installed would see the fallback whatever this machine
holds. It would be the wrong answer for a page that embedded the face.
