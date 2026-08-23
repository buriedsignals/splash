---
family: "Helvetica, Arial, sans-serif"
origin: default
---

# The typeface this story draws in

Recorded from the journalist's own answer, from no measurement — this is what resvg, Chrome and Canvas fall back to on their own.

Space Grotesk is not installed on the machine that renders this beat, and the probe showed it drawing identical ink to a nonsense family — a silent fallback. Courier New is present but monospaced, which is a distraction in a map legend. The web format of a map beat writes Helvetica, Arial, sans-serif into the page it delivers and has no reader for this file, so recording the substrate stack is the only answer that matches what will actually be on screen. Recorded so the gap is visible rather than implied.

`NEWSROOM.md` records `typefaces: "Space Grotesk, Courier New"`. Every one of them was measured here before anything was written: a family that does not resolve is refused rather than swapped, because resvg renders the fallback and reports nothing, as do Chrome and Canvas.

`origin: default` is the honest word. Nobody chose this stack — it is the substrate's own, and recording it as a value rather than leaving it as a literal in the renderer is what makes the gap visible: until the recorded face is on the machine that renders, these beats are not set in it.
