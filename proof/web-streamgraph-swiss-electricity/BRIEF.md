---
format: web
type: streamgraph
---

# Beat — Le solaire suisse est passé de 0,01 à 7,89 TWh, troisième source depuis 2016 (web)

**Type:** streamgraph. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Between 2000 and 2025 Swiss solar generation went from **0,01 to 7,89 TWh**, and **in 2016 it passed
oil to become the country's third source**, behind hydropower and nuclear — and has held third every
year since. The rank, the year it was first reached and the fact that it held are all computed, and
the beat throws if the source reached third and then lost it.

## The reader's question, and why the still cannot answer it

*Is this band growing, and by how much?*

A streamgraph is the moving-floor problem at its most extreme, and on this data the floor moves more
than the bands do. Measured on the plate this beat actually draws (900 x 400 viewBox, 4,5936 units
per TWh):

| band | its own 25-year growth | how far its floor wanders | ratio |
|---|---|---|---|
| hydraulique | 69,1 u | 47,2 u | 0,68 |
| nucléaire | 39,3 u | 31,0 u | 0,79 |
| **solaire** | **36,2 u** | **53,7 u** | **1,48** |
| biomasse | 3,9 u | 44,8 u | 11,60 |
| gaz | 3,5 u | 49,3 u | 14,12 |
| autres renouv. | 2,5 u | 46,2 u | 18,28 |
| pétrole | 1,2 u | 46,6 u | 38,98 |
| éolien | 0,8 u | 48,5 u | 58,69 |
| charbon | 0,0 u | 46,2 u | infinie |

**Seven of the nine bands move their floor further than they ever move their own thickness**, the
headline band among them: solar's ground shifts 53,7 units across the record while solar's entire
rise is 36,2. Between 2024 and 2025 alone solar's floor drops 40,8 units while solar itself thickens
by 10,2 — the eye is handed a 4:1 signal pointing the wrong way. And because the offset is centred,
**zero of the nine bands rest on a straight line**; there is not even one honest band to read the
others against.

## Does the stacked bar's answer transfer? The idea does, the vocabulary does not

`proof/webx-electricity-mix` (commit `603d150b`) answered the same trap by letting the reader choose
which band rests on the baseline, reusing `stack.ts` — a `StackedColumn` being `{ key, dx, dy }`, one
rigid displacement per member.

That cannot express this. Re-basing a stacked column is a translation; re-basing a stream is a
**shear**, because the correction needed is a different number at every step. To put solar on a
straight floor the plate must lift 2000 by 61,2 units and 2025 by 104,0 — **a 42,8-unit spread
inside one band, larger than that band's whole 36,2-unit growth**. A single `dy` per band would be
wrong by more than the thing it exists to show. So the gesture transfers and the file does not.

## The gesture — `floor.ts`, a new vocabulary: what the picture may STAND ON

The reader chooses which band is laid flat. The whole stream shears vertically so that band's own
bottom edge becomes a straight rule, every band keeps its exact shape and its exact place in the
order, and nothing is repainted — the ramp encodes stack position and stack position is what the
shear preserves.

**And then the page hands back the thing this type forbids.** The static sibling's confessed debt is
`a-free-baseline-forbids-a-value-axis`: *"no band is measured from a fixed zero, so a value axis
would be a lie."* Under a chosen option that stops being true for the chosen band — its floor **is**
a fixed zero — so a real y-axis in TWh appears in the gutter, with dashed graduations across the
plot, and leaves again when the reader leaves the option. The reader earns the axis.

**Which bands are offered is arithmetic, not taste.** An axis a reader cannot read is not an axis, so
an option must carry at least two labelled graduations spaced no closer than the axis register's own
leading — `leadOf`, the widest of the three filed directions (13,20 px at the canonical 1:1 mapping,
`creme` and `rapport`; `nocturne` is 12,00). That admits hydraulique (peak 206,4 u), nucléaire
(128,3 u) and solaire (36,2 u), and refuses pétrole (6,4 u), autres renouv. (5,4 u), biomasse
(4,8 u), gaz (4,7 u), éolien (0,8 u) and charbon (0,0 u) — every one of them too thin to hold a
second graduation. Six refusals the file makes by measuring, before anything is drawn.

## What changes in the image

The control reads **Au sol · Silhouette / Hydraulique / Nucléaire / Solaire**. Choosing one:

- re-draws the nine band paths at their sheared places (`floor.ts` owns the shear; each option's
  plate is drawn once, at its own place, and the stylesheet reveals one);
- lays a solid, ground-cased floor rule under the chosen band and dashes a graduation at each tick;
- opens the y-gutter and fills it with TWh labels — nothing in the default state, where they would
  lie. Hydraulique earns 0–40 in tens, nucléaire 0–25 in fives, solaire 0–5 in fives;
- **moves** the three in-band names rather than hiding them: one generated rule per name per option,
  so every argument-bearing word stays drawn in every state of the page, which is what the format's
  own default-view check requires and what `assertFloorDeclaration` refuses an option for forgetting;
- carries the 2016 crossing marker and its sentence with the band they belong to.

## The readout had to change too, and that is the control's price

The page shipped 234 hit points, one per band-year, each at the centre of its band. A shear moves
every one of them, and `interaction.mjs` resolves a pointer off `cx`/`cy` read once at init — so
under any option each point would have answered for the place its band used to occupy. That is the
worst answer an interactive chart can give, and `603d150b` paid for the same lesson.

So the reading is now **one point per year**, at an x that no option ever moves, wired by
`data-mark-ref` to a full-height guide that lights across the whole stream. Its detail carries the
year, the year's total, and all nine sources **in rank order** — which is strictly more than the old
per-band point gave, and it is where the reader reads the claim itself: solar sits fourth in 2015 and
third in 2016, and stays there.

