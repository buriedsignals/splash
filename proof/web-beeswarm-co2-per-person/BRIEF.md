---
format: web
type: beeswarm
medium: chart
grounding: supported
---

# Beat — Les 6 pays au-dessus de 20 t de CO₂ par personne pèsent 0,6 % de l'humanité (web)

**Type:** beeswarm. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

The **6** countries emitting 20 t of CO₂ per person or more hold **0,55 %** of humanity. The largest
circle on the page is India — 1,4 billion people at 2,1 t — *below* the median of the 213 countries
(3,14 t). The world average, 4,58 t, already sits above what **63,8 %** of people emit.

The runner refuses to render if the heaviest emitters hold 1 % or more, if the world average sits
above less than 60 % of people, or if the largest circle is not below the country median. Both
callouts are **derived, not chosen**: the biggest circle and the farthest one out — the two marks a
reader's eye lands on anyway.

## The interaction, written before the code

### The reader's question, and the thing about a beeswarm that provokes it

*« L'essaim est épais ici. Épais de quoi ? »*

A beeswarm has exactly one axis of data. The other one is **not an axis at all** — it is the space
the collision-avoidance layout needs, and a mark's distance from the baseline is an artefact of
packing order, nothing else. Every other chart type has both dimensions committed; this one has a
free dimension it spends entirely on not overlapping. What the reader gets back for that spend is
the swarm's **WIDTH at each value**, which is the type's only aggregate statement and its whole
reason to exist next to a histogram.

And that width is not a count. **It is a count of whatever the marks are sized by.** The static
sibling sizes a circle's area by population, which means its swarm is already thick where the
*people* are, not where the *countries* are — and nothing on that plate says which of the two a
reader is looking at. It cannot: a still has one packing, and a packing is one weighting.

That is not a tooltip's job and not a filter's. Nothing leaves, nothing is re-ordered, nothing is
re-parented, no reference is laid across. **What changes is what a mark is WORTH**, and therefore
how much room it claims, and therefore where the swarm is thick.

### The gesture: the reader chooses the unit the swarm is thick in

Three weightings of the same 213 marks, at the same 213 positions on the same axis. No mark leaves,
no mark moves along the axis, no mark is aggregated into a bin — which is the type's own promise,
kept three times over:

| l'essaim pèse | a circle's area is | where half the weight sits | the 6 pays > 20 t are | biggest circle |
| --- | --- | --- | --- | --- |
| **les habitants** *(default, the plate)* | its population | **2,60 t** | **0,55 %** of humanity | l'Inde, r = 27,1 |
| **les pays** | the same for all 213 | **3,14 t** | **2,82 %** of the countries | — all equal, r = 3,8 |
| **le CO₂** | its total emissions | **8,56 t** | **2,72 %** of the CO₂ | la Chine, 32,9 % of it, r = 66,4 |

**The half-way point swings 3,3× along a fixed axis while not one mark changes its value.** That is
the reading, and it is the climate-equity argument itself: the world average of 4,58 t — a rule the
plate draws unconditionally, in every state — sits above **63,8 %** of humanity and above only
**25,1 %** of the CO₂. Same line, same axis, same marks; the swarm is thick on one side of it or on
the other depending on what you agreed to count.

### Why a still, a video and a scrolly all fall short of this

A still picks one weighting and the ambiguity it leaves is permanent — the reader cannot even know
there was a choice. A video or a scrolly can morph through all three, but **on the author's clock,
in the author's order, once**: the comparison here is not a sequence, it is a back-and-forth. The
reader who wants to know whether India's circle shrank *more or less* than China's grew has to
return to the first state and leave it again, which is exactly what a timeline cannot give. And the
answer a mark gives changes with the unit — under *les pays* India answers with its rank among 213,
under *le CO₂* with its share of the world's tonnes — so the three states are not three pictures of
one reading, they are three readings.

### The option that was designed and NOT shipped

