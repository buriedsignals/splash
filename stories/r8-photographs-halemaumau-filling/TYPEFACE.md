---
family: "Helvetica, Arial, sans-serif"
origin: default
---

# The typeface this story draws in

Recorded from the journalist's own answer, from no measurement — this is what resvg, Chrome and Canvas fall back to on their own.

Space Grotesk is not installed on the machine that renders and useTypeface refuses a face it cannot resolve; Courier New resolves but is a monospaced typewriter face, wrong for a photo caption and a credit line. The stated fallback is recorded as the answer, with the gap named. This format does not read this file at all — image-beat/scripts/render-still.mjs:29 holds FONT_FAMILY as a const and carries no useTypeface, no readTypeface and no familyResolves — so the record is written for the next format to read and the beats hand-over says the render did not reach it.

`NEWSROOM.md` records `typefaces: "Space Grotesk, Courier New"`. Every one of them was measured here before anything was written: a family that does not resolve is refused rather than swapped, because resvg renders the fallback and reports nothing, as do Chrome and Canvas.

`origin: default` is the honest word. Nobody chose this stack — it is the substrate's own, and recording it as a value rather than leaving it as a literal in the renderer is what makes the gap visible: until the recorded face is on the machine that renders, these beats are not set in it.
