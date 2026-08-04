# A route scrolly, produced and scrolled — rendered proof

2026-08-04. `route` was the ONE arc-capable map type with no browser scrolly: the walk existed
(`resolveRouteWalk` gives territory + camera + confirmed text per step) and had no renderer, so a
journalist with a trajectory could produce a video of it but never a page a reader scrolls.
`MAP_SCROLLY_TYPES` refused it by name, and rightly — without a branch, Scrolly.tsx's final `else`
would have drawn a trajectory as a choropleth.

Produced from this repo's own route sample through the REAL producer
(`bun scripts/produce.mjs <config> <outDir>`) — including the reduced-motion guard it has to
clear — then scrolled in a real browser.

| | |
|---|---|
| `step-india.png` | the river drawn to the Indian stretch, **India filled** as the active territory, the journalist's beat in the prose card |
| `step-bangladesh.png` | the walk has advanced — **Bangladesh framed and filled**, the river drawn to the delta, its own beat |

## Two things this proof caught that no unit test did

**The prop is a beat REF, not a step index.** Scrolly.tsx passes `currentBeatRef`; read as an
index, the overview (`ref -1`) collapsed onto the first territory and the camera never moved.

**A draw step must frame the territory it enters, not the cumulative drawn extent** (which is what
the video family uses). On this very sample the two coincide — India spans nearly the whole route —
and the reduced-motion guard refused the build by name: *"step 2's camera equals step 1's — no
real transition"*. That refusal is about the reader, not about the test: in a scroll the reader
sets the pace, and a step whose camera does not move reads as a page that failed to respond.

Regenerate:

    cd skills/scrolly && bun scripts/produce.mjs <route-config>.json <outDir>

Not wired into `bun run check` — a live MapTiler-backed build plus a browser pass.
