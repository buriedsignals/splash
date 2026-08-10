# Chart type sheets

Thirty-two sheets, one per chart type, each a page you read before writing that type's beat by
hand — not a config, not a component to import. Each sheet answers five questions: what the type
is for, when NOT to reach for it (and what to use instead), the one thing that makes it lie or
become unreadable, what the drawing actually needs (position, length, colour, sort order, shared
scale), and the accessibility trap specific to that type, where one exists.

This knowledge was harvested from a sibling parameterised engine (`chart-native`, 41 types,
`/Users/rmdms/Sites/Professional/splash/skills/chart-native/`) that has been built, rendered, and
QA'd against real newsroom stories for months — the numeric thresholds and named defects in these
sheets are real, not invented for this toolchain. What changed is the form: there, the knowledge
lives in a conformance checker's source code and fires as a runtime guard; here, it is a paragraph
a person reads before writing a bespoke component, because this toolchain's whole premise is that
nobody imports a chart-type component — they write one, once, for the story in front of them.

## How to use a sheet

Read the sheet for the type you are about to write, before you write a line of the component. It
will not tell you how to lay out THIS story's chart — that is the beat's own judgement, made
against the doctrine in `chart-beat/references/static-discipline.md` and
`doctrine/references/`. It will tell you the trap this type specifically falls into, so you
do not rediscover it by rendering a bad still first. If a sheet's "what goes wrong" section does
not match what you are looking at, trust the render, not the sheet.

## What is here

**First pass (16):** line · bar-and-column · grouped-bar · stacked-bar · scatter · area (and
stacked area) · pie-and-donut · slope · dumbbell · lollipop · histogram · boxplot · heatmap ·
waterfall · population-pyramid · small-multiples (a layout pattern, not a mark type — read it
when any of the above is getting crowded with series or categories).

**Second pass (16):** diverging-bar · diverging-stacked-bar (Likert) · connected-scatter · bump ·
beeswarm · dot-strip · bullet · radar · treemap · sankey · streamgraph · calendar-heatmap · gantt ·
marimekko · parallel-coordinates · pictogram (isotype).

## What is not here

The source engine ships 41 chart types; this set now covers thirty-two — the ones a newsroom
reaches for most, plus the next tier down. Deliberately not covered, in no particular order:
**arc diagram, candlestick, chord diagram, fan chart, line-and-column combo, Lorenz curve, radial
bar, sunburst, violin.** None of these are exotic in the sense of unused — several are proven,
named types in the source engine with their own guardrails — they simply did not make the cut on
either harvesting pass. Do not treat this set as complete, and do not infer from a type's absence
that it is discouraged — only that nobody has yet harvested its sheet. If your story genuinely
needs one of these, the same harvesting method applies: read the source engine's conformance rules
and component for that type, and write the sheet before you write the beat.
