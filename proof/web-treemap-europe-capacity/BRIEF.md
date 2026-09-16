---
format: web
type: treemap
medium: chart
grounding: supported
---

# Beat — L'Europe compte 453 GW bas-carbone, et l'eau et l'atome en portent encore 79 % (web)

**Type:** treemap (squarified). **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

**453 GW of low-carbon capacity across 8 299 stations in 41 European countries, and water and the
atom still carry 79 % of it — but 8 countries have already tipped: wind and solar are more than half
of their low-carbon fleet.** Those eight hold **15 %** of the capacity. The largest cell, France, is
not one of them (14 % wind and solar). Every part is asserted in the runner before the render.

## The file's camera is not this beat's

The WRI export reaches past Europe — Algeria, Iraq, Morocco, Syria and Tunisia are in it because the
extract was cut by a bounding box, not by a continent. A treemap of "Europe" that silently included
them would be a claim about a set nobody stated, so the set is **stated in the runner** and every
country outside it is dropped before anything is summed.

## The interaction, written before the code

### What the type's own gesture is, and the measurement that confirmed it

A treemap buys density and **sells comparability**. Two rectangles that are not neighbours cannot be
ranked by eye, and the small ones are unlabelled by necessity. Measured in a real browser on the
delivered page: of 41 countries the root view names **23 at 1440 px wide, 21 at 1280, and 3 on a
375 px phone** — because whether a cell can hold a line is a question about the reader's pixels, not
about the build (see "The hard-coded `lineHeight`" below). A still picks one level and stays on it;
the rest stay anonymous for ever, and the reader has no way to ask.

So the type's native move is the one no still and no clock can offer: **descend into a branch**. One
part becomes the whole, its children get the room they never had, and the reader climbs back out.
A video or a scrolly can descend too — but into **the author's branch, on the author's clock**, once.
Here the reader picks the branch, stays as long as they want, and comes back.

### Which hierarchy, because this data carries one the plate never draws

Every station has a fuel. The continent is therefore *Europe → source → country*, and the plate draws
only the leaf totals rolled up per country. The tipping claim — the whole second half of the headline
— rests entirely on a split **no cell on the plate shows**: France's 96 GW block says nothing about
being 66 % nuclear, and the United Kingdom's says nothing about owning more than a third of
Europe's wind.

### The controls

**1. « Qu'est-ce qu'il y a VRAIMENT dans ce pavé, et qui possède le vent ? »**
*Gesture:* descend into a branch (new vocabulary — see below).
*What changes in the picture:* the frame is thrown away and re-squarified over the chosen source
alone. Different cells, different areas, different names. Measured, at this frame:

| branch | GW | cells | biggest | magnification | countries that GAIN a name (1440 px) |
| --- | --- | --- | --- | --- | --- |
| Hydraulique | 195,8 | 36 | Norvège, 16 % of it | x2,3 | **4** — Géorgie, Islande, Lettonie, Albanie |
| Nucléaire | 161,4 | 18 | France, 39 % of it | x2,8 | 1 — Hongrie |
| Éolien | 63,9 | 21 | Royaume-Uni, 36 % of it | x7,1 | 4 — Pays-Bas, Danemark, Irlande, Estonie |
| Solaire | 32,0 | 21 | Royaume-Uni, 27 % of it | x14,2 | 1 — Pays-Bas |

**Nine distinct countries the root view cannot name are named by descending into it at 1440 px, and
eleven at 1280 px** — driven in a browser, not computed from the geometry. It is a count, not a
claim, and it is bigger on the narrower frame, which is the right way round: the tighter the plate,
the more the reader needs somewhere to go.

**2. « Les huit pays basculés, ça ressemble à quoi ? »** — answered by the same control, and this is
why the accent had to survive the descent rather than be re-assigned inside it. The accent marks the
tipped countries in *every* view. So:

- in **Nucléaire**, the accent nearly disappears: the tipped hold **6 %** of Europe's atom;
- in **Hydraulique**, **6 %** again;
- in **Éolien**, the accent **floods the frame**: the tipped hold **55 %** of Europe's wind;
- in **Solaire**, **31 %**.

The headline *asserts* that eight countries have tipped. Descending **shows** it: eight of
forty-one own more than half of the one source that is growing. No still of this claim can put that
in front of a reader, because a still has one frame and this needs five.

**3. « Ce pavé-là vaut combien, et il pèse quoi là où il est ? »**
*Gesture:* ask a mark (hover, tap, Tab).
*What changes in the picture:* the cell under the pointer takes a measured lift off its own fill, and
answers with readings printed nowhere — and **the answer is different in each view**, because the
question is. At the root: the country, its GW, its share of Europe, its rank among 41, its station
count, and the water-and-atom / wind-and-sun split the tipping claim rests on. Inside a branch: its
GW *of that source*, its **rank among the countries that have it**, its share of that source across
Europe, and what share of its own national fleet that one source is. Norway is 6th in Europe and
**1st in water**; the United Kingdom is 2nd in Europe and **1st in wind and 1st in sun**. Neither
rank exists anywhere on the plate.

