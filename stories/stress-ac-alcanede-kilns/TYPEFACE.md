---
family: "Helvetica, Arial, sans-serif"
origin: default
---

# The typeface this story draws in

Recorded with no journalist present, from no measurement — this is what resvg, Chrome and Canvas fall back to on their own.

No journalist was present in this run; the proposal recommended the fallback stack because Space Grotesk does not resolve on this machine and Courier New is a monospaced face carrying its own caution.

`NEWSROOM.md` records `typefaces: "Space Grotesk, Courier New"`. Every one of them was measured here before anything was written: a family that does not resolve is refused rather than swapped, because resvg renders the fallback and reports nothing, as do Chrome and Canvas.

`origin: default` is the honest word. Nobody chose this stack — it is the substrate's own, and recording it as a value rather than leaving it as a literal in the renderer is what makes the gap visible: until the recorded face is on the machine that renders, these beats are not set in it.

No journalist was present for this run. The option recorded is the proposal's own measured recommendation, never a face invented for the occasion and never one the measurement refused; a later run can revise this file, which is the reason writing it beats ending the turn with nobody there to resume it.
