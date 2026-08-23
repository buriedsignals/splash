---
ground: "#16191B"
accent: "#D4A853"
origin: newsroom
---

# Colours for this story

`proposePalette({ newsroom, subject: "measles cases reported in the WHO European Region", format:
"video", surface: "screen" })` was run. `matchConvention` returned **`null`** — no subject
convention exists for disease surveillance, and the proposal said so out loud rather than reaching
for a plausible epidemiological red. The newsroom's own colours therefore led, and **option 1, the
one it recommended**, is what was chosen.

- Ground `#16191B` — `NEWSROOM.md`, Buried Signals's own. A video delivery lands on a screen, so
  `resolveSurface("screen")` keeps the newsroom's own ground rather than swapping to paper white.
- Accent `#D4A853` — `NEWSROOM.md`'s `brandColor`. Measured **8.01:1** against the ground, well
  above the 3:1 non-text floor.

**One accent, and that is the whole design.** This beat draws one series. The accent is spent on
exactly one thing — the 2024 mark that crosses the reference — and everything else on the frame
(the series before 2024, the reference rule, the axis, the type) is drawn in ink derived from the
ground by `deriveFurniture`. The second house accent `#5B8A8A` is recorded in `NEWSROOM.md` and is
deliberately **not** used here: a second colour with nothing to distinguish would read as a second
category, and there is only one.

`origin: newsroom` because the newsroom's own colours are what was chosen.