### The sentence each branch owes the reader

Revealed by the same `:checked` that re-lays the frame, because a reader who is not looking at the
picture is owed the reading too. Each is derived in the runner from the frozen file and asserted
there. The one that pays for the whole control: **solar is 7 % of the capacity and 47 % of all
8 299 stations; nuclear is 36 % of the capacity on 72 stations, under 1 % of them.** Neither number
is on the plate, in any view, and neither can be inferred from an area.

## The vocabulary: `descend.ts`, written for this beat

`filter.ts` is the near miss and the reason a sixth file exists. A filter's own specification says
*"the marks outside a named set leave, and **the frame they were measured against does not move**"* —
which is the exact opposite of a descent, whose whole point is that **the frame moves**: the branch
is re-squarified over the full plate, so a country's area means *share of this source*, not share of
Europe. Narrowing a treemap without re-scaling would leave 36 hydro cells sitting in the holes the
other five left, at continental scale — the same picture with gaps.

`stack.ts` moves marks on a frame that stays. `level.ts` lays a reference across a frame that stays.
`withdraw.ts` takes a term out of a sum. `fold.ts` carries one half onto the other. `brush.ts` picks
a span. `trace.ts` follows one thing through. **None of them re-parents the picture.**

The mechanism is the shared one and nothing else: native `input[type=radio]` in a real `<fieldset>`,
plus CSS generated at build time (`:has()` + `:checked`). No script, no listener. With JavaScript
off the reader gets the complete root plate *and a working descent*.

Its own refusals, and each is a thing a descent can get wrong:

- **a branch that is the root again** — a branch holding ≥ 95 % of the root's total is the whole
  under a second name;
- **a branch that gains no room** — the magnification `1 / parentShare` must exceed 1, asserted per
  branch;
