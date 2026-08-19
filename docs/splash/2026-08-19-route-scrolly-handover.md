---
title: splash-test-b-route-access — what is wrong with it, and the three changes that close it
status: handover
opened: 2026-08-19
subject: https://bde64c64.splash-test-b-route-access-5317ff78590141b98ecb.pages.dev/
---

# The five-stop route scrolly, taken apart

Measured on the delivered file, at 1600x900, 1280x800 and 375x812. Every number below is read off
the running page, not inferred. **27 failures, three classes.** Run them yourself:

```sh
bun skills/scrolly/scripts/verify-scrolly.mjs <your-file>.html
```

The vehicle is healthy: the active step hands over exactly once per boundary, the frames arrive in
order and settle, the card travels centred and opaque, and `data-progress` runs a clean 0 → 4. The
cargo is not.

## 1. The visual is built five times and only one copy is ever driven

The page carries **five `.step-frame`s, each with its own complete copy of the visual** — 84
occurrences of `data-visual="test-b-route"`, and the same 340 KiB basemap plate inlined five times.
The beat's own boot script then binds one of them:

```js
const frame = document.querySelector('[data-visual="test-b-route"]');   // singular
const route = [frame.querySelector('[data-part="route-halo"]'), …];
```

`querySelector` returns the FIRST copy. That copy is the one the scaffold paints at step 1 and hides
from step 2 onward, so the animated visual is invisible for four steps out of five, and the four
copies the reader actually sees are frozen at their build-time state: `stroke-dashoffset` at full
length (route hidden), stops 2–5 at `opacity 0.28`.

Measured consequence: the graphic repaints **4.4% / 0.0% / 0.0% / 0.0%** of its marks across the four
transitions, at all three widths. A reader who scrolls five stops meets one identical picture.

**The rule.** The scaffold emits one frame per step, so a beat works one of two ways and never both:

- **N pictures** — each step's frame carries its own SSR'd drawing, differing by camera, state or
  what is revealed. Nothing runs at read time.
- **ONE picture, detached** — the visual and its script ride step 1's frame (the one the scaffold
  marks `active` at build time, so a reader without JavaScript still meets the opening state), and
  the script lifts the node OUT of the frame stack on boot, where the step swap can never fade it.
  It then scrubs itself off `data-progress`.

This beat wants the second. Two worked examples to read, both driven and both green:
`proof/mapmore-scrolly-danube/render.mjs` (a route, same shape as yours) and
`proof/scrolly-one-chart-swiss-life-expectancy/render.mjs`.

Fixing this closes the duplicated plate at the same time: 1.33 MB of a 1.80 MB page, gone.

## 2. The plate and the marks describe two different places

The stylesheet declares the plate `contain` five times, once per frame, and then overrides it:

```css
[data-visual="test-b-route"] [data-part="plate"]{object-fit:cover!important}
```

while the SVG carrying the stops keeps `viewBox="0 0 1400 700"` with
`preserveAspectRatio="xMidYMid meet"`.

`cover` crops, `meet` letterboxes. At 375x812 the plate shows the middle third of its width while the
marks are laid out across a 375x188 band: **Lisbon is drawn over Switzerland**, at a scale that makes
every stop a 4px smear. It is wrong at every width; the phone is where it becomes unreadable.

**The rule.** A raster plate and the overlay drawn on it pair `cover` with `slice`, `contain` with
`meet`, `fill` with `none`. The alignment half of `preserveAspectRatio` stays your composition.
Either drop the `!important` (your own five declarations already say `contain`) or move the overlay
to `xMidYMid slice`.

## 3. What the guards now refuse, so this cannot ship again

`verify-scrolly.mjs` gained four cargo checks. Three of them fire on this file:

| check | what it refuses | on this file |
| --- | --- | --- |
| step redraw | two consecutive steps painting the same picture, measured as the share of painted marks that differ (fingerprint of box, opacity, fill, stroke, transform, clip, path data, text) | 9 failures |
| projection | a plate and its overlay that fit differently | 15 failures |
| duplicate payload | an asset inlined more than once | 3 failures |
| screen-space dash | a dash that MEASURES its own path alongside `vector-effect: non-scaling-stroke` | clean — your route already declares `pathLength=1` without it |

The fourth is worth reading anyway: it is the defect that took this tree six hours and five wrong
diagnoses on its own route beat, and the account is in
`skills/scrolly/references/scrolly-discipline.md`, "A reveal is measured in the path's own units".

## What is NOT wrong here

Worth saying, because it looks wrong and is not: **36% of the route is drawn before the reader
scrolls at all**. `data-progress` runs 0 → N-1, so step 1's authored state is reached at progress 0 —
the last step would otherwise be a point with no travel. Showing the first stretch under the first
sentence is the vehicle's model, not a defect of this beat.
