---
family: "Helvetica, Arial, sans-serif"
origin: default
---

# The typeface this story draws in

Recorded from the journalist's own answer, from no measurement — this is what resvg, Chrome and Canvas fall back to on their own.

Space Grotesk is not installed on the machine that renders this beat, and the proposal measured the silent fallback rather than assuming it. Courier New resolves but sets every digit on one grid, which is wrong for a chart whose whole argument is two counts read against each other. The stack is recorded as a choice so the beat can say its type was not decided by anybody, rather than carrying a literal nobody sees.

`NEWSROOM.md` records `typefaces: "Space Grotesk, Courier New"`. Every one of them was measured here before anything was written: a family that does not resolve is refused rather than swapped, because resvg renders the fallback and reports nothing, as do Chrome and Canvas.

`origin: default` is the honest word. Nobody chose this stack — it is the substrate's own, and recording it as a value rather than leaving it as a literal in the renderer is what makes the gap visible: until the recorded face is on the machine that renders, these beats are not set in it.