- **a descent with no way back** — the root option must exist, be first, and be the default;
- **a branch that re-parents nothing** — a branch drawing the same cell keys as the root;
- **a half-tagged datum** — every element carrying `data-cell` must carry the `data-view` of a
  declared view, read back off the rendered markup (`filter.ts`'s lesson, one vocabulary over);
- **a branch with no sentence** — an option that moves the picture and tells a non-looking reader
  nothing.

## The hard-coded `lineHeight`, and what it was really patching

`KNOWN-STATE.md` lists this beat among ten carrying a literal `lineHeight` in the same style object
that spreads a register. Here it was `lineHeight: 1.1` on `.end-label`, and what it was patching is
now established rather than guessed: the cell label is **two lines** (name, then value) inside a box
whose height the build had frozen as `c.h > 34` in *viewBox* units. At the register's own leading a
two-line label is taller than 34 viewBox units at most real widths, so it printed out through the
bottom of its own cell onto its neighbour. The literal squeezed the two lines back in — **a layout
fix wearing the rhythm's lever**, and since `78b79c70` it also *beat* the register.

Both halves were wrong, and the typed threshold was the worse of the two: **the plot's height in CSS
pixels is not a function of its width** (`.chart-figure` caps at `100dvh`, `.chart-plot` is the one
shrinkable item), so a fraction of the frame frozen at build time is right at one size and wrong at
every other.

The right lever is the one `proof/webx-electricity-mix` already proved in this tree: **one size
container per cell**, asking the graphic, in the reader's own pixels, whether that cell can hold a
line. So:

- the leading goes back to the register — no literal anywhere in the component;
- each cell gets a `.cell-box` at its own percentage position and size, `container-type: size`;
- `@container (max-height: …)` drops the value line, then the name, at thresholds derived from
  `leadOf` = `regs.value.lineHeight × regs.value.fontSize` — the direction's number, not a typed one;
- `@container (max-width: …)` drops a name the cell is too narrow for, at a threshold measured
  through `measureText` in the value register and tiered to 6 px so the rule count stays small;
- a name that does not fit takes its value with it — a figure with no subject is an assertion with
  nothing to attach it to (`static-treemap`'s own rule);
- both carry `data-fits-its-mark`, which is what `verify-web.mjs` reads to tell "owned by a size
  container" from "conditionally drawn".

Nothing is clipped and nothing is shrunk: a cell that cannot hold its name goes unlabelled and
answers the pointer, which is this type's own filed failure mode.

## Treatments spent

- `the-set-a-claim-adds-up-is-drawn-as-a-set` — every country in the set is drawn in every view,
  including the ones too small to hold a name. **A treemap that quietly drops its tail is a pie chart
  with better manners.** Each view's layout throws if it lays out fewer cells than it was given.
- `a-narrow-cell-degrades-its-label-rather-than-dropping-it` — name and number where both fit, name
  where only it fits, the pointer where neither does. Now decided by the container, not by the build.
- `accent-marks-the-thread` — the accent marks the tipped countries, not the largest cell, **and it
  keeps marking them through the descent**. A large cell already shouts by being large.

## The accessibility trap this type files, and where it is spent

The type sheet's named failure is white label ink picked by a naive brightness rule landing on a
mid-toned fill under the 4.5:1 floor. This page never picks ink by luminance: `inkOnFill` measures
each candidate against **that exact fill** and takes whichever wins. Two fills exist (the field's
neutral and the thread's accent), both calibrated against the direction's own ground through
`adjustToContrast`, and the label ink is measured against the fill the cell actually paints.

## Why no `interaction` plan is declared, and it is not an oversight

`assertInteractionPlan` matches a declared control's **gesture** against the controls it can
*see* in the markup, and `shippedControls` knows five kinds: `ask`, `table`, `filter`, `stack`,
`level`. A descent is none of them, and `interaction-plan.ts` is vendored into two formats, so
teaching it a sixth is not a change this beat may make. Declaring a plan anyway would mean either
naming a gesture the page does not ship — refused, correctly — or declaring the hover alone and
letting the brief say this page's only control is a tooltip, which is worse than saying nothing.

So the interaction is written out above, in full, before the code, which is rule 1 and the half a
person holds. It is the same choice `fold.ts`, `withdraw.ts` and `trace.ts`'s beats made. **The
mechanical half still runs**: the page's hover is measured against the default state and passes on
its own readings, which is what `renderWeb` refuses on.

## Verification

- `verify-web.mjs`, all three directions: **96 / 90 / 90 checks passed, 0 failed** (6 / 5 / 5
  skipped — the filter checks, which this beat has no filter for).
- Driven in a real browser at 1440x900, every pill clicked, **with the script on and with it off**.
  The two runs are identical, which is the whole claim the mechanism makes: root 41 cells / accent
  14,6 % of the frame, then 36 / 5,9 %, 18 / 5,8 %, 21 / 54,8 %, 21 / 31,3 %, each with its own
  sentence revealed and no other. Named cells: 23 at the root, 27 inside the water.
- Hover and keyboard exercised inside a branch: the answer is the branch's own reading
  (`Royaume-Uni · 23,2 GW éoliens · rang 1 sur 21 pays · 36,3 % du vent européen · 49 % de son
  propre parc bas-carbone · 780 centrales`), the cell takes its ring, 21 cells in the tab order and
  57 pointer-only sample points behind them.
- `bun test skills/chart-web/test skills/splash/test/web-interaction-changes-the-picture.test.ts
  skills/splash/test/no-cross-skill-imports.test.ts
  skills/splash/test/filter-vocabulary-parity.test.ts` — **386 pass, 1 fail**, the one being
  `chart-web — the canon's assets … preview.png is a current render of the seed`, a stale committed
  render of a seed this beat does not touch.

### Mutations

1. **A branch declared at 99 % of the root.** Refused at the declaration, in all three directions,
   with the reason — and the runner exits 1 and takes the stale renders off the disk, so a refused
   page cannot look like a produced one.
2. **The label boxes lose their `data-view`.** Refused by `assertOneDescent` reading the written
   page back, naming the tag and the key: a branch's labels left over the root's cells is this
   vocabulary's version of the filter defect that left names on a map.
3. **`descendCss` dropped from the beat's stylesheet — and this one went GREEN.** One line removed;
   every attribute still correct, `assertOneDescent` silent, `renderWeb` silent, and what shipped
   was five views drawn on top of each other with every branch's sentence printed at once. Only
   `verify-web`'s phone-height check noticed, and only by accident. A vocabulary a beat brings with
   it has to emit its own rules, so it now checks its own rules: `assertOneDescent` requires a
   hiding rule per declared view when it is handed a whole page. Re-run, the mutation is refused.

## What the three renders show

The wind view is the one the gesture was built for and it delivers: the accent goes from a scatter
of small blue rectangles at the root to **more than half the frame**, with the United Kingdom alone
holding 36 % of it — and Estonia, Denmark, Ireland and the Netherlands, four cells too small to
carry a name on the continental plate, all named. Nuclear is the mirror image: eighteen cells,
France taking two fifths of the frame, and the accent almost gone.

One thing was only visible in the capture and is now fixed: the format's tooltip is 220 px wide, and
a six-reading answer about a cell in the top-left corner of the plot ran to five lines and rose
clean over the descent's own pills, hiding the control the reader had just used. The box is widened
to `min(440px, 100vw - 32px)` in this beat's own stylesheet — two lines instead of five.

## Source

Global Power Plant Database (WRI) · installed capacity per station, aggregated by country and by
fuel. `stations.csv` is a byte-for-byte copy of `proof/static-treemap-europe-capacity/stations.csv`.
