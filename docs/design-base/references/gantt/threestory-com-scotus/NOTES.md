# Threestory Studio — SCOTUS Seniority, nine sitting justices on one date axis

- url: https://threestory.com/scotus/
- archive: url-list
- type: **a true gantt** — one row per sitting justice, a bar from their oath date to today,
  positioned on one shared horizontal date axis, rows sorted by start date
- export: web (an inline `svg 880 × 506` at `documentTop 525`, `nearTheTop`)
- readAs: the published page at 1440 × 900. **A newsletter modal was over the page** in
  `screenshot.png` and it is NOT in `graphic.png`: the harvester hides everything
  `position: fixed | sticky` for the length of the element photograph, which removed it
  incidentally. The graphic reading is therefore clean and the page reading is not.

## What it is

*"SCOTUS Seniority: U.S. Supreme Court Justices by Age and Tenure."* Nine rows, one per sitting
justice. Each bar begins at the date that justice took the oath and ends at the present, so bar
length is time served and bar position is when it was served. Roberts is at the top not because he
is longest-serving — Thomas is — but because the Chief Justice is senior by definition; the eight
associates below him are then in strict order of start date, which is exactly the ordering this
form asks for and here it is also the institution's own rule.

## What it does with information

**Every bar ends at the same place, and that place is now.** All nine spans are open-ended, and the
chart says so by aligning their right edges into a single ragged-right column of faces rather than
by drawing arrows. On a chart where every row is ongoing, the shared right edge IS the "still
serving" notation, and it costs nothing.

**The cap of each bar is the person's photograph.** The portrait sits astride the bar's end, and the
name sits outside it in the ground. Two consequences: the row needs no gutter at all — the reader
finds a justice by face and reads the name where the bar ends — and the bars can be drawn short
without the label being crushed, because the label never lives inside the mark. Ketanji Brown
Jackson's span is roughly a tenth of Thomas's and her name is as legible as his.

**Colour is the nominating president's party and it is deliberately pale.** `fill rgb(214, 158, 156)`
× 6 and `fill rgb(177, 195, 224)` × 3, read straight off the SVG. Both fills are tints, not the
saturated party reds and blues; the saturated colour on the plate is in the photographs. The party
reading is available and it is not the loudest thing on the page.

**Nine rows, and the piece links out rather than growing.** *"Click here for an interactive look at
all the justices who have served since 1789."* The chart that answers the historical question is a
separate page (`scotus_all.html`, also in this family) with its own encoding. The type reference's
warning that a gantt past a large number of rows becomes a wall is answered here by **splitting the
question across two charts** rather than by filtering one.

## What it does with style

Measured on the 445 280-px clip. Ground `#FFFFFF` at **83.296 %**. Two mark colours: `#D69E9C` at
**7.586 %** and `#B1C3E0` at **2.730 %** — a 2.8 : 1 split that is simply six Republican-nominated
justices against three Democratic-nominated ones, weighted by how long each has served. Hue clusters
2° at **8.152 %** and 217° at **2.730 %**; `shape: diverging`, `ramped: 1`.

**The rest of the chromatic list is the photographs**, and it is worth naming so nobody mistakes it
for a palette: `#5D2A03` **0.053 %**, `#44230C` **0.046 %**, `#543524` **0.045 %**, `#5A2602`
**0.044 %**, `#4B2B1B` **0.033 %**, `#442514` **0.028 %**, `#552402` **0.027 %**, `#3C230B`
**0.024 %** — eight browns, which are hair, robes and mahogany. The 2° cluster is `size: 23`,
meaning twenty-three distinct buckets fell into it: two bar fills and twenty-one skin-and-timber
tones.

Furniture: `#000000` at **0.365 %** (the names and the axis rule), `#808080` **0.238 %**, `#F5F5F5`
**0.740 %**, `#EBEBEB` **0.079 %**, `#E3E3E3` **0.058 %** — the vertical gridlines.

**Type** (`style.type`, and the graphic is an inline `svg`, so this record's type list is the
chart's own document): proxima-nova 14 / **600** × 9 — the nine names, all at one size and one
weight; proxima-nova 12 / 600 × 6 — the numerals; proxima-nova 13 / 600 × 2 — the two panel captions
(`Seniority`, `Age`). **Three tuples, one family, one weight, three sizes.** The page around it
runs Josefin Sans 35.2 for the title and proxima-nova 17.6 / 600 uppercase with 1.76 px tracking for
the deck, on a `rgb(72, 73, 75)` site ground — the studio's own furniture, and note that
`style.ground` is that dark grey while the graphic's own ground is white.

## What is transferable

- **Align every open end at the present and let the shared edge mean "still running."** No arrow, no
  "present", no legend entry.
- **Cap the span with the subject's own image and put the name outside the bar.** The row needs no
  gutter, and short spans keep full-size labels.
- **Pale the categorical fill when a photograph is on the same plate**, so the two colour systems
  do not fight.
- **Split the question rather than the rows.** Nine live rows here, 116 historical rows on a linked
  page with a different encoding, instead of one chart doing both badly.
- **One family, one weight, three sizes** is enough for a labelled gantt.

## What was not verified

**No date labels are visible anywhere in the 880 × 506 capture.** The vertical rule at the left and
the faint verticals behind the bars imply a scale, but nothing in `graphic.png` names a year, and I
could not establish whether the published chart labels its axis below the captured region, labels it
on hover, or does not label it at all. If it is the last, that is precisely the failure the type
reference calls load-bearing, and I am not asserting either way.

The party mapping (pink = Republican-nominated, blue = Democratic-nominated) is inferred from the
counts — six and three — matching the court's composition, and from the sibling record
`threestory-com-scotus-scotus-all-html`; it is not stated in the captured region. **This is the same
publication as that sibling**: two records, one host, one studio, one designer. They corroborate
each other about nothing.

The page carried a newsletter modal, absent from the graphic photograph for the reason given above;
`METHOD.md` correction 3's warning applies to the page reading, not to the graphic reading. Read
2026-09-08, so "today" is that date.
