# Beat 1 — where the routes lead

**Medium** map · **Format** web · **Type** flow / route map · **Producer** custom (`map-web`)
**Language** en · **Output** `renders/where-the-routes-lead.html`

## What this beat proves

That the eight recorded routes fan out of Portugal to five European cities; that Lisboa–London is
the widest single one at 18,400 people; and that Paris nevertheless takes more people than London —
23,600 against 21,200 — because three routes end there.

The second half is the reason this beat is a map and not a bar chart. It is a number that exists
only when ribbons are added together, so no single mark can carry it, and the geography is what
makes "three routes end there" visible rather than asserted.

## The type, and the refusal it comes with

`map-beat/references/types/flow-map.md` — the only flow sheet this toolchain holds — refuses this
data outright in its second sentence:

> a route is a SINGLE path with the territories it crosses, not a many-to-many flow — trying to show
> trade or migration between many origin-destination pairs on this type produces a tangle of
> overlapping accent-coloured lines … that's a different chart entirely (an OD flow diagram, not a
> route map), with its own legend logic for volume and direction.

There is no OD-flow sheet in the catalogue, and that sentence is not in the survey the treatment
gate reads from (`storyboard/references/type-survey.md` lifts only a refusal's FIRST sentence). So
this beat is a flow map by the survey's vocabulary and an OD flow map by the sheet's, and it answers
the refusal rather than ignoring it. Four decisions do that work, and each was checked on the render
or in a real browser:

1. **Eight ribbons, not hundreds.** The tangle the sheet describes is a function of count. Eight is
   inside what one accent at eight widths can carry; this is stated so that a later beat with forty
   routes knows the argument does not transfer.
2. **One accent, eight widths.** A route is not a KIND of thing, it is an amount of one thing, so
   giving each a hue would invent a category the data does not have. Width is the only encoding on
   this map and the legend says so.
3. **Opaque strokes, widest painted first, each with a ground-coloured casing.** A crossing reads as
   one ribbon passing over another. Translucent ribbons were the alternative and are refused: alpha
   over alpha makes a third, darker value at every crossing, which on a beat whose only encoding is
   ink reads as a quantity that is not there.
4. **One bow, one side, always.** A fanned bow was tried — see `geo-flow.ts`'s own `bowsFor` note —
   and it turned the Paris sheaf into a lens of crossings and swung the widest ribbon across
   Faro–London. It was reverted and written down.

## Direction is data

Every route in this extract is a DEPARTURE, and the article says plainly that return flows are
recorded separately and are not here. A ribbon with no direction is a LINK, and a reader would be
entitled to read a link as a balance. Each ribbon therefore ends in an arrowhead at the city it
arrives at, sized from the ribbon but capped, and the one caveat printed on the graphic is the
return-flow limit.

## What overlaps, and what was done about it

Eight routes converging on five cities cross — that is the geometry, not a defect. The composition
decisions are above. The INTERACTION had its own version of the same problem and it was found by
driving a real browser, not by reading the markup: a fixed-size hit target at each ribbon's midpoint
(this format's own answer, because its own mark is a disc) meant hovering Porto–Paris returned
Aveiro–Paris's reading, at every viewport. The hit surface is now the ribbon itself — a transparent
over-stroke, hit-tested on the stroke — so the whole length of a ribbon answers for that ribbon, and
the `.pt` buttons keep the keyboard. `verify-interaction.mjs` drives nine points along every ribbon
at four viewports and asserts two things: that whatever answers answers truthfully for whatever is
actually under the pointer, and that no ribbon is buried along its whole length.

## Colours

`../../PALETTE.md`: ground `#16191B`, accent `#D4A853` (8.01:1), second house accent `#5B8A8A`
(4.58:1) spent only on the five destination marks, which are a place rather than a movement and are
not part of the volume comparison. The ground is dark, so the plate is baked `dataviz-dark`:
`plateFollowsGround` refuses a charcoal beat over a pale basemap.

## The typeface

This format does not read the story's recorded typeface — `map-web/SKILL.md` says so itself, and
`render-still.mjs` holds `FONT_FAMILY` as a const. This page is therefore set in
Helvetica/Arial, which is not one of the two faces `NEWSROOM.md` records. Named here and in the
hand-over rather than left to be discovered.

## Files

- `geo-flow.ts` — the pure core: the frozen table's own reader (fails loud on a missing column or a
  bad cell), the origin/destination totals, the ribbon geometry, the LINEAR width scale, the legend's
  reference widths, the two orders, and the plate's own exact unprojection.
- `prepare-data.mjs` — derives `routes.json` and `places.json` from `../../source/data.csv`. Nothing
  on this beat is hand-typed from the frozen table.
- `bake-plate.mjs`, `keep-point.ts`, `splash-root.mjs` — this beat's own copy of the bake, with its
  own camera (`geo-discipline.md` rule 12) and its own dark basemap. Copied because the skill's own
  camera and style are consts inside the skill and a beat may not edit a skill.
- `FlowMapWeb.tsx` — the composition, plus `RouteTable` and the two rules the format's CSS has no
  line for (a WIDTH legend, a ribbon hit surface).
- `render-web.mjs` — this beat's runner: hands its own component to the format's own generic
  `renderMapWeb`, and writes the live plan by hand because `livePlan` builds only a circle layer.
- `verify-interaction.mjs` — the real-browser driver (pointer, keyboard, argument-at-rest, no-JS).
- `check-guards.mjs`, `check-fills-its-frame.mjs` — the format's own declared guards, run against
  this delivered page. Both exist because the skill calls those guards only from its own test files,
  over its own committed beats.
