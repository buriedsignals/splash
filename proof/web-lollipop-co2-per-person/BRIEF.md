---
format: web
type: lollipop
medium: chart
grounding: supported
---

# Beat — La Chine a triplé son CO₂ par personne ; l'écart avec l'Américain moyen est passé de 7,5 à 1,7 (web)

**Type:** lollipop (paired). **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Among the six countries with the largest **total** emissions in 2023 — 63,9 % of the world's CO₂ —
China's per-person figure went from **2,87 to 8,56 t** (×2,98) while the United States fell from
21,40 to 14,32. **The ratio between the two averages fell from 7,5 to 1,7.** The six are a computed
rule, not a pick: per-person × population, ranked. The beat throws if the subject did not roughly
triple, if the ratio did not fall into that band, or if the six do not carry most of the world's
emissions.

## Why a lollipop and not the dumbbell next door

A dumbbell draws the **gap** and says nothing about how far either end is from nothing. A lollipop
pair draws each state as its own stem **from zero**, so the two LEVELS are the first reading and the
gap the second — which is what this claim is about.

- `two-states-of-one-measure-are-one-hue-at-two-chromas` — the earlier state is a lighter tint of the
  later state's own hue. Not grey, not a second hue.
- `every-bar-labelled-lets-the-axis-go` — both values are printed above their own heads, so the page
  carries a zero line and its unit instead of a value axis.
- `the-subject-is-ringed-not-recoloured` — the chroma axis is already spent on the two dates, so
  China is ringed on its 2023 head rather than given a hue of its own.

## THE INTERACTION, WRITTEN BEFORE THE CODE

### What this page earns

The still fixes **two endpoints the author chose**: 7,5 then, 1,7 now, China against the United
States. Every other ratio on the plate is left for the reader to do in their head, and the drawn
order actively hides the one thing a per-person chart is for. **These six are ranked by TOTAL
emissions — per-person × population — so the order on the page is not the order of the levels it
draws**: India is third on the plate and last of the six per person; China is first on the plate and
was fifth per person in 2000.

A still cannot lay one country's own two levels flat across the other five, and a video cannot let
the reader choose which country that is. Here they choose — and what comes back is the fact the
total-emissions order buries: **three of the six changed level rank in twenty-three years** (China
5th → 4th, Iran 4th → 3rd, Japan 3rd → 5th), and **the Japanese average, 7,94 t, now sits between
where China was in 2000 and where China is in 2023**. Japan emits less per person than China. That
sentence is printed nowhere on the plate and no still of this claim can hold it.

### Control 1 — the yardstick

- **The reader's question.** « L'écart, moi je le veux avec ce pays-là — il est où par rapport aux
  cinq autres, et qui est passé entre ses deux niveaux ? »
- **The gesture.** `find-your-own-case` — the `level.ts` vocabulary: radios plus CSS generated at
  build time, `:checked` and `:has()` on the figure, no listener, no script. Its `y` marks, laid
  **flat**, which is the form that file was written for and the form this shape needs: on a lollipop
  the value axis is vertical, so a country's own levels are two horizontal references. **Nothing is
  widened.** The dumbbell needed `x` (its value axis is horizontal); this one needs neither that nor
  `angle`.
- **What changes in the picture.** Two dashed references lie flat across all six pairs at the chosen
  country's 2000 and 2023 levels, each on a ground casing so it stays readable where it crosses a
  stem, a head or a gridline. Its own two heads take an ink ring among twelve that keep only the
  colour their state gave them; its name takes full ink and the five others step back. A sentence
  under the control gives three readings the plate does not print: its **level rank** in 2000 and in
  2023 (which the total-emissions order hides), **how many times the highest of the six out-emitted
  it** per person at each date — the headline's own arithmetic, generalised to whichever country the
  reader picked — and **which of the five others sit today between its own two levels**.
- **What it does not touch.** The title, the caveat, the selection rule, the twelve printed values
  and China's ring are drawn in every state of this page. The reader chooses what the picture is
  measured against; they cannot switch the claim off.

### Control 2 — the pair

- **The reader's question.** « Une moyenne par personne, c'est une division. Combien de personnes ? »
- **The gesture.** `ask-a-mark`. The pair answers with the **weight** behind the ratio — the
  population it was divided by, the country's own total in gigatonnes, and its share of the world —
  none of which a per-person encoding can draw at all, and all of which a reader needs before setting
  China beside Japan.
- **What changes in the picture.** The pair under the pointer, the finger or the key takes an ink
  halo on both its heads — the two shapes the reading is about, keeping the colours their states gave
  them, never a grey dot dropped between them.

## What the render taught

Four defects, each measured on the committed render rather than looked at.

- **A lollipop's head was indistinguishable from its own stem: 1,00:1, both states, all three
  directions.** The head was filled with the very colour the stem was stroked with, so each pair read
  as two plain bars and the form's one defining mark was not on the page. This is the dumbbell's
  finding one commit over (two heads at 1,023:1 against the bar they terminate) in its purest form:
  not two colours clamped to the same floor, but one colour used twice. No colour fixes it — the head
  and the stem ARE one state — so the separation is geometric: each head now sits on its own ground
  casing, which measures 3,10:1 / 3,07:1 / 3,07:1 against the earlier stem and 6,64:1 / 10,80:1 /
  7,09:1 against the later one, and the beat refuses rather than assumes it.
