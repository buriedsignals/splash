# Map-web discipline

The rules this genre is written under. `twin-doctrine`'s cross-cutting references
(`editorial-standard.md`, `information-architecture.md`, `visual-system.md`) apply unchanged, and
`geo-discipline.md` — the map craft's own twelve rules — applies unchanged too: this genre draws
from the same baked plate a static or video map beat draws from, so the bake rules (1, 2, 4, 6, 7,
9, 12) all still bind. What this file adds is only what is true of a map that a reader can
**interrogate**, and nothing this genre's first beat did not actually meet.

## The accessibility question

**A map is a spatial medium, and a screen-reader user has no spatial access to it.** A chart's own
web genre can lean on a linear reading order — a series of points along an x-axis has a natural
"first, then next" a screen reader's own navigation already matches. A map has no such order: two
regions are related by where they sit on a plane, and that relationship is not expressible as a
sequence of DOM nodes no matter how carefully `tabIndex` is assigned to them. Tabbing through
thirteen circles in *some* order gives a screen-reader user thirteen numbers, but not the one thing
the map itself is for — the spatial pattern those thirteen numbers make.

Two answers were on the table for this beat, and only one of them is honest:

- **A hover tooltip, alone, is not an answer.** It requires knowing where on the canvas a value of
  interest sits *before* you can ask for it — exactly the spatial access the question starts by
  saying is absent. Treating "point your cursor at the right pixel" as an accessible affordance is
  the anti-pattern this section exists to name and reject, not merely to avoid by accident.
- **An ordered, readable list of the regions and their values, behind the same markup, is a
  legitimate answer** — not a consolation prize, a genuinely complete one. It does not restore
  spatial reasoning (nothing can, from inside a linear medium), but it restores what a map actually
  *claims*: thirteen facts, each attached to a name. A reader who cannot see the pattern can still
  read every fact the pattern is made of, in a stable order, with the same exactness a sighted
  reader gets from a hover.

This beat ships the second answer, as `RegionTable` in `assets/MapWebSeed.tsx`: the same thirteen
`(name, value)` pairs the map draws, rendered ONCE (not per responsive layout — the same facts do
not need saying twice) as a real HTML `<table>`, captioned, with `<th scope="row">`/`<th
scope="col">` so a screen reader's own table navigation (row-by-row, column-by-column) actually
works on it, largest value first so "the first row" means something instead of being an accident of
data order. It is `readingOrder`, the exported function every consumer of the geometry uses, so the
table's order and a sighted keyboard user's Home/End order are the same order — nobody gets a
*different* map depending on how they read it, only a different medium for the same one.

Three choices this table deliberately makes, each closing a way the same idea goes wrong in
practice:

