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

## What this file does NOT yet cover (reserved for later tasks)

- Bounded free-explore: the map must snap back to its initial bounds when the reader pans/zooms
  too far (prevents the reader getting lost). Implemented by the reset control; best-practice
  rationale TBD in Task 4.
- Responsive recentering: on viewport resize the map must refit to its data bounds so no symbols
  are clipped. Rationale TBD in Task 4.