## Treatments spent

- `a-free-baseline-forbids-a-value-axis` — spent in the default state, where the page carries no
  value axis at all and prints the total at both ends instead. **Suspended, not broken, under an
  option**: the axis is revealed only for the one band whose zero has been made real, and the note
  under the control says so in the beat's own words.
- `a-band-is-named-inside-itself-or-it-is-texture` — the three bands thick enough carry their names
  where they are thickest, clamped away from both edges, in every state; the thin ones are named by
  the pointer.

## What the render taught, and it was found by the format's own probe

`verify-web` points at the widest label over the plot and requires the pointer to reach through it.
At 375 px it reached `.floor-notes` instead of the chart: the crossing sentence was lifted by
`translateY(-160%)`, a lift stated as a fraction of the note's **own** height, which doubles the
moment the note wraps — 30 px on one line at 1280 and 61 px on two at 375, putting the whole sentence
35 px above a plot that starts at y=490. A lift that grows with its own content grows **out of** the
frame. It now hangs a fixed 10 px BELOW its point, into the plot, on the ground chip `.note` already
carries.

## What the owner's read taught — the ink was solved against the wrong thing

*« le petit cercle et texte "solaire" en noir sont pas très lisibles »*, on `renders/rapport.html`.

Both words in that sentence are the same defect. The in-band names were solved fill by fill
(`inkOnFill`), and that rule **flips pole between band two and band three**: on `creme`, hydraulique
and nucléaire take the ground (6,64:1 and 5,40:1) while solaire takes black (4,71:1). The flip is not
a taste failure — a mid-tone fill runs both poles out of room at once, and **4,76:1 is the ceiling**
for any ink at all on solaire's fill. There is no colour that answers.

The 2016 marker was worse, and for something the fill-by-fill rule could not see: it is r=6 on a band
that is **6,11 units thick in 2016**, so it crosses **four** fills (nucléaire, solaire, biomasse,
éolien) and was measured against none. On `nocturne` its white stroke lands on the mint end of the
ramp at **2,00:1** — under the non-text floor, an invisible marker on the one year the claim turns
on. Nobody had looked at the dark direction for this.

Both take the ground casing the floor rule on this same plate already used, and both are refused in
the component: the casing against **every step of the ramp** (≥ 3,05:1 by construction, since the
ramp was lifted to that floor against this exact ground) and the ink against the casing
(20,41 / 21,00 / 17,78). Worst in-band name **4,71:1 → 20,41:1**; ring **2,00:1 → 17,78:1**. A chip
is also what the format's own `.end-label` ships by default — this beat had overridden it to
`background: transparent`, which is where the compromise came from.

## Verification

`verify-web.mjs` per direction: **creme 99/0/6, nocturne 93/0/5, rapport 93/0/5**. The control driven
in a real browser with real clicks and with the keyboard, once with the script on and once with it
off — identical in both, except the pointer readout, which is the only thing a script is for here.

Three mutations held; **a fourth went green, and that is itself the finding**:

- an option whose shear is constant end to end — refused, "the band it lays flat already rests on a
  straight line, so choosing this option renders the picture the page already ships";
- an option that forgets to re-place one carried name — refused, by name;
- dropping the derived spacing floor from 13,20 units to 1 — the offered set grows from three bands
  to seven, so the refusal is the measurement and not a list;
- **swapping the two plate rules in `floorCss`** so the blanket `display: none` is emitted AFTER the
  default plate's `display: inline` — the page then ships a streamgraph with **no bands drawn at
  all**, and `verify-web` reported **99 passed, 0 failed**. Nothing in the verifier looks at whether
  a plate's geometry is on screen; it counts words, `.pt` marks and opacities, all of which survive.
  Same shape as the sankey on this branch that rendered green with zero ribbons lit. Not fixed here:
  `verify-web.mjs` is shared and five sibling agents are in this tree.

Three more, run for the casing:

- the ramp keeps no non-text lift against the ground — refused in all three directions, the casing
  at 1,37:1 / 1,37:1 / 1,54:1 against the nearest band;
- the plot's ink is made a step of its own ramp — refused on `creme` (4,33:1) and `rapport`
  (4,41:1); `nocturne` **stayed green, correctly**, because a mid-ramp mint does clear 4,5:1 against
  that direction's dark ground. The guard measures the pair, not the identity;
- the casing thrown away at the paint site (`background: transparent` on the names, the ring's
  ground circle deleted) — **green everywhere, and `verify-web` reported 99/93/93 with 0 failed**.
  The refusals above measure the *values*; nothing mechanical checks that the paint actually uses
  them, and nothing in `verify-web` measures a word against what is behind it. Same family as the
  swapped plate rules above. Not fixed here: `verify-web.mjs` is shared and sibling agents are in
  this tree.

One gap named rather than papered over: `interaction-plan.ts`'s `shippedControls` discovers a
control by its radio-id prefix and knows `chart-filter-`, `chart-stack-`, `chart-level-` and
`chart-cutoff-` only, so a `chart-floor-` group is invisible to the format's mechanical "every
control changes the picture" refusal — as `fold`, `brush` and `trace` already are. This beat
therefore ships no `interaction` plan (declaring a gesture the detector cannot see is refused), and
the refusal is made instead by `assertFloorDeclaration`, in the vocabulary's own terms: an option
whose shear is constant end to end is the default under a second name, and it throws.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data ·
Switzerland, 2000–2025. `data.csv` is a byte-for-byte copy of
`proof/static-streamgraph-swiss-electricity/data.csv`.
