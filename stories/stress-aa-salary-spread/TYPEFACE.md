---
family: "Helvetica, Arial, sans-serif"
origin: default
---

# The typeface this story draws in

Recorded from the journalist's own answer, from no measurement — this is what resvg, Chrome and Canvas fall back to on their own.

Space Grotesk is not on this machine and useTypeface refuses a face it cannot draw; Courier New resolves but sets a chart’s own numbers on a typewriter grid. The stated fallback is recorded as a choice with the gap named.

`NEWSROOM.md` records `typefaces: "Space Grotesk, Courier New"`. Every one of them was measured here before anything was written: a family that does not resolve is refused rather than swapped, because resvg renders the fallback and reports nothing, as do Chrome and Canvas.

`origin: default` is the honest word. Nobody chose this stack — it is the substrate's own, and recording it as a value rather than leaving it as a literal in the renderer is what makes the gap visible: until the recorded face is on the machine that renders, these beats are not set in it.