**« Sans écartement »** — collapse every mark back onto the baseline, so the reader sees exactly how
much displacement the layout invented. It is the most literal answer to "the jitter is not data",
and it is refused: the resulting picture is a single 900 x 5 px smear of 213 overlapping circles, it
hands back **no reading at all**, and `directed-interaction.md` refuses a control that moves the
picture without handing the reader a number. Named here rather than silently dropped, because it is
the option a reader of this brief will think of.

### Ask a mark, and the answer is the view's own question

Hover, tap or Tab any circle. All 213 answer — the plate names two — and **the answer is different
in each weighting, because the question is**:

- *les habitants* — its figure, its population, and **the share of humanity that emits less**;
- *les pays* — its figure, its **rank among the 213**, and the share of countries below it;
- *le CO₂* — its figure, **its own total in Mt**, its share of the world's CO₂, and the share of the
  world's CO₂ emitted at a lower per-person level.

Every one of them is derived in the runner from the frozen file and baked into the mark
server-side; the browser formats no number.

## The vocabulary: `weigh.ts`, written for this beat

None of the nine existing files expresses it, and the misses are not close:

- `filter.ts` — what may LEAVE. Nothing leaves here; all 213 are drawn in all three states, and an
  option that dropped one would turn a weighting into a filter (refused, see below).
- `stack.ts` / `hold.ts` — a per-member displacement, and a per-column affine re-scale. Both take a
  drawn geometry and move or stretch it. **A weighting does not transform the drawing; it re-derives
  it.** The packing is re-run from scratch, and a mark's new place is a function of every other
  mark's new size — not of its own old place. There is no `dx`, no `sx`, and no transform anywhere.
- `descend.ts` — what may BECOME THE WHOLE. The frame moves and the set of marks changes. Here the
  frame and the set are fixed and only the marks' weight changes.
- `floor.ts` — what the picture may STAND ON. A shear: same marks, same sizes, moved.
- `level.ts`, `withdraw.ts`, `fold.ts`, `brush.ts`, `trace.ts`, `cutoff.ts`, `follow.ts`,
  `reorder.ts` — a reference laid across, a term taken out of a sum, a half laid over, a span of an
  axis, a path followed, a threshold, one competitor pulled out, a cyclic re-ordering. None of them
  changes how big a mark is.

So: **`weigh.ts` says what a mark is WORTH in the picture, and therefore how much room it claims.**
The mechanism is the shared one and nothing else: native `input[type=radio]` in a real `<fieldset>`,
plus CSS generated at build time (`:has()` + `:checked`). No script, no listener. With JavaScript
off the reader gets the complete plate *and a working control*.

### Its refusals, each one a picture that would lie

- **A weight that just repeats the axis.** If a mark's weight is a monotone function of its own
  position, the swarm's width says what the axis already says and the control is decoration. Refused
  by measuring Spearman's rho between weight and value against a declared ceiling. Measured here:
  **-0,209 / -0,026 / +0,334** against a ceiling of 0,95. (A weighting by the per-person rate itself
  scores **1,0000** — that is mutation 1.)
- **A floor that hides weight.** Weights here span six orders of magnitude, so a minimum visible
  radius is unavoidable and it is a distortion: 128 of 213 marks sit on it in the default view. The
  distortion only *lies* if the floored marks carry real mass, so that is what is measured — the
  share of the option's total weight held by marks on the floor: **5,14 % / 0,00 % / 1,27 %**
  against a ceiling of 8 %. Count is printed, weight is refused on. (It is not a formality: it is
  what refused a shorter frame — see "The marks are round, and what it cost" below.)
- **A swarm that leaves the band.** Each option walks a ladder of ink fractions, generous first, and
  takes the first that packs inside the frame with room above it. None fitting is a refusal, never a
  clip. Taken here: **4 % / 3 % / 13 %** of the band's area.
- **A mark that moves along the axis.** Checked across every option against the default: a swarm
  that slid a circle sideways to make room would have lied about the one thing it measures. Nothing
  here moves in x, ever — this is also what makes the two callout cards able to stand still.
- **A mark that leaves, or arrives.** Every option seats exactly the same key set.
- **An option that is the default under a second name.** Two independent measurements, both
  arithmetic: the fraction of marks re-seated or re-sized by more than half a geometry unit
  (**212/213** and **208/213**), and the movement of the half-weight reading (**0,54 t** and
  **5,95 t**, against a floor of half a geometry unit).
