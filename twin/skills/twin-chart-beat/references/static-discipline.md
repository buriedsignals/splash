# Static discipline

The rules a static chart beat is written under. Each one is here because breaking it produced a
defect somebody had to find by looking at a rendered image.

## Every layer earns its place

Encode data, supply context, establish hierarchy, support verification, or direct attention. A
layer doing none of those comes out. The test is blunt: remove it, and ask whether anything is
harder to understand. Boxes, frames, drop shadows, tick marks that duplicate a gridline, a legend
for one series, a background band behind the title — all fail it.

## One accent

One semantic accent, reserved for the subject the journalist named. Everything else neutral or
muted. The subject is not the maximum: a chart that accents its highest bar because it is highest
has decided the story on the data's behalf.

## All furniture derived from the ground

No hex is written anywhere except the newsroom's ground and its accent, both of which arrive as
inputs. `deriveFurniture(ground)` produces the rest:

- **ink** is the pole — pure black or pure white — that MEASURES higher against this ground.
  Not a luminance threshold. The obvious `luminance > 0.5 ? black : white` is wrong on the
  mid-grey band: on `#808080` it picks white at 3.95:1 over black at 5.32:1.
- **muted** starts 62% of the way to the ink and escalates until it clears 4.5:1 against the
  ground. It always terminates: the worst ground for its own better pole is L = 0.1791, where
  that pole still measures 4.58:1. So a source line is readable on any ground a newsroom picks —
  there is no ground on which this has to fail.
- **grid** is decoration, not text. No contrast floor, and it must not shout.

Contrast is measured **on the real ground**, never on an assumed white.

## Honest scale — and zero is a rule about BARS

**Show zero when the mark's LENGTH encodes the value: bars, columns, areas, anything read by how
far it extends.** Halve a bar's length and you halve what it claims, so a truncated bar axis is a
false statement about the data. This is not negotiable.

**A line is a different instrument.** It encodes change by SLOPE, and a line anchored at zero when
its values sit far above zero flattens the very change the beat exists to show. Rainfall running
604–912 mm drawn on a 0–1000 scale is a gentle sag under a title that says it fell by a third: the
chart contradicts its own claim, and it does so while looking scrupulous. That is worse than a
truncation the reader can see.

For a line, the honest choice is a scale **fitted to the readings** — and the honesty lives in the
labelling, not in the floor:

- every tick carries its value, so the span is stated and cannot be misread;
- the unit is on the top tick;
- a series of positive values never dips below zero (that would be inventing room);
- a series that **crosses** zero always draws the zero line, because the sign change is the story.

`yTickValues` gets that from d3: `scaleLinear().domain(extent(readings)).nice()` rounds the
readings' own extent outward to round values and stops there, and `.ticks(3)` labels the round
values inside it. The check is not "does the axis start at zero" — it is **does the reader see
the span, and does the slope tell the truth about the change**.

This rule was written the wrong way round in the first draft of this file, and the render is what
exposed it: 45% of the frame empty, and a decline of a third drawn as a shrug.

**And then the arithmetic broke it a second time, quietly.** The hand-rolled version of the rule
padded the extent by 15%, floored and ceiled the padded ends to a round step, and then spent one
more step to keep the tick count even — three widenings, each defensible alone. On a series of net
migration running -3,4 to 84,1 they compounded into an axis from -45 to 105: the readings used 58%
of the plot, the bottom third held nothing, and the top gridline stood 25% above any number anyone
had measured. In a head-to-head against an established chart engine, that is the case this twin
lost, and it lost it on arithmetic, not on judgement. **Fitting a scale and generating ticks are
solved problems; write neither by hand.** `d3-scale` and `d3-array` are data-to-coordinates
primitives — a scale and a tick generator, knowing nothing about colour, labels or type — which is
this doctrine's own definition of pure geometry. Taking them costs nothing it forbids. Taking a
chart library, which hands over a chart type with props, would cost everything it exists to defend.

