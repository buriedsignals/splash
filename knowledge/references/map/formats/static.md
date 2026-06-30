# Static map format

## What it is

A static map is an **image** — a rasterised export (PNG/JPEG/WebP) that renders once and
ships as a pixel grid. There is no runtime, no tile fetching after load, no interactivity.

## What it must NOT contain

- Zoom-in / zoom-out buttons (`+` / `−`)
- Navigation / compass reset controls
- Any element rendered by `.maplibregl-ctrl` that is interactive chrome

The only acceptable non-cartographic element is the **licensing attribution** (© MapTiler,
© OpenStreetMap contributors), which is a legal requirement, not interactive chrome.

## Furniture placement

Title, source line, and legend must sit inside a **safe gutter** — a minimum inset from
every edge (≥ 16 px at 1×, scaled by canvas size). Nothing should be flush to the border.
The title pill keeps at least `G = 16 × scale` px from the left, right, and top edges;
`maxWidth` is set to `width − 2G` so a wrapped title never reaches the frame boundary.
At the export resolution, every text element must remain legible without zoom.
Source: FT Visual Vocabulary (layout hierarchy).

## Why controls are forbidden

Controls imply an interface the viewer cannot use. In a static export they are non-functional
dead weight that misleads the reader into thinking the image is interactive. A clean static
map communicates at a glance; controls introduce visual noise and false affordances.

## Data extent framing

The FULL data extent is always visible — the map fits all data centred, with margin; at extreme
ratios it letterboxes (extra margin on the long axis), it NEVER crops the data. The furniture
(title, legend, source) overlays the surrounding margin, never the data.

`fitToData()` is called on load AND on every resize. It calls `map.setMinZoom(0)` before
`fitBounds` so a stale higher minZoom cannot prevent the new fit at a smaller container, then
re-pins `setMinZoom` to the freshly-computed fit zoom inside `map.once("idle")`. This ensures
the full extent is always visible at any container width, including extreme narrow ratios (360 px).

## Sources (by name)

- **Datawrapper Academy** — static map export guidelines (choropleth and symbol workflows)
- **FT Visual Vocabulary** — framing, labelling, and furniture hierarchy for print/web maps

## Enforcement

- No-controls assertion: `scripts/snap-static.mjs` queries `.maplibregl-ctrl button` after
  every static screenshot and exits non-zero if any button is found.
- Framing safe-area: validated visually via the responsive snaps at 360 / 768 / 1100 / 1600 px.
