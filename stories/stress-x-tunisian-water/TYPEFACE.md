---
family: "Helvetica, Arial, sans-serif"
origin: default
---

# The typeface this story draws in

Recorded from the journalist's own answer, from no measurement — this is what resvg, Chrome and Canvas fall back to on their own.

The story is in Arabic, and this answer was taken by looking at the glyphs, not by reading the
proposal. `Geeza Pro` is on this machine and `familyResolves` reports it as resolving — its Latin
probe string draws different ink there than in a family that exists nowhere — but rendered with
this story's own strings it draws the ASCII colon and `2025` as EMPTY BOXES: resvg does not fall
back glyph by glyph inside a family it did find. The recorded stack has the opposite behaviour and
it is the one this beat needs: Helvetica draws the Latin digits, and the Arabic falls through to
resvg's own system fallback, joined and in right-to-left order. Both were rendered and looked at
before this file was written.

`NEWSROOM.md` records `typefaces: "Space Grotesk, Courier New"`. Every one of them was measured here before anything was written: a family that does not resolve is refused rather than swapped, because resvg renders the fallback and reports nothing, as do Chrome and Canvas.

`origin: default` is the honest word. Nobody chose this stack — it is the substrate's own, and recording it as a value rather than leaving it as a literal in the renderer is what makes the gap visible: until the recorded face is on the machine that renders, these beats are not set in it.