## Axis density — conventional for a static frame, sparse only for motion

This rule was written the wrong way round in an earlier draft of this file: "ask for three y
ticks, three x ticks — first, middle, last — because nobody reads the values between them off the
axis, that's what the direct label is for." A render is what exposed why that is wrong for THIS
genre. Two independent judges, shown a static chart beat next to an established engine's version
of the same data, picked this twin's render in every case on the strength of its comparison
geometry — and named the same weakness against it every time: a three-tick x-axis whose middle
tick is the series' array midpoint, an arbitrary year the story never mentions, so that apart from
the one or two points the chart directly annotates, nothing on the frame can be read off an axis
at all. One judge could not locate 1997 or 1998 on a chart about them; another could not locate
1967 or 1973 because the midpoint tick landed on 1987, a year nobody's argument needed.

**The rule has one test, and it is not a tick count: a reader must be able to locate, on the axis,
any point the chart itself annotates or names.** A midpoint tick chosen by array index — `years[Math.floor(years.length / 2)]` — is worse than no midpoint tick at all, because it looks like a
deliberate landmark and is actually an accident of how many rows the dataset happens to have.

**This split is genre-scoped, not a correction that reaches every render this twin produces.**
Sparse ticks are still the right call for a chart that MOVES: `twin-chart-video` follows a line as
it draws, and a viewer watching motion reads position and change, not a printed axis — a dense
grid competing with the reveal is noise, and that genre keeps its own three-tick rule
unchanged (`motion-grammar.md`). A static frame is the opposite case: it is the only rung of the
render ladder a reader gets to scrutinise at their own pace, stationary, for as long as they like
— exactly the reader `information-architecture.md`'s "one graphic, one idea, one density" is
written for, and exactly the reader three sparse ticks fail.

**The density itself is derived from the series' own span, never hand-picked per story.** Ask
`d3-array`'s `tickStep(first, last, hint)` for the "nice" 1/2/5×10ⁿ interval closest to
`span / hint`, at a fixed hint (this twin uses `6`) — the same primitive `.nice()` and `.ticks()`
already use internally, so the interval is chosen exactly the way this doctrine already trusts d3
to choose one, not a second hand-rolled rule beside it. On a 75-year series (1950–2024) that
answers `10`: decade ticks. On a 35-year series it answers `5`: five-year ticks. On an 11-year
series it answers `2`. Nothing about "decade" or "five-year" is written down as a knob for a
particular story — the number is what `tickStep` returns for that story's own first and last year,
at the one hint this file fixes.

**A regular grid this dense makes the annotated years locatable without forcing a tick onto every
one of them.** 1973 does not need to be a labelled tick to be locatable once decade ticks run
1950, 1960, 1970, 1980 …: the peak visibly sits about three-tenths of the way past 1970, and that
is enough for a reader to place it. Forcing every annotated year onto the tick set would fight the
"nice round numbers" property that makes the grid readable at all; a dense, regular, honestly
labelled grid is what conventional charts (and the established engine the judges preferred on this
one axis) actually ship, and it is what this rule now asks for.

**The y-axis gets the same treatment for the same reason: "enough gridlines to read a value,"**
not the two or three this file asked for before. Ask `.ticks(hint)` of the fitted, `.nice()`d
domain for a genuinely readable grid (this twin uses `5`) instead of the bare floor/reference/
ceiling a hand-placed annotation used to stand in for. The unit still goes on the topmost tick
actually drawn, once, exactly as before — it does not have to be the domain's own ceiling if the
ceiling itself is not one of the round values `.ticks()` returns.

**A regular gridline that would land inside a hand-placed annotation's own line height is dropped
— its line AND its label — not just thinned to a fainter stroke.** A reference level a journalist
chose is already drawn as its own dashed rule with its own caption, precisely because it is a level
somebody chose, not a measurement — a routine round-number
gridline a few pixels away is not corroborating it, it is competing with it for the same few
vertical pixels, and a caption that names the reference reads as naming whichever line it happens
to sit closest to. The fix is not a bigger offset — an offset just moves the same ambiguity a few
pixels — it is removing the competing line: filter the regular ticks to drop any whose pixel
distance from the reference is under one label's own line height (roughly 20px at this file's
type sizes) before that list becomes gridlines or gutter width. The reference's own value is still
on the axis, in its own dedicated label; it has simply stopped sharing the vertical band with a
line that was never the one the reader needed there.

