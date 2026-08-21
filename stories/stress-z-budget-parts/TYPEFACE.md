---
family: "Helvetica, Arial, sans-serif"
origin: default
---

# The typeface this story draws in

Recorded with no journalist present, from no measurement — this is what resvg, Chrome and Canvas
fall back to on their own.

`NEWSROOM.md` records `typefaces: "Space Grotesk, Courier New"`. Space Grotesk is not installed on
this machine, and a family that does not resolve is refused rather than swapped, because every
renderer here draws the fallback and reports nothing. Courier New does resolve, but it is a
monospaced typewriter face — a virtue in code and a distraction in a chart's own numbers. Offered,
not recommended. That leaves the stated fallback, recorded as a choice with the gap named.

`origin: default` is the honest word: nobody chose this stack.

**This file is not read by the format that ships this story's beat.** `chart-web`'s own
`scripts/render-web.mjs` never calls `readTypeface`, and the delivered page's
`font-family: Helvetica, Arial, sans-serif` is a literal inside `buildCss`. The value recorded here
and the value the reader receives agree by coincidence, not by mechanism. Reported in this run's
maintainer note.
