---
format: web
type: radar
medium: chart
grounding: supported
derived: v1
---

# Beat — France et Allemagne produisent presque autant d'électricité et n'ont presque aucune source en commun (web)

**Type:** radar (spider). **Medium/format:** chart / **web**. **Frame:** fluid in width, fixed in
proportion — a radial geometry cannot stretch, so this page letterboxes.

## Claim

In 2024 France generated **562 TWh** and Germany **496** — within **12 %** of each other — from mixes
that share almost nothing: nuclear **67,7 % against 0**, wind + solar **12,5 % against 43,5 %**, coal
**0,2 % against 21,4 %**. The beat throws if the two totals are not within a fifth of each other or
if the nuclear gap is under 50 points.

## The catalogue's trap, and why this page does not dress it up

`references/types/radar.md` does not warn about a decoration on this type. It says the type itself
misreports:

> a polygon's AREA (the thing a reader's eye actually judges at a glance) is sensitive to axis order
> and count in a way the underlying numbers aren't … this is the type's structural weak point, not a
> bug to be fixed in code.

and, in the accessibility section, that it ships with **no mechanical guard at all** behind that
problem. The static sibling ANSWERS the trap the only way a still can: it picks one set of axes in
one arrangement, states it on the plate, and asks the reader to trust it. That is the honest maximum
of a still. It is not the maximum of this format.

## The gesture changed, and the reason is the owner's verdict rather than a better idea

This page shipped twice on the ORDER half of that sentence: the reader handed the eight axes round
the circle and watched both areas move while no number changed. The owner read it and asked *«
pourquoi les labels changent d'ordre au filtre ? »*. A warning sentence was added under the pills,
saying before any press exactly what pressing would do. He read it again and wrote: **« Les labels
"nucléaire", "éolien", etc bougent avec les filtres alors qu'il n'y a pas lieu d'être. »**

He had a legend reading « Ordre des axes » and pills reading « sur la France », « sur l'Allemagne »,
« au plus flatteur pour la France » in front of him, and he still read them as FILTERS — which is
what a row of pills over a chart is, everywhere else on the web and in six of this family's own eight
vocabularies. Under a filter, an axis label that moves is a bug and not a finding. So this was never
a labelling defect. **It was the gesture, and the gesture is gone.**

**The standing consequence: no axis label moves, ever, in any state this page can reach.** The eight
spokes keep their angle and their name for good.

## The gesture now: the reader chooses WHICH SOURCES ARE COUNTED IN THE SHAPE

The catalogue's sentence has two halves — order AND **count** — and the count half is the one a
newsroom actually decides. Nobody shuffles axes at random. Everybody chooses which sources go into a
comparison, and the choice is made in an editorial meeting, not by a layout engine.

A source set aside stays drawn, stays named, and keeps both of its vertices exactly where they were.
It did not stop being true. What it stops doing is being a corner: the two outlines close over it.

Measured on the frozen file, with `countedOutline` and `enclosedArea` — the vocabulary's own two
functions, the same ones the component builds its paths with:

| what is counted | axes | France's shape | Germany's shape | Germany ÷ France |
| --- | --- | --- | --- | --- |
| **les huit** (the plate) | 8 | 1,80 % of the disc | 2,61 % | **1,45×** |
| **sans le nucléaire** | 7 | 0,33 % | 2,99 % | **9,16×** |
| **le bas-carbone** | 5 | 1,52 % | 1,26 % | **0,83×** |
| **les pilotables** | 6 | 2,30 % | 1,47 % | **0,64×** |
| across the 37 counts that drop at most two of the eight | | 0,17 % … 2,30 % (**×13,53**) | | **0,59 … 18,89** |

Not one of the sixteen numbers changes between any two rows, and not one label moves. **In 12 of
those 37 counts the eye's answer to the only question a radar invites — *who covers more of the
circle?* — is the other country.**

### Why these three subsets and not three draws from the 219

Each is a line somebody argues about in an energy newsroom, which is the whole point: a subset nobody
would defend proves nothing about how a radar is read in practice.

- **sans le nucléaire** — the single axis the French mix is built on, and the one every comparison of
  "renewables" quietly drops. It takes the answer further the way it already pointed: 1,45 to 9,16.