- **An option with no sentence**, and **an accessible name that does not contain its visible label**
  (WCAG 2.5.3) — the conventions every sibling vocabulary holds.
- **A half-tagged datum** — every element carrying `data-weigh-mark` must carry the `data-weigh` of
  a declared view, read back off the rendered markup. `filter.ts`'s lesson, two vocabularies over.
- **A vocabulary that emits no rules.** `assertOneWeighing`, handed a whole page, requires one
  hiding rule per declared view. `descend.ts` records the mutation that earned this check: dropping
  the stylesheet call left every view drawn on top of every other and went green everywhere.

## What cuts and what travels, and why it is that way round

The owner's arbitration: *« ça pourrait changer en lerp smooth au lieu de saccader »*.

**The three swarms cut.** They cannot interpolate, and the reason is mechanical rather than
aesthetic: `interaction.mjs` resolves the mark under a pointer from `cx`/`cy` read **once at init**,
so a mark animated into a new place would keep answering for the place it left — the worst answer an
interactive chart can give. Each weighting is therefore its own `<svg class="chart">`, drawn once at
its own packing, stacked in the same grid cell, and only the chosen one displayed. A hidden `<svg>`
has no CTM and no focusable content, so it is inert: the pointer and the keyboard only ever reach
the swarm the reader is looking at. Same discipline as `floor.ts` and `descend.ts`, for the same
reason both of them record.

**The centre of mass travels**, and it is the one element on the page that should: a solid caret
sitting under the axis at the value where half the swarm's weight lies, always rendered, its `left`
generated per view and transitioned. It slides **2,60 → 3,14 → 8,56 t** — and under *les pays* it
comes to rest exactly on the median rule the plate already draws, which is not a coincidence but the
definition of a median, and is visible as one. Nothing else on the page moves, and **no text moves
at all**: the caret's own label is invariant (« milieu de la masse »), the two callout cards stand at
a fixed row at their marks' own x — which no weighting touches — and the numbers live in the
sentence under the control, where every sibling vocabulary puts them.

**It is not a dashed rule**, deliberately. The plate already carries two, and a third would be the
reflex the owner named. A caret on the axis is a different object saying a different kind of thing:
the two rules are *reference levels the swarm is read against*; the caret is *a property of the swarm
itself*, which is why it moves when the swarm does and they do not.

## The type's own trap, and what it turned out to be here

The catalogue files one: a single-distribution beeswarm has exactly one colour channel and it has
shipped, in production, on a default hue that had nothing to do with the subject. The literal form is
absent here — the swarm has no hue at all. The reason is wide open, and this control re-opened it in
a form the static sibling never met:

**Both accents are derived from ONE weighting.** « Le plus gros cercle » is India only while the
marks are sized by population; under *le CO₂* the eye lands on China, which carries no accent, and
under *les pays* there is no biggest circle at all. The temptation is to let the accent follow each
view's own largest mark. It is refused, for the reason `web-discipline.md` states as a rule and the
treemap beat states as a measurement: **the accent on the subject is drawn unconditionally**, and a
page whose claim names India cannot let India go grey when the reader touches a control. So India and
Qatar keep the accent in all three states — and what that buys is the argument itself made visible:
the accented circle that is the largest object on the plate under *les habitants* is visibly a
quarter of an unaccented neutral one under *le CO₂*. China's number is named in that option's own
sentence, which is where a revealed reading belongs.

The accessibility trap the sheet files — a value label painted in the mark's colour, under the text
floor — is spent as the sheet asks: both callouts are the page's neutral ink on the format's own
ground chip, calibrated against the ground each direction actually paints, never in the accent.

## Treatments spent

- `the-distribution-is-furniture-and-the-case-is-ink` — the swarm is drawn quietly in every
  weighting and the accent is spent on the two derived cases and nowhere else.
- `a-countable-field-is-paired-with-its-own-figure` — the field of marks is a quantity, and each
  weighting states its own total as a figure in the sentence it reveals rather than leaving it to
  be summed by eye.
