---
family: "Helvetica, Arial, sans-serif"
origin: default
---

# The typeface this story draws in

Recorded with no journalist present, from no measurement — this is what resvg, Chrome and Canvas
fall back to on their own. `proposeTypeface` measured both recorded faces against this story's own
strings (the six continent names, the grouped numerals, the credit line) and recommended this one.

`NEWSROOM.md` records `typefaces: "Space Grotesk, Courier New"`. Space Grotesk is not installed on
this machine, and a family that does not resolve is refused rather than swapped, because resvg
draws the fallback and reports nothing. Courier New does resolve here, but it is a monospaced
typewriter face — a virtue in code and a distraction in a chart whose numbers run to seven digits.
Offered, not recommended. That leaves the stated fallback, recorded as a choice with the gap named.

`origin: default` is the honest word: nobody chose this stack.
