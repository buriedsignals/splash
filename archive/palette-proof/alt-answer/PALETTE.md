---
ground: "#12161C"
accent: "#E4B23C"
origin: journalist
---

A different newsroom's answer, recorded the same way: a dark ground with a warm accent, given
directly as two hex codes — the proposal's "something else" branch. `origin: journalist` says so.

The point of this file is that `render.mjs` is byte-identical between the two renders. Only the
recorded answer differs, and the chart changes completely — furniture included, because
`deriveFurniture` derives ink, muted and grid from whatever ground it is handed.
