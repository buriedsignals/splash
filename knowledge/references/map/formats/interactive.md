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

Implementation in `SymbolMap.tsx`: the `symbol-labels` layer is added only when `interactive` is
`false`. The hover popup already renders `name + value + unit`; no baked label is needed.

## Bounded free-explore

**maxBounds + minZoom keep the reader inside the data's story extent — no panning into empty
ocean, no zooming out past the story.**

On `map.once("idle")` after the initial `fitBounds`, compute a 15 % margin around the data bbox
and call `setMaxBounds` + `setMinZoom(map.getZoom())`. The reader can freely explore within the
story extent but cannot escape it.

Sources: NN/g (constrained navigation prevents disorientation in task-focused interfaces);
Datawrapper Academy (interactive maps should constrain the reader to the data extent).

## Responsive recentering

**On container resize the map recentres and re-fits; the data is always centred and the zoom
adapts to the new frame.**

A `ResizeObserver` on the map container calls `map.resize()` (updates the GL canvas to the new
pixel dimensions), then recomputes the frame padding from the new size and calls `fitBounds` with
`duration: 0` so the recentering is instant and invisible. The observer is disconnected in the
cleanup function to avoid leaks.

Sources: NN/g (responsive design — content must adapt to viewport changes);
Datawrapper Academy (embedded maps must refit on resize to avoid cropped or off-centre data).