- **le bas-carbone** — the standard European frame, and it **turns the answer over**: France covers
  more of the disc than Germany under it, 0,83.
- **les pilotables** — wind and solar set aside. Two axes leave the count and **the French shape gets
  BIGGER**, 1,80 % to 2,30 %. That is the finding no subtraction vocabulary can express: a small
  reading was pulling the outline in, and closing over it lets the outline out.

The runner refuses to render if no offered subset turns the answer over, and refuses if France's area
moves by less than a factor of two across the 37 — the page's argument is asserted against the frozen
file, not assumed.

**The span is quoted over the modest space on purpose.** All 219 subsets that still close into a
shape include three-spoke slivers whose area is near zero, and the ratio between two near-zero areas
runs into the hundreds. True, and worthless as an argument. The 37 counts that drop at most two
sources are every one of them a comparison somebody could publish with a straight face, and the
finding holds there.

## The interaction, control by control

### 1. Sources comptées — the count

- **The reader's question:** *« Si on ne comptait pas cette source-là, est-ce que je lirais la même
  chose ? »*
- **The gesture:** four native radios, one per count, plus CSS generated at build time. No script.
- **What the page says BEFORE the gesture:** the reserved row under the pills is not empty at rest.
  It carries one sentence — *« Les boutons ci-dessus retirent des sources du compte : les huit axes
  gardent leur place et leur nom, les sommets restent posés, la forme cesse d'y passer. »* — between
  the control and the circle it changes. This is the one thing kept from the version this replaces,
  and `count.ts` refuses a declaration that has none.
- **What changes in the picture:** the set-aside spokes go dashed, their names go to a measured fade,
  their vertices become open rings at the same coordinates on the same readings, and both outlines
  travel off those vertices and close over them. The readout on the plot and the sentence under the
  control both state the two areas this count produces and the ratio between them, against the
  plate's own 1,45×.
- **And the change is a TRAVEL, not a swap.** `countedOutline` walks the frame and returns ONE POINT
  PER SPOKE in every state — a counted spoke contributes its own vertex, a set-aside one contributes
  the point where the closing chord crosses it. Every state's path therefore has the same segments in
  the same order, a CSS `d` interpolates it, and the reader watches the edge peel off the vertex it
  stops counting while the vertex stands still.

### 2. Asking a vertex — `ask-a-mark` (kept from the plate)

- **The reader's question:** *« Cette pointe, elle vaut combien exactement ? »*
- **What changes:** the vertex answers with the country, the source, its share to one decimal, the
  TWh behind it, and **what the other country has on the same axis**. These sixteen readings are
  identical in every state — they are the part of this page the count cannot touch, which is the
  editorial point restated on a second channel. A **set-aside** vertex adds one clause: *hors du
  compte : la forme ne passe plus par ce sommet*. It must not answer as though it counted.

### What this page earns over a still, a video and a scrolly

A still shows one set of axes and must ask for trust. A video could animate between two, but the
viewer never gets to ask *what about counting these instead* — and a sequence the author controls is
an argument the author is still making. A scrolly has the same problem one gesture down. **Only here
does the reader get to make the editorial choice themselves and watch their own takeaway invert while
every number on the page stays put and every label stays where it was.**

## What must NOT sit behind the control, and does not

The claim is the two mixes, not the two shapes. Every state draws **both** outlines, **all sixteen**
vertices and **all eight** names, and the caveat — nuclear 67,7 against 0, wind + solar 12,5 against
43,5, the two totals — is printed unconditionally in every state. **The measured span (0,17 % …
2,30 %, and 12 counts of 37 turning the answer over) is printed on the plate too**, not behind a
gesture: the lie is the page's own finding and a reader who touches nothing must still be told it.
The control only lets them watch it happen.

## The vocabulary

**`filter.ts` was read first and is REFUSED here, with the reason.** A filter's own promise is *"the
marks outside a named set LEAVE, and the frame they were measured against does not move."* Here
nothing leaves: a set-aside spoke keeps its angle, its name and both of its vertices. What changes is
not the population of the picture but the population of ONE ARITHMETIC — the closed outline — and a
vocabulary whose every rule is "this key is gone" cannot say "this key is still on the page, still
true, and out of the sum". `filter.ts` is also, deliberately, a set of keys and nothing geometric;
the whole product of this gesture is geometric.