- **Always rendered, never behind a toggle or `sr-only` CSS.** A disclosure widget ("show data
  table") adds an extra interaction step for the one reader who most needs the fallback not to be
  optional, and screen-reader-only CSS has a well-known failure mode: a positioning bug, a CSS reset
  that strips it, an author who "cleans up" a rule they do not recognise the purpose of, and the
  content silently stops reaching anyone. Visible-to-everyone is what makes it un-losable. It also
  means a sighted reader who prefers exact numbers over circle-squinting gets a real option too —
  this is not a screen-reader-only feature wearing an accessibility label, it is a genuinely better
  way to read thirteen exact numbers than a legend with three rounded reference sizes.
- **A `<table>`, not an SVG text grid.** The map's own circles already carry `aria-label`/`tabIndex`
  as a *second*, complementary channel (see "Two channels, not one" below) — but nothing in this
  skill asks a screen reader to construct "this is a table" out of positioned `<text>` elements,
  because it cannot: `role="table"`/`role="row"`/`role="cell"` on SVG nodes is unreliable across
  screen readers in exactly the way a real `<table>`, `<tr>`, `<th>`, `<td>` is not. Reaching for
  the browser's own oldest, best-supported accessible data structure beats reimplementing one.
- **One value, one formatting, in one place.** `pointDetail` in `MapWebSeed.tsx` is the only
  function that turns a `{ name, value }` into the string a reader sees, called by the SVG's
  `aria-label`/`data-detail`/`<title>` AND by nothing else — the table calls `fr(point.value)`
  directly rather than re-deriving a second phrasing, so a hovering reader and a table-reading
  reader are never told two different numbers for the same city because someone edited one
  formatter and not the other.

## Two channels, not one

The map and the table are not a primary feature and its fallback — they are two channels carrying
the same thirteen facts, and a reader picks whichever one their situation makes usable. This is why
the SVG's own circles are STILL individually `tabIndex={0}` with their own `aria-label`, exactly the
way `twin-chart-web`'s points are: a sighted keyboard user who does not use a screen reader still
benefits from being able to tab the map itself and hear/read the value at their own pace, without
needing a mouse's fine motor precision to land on a small circle. Dropping the table because the
circles are "already accessible" would be wrong (spatial access is not linear access), and dropping
the per-circle `aria-label`s because the table exists would ALSO be wrong (a keyboard user reading
the map spatially, circle by circle, is a real and different reading strategy from reading the
table top to bottom). Ship both; neither substitutes for the other.

## Touch and hover share one target

A circle sized by its own value can be a few pixels across at the small end of the scale (Dublin,
here, well under half the linear radius of Paris) — too small to be a fair touch or mouse target on
its own. Every point therefore carries an INVISIBLE, larger hit circle (`hitR = max(r, 14)` in
`MapWebSeed.tsx`) on top of the decorative, visibly-sized one: the thing a reader sees is
proportional to the value, and the thing a reader has to land a pointer or a finger on is not
punished for a small value. This is the same "shared touch/mouse target, sized for the hand rather
than for the data" rule `twin-chart-web/references/web-discipline.md` states for its own `.pt`
circles, applied to a genre where the visible mark's own size actively varies per point rather than
staying constant.

## Progressive enhancement: a native tooltip before the script runs

Every `.pt` circle nests a `<title>` element carrying the exact same string its `aria-label` and
`data-detail` carry. `<title>` is a native SVG affordance — most browsers show it as a plain tooltip
on hover, with zero script. This means the ONE thing this genre's inline script (`interaction.mjs`)
actually adds on top of a no-JS page is positioning (a fixed, always-visible tooltip near the
pointer instead of the browser's own delayed native one) and keyboard cycling (Arrow/Home/End
between points) — not the base capability of "hover a point, learn its value," which the markup
alone already provides. This is why `test: disable JavaScript` in this beat's own verification
checks for "the map and its legend still render," not "hover stops working": the legend, the map,
the per-point `<title>` tooltips and the accessible table all survive script-off; only the nicer
fixed tooltip and the arrow-key shortcuts are genuinely JS-only, and neither carries an argument the
static markup does not already state.

## Responsive behaviour: two pre-rendered layouts, not a live reflow

The same reasoning `twin-chart-web/references/web-discipline.md`'s own "Responsive behaviour"
section gives, applied to a map instead of a line chart: `MapWebSeed.tsx` is called TWICE, once per
`WebLayout` (`desktop`, 860px, map beside the text column; `narrow`, 360px, map stacked above it —
there is no room for both side by side once the frame drops below ~480px), both SSR'd at build time
by `scripts/render-web.mjs`. A single CSS media query (`buildCss` in that file) picks which
pre-rendered SVG is visible; nothing recomputes a radius scale, a label side, or a column width in
the browser. The narrow layout is not the desktop layout scaled down — `maxRadiusPx` shrinks from 26
to 15 so the smallest circles stay legible rather than vanishing, and the text column moves from
beside the map to below it, a genuine second layout rather than one CSS transform of the first.

## What must not become interactive

The title, the source, the legend caption, the three legend reference circles and their own labels,
the subject's own note, and the caveat are all drawn unconditionally, exactly once, regardless of
hover or focus state — none of it is assembled or revealed by `interaction.mjs`. The interaction
layer's only job is the PER-POINT exact figure the legend's three rounded reference sizes can only
approximate; nothing a reader needs to receive the beat's own argument lives only in a hover, the
same invariant `twin-chart-web/references/web-discipline.md` states for its own genre.

## Verification

The one gotcha this skill's own `SKILL.md` names applies here in full: a static render is checked
with a PNG; the thing unique to THIS genre — does hovering circle X show circle X's own value, does
Tab actually reach every one of the thirteen points in a sensible order, does the accessible table
read correctly with a screen reader's own table navigation, does the map and its legend survive
script-off — is a *behaviour*, provable only by driving a real browser and using it. A unit test
(`test/render-web.test.ts`) covers what it honestly can: the SSR'd markup's structure, the exact
formatted value baked into every `data-detail`, the point count, the palette. It stops there on
purpose.