## The source on the frame's bottom margin

**The source's last line sits on a baseline at `height - PAD`** — the frame's own bottom inner
margin, the same inset the title hangs off at the top, left-aligned on the same `x` as the title.
At reading size, in muted ink. Not 9px, not in the bottom-right corner. It carries the effective
date the journalist gave, because "as of" is part of the claim. Where the source wraps to n lines,
the FIRST line's baseline is `height - PAD - (n - 1) * SOURCE.lead`, so the block grows upward and
the last line always lands on the margin.

**REVERSED 2026-08-10.** Until this date this section was titled *"The source under the header, not
in a footer"* and required the opposite: the source directly beneath the title (and beneath the
limits subtitle, where the beat carries one), on the argument that it is then *"not cropped when
somebody screenshots the top of the chart"*.

**The cost that reversal accepts, named:** a reader who screenshots only the top of a chart now
gets no source. What makes that acceptable is what a beat actually is here — the graphic is
delivered as ONE file (a PNG, an mp4, a self-contained HTML), not as a scrolling region somebody
crops; and a credit in a **constant** position across every graphic this project ships is worth
more than robustness against a partial screenshot of one of them. It is also where a reader looks
for a credit, which the old rule was trading away.

**What this is NOT, in the layout.** Moving the source is never just moving a `<text>`. Every
component reserved its plot from the source's own baseline (`padding.top = sourceBaseline + …`), so
the three edits are always: anchor the source to `height - PAD`; re-point `padding.top` at the
**last drawn HEADER line** with the clearance the type already used; and grow `padding.bottom` by
the source block's own height plus clear air, so the axis-label band beneath the plot ends above
the source's ink. Measured on `ChartSeed`: the plot's top edge rises 26px, its bottom edge rises
22px, its height gains 4px, and **no horizontal geometry moves at all** — the source is not in a
gutter, so no measured gutter is re-measured. That is what keeps this change out of the
label-collision class this project keeps finding by eye. (The first arithmetic tried reserved only
`PAD + SOURCE.fontSize + 14` on the floor, and the rendered preview showed the source struck
through the x-axis years. The tick drop is now a named constant that `padding.bottom` and the tick
`<text y>` both read.)

A beat whose header block has both a limits subtitle and a source line no longer stacks all three:
the header is title, then subtitle; the source is at the bottom. That is now the same arrangement
`information-architecture.md` states for the general case — this file no longer overrides that
zone. The two lines are still not interchangeable: a subtitle answers "what can't this data
support," a source answers "where did it come from and as of when" — a beat that spends its one
subtitle slot on the source, the way an earlier draft of this file's own reference case did,
answers neither question and drops the caveat the framing exchange already extracted.

## Direct end labels, not a legend

Name the series where it ends. A legend makes the reader carry a colour across the frame and back;
an end label is read where the eye already is. This is also why the right gutter exists.

## Gutters are measured, never fixed

The right gutter is `measureText(endLabel)`; the left gutter is the widest y tick label, measured.
A constant that fits `Annemasse` clips `Annemasse-les-Voirons-sur-Arve`, and a constant that fits
`1000 mm` clips `17 600 €`. Fixed gutters cost the engine this twin replaces four real clipped
labels in production — a stacked-area band label, two legends and an annotation — every one of them
found by eye, none by a test, because the tests were written against the constant.

`measureText` measures the ink of the real string in the font it will really be drawn in
(resvg lays it out and reports the box). It is not an estimate from character counts, and the font
stack it measures with is the same constant the component draws with. If those two ever diverge,
every gutter in the chart is measured against a font nobody is looking at.