- `the-subject-is-ringed-not-recoloured` — the mark under the pointer darkens **from its own fill**,
  measured against that fill in each direction; no dot is plastered over it.

## The marks are round, and what it cost — a finding about the format, not about this beat

A packed field is the one geometry in this format whose honesty depends on the two axes being scaled
by the same number. `preserveAspectRatio="none"` plus the window-fit rule (`.chart-plot` absorbs the
whole shortfall when the figure would exceed `100dvh`) guarantees they are not: a circle becomes an
ellipse, the packing's clearance is no longer the clearance drawn, and area stops encoding.

The first render of this beat, at a 900 x 470 frame, drew India **100 px wide and 78 px tall** at
1440 x 900 — a 28 % distortion, plainly visible. Nothing in the format, in `verify-web` or in this
beat's own refusals could see it; it was found by looking at the capture.

It is largely fixable by choosing a frame whose preferred height the window does not have to take
away. At **900 x 360** the mark is measured, in a driven browser, at:

| window | mark, w x h | w/h |
| --- | --- | --- |
| 1440 x 900 | 11,8 x 12,1 px | **0,97** |
| 1024 x 768 | 8,3 x 8,2 px | **1,01** |
| 768 x 1024 | 6,1 x 5,9 px | **1,03** |
| 1920 x 950 | 15,9 x 13,6 px | 1,17 |
| 375 x 812 | 2,8 x 2,2 px | 1,26 |
| 1600 x 800 | 13,1 x 10,0 px | 1,31 |
| 1280 x 720 | 10,4 x 7,9 px | 1,32 |
| 3440 x 900 | 28,7 x 12,5 px | **2,29** |

Round where the window is tall enough to grant the frame its own aspect; flattened exactly in
proportion to how much height the fit rule takes back. The ultrawide row is the fit rule at its
limit — a 3392 px plot in a 900 px window — and no fixed frame can survive it, because the frame
would have to shrink with the reader's width, which is not something a build can know.

**And going further was refused, by this beat's own vocabulary.** A 900 x 280 frame is round at
1600 x 800 and 1280 x 720 as well (the arithmetic is `H = (available - axis row) x 900 / plot
width`). Rendering it fails: at that height the ladder can only afford 3,8 % of the band in ink, 148
of 213 marks fall onto the visibility floor, and **they carry 8,87 % of humanity** — over the 8 %
ceiling. The refusal is worth quoting because it is the whole argument for having written it:

> *option "les habitants" draws 148 of 213 marks on the visibility floor, and they carry 8,87 % of
> its weight (ceiling 8 %). A mark on the floor no longer draws what it weighs, so at that share the
> swarm's width is measuring the floor rather than the quantity the option names.*

Roundness and floor-honesty pull against each other on a packed field, and 360 is where the second
one stops the first. That is a measurement, not a taste.

## What the three renders show

