---
format: web
type: small-multiples
---

# Beat — La France a multiplié sa part solaire par 40 et reste la courbe la plus plate des six (web)

**Type:** small multiples. **Medium/format:** chart / **web**. **Frame:** fluid in width, fixed in
proportion.

## Claim

Solar's share of each country's own electricity generation, six EU member states, 2010–2024. **All
six rose.** Spain ends highest (2,41 % → 20,75 %), and **France multiplied its own share by 40
(0,11 % → 4,43 %) while ending lowest of the six** — so on the shared scale its panel is the
flattest one on the page.

That tension is the finding, and it is what a shared scale is for: **a factor and a quantity are
different questions**, and a common axis answers only the second.

Same subject and the same frozen file as `proof/static-small-multiples-solar-eu-six`, byte for byte
(md5 `47afd293940bee564f91047b5664fd6e`).

### A defect in the premier jet, found before anything was rewritten

The first pass of this page printed **TWh** on every panel, in its caveat, in its shared note, in
all six hover answers and in its own `BRIEF.md`. The column is not TWh. The static sibling reads the
same bytes and says so in its own first line — *"solar's share of electricity generation"* — and
refuses a reading outside 0–100 with the message `is not a share of a whole`. Germany's real solar
generation in 2024 is of the order of seventy terawatt-hours, not 14,9. Every unit on this page is
now `%`, and the derived readings that leaned on the unit (*« a passé un TWh »*) are re-derived as
shares (*« a passé 1 % »*).

## THE INTERACTION, WRITTEN BEFORE THE CODE

### What small multiples do that no other type does, and what it costs

Faceting is not a chart type. It is the decision to **trade one rich picture for many identical
ones**, and everything it buys rests on one thing: the panels share a scale. The type sheet's single
non-negotiable is exactly that — *"same domain, same axis, same units, on every single panel, full
stop, even if that means some panels look nearly flat"* — and its one failure mode is the moment a
panel is fitted to its own data.

So the honesty is bought with a frame. And a frame is a wall. **The grid makes every panel comparable
and puts every comparison out of reach**: the reader can see that Spain's curve is taller than
France's, but the two curves are in different boxes, and *two curves in different boxes never meet.*
Everything that lives at a meeting — who was ahead, for how long, the year the order changed — is
structurally absent from a facet grid. Not omitted for space. **Unreachable, because the panels are
the type.**

Measured on this beat's own frozen file, here is what is in the data and is on no panel:

| the pair | what the grid cannot say |
| --- | --- |
| Germany and Italy against **Spain** | both were **above** Spain's share from 2011 to 2020 — ten years each — and Spain only retook the lead in **2021** |
| Italy against **Germany** | Italy was above Germany from **2011 to 2021**, eleven of the fifteen years, and fell back behind only in 2022 |
| Poland against **France** | France — the flattest panel, last in 2024 — was **above Poland for twelve of the fifteen years**; Poland crosses it in **2022** |
| Romania against **France** | **three** crossings, 2014, 2022 and 2024 — the only pair on the grid that changes order three times |

The last two are the ones that matter to this page's own claim. The headline says France ends lowest
of the six. **That is a 2024 fact, not a 2010–2024 fact**, and the grid has no way to say so.

### Why a still, a video and a scrolly all fail here, and it is arithmetic

A still could draw one of these comparisons by picking a reference and printing it. Fifteen pairs
exist among six panels; drawing them all in one plate means **thirty-six panels** — six grids of six
— which is the combinatorial blow-up that made anyone reach for a facet grid in the first place. The
other escape is the six-line overlay, and the type sheet names it as the thing faceting exists to
avoid.

A video or a scrolly can step through six references **in the author's order, once**. They cannot let
a reader who has just noticed something about Poland go back and look at Poland against France, then
against Romania, then against Spain, on the same frames, without losing their place.

### The gesture — `carry.ts`, a new vocabulary: which member of a repeated set is CARRIED INTO every other member's frame

The reader picks one of the six. That country's own curve is stamped **into all six panels at once**,
as a filled silhouette behind the panel's own line, on the grid's own shared scale, unchanged. The
grid stays a grid: six frames, one scale, the same years, the same positions, the same names. What
arrives is a second shape inside each frame, and every crossing the wall was hiding becomes a place
where a line enters or leaves a mountain.

Three properties, and each one is the type's and nobody else's:

1. **One act, six laydowns.** The gesture does not compare two things. It compares one thing to
   *everything*, in one move, because a facet grid's unit is not a mark, it is a frame, and there are
   six of them.
2. **The guest is drawn from the set of hosts.** The carried country is one of the six panels, so its
   own panel shows the silhouette lying exactly under its own line — the reader can *see* that the
   shape they are reading in five frames is the same shape they are reading in the sixth. Nothing
   external is ever carried in. That reflexivity is what keeps the shared scale honest under the
   control: there is no second scale to get wrong, because the guest is already on this one.