- **The change label was painted under the text floor in every direction.** `opacity: 0.8` sat on a
  span whose ink `deriveFurniture` had already clamped to exactly 4,5:1 against the ground — so what
  reached the reader was **3,89:1 in creme, 3,90:1 in rapport, 5,04:1 in nocturne**, and on the
  subject's own accent **4,33:1 and 4,41:1**. An opacity applied after a clamp spends the clamp. Gone;
  the label takes the register's ink and the hierarchy is carried by the line break and the weight.
- **The subject's value label was drawn in the accent.** This type's own sheet names that as its
  previously-shipped bug — *"the label carries the value, the mark carries the hue, and the two are
  never the same colour"*. It measured 6,64 / 10,80 / 7,09:1, so it was legible; it was still the
  rule. Every one of the twelve values is now in ink, and China is identified by its ring and by its
  name.
- **The label row's height was typed at 52 px** on the one type whose sheet names the category-label
  gutter as its production failure. It is derived now, from the widest of the six names measured in
  the axis register's own face, size and weight — at the subject's 700 as well, which is wider — and
  the width below which that name cannot fit one band is asked of **the plot itself, via
  `@container`**, never of the viewport: a breakpoint typed in reader pixels cannot survive a
  direction that sets its axis at 10 px in Montserrat rather than 11 in Open Sans.

- **The label row was spending two emphasis weights and two registers' worth of voice on one line.**
  The name is the category axis; the per-cent change is a **derived delta** and now takes the
  annotation voice, which is the treatment the still spends and this page had dropped — and it keeps
  that ink in every state, because a yardstick dims the NAMES and never a reading the claim is made
  of. The legend took the same voice for the same reason: it says what a colour MEANS, it does not
  name a position. And the subject's name and the name the reader lights are one kind of emphasis, so
  they are one weight — 600, a real step above every direction's own axis weight (500 in creme, 400
  in rapport and nocturne) and an embedded face in all three, where 700 was a second emphasis weight
  doing the first one's job.

  What made it measurable rather than arguable: the format's width-differential typeface probe went
  red on that row in two directions. Its alphabet was **nineteen characters — the six country names,
  and nothing else** — and over a 76-character probe Open Sans came out **0,31 px** from Helvetica at
  700 (creme) and **0,13 px** at 400 (rapport), under the 0,5 px floor. Measured across the ladder,
  the same nineteen characters clear it at every other weight the beat could have used (3,13 px at
  400, 7,56 at 500, 20,72 at 600). A row carrying one register's alphabet at one emphasis weight is
  both the right typography and the one the probe can see.

## What the control cost

Seven pills and a reserved sentence, which at 375 × 812 — where nocturne's display register alone
takes 444 px — put the figure 49 px past the window and broke the fit rule the plate passed without
it. Given back in prose rather than in plot, as the dumbbell's was: the caveat and the reading line
are each a sentence shorter than the still's, the control opens 4 px under the legend instead of 10
and its sentence 2 px under the pills instead of 4. All three directions now measure 812 px in an
812 px window.

## Verification

`verify-web.mjs --file renders/{creme,nocturne,rapport}.html` — **135 / 129 / 135 passed, 0 failed,
6 / 5 / 5 skipped**, each lane driven with the script on and with the script off. Three mutations,
all restored:

| mutation | what happened |
|---|---|
| the head's ground casing becomes the later state's own colour | all three directions refuse, naming 2,142:1 / 2,309:1 and — on the state that IS that colour — **1,000:1**, the number this beat shipped |
| one option lays a rule on 2023 and not on 2000 | `assertLevelDeclaration` refuses all three: "a yardstick that reports one of 2 series answers half the question" |
| the point stops naming the shapes that answer for it | the pointer paints the r=9 point itself `#61605a`, a grey disc wider than either head and standing between the two stems; `.mark-active` count goes 2 → 0 |

Contrast, measured on the colours the page actually paints (creme / nocturne / rapport):

| | |
|---|---|
| 2000 head against its ground casing | 3,10 · 3,07 · 3,07 |
| 2023 head against its ground casing | 6,64 · 10,80 · 7,09 |
| every printed value, in ink, on the ground | 20,41 · 17,78 · 21,00 |
| country name, axis ink | 6,13 · 7,28 · 6,19 |
| per-cent change, annot ink | 6,13 · 17,78 · 21,00 |
| the subject's name and change | 6,85 · 10,93 · 7,31 |
| the yardstick's dash where it crosses a 2023 stem | 3,08 · **1,65** · **2,96** — which is why it carries a ground casing, measured at 6,64 · 10,80 · 7,09 against that same stem |

The value axis includes zero: `yTicks[0] !== 0` throws, and the ticks are 0 · 5 · 10 · 15 · 20 · 25.

## Source

Global Carbon Budget 2025 · population 2023, via Our World in Data. `data.csv` is a byte-for-byte copy
of `proof/static-lollipop-co2-per-person/data.csv`.
