# The seed, and what it is not

`assets/ChartSeed.tsx` carries `REPLACE ME. Do not parameterise me.` on its first line. That line
is the whole contract. What follows says why, and what to keep when you throw the file away.

## What it is

One static chart beat, written out end to end, so the next beat can be written from scratch in the
same shape:

```
pure geometry (numbers only) -> furniture derived from the ground -> direct annotation -> one accent
```

Four things, in that order, are the anatomy. Everything else in the file is this story's rainfall.

**① Pure geometry.** `lineGeometry(data, {width, height, padding})` turns readings into
coordinates and returns nothing else — no colour, no font, no label. That boundary is the test:
if a function in here knows a colour, a label or a font size, it is not geometry. It is also why
the geometry is the one part worth keeping when the drawing is rewritten; a scale, a tick set and
a run-splitter outlive the story they were written for.

**② Furniture derived from the ground.** `deriveFurniture(ground)` (in `scripts/render-still.mjs`)
is the only source of ink, muted and grid. The component names two colours: the ground it was
handed and the accent it was handed. It never writes a hex. A newsroom whose ground is
`#F2E9DC` gets a chart that belongs to it, with no branch anywhere saying "if dark".

**③ Direct annotation.** The subject is named where it ends — `Annemasse 604 mm`, on the last
point, in the accent — instead of in a legend the reader has to look up. There is no legend in
this file, and a beat with one series should never grow one.

**④ One accent.** The line, its final dot and its end label are the same accented thing: the
subject. Grid, ticks, axis labels, the source line and the gap note are muted or neutral. If a
second colour appears in a beat, it is because a second thing is being claimed — and then the
storyboard should say so.

## What it is not

- **Not a chart type.** There is no `type="line"` and there will not be one. The beat that needs
  a second series, a band, a projection or an annotation writes its own component.
- **Not a component to configure.** Adding a `variant`, a `showLegend` or a `palette` prop to this
  file is the exact failure it exists to prevent: taste frozen into parameters, with a ceiling set
  by whoever wrote them.
- **Not a place for story content.** `UNIT = "mm"` is a literal, on purpose. The next beat is not
  measured in millimetres; it edits the constant, because it edits the file.

Replacing the seed per story is the expected behaviour, not a shortcut. The knowledge that has to
survive lives in `references/`, not in props.

## The props it does take

`data`, `title`, `source`, `alt`, `ground`, `accent`, `subject`. Every one of them is editorial —
the journalist's words, the newsroom's colours, the subject the journalist named. None of them
selects a behaviour. That is the line between an input and a parameter.

## The seed's own layout decisions, and why

- The header is laid out first; the plot starts where the header stops. Nothing is positioned by a
  constant that "looked about right".
- Both gutters are measured — see `static-discipline.md`.
- The zero baseline is drawn in `muted`, the other gridlines in `grid`: zero is a fact, the others
  are a reading aid, and they should not weigh the same.
- The gap note sits IN the hole, at the height of its neighbours. The first draft put a full-height
  dashed rule at the missing year with the label above the plot; rendered, it shouted louder than
  the subject and read as a subtitle of the whole chart. Looking at the still is what caught it.
