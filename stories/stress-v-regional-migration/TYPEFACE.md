---
family: "Helvetica, Arial, sans-serif"
origin: default
---

# The typeface this story draws in

Recorded with no journalist present, from no measurement — this is what resvg, Chrome and Canvas fall back to on their own.

No journalist was present. Space Grotesk is recorded in NEWSROOM.md and does not resolve on this machine — resvg would have drawn a fallback silently — and Courier New, which does resolve, is a monospaced face this proposal itself cautions against for a chart whose whole content is numbers. The stated fallback is recorded as a choice, with the gap named.

`NEWSROOM.md` records `typefaces: "Space Grotesk, Courier New"`. Every one of them was measured here before anything was written: a family that does not resolve is refused rather than swapped, because resvg renders the fallback and reports nothing, as do Chrome and Canvas.

`origin: default` is the honest word. Nobody chose this stack — it is the substrate's own, and recording it as a value rather than leaving it as a literal in the renderer is what makes the gap visible: until the recorded face is on the machine that renders, these beats are not set in it.

No journalist was present for this run. The option recorded is the proposal's own measured recommendation, never a face invented for the occasion and never one the measurement refused; a later run can revise this file, which is the reason writing it beats ending the turn with nobody there to resume it.
