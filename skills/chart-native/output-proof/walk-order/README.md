# A bar video enters in the journalist's order — rendered proof

Sub-project ④, chart track, 2026-08-04. Two REAL produce runs of the same sample
(`assets/sample-data/bars.json`), same frame (t = 1.5 s, mid-build), differing only by a
confirmed `beats` walk.

The walk runs **against reading order**: `Westpark → Eastgate → Central`, while the data's own
order is `Central, Riverside, Hilltop, Eastgate, Westpark` and `Central` is by far the largest
bar. That inversion is the only shape that tells "the journalist's order was honoured" apart from
"the default order happens to look right".

| | what the frame shows |
|---|---|
| `without-walk.png` | **Central** is in — the first row, the largest bar. Reading order. |
| `with-walk.png` | **Westpark** is in — the LAST row, the smallest bar, and beat 1 of the walk. |

Before this, a bar video ignored a walk the journalist had written and validated: the plan reached
the config and changed nothing on screen.

⚠️ The review still (frame 140) is NOT a usable instrument here — it lands after the stagger
window, with every bar already full. Extract a frame from the mp4 during the build instead.

Regenerate:

    bun scripts/produce.mjs bar <config-with-beats>.json <outDir> video

Not wired into `bun run check` — two real Remotion renders.