**`withdraw.ts` was read second and is REFUSED too.** Its arithmetic belongs to a waterfall —
`resteps`, `cuts`, `close`: a running total, a bar that shortens, the rest of the sequence that
re-lands. A closed outline has no running total and no rest of the sequence. Removing a term does not
shorten anything; it replaces two edges with one, and **the area can go UP** — which `les pilotables`
does, measurably, and which no subtraction vocabulary can express.

`reorder.ts` expresses the gesture the owner rejected and is not used by this beat any more. It is
**not deleted**: another beat may take it, and its arithmetic — the shoelace area of a polygon on
evenly spaced spokes — is still correct. `stack.ts`, `level.ts`, `fold.ts`, `brush.ts` and `trace.ts`
were checked too: none has a vocabulary for *which terms are counted in a closed shape*.

**Written instead: `skills/chart-web/assets/count.ts`** — the ninth mechanism, the same radios +
generated CSS, not one byte of JavaScript. What it owns that no other file does is `countedOutline`
plus `enclosedArea`: the outline through a counted subset, built at one point per spoke so it can be
interpolated, and the shoelace over **the very coordinates the page draws**, so the number a refusal
quotes is the number a reader could take off the picture with a ruler.

### Two registers drawn, one shown — and why the vocabulary names nothing but `display`

Being set aside changes a spoke's line, its name's ink and the fill of its two vertices at once, in
three properties on three kinds of element. A stylesheet that flipped each property would have to
name a colour, a dash and a fill, which is the beat's business and not the vocabulary's. So each axis
is drawn TWICE — `data-count-in` and `data-count-out` — and `countCss` reveals one of the two. Every
rule it emits keyed on a count state ends in `{ display: none; }` or `{ display: inline; }`, and
there is a test that says so. It also takes the unshown register out of the hit test, out of the tab
order and out of `verify-web.mjs`'s probe by its own zero-box filter, all three for free.

## The mechanism, and the defect it does NOT have to design around any more

The page this replaces split its drawing from its answers because `interaction.mjs` resolves the mark
under a pointer from `cx`/`cy` read once at init, and no CSS transform ever changes those: its
vertices moved, so the marks that answered had to be baked per state and swapped.

**This gesture moves no vertex at all.** Every dot is at the same coordinate in every state, which is
the whole content of the owner's verdict expressed geometrically. What still differs per state is
what a vertex SAYS, so there is still one transparent hit layer per state — sixteen points that
answer, swapped with `display`, out of the hit test and out of the tab order when unchosen — but
every point in every layer sits at the same place and only the sentence changes.

The lift crossed the drawing/hit-layer boundary and is CSS: a generated `:has()` rule on
`.chart-plot`, keyed on the point, painting the vertex in the colour the beat measured on the vertex
itself. Two rules per mark, because a vertex has two registers — the counted one lights on its
**fill**, the set-aside ring on its **stroke**, because filling the ring would make it look counted.
Driven over every vertex in a set-aside state: **16 of 16 light in their own declared
`--mark-active`, in all three directions.**

And nothing here needs the motion to be correct. Under `prefers-reduced-motion: reduce` the geometry
is set outside the query and the transition inside it, so the picture snaps. With JavaScript disabled
the page is byte-for-byte the same, because nothing in the control is script — driven, the four
states are identical with the script on and off. On an engine with no CSS `d` property the outlines
fall back to one baked `<path>` per state swapped with `display`, behind `@supports not`.

## The vocabulary's own refusals, verified by mutation

Two kinds of mutation, and both were run.

**The guard deleted from `count.ts`, the test re-run.** Each line below is the guard neutered to
`if (false)` and `skills/chart-web/test/count-vocabulary.test.ts` run again. None crashed; each one
reddens exactly the case written for it.

