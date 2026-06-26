# Interactive web — per-format discipline (cross-cutting ⟂)

> Sources: WCAG 2.1 (1.4.10 Reflow, 2.1.1 Keyboard, 2.3.3 / `prefers-reduced-motion`, 1.4.3
> Contrast) · the responsive + a11y patterns proven in `chart-native` · credited.
> Applies to ANY element embedded as live web (chart OR map). Composes with the element's own
> interaction affordances.

An interactive web embed is not "a static chart you can hover". Its craft is **responsiveness**,
**input access** (mouse AND keyboard), and **restraint** (motion that respects the reader). It ships
as one self-contained artifact the newsroom can drop into a CMS.

## Responsive — the embed must re-lay-out to its container (WCAG 1.4.10 Reflow)

- The embed width is unknown and changes (article column on mobile → full-bleed on desktop). The
  chart must **measure its container and recompute geometry** (ResizeObserver), not scale a fixed
  drawing (CSS `viewBox` zoom makes text grow/shrink — bad in a narrow column).
- **Text keeps its size; the plot re-lays-out.** Labels, title, source stay legible at every width;
  only the data area reflows. (FT-grade behaviour.)
- **Layout, not just scale, must adapt.** On narrow widths: title flows above the plot (not absolute-
  positioned for desktop), the tick count drops to avoid label collisions, long category lists may
  switch orientation. A desktop-tuned absolute layout *breaks* on mobile — verify at ≥3 widths
  (≈360 / 768 / ≥1100).
- **De-duplicate axis labels at high tick counts.** A wide layout can request many ticks; a time
  axis then emits sub-period ticks that format to the same label (2020, 2020, 2020). Collapse
  consecutive equal labels so each appears once.

## Input access — mouse AND keyboard (WCAG 2.1.1 Keyboard)

- Every hover affordance must also be reachable by keyboard. Data points get `tabindex="0"`, a
  `role`, and a per-point `aria-label` (e.g. "2021: 3.4k monthly visits"); the tooltip shows on
  **focus**, not only on `mouseenter`. A tooltip a mouse-user gets but a keyboard-user can't is an
  accessibility failure — and it can only be caught by driving the browser with the keyboard, never
  by a static screenshot.
- Focus must be **visibly indicated** (a ring / highlighted point), and focus order follows reading
  order.
- Tooltips are progressive enhancement: the chart is fully readable with **no** interaction (direct
  labels + the insight title carry the story); hover/focus only *adds* per-point precision.
- **A tooltip anchors on the DATA ELEMENT under the cursor/focus** — the bar, dot, slice, cell, or
  vertex — and shows THAT element's value. The hit-target is the element (or an invisible disc over a
  small one), never the legend. A **legend** hover is a *different* interaction: it brings one series
  forward (dims the others) — it never opens a tooltip and never stands in for per-element inspection.
  (A legend that lists every value in one box is a layout crutch, not interactivity.) This holds for
  every type: a reader inspects a value by pointing AT it.

## Motion (WCAG 2.3.3 — respect `prefers-reduced-motion`)

- An intro reveal is welcome but optional. When `prefers-reduced-motion: reduce` is set, **skip the
  animation** and render the complete chart immediately.
- Trigger the reveal sensibly: on viewport entry (IntersectionObserver) for an article embed, or on
  load — a per-format knob; never loop a chart reveal distractingly.
- The animation must never be the only way to get the information (same rule as video): the settled
  state is the source of truth.

## Accessibility & contrast (inherits global, with web specifics)

- `<svg role="img" aria-label="…">` where the label = the **insight** (not "bar chart").
- Text contrast ≥ 4.5:1 on the background (global rule); decorative gridlines are exempt.
- The source is a real, focusable **link** (name → url) — an embed can be clicked, unlike a PNG.

## Packaging

- Ship **one self-contained file** (inline JS/CSS, no external requests) so it embeds anywhere and
  survives archiving — the owned artifact, no SaaS dependency.
- Verify the live behaviour in a real browser (hover + keyboard focus + ≥3 widths), not by asserting
  the markup is present. A screenshot proves layout; only driving the browser proves interaction.
