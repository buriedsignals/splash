---
ground: "#16191B"
accent: "#1B7F4B"
origin: subject
---

The subject is solar generation across European countries in 2024. `palette`'s subject-convention
check fires: `references/subject-conventions.md`'s `renewables` entry (`#1B7F4B`, green for
renewable generation) matches on "solar" in the subject phrase and wins over the house accent —
a reader who has seen one electricity-mix chart has seen this green before.

Ground stays the newsroom's own (`NEWSROOM.md`, `ground: "#16191B"`) — the convention supplies the
accent only, never the ground.

Measured with `contrast` (`shared/chart-beat/render-still.mjs`): `#1B7F4B` against `#16191B` is
3.52:1, clearing the 3:1 non-text floor for a mark colour.