| guard neutered | outcome |
| --- | --- |
| refusal 1 + 4 — a subset already on the page | 2 tests RED ("counts exactly what the plate counts", "the same axes in a different order") |
| refusal 2 — under three counted axes | 1 test RED |
| refusal 3 — the area did not move | 1 test RED |
| refusal 5 — an axis the frame does not draw | 1 test RED |
| refusal 6a — no sentence for the state the page ships in | 1 test RED |
| refusal 6b — an option with no revealed sentence | 1 test RED |
| refusal 6c — an option that prints nothing on the plot | 1 test RED |
| refusal 6d — the plate with no readout | 1 test RED |
| nothing neutered | 24 pass, 0 fail |

**And the REAL runner, mutated.** Two beat-level mutations, both refusing all three directions with
`process.exitCode` 1 and writing nothing:

| mutation | outcome |
| --- | --- |
| `les pilotables` set to count every axis the plate counts | all three REFUSED — *"counts the same axes as « les huit », so it draws the same outline"*, exit 1 |
| the ships-in sentence emptied | all three REFUSED — *"nothing on the page says what this control will DO before it is pressed"*, exit 1 |

### One defect the mutations found, and it was real

Refusals 2 and 5 were **unreachable** as first written. `assertCountDeclaration` computed all four
states' areas up front, so an option counting two axes, or counting a key the frame has not got, was
answered by `countedOutline`'s own throw about a shape it could not close rather than by the refusal
written for it. The plate's areas are now measured up front and each option's inside the loop, after
its keys have been checked. The test is what found it.

### One claim that is structural rather than refused

A vertex and the corner of the outline on it are the same arithmetic done once: the dot is drawn at
`vertices[key]`, and the corner is that same value or a point on the chord between two of them.
`count.ts` is handed the coordinates and builds the path itself, so a beat cannot state a corner that
disagrees with its own dot. That is the defect this family measured at 5,47 user units on the
previous gesture, made unsayable rather than merely refused.

### What is not caught, named rather than implied

Nothing measures that a declared frame's order is the ring's own angular order. A beat that handed
`count.ts` its axes in an order its drawing does not use would get an outline walked through the
right vertices in the wrong sequence — a star, consistently, with every dot on it.

### One finding worth recording rather than hiding

On this beat's own data the AREA refusal (refusal 3) is unreachable: a subset that changes which
axes are counted and leaves both areas within half a percent needs a vertex sitting exactly on the
chord its neighbours close along, and no such configuration exists in this frozen file. The guard is
live and it is exercised in the test, on a hand-built pentagon whose third vertex IS the midpoint of
its neighbours. That fixture exists for exactly this reason, and the test says so.

## What looking at the renders showed

**The gesture reads, and the reversal is visible.** In `les pilotables` the two German rings for wind
and solar sit clearly outside the closed grey shape — the data is still on the page and the shape no
longer counts it — while the French sliver visibly widens. In `sans le nucléaire` the French nuclear
vertex is an open ring far out on a dashed spoke, its name faded, and France's shape has collapsed to
almost nothing; it is the single strongest frame of the argument.

**And the honest complication the previous pass recorded still holds.** Even in `le bas-carbone`,
"France covers more" is not something the eye reports confidently: both shapes are small and close to
the centre, and a thin spike and a squat blob are hard to compare by area at all. That is the same
indictment one notch stronger — a radar's area is not only choice-dependent, it is barely readable —
and it is why the page PRINTS the two areas on the plot rather than leaving them to be judged.

Changes the renders forced, in order:

1. **A pill's accessible name dropped its own visible words.** `sans le nucléaire` announced *« Ne
   pas compter le nucléaire… »*, which does not contain the label. All three directions REFUSED on
   WCAG 2.5.3 before anything was written. Rewritten.
2. **`nocturne` did not fit a 375 × 812 window** — 874 px against 812, then 838 after a first trim.
   The notes row is sized by its longest sentence and the pills wrap. The four sentences and the
   reading line were cut, and the pill labels shortened (`les sources bas-carbone` → `le
   bas-carbone`). All three directions now measure exactly their window.
3. **A `→` in one sentence refused all three directions** — it is in no house family, and the font
   subsetter returned HTTP 400 on the glyph. Rewritten in words.
