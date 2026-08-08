# A route's last card, and the work its video does for nothing

2026-08-08. Two faults reported on the same track. Both reproduced first, verbatim, before
anything changed.

## 1 — the closing caption was the title again

Reproduced on a **built page**, not on a model: the shipped route sample with its `insight`
removed — which is what every loop-assembled route config looks like, since no assembler writes
that field — produced through the real producer
(`skills/scrolly/scripts/produce.mjs`), then scrolled to the end in a browser.

| | |
|---|---|
| `closing-before-the-title-again.png` | header **"The Yarlung Tsangpo's long road to the sea"**, last prose card **the same string, verbatim** |
| `closing-after-the-route-span.png` | last card reads **"3 territories, 2,755 km"** |
| `closing-after-fr-localized.png` | the same page in French: **"3 territoires, 2 755 km"** — localized words, and the French thousands separator |
| `closing-video-last-frame.png` | frame 2 468 of a rendered mp4: the video path closes the same way, **"17 territoires, 22 798 km"** |

`skills/scrolly/src/Scrolly.tsx` passed `insight: config.insight ?? config.title` into
`routeStoryToChapters`, so the engine's own "no insight → derive a closer" branch was
unreachable from the web track.

**The rule chosen, and why it is the family's, not a new one.** Every other map deriver already
refused an insight equal to the title — `map-story.ts`, `symbol-story.ts`, `hex-grid-story.ts`,
`cartogram-story.ts`, `dot-density-story.ts`, `locator-story.ts` each wrote the same expression
out inline. It was correct five times over and **missing on the sixth**. It is now one function,
`closingInsight` (map-story.ts), used by all six: a journalist's line closes the piece only when
it is genuinely a different sentence from the title the persistent header already shows;
otherwise the engine falls through to the data-tied closer it can honestly compute.

**Why route does not "emit nothing" the way the chart track does.** `chart-chapters.ts` drops a
takeaway card with no copy outright, and it is right to: a chart is already fully drawn by its
last reveal, so the dropped card costs the reader nothing. A route's closing step is **also a map
state** — its sentinel `ref` is what tells `RouteScrolly.tsx` and `ScrollyRouteMap.tsx` to frame
the whole trajectory, fully drawn. Drop it and the scroll ends inside the last territory with the
route never finished. And unlike a chart takeaway, a route has something honest left to say that
its reveals did not: how far it went, through how much. So route follows the **map** family (a
data-tied closer, an insight that must be distinct), which is that family's own answer to the
same defect the chart family answers by dropping the card.

## 2 — the video: what was measured, and what was not

**Not reproduced.** The report was `No target found for targetId` → `TypeError`. That string is
Chrome's answer to `Target.activateTarget`, which Remotion issues **per frame** before capturing
it (`@remotion/renderer/dist/screenshot-task.js:12`) — it means the renderer target was already
gone, i.e. the tab died. It is not a code path in this repo.

Nine renders across the whole route configuration space did not kill it:

| case | territories | route points | comp | frames | result |
|---|---|---|---|---|---|
| shipped sample | 3 | 603 | MapScrolly | 705 | mp4, snap-video OK |
| minimal (no insight, no territories) | 3 | 603 | MapScrolly | 705 | mp4, snap-video OK |
| Paris→Marseille (one country) | 1 | 61 | MapScrolly | still | OK |
| Lisbon→Moscow | 11 | 121 | MapScrolly | still | OK |
| dateline crossing | 17 | 81 | MapScrolly | 2 469 | mp4 OK, RSS flat ~590 MB throughout |
| mid-Atlantic (crosses nothing) | 0 | 61 | MapScrolly | still | OK |
| dense trace | 3 | **21 071** | MapScrolly | 401 | OK |
| confirmed arc (own-segment camera branch) | 1 | 61 | MapScrolly | 453 | mp4 OK |
| **max load** — dateline × dense × portrait | 17 | 4 001 | MapScrollyPortrait 1080×1920 | 2 469 | mp4 OK, **323 s**, exit 0 |

A bogus `arcBeats` region — the one route-only failure mode that fires inside
`calculateMetadata` — reports cleanly by name (`resolveRouteWalk` → `route-story.ts:115`), not as
a protocol error. So that is not it either.

**What the comparison the report pointed at does show.** "What does the route composition do that
the locator one does not" has one measurable answer: **RouteScrolly.tsx was the only `*Scrolly`
composition with no per-frame `setData` guard.** Its two siblings say so in their own source —
ChoroplethScrolly.tsx: *"Update source data only when the step's ref beat changes"*;
LocatorScrolly.tsx: *"so we avoid setData on every frame"*. The route called `setData` on `river`,
on `river-head`, and on `trail-<key>` for **every crossed territory, on every frame**, and the
trail payload it shipped was a byte-identical ring set each time. On the dateline case that is
**46 911 source updates where ~1 200 carry information** — each one re-serialized, handed to
MapLibre's worker and re-tiled, on the map type whose payloads are the largest.

Fixed in `route-frame-updates.ts` (a per-map cache of what has actually been shipped, compared on
the exact value, no quantization). Measured A/B on the dateline case, same machine, sequential:

| | wall | CPU (user) |
|---|---|---|
| before | 303.20 s | 169.96 s |
| after | **281.70 s** | **108.87 s** — **−36 %** |

And the output is unchanged: frames 0, 74, 120, 300, 900, 1500, 2100 and 2468 extracted from both
mp4s are **byte-identical by SHA-256** — the title scene, the overview, a draw ramp, three holds
and the final frame. The guard removes work, not pixels.

This is stated as what it is: the asymmetry the report's own comparison points at, measured and
closed. **The tab death itself was not observed here**, at any load this repo can produce.

## The neighbouring problem, measured — and genuinely a different one

`neighbour-symbol-closes-on-its-description.png`: a symbol scrolly with no insight, produced the
same way, delivers

    Venture funding raised by startups headquartered in each city, 2024      ← opening card
    London — 296$bn, the highest of the 6 shown
    …
    Venture funding raised by startups headquartered in each city, 2024      ← closing card

The closing card repeats the **description**, not the title, and it happens in
`mapStoryToChapters`'s generic fallback (`prose = hasCopy ? b.copy : desc`), not in the route
composer. It affects symbol, hex-grid, cartogram, dot-density and locator — the five map types
that, unlike route (`routeSpan`) and choropleth (`deriveTakeawayCopy`), have **no data-tied closer
of their own to fall through to**. Closing it means writing one per type, on both the web and the
video path: a design task with editorial consequences, not a call-site fix, and out of this
branch's scope. Recorded here with its render so it is a known measurement rather than a
suspicion.

## Regenerate

    # the page
    cd skills/scrolly && bun scripts/produce.mjs <route-config-without-insight>.json <outDir>
    # the video
    cd skills/map-native && bun scripts/produce.mjs <route-config-with-cameraMode-stepped>.json <outDir> video

Neither is wired into `bun run check` — both are live MapTiler-backed builds.