**`creme`, *les habitants* (the default, and the static sibling's own picture).** A dense wall of
circles under 5 t falling to almost nothing past 15 t, India's accented circle the largest object on
the plate and sitting *left* of both reference rules — which is the headline, drawn. The tail from
20 t to 40 t is a scatter of floor-sized dots: six countries, and you can see that they are six.

**`creme`, *les pays*.** The picture the type is famous for, and it is a different picture: 213
identical dots, a tall column at the left edge falling away in a smooth curve to single dots past
10 t. India is one small blue dot among them — the whole point of the option. The caret slides right
and comes to rest **exactly on the median rule**, which is not a coincidence but the definition of a
median and reads as one: the two objects are drawn by different code from different arithmetic and
they land on the same pixel.

**`creme` and `nocturne`, *le CO₂*.** The one the control was built for. The mass swings right:
China at 8,6 t is a circle 133 px across, the United States at 14,3 t is the second, and the caret
travels from 80 px to 265 px. India's accented circle is still there and is now visibly **half
China's radius** — the country with the most people in the world, drawn a quarter the size of the
one beside it, in the same frame, on the same axis, with nothing recoloured. On `nocturne` the mint
reads cleanly against the muted purple field (10,93:1) and the picture is the strongest of the nine.

**`rapport`** is `creme`'s geometry on a white ground with a deeper blue accent (7,31:1); nothing
differs but the palette and the header treatment, which is what a direction is.

Three things the captures taught, all fixed above: the ellipses; a sentence that opened *"la Chine"*
lower-case because the name is filed with its article for mid-sentence use; and a `fill-opacity: 0.8`
sitting on a calibrated fill, which meant every contrast in `PALETTE.md` described a colour the page
did not paint.

## Verification

- `verify-web.mjs` per direction: **creme 99/0/6, nocturne 87/0/5, rapport 93/0/5** (passed / failed
  / skipped — the skips are the filter's, which this beat has none of).
- Driven in a real browser at 1440 x 900, every pill clicked with real mouse events, **once with the
  script on and once with it off**. The two runs are identical to the byte on every measurement:
  one plate displayed (213 marks), exactly one sentence revealed, the caret at **80,5 / 97,1 /
  264,7 px**. The control is CSS; nothing here needs a script.
- Hover exercised inside the carbon view: pointing at India answers *« India · 2,1 t/personne ·
  3 063 Mt de CO₂ · 8,28 % du CO₂ mondial · 3,7 % du CO₂ est émis plus bas »* — four readings, none
  of them on the plate, none of them the same as the default view's answer for the same mark — and
  the circle darkens off its own fill in all three directions.
- The first tick cost a render: an axis graduation at 100 % puts half of "45 t/personne" outside the
  plot and pushed the document **15 px wider than the window at all seven widths**, phone included.
  The scale still runs to 45; the last graduation a reader is given is 40.
- `bun test skills/chart-web/test skills/splash/test/web-interaction-changes-the-picture.test.ts
  skills/splash/test/no-cross-skill-imports.test.ts
  skills/splash/test/filter-vocabulary-parity.test.ts` — **410 pass, 1 fail**, the one being
  `chart-web — the canon's assets … preview.png is a current render of the seed`, a stale committed
  render of a seed this beat does not touch.

### Mutations

1. **The swarm weighed by the axis variable itself** (`weight = c.value`). Refused in all three
   directions with the measurement: *Spearman rho 1.0000, ceiling 0.95*. The runner exits 1 and takes
   the stale renders off the disk, so a refused page cannot look like a produced one — verified by
   listing the directory, which came back empty.
2. **The frame shortened to 900 x 280** to buy roundness at two more widths. Refused by the floor
   share at 8,87 % against 8 %, quoted in full above. This is the mutation that turned a design
   decision into a measurement.
3. **`weighCss` dropped from the beat's stylesheet.** Refused by `assertOneWeighing` reading the
   written page back — *nothing in the page's stylesheet reveals the weighting "people"*. `descend.ts`
   records the version of this that went green; it is red here because the check was written from
   that record.
4. **The drawn circles lose their `data-weigh`.** Refused by name: *the mark "AFG" is drawn with no
   data-weigh … a half-tagged datum is drawn in every state at once.*
5. **The blanket hide emitted AFTER the default plate's reveal — and this one went GREEN.** The
   render passed, `verify-web` reported 99/0/6, and a driven browser showed the page working
   perfectly. The reason is worth more than the fix: the DEFAULT option has its own
   `:has(#…:checked)` block scoring (1,3,0) against the base pair's (0,2,1), so in an engine with
   `:has()` the base pair decides nothing at all. It decides everything in an engine **without** it,
   where the swap leaves `display: none` last and the page ships a beeswarm with no marks in it.
   Neither the render path nor the verifier can see that, because both are Chrome. `assertOneWeighing`
   now checks the two rules' **order** rather than their presence; re-run, the mutation is refused.

## Source

Global Carbon Budget 2025 · population 2023, via Our World in Data · 213 countries. `data.csv` is a
byte-for-byte copy of `proof/static-beeswarm-co2-per-person/data.csv`, re-parsed independently here.
The country names on this page are the **source's own**, and the page says so: 213 hand-filed French
names is far past the point where a wrong translation inside a tooltip would be caught. Only the two
derived callouts, which also appear in the headline's prose and in the alt text, are named in French.