4. **The first reading line quoted the span over all 219 subsets** and read as a trick: ×551 and a
   ratio to 463, both true and both driven by three-spoke slivers. Restated over the 37 counts that
   drop at most two sources.

## Verification

- `verify-web.mjs` on all three filed directions: **creme 101 passed / 0 failed / 7 skipped**,
  **nocturne 89 / 0 / 7**, **rapport 89 / 0 / 7** — the counts this beat had before the re-gesture,
  with nothing newly skipped.
- **Measured on the delivered HTML rather than on intention**, in all three directions: the eight
  names are at the same eight places in all four states and no rule keyed on a count state transforms
  or re-anchors anything (56 count rules, none of them a transform); each state's outline passes
  through every counted vertex, through no set-aside one, and closes along the chord between the
  nearest counted neighbours instead; the areas and ratios the page announces are the ones its own
  emitted paths measure; and across the four hit layers every set-aside vertex says it is out of the
  count and every counted one does not (64 answers per direction).
- **Driven in a real browser at 1280 × 800, with the script and with the script disabled**, through
  all four states: identical in both, one hit layer shown per state, one sentence, one readout, the
  right number of dashed spokes and open rings, and `.chart-plot` at the same top and the same height
  in every state (creme 195/528, nocturne 233/490, rapport 190/532) — the plot never moves when a
  pill is pressed.
- **Every vertex answers a real pointer on its own mark, 16 of 16 in a set-aside state**, in all three
  directions, lighting in its own declared `--mark-active`.
- Contrast measured on the colours the page really paints, not on the formula: see `PALETTE.md`, "The
  set-aside register".

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` is a byte-for-byte copy of `proof/static-radar-electricity-mix/data.csv`.

## The choreography

The declaration below is this beat's own `const interaction`, in the shape
`chart-web/scripts/choreography.mjs` cuts out of a source. It lives here rather than in
`render-directions-web.mjs` because this beat's controls are built by a vocabulary of its own that
`shippedControls` cannot see, so no plan travels with the render — the reason the section above
already records. The block under it is what the parser reads out of it.

```js
const interaction = {
  earns:
    "A radar's only real question is who covers more of the circle, and the answer depends on which " +
    "sources were counted — a choice made in an editorial meeting, not by a layout engine. In 12 " +
    "of the 37 counts that drop at most two of the eight, the eye's answer is the other country, and " +
    "a still can only ever draw one of them.",
  controls: [
    {
      question: "Si on ne comptait pas cette source-là, est-ce que je lirais la même chose ?",
      gesture: "toggle-a-comparison",
      changes:
        "A source set aside stays drawn and stays named: its spoke goes dashed, its name to a " +
        "measured fade, its two vertices to open rings at the same coordinates on the same readings, " +
        "and both outlines travel off those vertices and close over them. The readout states the two " +
        "enclosed areas this count produces and the ratio between them, against the plate's 1,45×.",
    },
    {
      question: "Cette pointe, elle vaut combien exactement ?",
      gesture: "ask-a-mark",
      changes:
        "The vertex answers with the country, the source, its share to one decimal, the TWh behind it " +
        "and what the other country has on the same axis — sixteen readings identical in every " +
        "count, except that a set-aside vertex adds that the shape no longer passes through it.",
    },
  ],
};
```

```json splash:choreography
{
  "kind": "pointer",
  "promiseSource": "slot",
  "controls": [
    {
      "order": 1,
      "gesture": "toggle-a-comparison",
      "input": "tap"
    },
    {
      "order": 2,
      "gesture": "ask-a-mark",
      "input": "hover"
    }
  ],
  "keyboard": true,
  "degradesTo": "static-frame"
}
```

## Precision

```json splash:precision
{
  "kind": "pointer",
  "rounding": null,
  "asserts": [],
  "values": {},
  "staticFloor": [],
  "onDemand": [],
  "unfound": [],
  "covers": {
    "claim-datum": null,
    "every-axis-keeps-the-same-fixed": null,
    "the-beat-throws-if-the-two": null,
    "the-page-prints-the-measured-span": null,
    "asserted-in-the-js-off-floor": null
  }
}
```
