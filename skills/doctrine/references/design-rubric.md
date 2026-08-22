# The design rubric

The PASS/FAIL criteria a rendered beat is judged against before the journalist is asked to
approve it (G3, per beat). Nothing here is new doctrine: every criterion cites the floor or rule
it restates — `visual-system.md` for colour grammar and label ink, `editorial-standard.md` for
what a layer may be *for*, `palette`'s `references/contrast-floors.md` for why 3:1 is not 4.5:1,
and `chart-beat/scripts/annotation-ink.mjs` for the annotation thresholds. This file exists so a
design review has one checklist to read from and cannot quietly invent a stricter or looser
number than the system already holds.

A review is a human gate: present each criterion's verdict against the actual artifact, then end
the turn. A FAIL is reported with its detect evidence, never argued around.

## 1. Non-text mark contrast — PASS / FAIL

**Rule:** every graphical object that identifies data — line stroke, bar fill, point, highlighted
region — clears **3:1** (WCAG SC 1.4.11) against the background it is drawn on.

**Detect:** measure the mark's ink against the real ground (never an assumed white), using the
same arithmetic as `palette`'s `NON_TEXT_CONTRAST_MIN`. For a mark drawn over another mark, use
`annotation-ink.mjs`'s `marksUnder`/`worstContrast`. FAIL names the measured ratio and where it
was sampled.

## 2. Text contrast — PASS / FAIL

**Rule:** every word clears **4.5:1** (SC 1.4.3) on its real background, relaxed to **3:1** only
at ≥24 px, or ≥18.66 px bold. A label's ink is never inherited from the mark it names — it is
escalated to whichever pole reads against what it sits on (`visual-system.md`, "a mark's colour is
measured again when it becomes a label").

**Detect:** enumerate every text run; measure each against its own background. A value label set
in its bar's fill is FAIL even when the bar itself passes criterion 1 — they are different
criteria on purpose (`palette/references/contrast-floors.md`).

## 3. Zero-baseline honesty — PASS / FAIL

**Rule:** a mark whose LENGTH encodes the value (bar, column, area) includes zero on its scale.
A mark whose SLOPE encodes change (line) may truncate, but shows the reader the span it draws —
the axis carries the extent, and the slope tells the truth about the change
(`chart-beat/references/static-discipline.md`, "zero is a rule about BARS").

**Detect:** read the axis domain off the artifact and ask which instrument the marks are. Truncated
bars are an automatic FAIL; a truncated line whose ticks hide the span is a FAIL.

## 4. Annotation contrast over what it crosses — PASS / FAIL

**Rule:** a dashed rule, leader, bracket or other non-text annotation clears **3:1**
(`NON_TEXT_CONTRAST_FLOOR`) against EVERY mark it lies over; annotation TEXT clears **4.5:1**
(`TEXT_CONTRAST_FLOOR`; large-text relaxation as in criterion 2). When neither ink pole clears,
the annotation is in the wrong PLACE — move it, do not recolour it (`visual-system.md`,
"the rule reaches the ANNOTATION layer").

**Detect:** `assertAnnotationReadsOverMarks` on the delivered SVG, sampling at pixel centres
strictly inside the annotation — never at endpoints, where a connector legitimately meets what it
joins at zero width.

## 5. Single-hue category encoding — PASS / FAIL

**Rule:** the canvas holds ONE semantic accent — the subject the journalist named — with every
comparison series in neutral derived tones. Colour is assigned by role, never by palette
(`visual-system.md`, "colour has a grammar"). Two accented series mean the reader cannot tell
which one the story is about.

**Detect:** collect every non-neutral fill/stroke on the artifact and subtract the derived
furniture set. More than one accent outside a map's own basemap discipline (`geo-discipline.md`)
is FAIL; so is an accent that highlights the statistical maximum when the subject was named as
something else.
