---
ground: "#16191B"
accent: "#D4A853"
accents: "#5B8A8A"
origin: newsroom
---

# Colours for this story

`proposePalette({ newsroom, subject, about })` was run with the subject read as *rail punctuality
and passenger volume*. It found **no subject convention** — and said so, which is the honest half —
so the newsroom's own colours led. Recorded here is **option 1, the one it recommended**.

- Ground `#16191B` — `NEWSROOM.md`, Buried Signals's own.
- Accent `#D4A853` — `NEWSROOM.md`'s `brandColor`. Measured **8.01:1** against the ground, well
  above the 3:1 non-text floor. It carries the passengers panel, which is the beat's subject.
- Further accent `#5B8A8A` — `NEWSROOM.md`'s `accents`. Measured **4.58:1** against the ground,
  also above the floor. It carries the punctuality panel.

**Why two accents are recorded, and what the proposal did not do.** This beat draws two series in
two panels, so it needs two colours a reader can tell apart on the same ground. `proposePalette`
offered the second house accent as a COMPETING option — a different ground-and-accent pair to
choose INSTEAD — not as a companion to the first, and its printed question asks which single pair
to use. `PALETTE.md`'s own format carries `accents` and `parsePalette` reads it back and measures
every entry, so the pair is recordable; it is simply not proposable. The second colour was
therefore taken from the same `NEWSROOM.md` line the proposal read it from, and both were measured
against this ground by the same `assertLegible` the render calls.

The two accents are 1.75:1 against EACH OTHER, which no floor in this toolchain measures. They are
never adjacent: each owns its own panel, each panel carries its own named label in its own colour,
and nothing asks the reader to tell one stroke from the other across a shared plot.

`origin: newsroom` because the newsroom's own colours are what was chosen.
