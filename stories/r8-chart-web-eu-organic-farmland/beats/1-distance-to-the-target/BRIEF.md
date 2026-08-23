# Beat 1 — distance to the target

Slot 1 of `../../STORYBOARD.md`. Medium `chart`, format `web`, treatment **Lollipop**, producer
custom (no Datawrapper mapping exists for this treatment in this format, so the producer question
was never asked).

## The one thing this beat proves

That the EU's own 25 % organic-farmland target for 2030 is not close for any member state still
reporting — and that the one country which ever crossed it stopped publishing four years ago.

## What is drawn

One row per EU member state, twenty-seven of them. Each row is a stem from the zero baseline to that
country's own most recently published share of utilised agricultural area under organic farming,
with a dot at the end. A vertical rule at 25 % carries its own label.

The rows sit in TWO blocks, separated by a drawn line and a label:

- the twenty-five member states that published a figure for 2024, ranked from Estonia (22.6 %) down
  to Malta (0.8 %);
- below the line, the two that did not — Austria, 25.7 % in 2020, and Greece, 12.2 % in 2021 — each
  carrying its own year in the label column, drawn with a hollow dot.

The gap is geometry, not decoration: it is what stops a reader comparing a 2020 stem against a 2024
one by eye. Austria's stem is the only one on the chart that crosses the rule, and it is in the
block the ranking excludes. That is the finding, and it is visible rather than asserted.

Neither European aggregate is drawn. `EU` and `EU27_2020` are rows of the same table sitting between
ES and FI, and they are sums of the rows around them; the runner asserts both are present in the
frozen file and excludes them by code, and the third caveat says the aggregate's own series stops in
2020 at 9.1 % rather than silently leaving the reader with no average and no explanation.

## What the web format carries that a still could not

Every row's value is on the frame — twenty-seven rows fit twenty-seven numbers, so nothing the
static frame could state is gated behind an ask. What interaction adds is the four readings a
static frame has no room for, per row:

- the year that figure is from, and, for the two stale rows, that it is that country's last;
- Eurostat's own observation flag, in Eurostat's words rather than as a letter — `e` estimated,
  `p` provisional, `d` definition differs, `b` break in series;
- the same country's 2015 share and the change since, in percentage points — which is how a reader
  finds that Sweden is the one member state whose share has FALLEN (17.1 % to 16.7 %);
- how many annual figures that country has published at all, from 13 (Croatia) to 25.

Hover and tap resolve by ROW, not by mark: a pointer anywhere along a row answers with that row, so
a reader never has to land on a 9px dot. Every dot is `tabIndex=0` with its own `aria-label` and
`data-detail`, baked at build time, so the page is walkable by keyboard with the script absent
entirely. The generic accessible table prints all twenty-seven readings in the drawn order.

No filter. The beat fails the filter test on requirement 1: the frozen slice carries no dimension of
this ranking a reader would want to narrow — one indicator, one unit, one row per country. So the
beat writes no fieldset, no CSS rule and no attribute.

No entrance motion. Nothing here builds; there is one state.

## What is deliberately not drawn, and why

**Not the eleven non-EU reporters.** Switzerland (18.3 % in 2024), Norway, Iceland, Türkiye, Serbia,
Montenegro, North Macedonia, Albania and the United Kingdom are all in the frozen table. The claim
is about a target the European Union set for itself; ranking a non-member against it would be
answering a different question.

**Not a latest-year-only ranking.** Dropping Austria and Greece for having no 2024 figure would have
removed the single most interesting row on the chart.

**Not the article's own 2022 numbers.** Eurostat's published prose says the EU stood at 10.5 % in
2022 and that Austria led on 27 %. Neither is checkable in this table: its EU aggregate stops at
2020 and Austria's series stops at 2020. Both are recorded in `../../STORYBOARD.md` rather than
repeated on the graphic.

## Words on the frame

- Title: the confirmed takeaway, shortened to one line of a chart's own headline.
- Three caveats: the measure and the per-country vintage; the two countries shown apart and Austria's
  2020 crossing; the missing EU average with the year and value where it stops.
- Source: `STORYBOARD.md`'s own recorded credit, read from the file rather than typed here.

## Colours and type

`../../PALETTE.md` — ground `#16191B`, one accent `#D4A853` (the newsroom's own, 8.01:1). A row whose
figure is not from the newest year is drawn HOLLOW, not dimmed: the format's own driven check refuses
a default view that dims anything, because in this format a dimmed mark is a filtered-out mark, and
the first build failed it three times over exactly this.
`../../TYPEFACE.md` — `Helvetica, Arial, sans-serif`, `origin: default`, because `NEWSROOM.md`'s
Space Grotesk does not resolve on this machine. Neither is named as a literal anywhere in this
beat's code.
