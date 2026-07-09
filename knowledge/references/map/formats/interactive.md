# Interactive Map — best practices

> Sources: NN/g (Nielsen Norman Group) — tooltips and progressive disclosure principles ·
> Datawrapper Academy — interactive maps best practices.

An interactive map lets the reader freely explore the data. It introduces unique idioms that differ
from static and video formats: hover is the primary value-access mechanism, not baked annotations.

## Tooltip XOR labels

**A directly-labelled symbol must not also show a hover popup when the two carry identical information.**
The static label ("London 296$bn") and the popup ("London — 296$bn") are redundant encodings:
the label is always visible, the popup is shown on hover — showing both clutters the map and
confuses what the interaction affords.

Rule: **tooltip XOR labels** — choose one disclosure channel per data point:
- **Static / video** — bake the label directly on the symbol (name + value + unit). No hover popup.
- **Interactive** — omit baked labels; the hover popup delivers name + value + unit. The popup is
  the expected interaction idiom for web maps (NN/g: progressive disclosure; Datawrapper Academy:
  interactive maps). Baked labels in an interactive map compete visually with the popup and signal
  to the reader that hover adds nothing.

Implementation in `SymbolMap.tsx`: the `symbol-labels` layer is added when
`!interactive || staticFallbackLabels`. On the LIVE interactive page `staticFallbackLabels` is
`false`, so the map is hover-only. The hover popup already renders `name + value + unit`; no baked
label is needed.

## The interactive deliverable's static a11y fallback MUST be labeled (the carve-out)

**Tooltip XOR labels governs the LIVE page only. An interactive deliverable also ships a no-JS
`static.html` a11y fallback (an inlined static image) for non-interactive / accessibility consumers —
and that fallback has NO hover.** So while the live map is intentionally hover-only, its static
fallback render MUST carry direct per-symbol labels (name + value + unit), exactly like the
pure-static map — otherwise the fallback ships mute circles that cannot carry the claim without
interaction (render-confirmed: an interactive symbol map whose fallback labeled only one hovered
point left every other symbol unreadable).

Mechanism: the snapshot that captures the fallback appends `?staticLabels=1` to the interactive
build's URL (`scripts/snap-a11y.mjs`); `mount.tsx` reads it (`wantsStaticFallbackLabels`) and passes
`staticFallbackLabels` to `SymbolMap`, which then renders the `symbol-labels` layer even though
`interactive` is `true`. A real reader loading `interactive.html` never sets the flag, so the live
page stays hover-only and is never double-labeled. `checkSymbolConformance` enforces the invariant:
for an `interactive` symbol map, `staticFallbackLabeled` must not be `false`.

Source: WCAG 2.1 SC 1.1.1 / 1.4.1 (information must not depend on a single sensory/interaction
channel — a hover-only value has no non-interactive equivalent); FT/NYT direct-labeling practice
(the static export must be legible on its own).

## Bounded free-explore

**maxBounds + minZoom keep the reader inside the data's story extent — no panning into empty
ocean, no zooming out past the story.**

On `map.once("idle")` after the initial `fitBounds`, compute a 15 % margin around the data bbox
and call `setMaxBounds` + `setMinZoom(map.getZoom())`. The reader can freely explore within the
story extent but cannot escape it.

Sources: NN/g (constrained navigation prevents disorientation in task-focused interfaces);
Datawrapper Academy (interactive maps should constrain the reader to the data extent).

## Data extent framing

The FULL data extent is always visible — the map fits all data centred, with margin; at extreme
ratios it letterboxes (extra margin on the long axis), it NEVER crops the data. The furniture
(title, legend, source) overlays the surrounding margin, never the data.

`minZoom` is the current-size fit zoom (recomputed on every resize) so the reader can never
lose the full extent. `fitToData()` calls `map.setMinZoom(0)` before `fitBounds` to clear any
stale pinned zoom, then re-pins `setMinZoom` to the new fit zoom in `map.once("idle")`.

Sources: Datawrapper Academy (interactive maps best practices); NN/g (constrained navigation).

## Responsive recentering

**On container resize the map recentres and re-fits; the data is always centred and the zoom
adapts to the new frame.**

A `ResizeObserver` on the map container calls `map.resize()` (updates the GL canvas to the new
pixel dimensions), then calls `fitToData()` which recomputes the frame padding from the new size,
resets minZoom to 0, fits, and re-pins minZoom to the new fit zoom. The recentering is instant
(`duration: 0`) and invisible. The observer is disconnected in the cleanup function to avoid leaks.

Sources: NN/g (responsive design — content must adapt to viewport changes);
Datawrapper Academy (embedded maps must refit on resize to avoid cropped or off-centre data).

## Control visibility

Interactive map controls (zoom / reset) render ABOVE the furniture overlays — never occluded by
the title or legend. The `.maplibregl-ctrl-top-right` container is raised to `z-index: 20`,
above the furniture pill (`z-index: 10`). In static/video builds no controls are added to the
top-right area, so this rule is inert and does not change their appearance.

Source: NN/g (control visibility / affordance — interactive controls must always be discoverable
and reachable; occlusion by decorative overlays breaks the core exploration affordance).
