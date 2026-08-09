# Beat — Poland's per-capita emissions have overtaken Germany's

**Type:** small multiples (four line panels). **Medium/genre:** chart / video. **Channel:**
1080×1080, 11s at 30fps.

## Claim

In 2024, Poland emitted 7.1 t of CO₂ per person against Germany's 6.8 t — a gap that did not exist
a decade ago. All four countries shown (Switzerland, France, Germany, Poland) have fallen sharply
from their own 1973-1980 peaks, but Poland's fall has been shallower, so it now sits above Germany.

## Subject and accent

No single subject line — the doctrine's own rule for this type ("same domain, same axis, same
units, on every single panel") governs the geometry: one shared, zero-based y-domain and one
shared 1950-2024 x-domain across all four panels, so the four countries' shapes and their relative
heights both stay honestly comparable. Poland's panel is the one accented event: its line, its
end-dot and its end-label transition from muted grey to the house teal (`#0B7A75`) as their own
distinct motion event (the `subject` window), landing only once every panel — including Poland's
own full curve — is already on screen.

## Source

Global Carbon Budget 2025, via Our World in Data · `co-emissions-per-capita.csv`, Switzerland,
France, Germany, Poland, 1950-2024, extracted 8 August 2026.

## The order (why this is a video, not a static grid)

Panels reveal one at a time, in ascending order of each country's own 2024 value (Switzerland,
France, Germany, Poland) — the reader watches the ranking build toward its own subject, rather than
four lines appearing at once with no hierarchy (`motion-grammar.md`'s "uniform cascade"
anti-pattern). The subject's colour change is a distinct event, separated in time from the reveal
that draws it; the conclusion sentence appears only once that colour change has started landing.

## What went wrong, caught by looking

Rendering the still-only final frame first (`--frame=-1`, before ever touching the mp4) surfaced a
real defect: gridlines and every panel's own country-name label were rendered at the very top edge
of the 1080×1080 frame, clipped almost entirely off-canvas, with only a stray horizontal line and a
sliver of "Germany" visible above the title. Root cause: the panel objects built in the render
function only carried `plot`/`points`/`zeroY` from the pure geometry helper — `top`/`left`/`width`/
`height`, which the JSX reads directly for the label baseline and the y-tick position formula, were
never attached to the same object. `p.top - 8` evaluated as `undefined - 8` (`NaN`), which the
renderer silently clamped to `0` — no type error, no crash, just every panel's furniture landing at
the frame's own top edge. Confirmed by scanning the rendered PNG's own top rows for ink (present
from row 0) before touching the code, fixed by attaching the origin and panel dimensions to the
object explicitly, then re-rendered and re-looked before moving on to the mp4.

## What extracting frames from the finished mp4 confirmed

Frame 10: title fading in, nothing else yet (matches `establish`). Frame 100: title settled, all
four panels' shared axis/gridlines/labels present, only Switzerland's line partially drawn — the
sequential, one-panel-at-a-time reveal, not a simultaneous cascade. Frame 230: Poland's line is
most of the way drawn and still grey — the subject event has not started. Frame 250: Poland's line
and end-label are now teal, mid-transition — the subject landing as its own event, after its own
evidence (the full curve) was already visible. Frame 265: the conclusion sentence is fading in,
faint. Frame 329, the true last frame (0-indexed, `durationInFrames - 1`, not the deliberately-empty
first frame): matches the standalone `--frame=-1` still exactly — the hold frame a viewer actually
reads.