## Three export sizes, and the frame IS the delivered pixel size

Ruling R2: a static ships at **landscape 1920×1080** (YouTube, article web), **square 1080×1080**
(social posts) or **portrait 1080×1920** (stories). One per beat, pinned at gate 2c and recorded on
the slot. Web is not a fourth size — it fills whatever container the CMS gives it, which is the
`twin-chart-web` genre's whole subject and not this one's. The table is `scripts/sizes.mjs`.

**The rasteriser draws 1:1, and that is a decision with a loser.** `rasterise` used to render at
`fitTo: { mode: "width", value: width * 2 }`, so a 900×560 element shipped an 1800×1120 PNG. The
alternative on the table was to keep that: halve every frame (960×540 / 540×540 / 540×960) and let
the 2× deliver the platform's pixels, which preserves crispness and keeps the type tokens near
their tuned values. It lost, measured rather than argued
(`proof/static-carbon-footprint-spread/probe/`): both candidates were rendered at 1920×1080 and
their **type is indistinguishable**, because resvg is a vector rasteriser and resolves glyphs at
whatever scale it is handed. What is not indistinguishable is that at 2× **every `strokeWidth` and
every `strokeDasharray` doubles** — a component asking for a 1px gridline is delivered a 2px one,
and a `"6 4"` dash arrives as `"12 8"`. The rasteriser was taking a design decision the component
believed it had taken. At 1× every number in the component means the pixel it will actually be.

*Sequencing, because the two halves are one change:* the `× 2` is retired in the same step that
makes `FRAME` come from `sizeFor(size)`. Removing it while frames are still 900×560 would ship
900px stills — the same defect from the other side.

**A size scales SPACING, not only type.** The named font constants are not a beat's whole tuning.
The simplest static in this corpus carries **eleven further bare literals** inside its layout
arithmetic — the gaps between title, subtitle and source; the insets inside `padding`; the offsets
at the tick labels, the axis title and the median note. Scaling the type and leaving those at their
literal value is what collided the title into the subtitle at 1920×1080, by 1634 × 4.5 px, on the
probe's first run. Every spacing number in a beat goes through the same integer-rounding multiplier;
integers, so `measureText`'s cache keys stay stable.

**A green measurement is not a good chart, and this is where that was learned on this axis.** At
portrait the histogram came back with zero clipped runs, zero collisions and 84% plot fill — and a
destroyed argument: the plot's aspect went 2.35:1 → 0.54:1 and its tallest bar 4.2:1 → 18.4:1, so a
right-skewed distribution read as one column beside nine slivers. A distribution's argument IS a
shape and a shape IS an aspect ratio. This is the same lesson `twin-chart-web`'s
`preserveAspectRatio="none"` rule already carries, arriving on the static path the moment the frame
stopped being fixed. **Before a beat is offered at a size, its render at that size is opened.** No
counter in the toolchain sees this one.

## Gaps are shown, not bridged

A missing reading ends the run: the line is not drawn across the hole, and no dashed bridge spans
it either — a dashed bridge reads as data nobody measured. The break is the fact; a small muted
note in the hole names it.

## No root `<title>`

An SVG's root `<title>` becomes a tooltip that follows the cursor and repeats what is already
printed at the top of the chart. Use `role="img"` plus `<desc>` for the alt text (WCAG 1.1.1). The
alt text is a sentence about what the chart shows, written by the journalist, and it ships on every
beat — there is no beat without one.

## Language

The render speaks the journalist's language, furniture included. `no data 2019`, `Source :`, number
grouping and date format are all part of the beat, not incidental strings. A language leak in the
furniture is a defect even when every number is right.

## Verification

Applied to the pixels. Not to the source, not to the bundle, not to the config — grepping a bundle
for a hex proves nothing, because the bundle inlines colours nobody rendered. Look at the PNG, on
the light ground and on the dark one. A chart that passes its tests and looks bad is the failure
this discipline exists to prevent.
