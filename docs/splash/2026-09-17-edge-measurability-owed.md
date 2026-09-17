# Edge measurability owed — the artifacts whose marks cannot be probed at their own edges

Measured 2026-09-17 by `skills/splash/test/interaction-promises-are-kept.test.ts`, driving all 241
delivered pages under `proof/` in a real browser.

An artifact is EDGE-MEASURABLE when a probed mark's own drawn shape can be found in the page — a
`[data-key]` inside the `<svg>` that pairs with the hit element carrying the reading. Only then can
the guard ask its assertion 4b: does the mark answer four pixels inside its own edges, or only at
the small target sitting at its centre? Where no drawn mark can be found, that assertion has an
empty array to iterate and passes by having nothing to look at.

**97 mark-carrying artifacts have no edge-measurable mark.** That number is pinned in the test as
`EDGE_UNMEASURABLE_ARTIFACTS`; it moves only when one of the two items below is closed, or when a
new format arrives unmeasurable — in which case the pin fails and somebody has to say which.

| family | artifacts | why | what closes it |
| --- | --- | --- | --- |
| chart × web, 32 beats × 3 directions | 96 | the renderer emits no `data-key` on a drawn mark; the hit element is a transparent full-height `<rect class="bin-hit">` | `chart-web` keying its drawn marks |
| `proof/co2-suisse/co2.html` | 1 | the same renderer, the legacy single page | as above |

`proof/web-heatmap-europe-electricity` is the one chart × web beat whose cells ARE keyed
(`data-key="ALB:hydro_generation__twh"`), and its three pages are edge-measured today — proof that
closing this is a renderer change, not a rewrite of the guard.

## Not in the number, and why

**map × web, 7 beats × 3 directions.** These pages carry no interactive DOM mark at all: their
`data-detail` attributes sit on the rows of the `<details class="mw-readings">` accessible readings
table, and the map's own marks are MapLibre features. They report zero marks, so they are skipped
by this guard exactly as a scrolly is, and the number above is not inflated by them. Their
interaction is guarded only by `skills/map-web/test/live-map.test.ts` and the rest of the `.live`
lane, which need a MapTiler key. Closing that gap is ruling R1's `queryRenderedFeatures` rewrite:
until a map beat's marks can be addressed from the DOM, no keyless guard can drive them.

**scrolly, 40 beats × 3 directions.** No `data-detail` marks and no `#tooltip`: they make no
per-mark promise, and their scroll vehicle is outside this guard's scope by its own blind spot 5.