3. **Nothing moves.** Not a panel, not a name, not a value, not the scale. The first ruling
   (*labels that move under a control read as a bug*) costs nothing here, because a carry adds a
   shape and subtracts nothing.

#### Why it is a new file and not one of the eighteen

`fold.ts` is the near miss, and the distinction is exact. A fold *"says what may be LAID OVER what is
drawn — one half of a picture, carried across and put down on the other half at its own measured
values"*. That is one guest and **one host, in one frame**: its `FoldOption` carries a single `steps`
outline and a single `host`. A facet grid has **no single frame**. Expressing this control with folds
means one option per (guest, host) pair — thirty, of which five would have to be checked to see one
country against all the others — and the whole reading, *this one shape against the entire grid at
once*, would be gone. The gesture lives at the level of the **grid**, which is the level `fold.ts`
does not have.

`benchmark.ts` is the second, and it fails the other way. A benchmark *"says what each row is JUDGED
AGAINST — one target per row, confined to that row's own track, and the verdict every row earns"*.
Three differences and any one of them is fatal: a benchmark's target is **one scalar per row**, this
is **one fifteen-point series shared by every panel**; a benchmark's target comes from **outside**
the data (a bullet's target is the editorial decision the type sheet warns about), this one is
**inside the drawn set by construction**; and a benchmark produces a **verdict** — hit or miss —
where a carry produces a **shape a reader reads themselves**.

`level.ts` is the third. A level lays **one constant across one plot** and its `LevelMark` carries
exactly one coordinate for exactly that reason. A carried country is a curve, and it is laid into
six plots.

### The refusals `carry.ts` makes, and each is a picture that would lie

- **A guest that is not one of the drawn panels.** The obvious seventh pill is *« la moyenne des
  six »*, and it is refused by name. An average has no panel of its own, so the reader has no frame
  in which to check the shape they are being asked to read the other five against — it would be the
  only carried curve on the page that cannot be verified against itself. An external target (a 2030
  objective, an EU average) is refused by the same rule, and belongs to `benchmark.ts`.
- **A carried series that is not the panel's own series, value for value.** This is the type
  sheet's one failure mode made mechanical, and no other file in this family can make it. The
  tempting bug is to refit the guest to each host's own range so it "fits" — which is per-panel
  scaling, wearing a different hat. The declaration is refused unless the carried series is
  **identical to the series that panel already draws**, so the lie cannot be written down.
- **A carried series that does not cover the grid's own years, or leaves its ceiling.** A hole in a
  carried panel is the same defect as a hole in a drawn panel: *a panel with a missing year is not a
  multiple*. And a silhouette clipped at the top of the frame reads as a country that plateaued.
- **A guest no panel ever changes side against.** The question this control asks is *who was ahead,
  and when did that change*. An option under which every panel keeps the side the shared ceiling
  already put it on answers with the ranking the plate already prints.
- **Two guests with the same curve** — two pills, one picture.

Plus the ordinary couture: exactly one verdict per drawn panel and no others, every accessible name
containing its visible one, no slug colliding, none slugging to the reserved `none`.

### Control 1 — « Poser un pays dans les six cadres »

- **The reader's question.** « Cette courbe-là, elle passe devant les autres à quel moment ? »
- **The gesture.** `toggle-a-comparison` — seven native radios (the untouched grid, then the six
  countries in the panels' own order), plus CSS generated at build time. No script.
- **What changes in the picture.** The chosen country's curve appears as a filled silhouette inside
  all six panels, interpolated over 520 ms; each panel's own light wash fades out in the same breath
  so the two shapes are never read through each other; each panel gains, under its own baseline, the
  verdict it earns against the carried country (*« au-dessus depuis 2022 »*, *« croise en 2014, 2022
  et 2024 »*, *« jamais au-dessus »*, and for the carried country's own panel *« le pays posé »*);
  and one sentence appears under the pills with the crossings, the longest run and the counts, all
  derived from the frozen file in the runner. Nothing on the page moves.

### Control 2 — « Demander à un panneau »

- **The reader's question.** « Ce pays-là, il est parti d'où, et il vaut combien aujourd'hui ? »
- **The gesture.** `ask-a-mark` — hover, tap or keyboard focus on any of the six panels.
- **What changes in the picture.** The panel's own line lifts off its own ink (a dose searched until
  the step is measurable, never a fixed one, and never a ring or a dot laid on top), and the panel
  answers with both ends, the factor it grew by, its rank among the six and the year it first passed
  1 % — fifteen years of readings a 240-unit panel cannot carry.

The two controls answer on two channels and do not duplicate one another: the carry answers **when
the order between two countries changed**, the ask answers **what one panel is made of**.

### What this page earns

> Un fixe ne peut dessiner qu'une comparaison à la fois, et les six panneaux en cachent quinze :
> les dessiner toutes demanderait trente-six cadres. Ici le lecteur pose n'importe lequel des six
> dans les six cadres et lit, sur l'échelle commune et sans que rien ne bouge, l'année où l'ordre a
> changé — dont les douze années où la France, dernière en 2024, était devant la Pologne.

## Treatments spent

- `panels-share-one-scale-or-they-are-not-multiples` — every panel runs 0 to the same ceiling on the
  same years, in every state of the control. The carried silhouette is drawn with the same two
  projections as the hosts and `assertCarryDeclaration` refuses a carried series that is not the
  host panel's own, so no state of this page can put a second scale on the grid.
- `what-is-shared-is-stated-once-and-what-varies-is-repeated` — scale, span and unit above the grid;
  name, final value and (under a carry) the verdict inside every panel.

A panel with a missing year throws, in the plate and in the declaration both: a hole in one panel is
not a multiple.

## Colour, and what it is measured against

Full reasoning and the whole table in `PALETTE.md` — which was, until this pass, one of the forty
byte-identical copies reasoning about a midpoint year this page does not have. The one thing worth
repeating here: **two greys calibrated independently on the same floor against the same ground come
out the same grey.** Measured on this beat — the neutral line at the non-text floor and the carried
silhouette at the non-text floor stand **1,068:1** apart on `creme`, **1,067:1** on `rapport`,
**1,200:1** on `nocturne`. Two shapes nobody could tell apart, in the one state where telling them
apart is the reading. So the neutral line is mixed deeper and held to a **5:1** floor it clears
outright (**9,21 / 9,58 / 9,44**), and — because the accent line still only reads **2,04:1** against
the silhouette on `creme` — every line is **cased in the panel's own ground**, 2,6 geometry units
wider than itself. The colour immediately adjacent to any line is then always the panel ground and
never the mountain, which is the whole of ruling 6.

## What the render taught, and every one of these was read in a capture or measured in a browser

- **The unit was wrong, on every string the page ships.** Found before the rewrite, from the static
  sibling's own first line. Recorded at the top of this brief.
- **The verdict row captioned the wrong grid row.** At `GAP.y = 46` the line under a panel sat 17
  units from its own baseline and 21 from the NAME of the row below — read in the `nocturne`
  capture, whose axis register is the largest of the three. The gap is 56 now and the verdict is 29
  units from the next name.
- **`rapport` shipped forty `<text>` elements in a face it did not carry.** `figureVars` emits a
  font stack that OPENS WITH A QUOTE, right for a stylesheet and wrong for an SVG attribute:
  `fontRequestsInHtml` decodes each tag before reading it, so `font-family="&quot;Open Sans&quot;, …"`
  arrives as `font-family=""Open Sans", …` and its own deliberately conservative pattern matches
  nothing. The request fell through to the page's inherited body family — Merriweather on `rapport`
  — so `assertFontsEmbedded` was satisfied while the browser resolved Open Sans 400 to Helvetica.
  `creme` and `nocturne` passed the same build because their body family IS Open Sans and the wrong
  attribution landed on the right face. `verify-web.mjs`, which asks the browser, failed on all 32
  characters. The attribute is written unquoted now, which is what `ChartWebSeed.tsx` does.
- **The page did not fit a phone.** A seven-pill control, a reserved sentence row and a six-panel
  grid put `nocturne` 181 px past an 812 px window. Paid for in words, not by shrinking the chart:
  at 375 px `nocturne`'s display register is set in CAPITALS and the first headline took five lines
  and 312 px of the window on its own. `creme` and `rapport` now fit in every state; `nocturne` fits
  untouched and overruns by **15 px** with a country carried, which is the note's own wrap and is
  recorded rather than hidden.
- **A six-panel grid is not readable at 375 px, and no amount of trimming changes that.** The
  viewBox is 756 units wide; at a phone width the plot resolves to 327 × 130 CSS px, so each panel
  is about 103 × 56. That is the type's own mobile problem — a grid's panel count is its argument —
  and it is a layout decision (two columns, or one) rather than a text budget. Not taken here;
  desktop is validated first.

## Verification

- `bun proof/web-small-multiples-solar-eu-six/render-directions-web.mjs` — three directions, none
  refused, runner exits 0.
- `bun skills/chart-web/scripts/verify-web.mjs --file …/renders/{creme,nocturne,rapport}.html` —
  **89 / 83 / 83 passed, 0 failed, 7 skipped**. The three counts differ because six of the checks are
  conditional on the direction's own registers, not because a direction skipped anything this beat
  ships.
- Driven in a real browser at 1512x860 and 375x812, in both states, once with script and once with
  scripting **off**: the carry works identically with JavaScript disabled, which is what radios plus
  generated CSS buy.
- Eleven mutations against `assertCarryDeclaration`, all refused; one mutation of the stylesheet's
  emission order, which **stayed green** and is recorded in `carry.ts` as a measurement.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data ·
2010–2024, solar's share of electricity generation. `data.csv` is a byte-for-byte copy of
`proof/static-small-multiples-solar-eu-six/data.csv`.
