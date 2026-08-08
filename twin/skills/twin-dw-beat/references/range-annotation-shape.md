# The `range-annotations` shape — what is confirmed, what is not

## 1. What a prior live comparison run established

A comparison run against the real Datawrapper API confirmed that the `d3-lines` chart type carries
a `range-annotations` key in `defaultMetadata`, under `visualize`, separate from
`text-annotations`. That is Datawrapper's native reference-line / band feature. Calling the
schema endpoint for a fresh default chart returns only an empty array (`[]`) for that key — it does
not describe the shape of a populated entry.

## 2. Where the entry shape below actually comes from

No working `DATAWRAPPER_TOKEN` was available while building this skill, so the shape below was
**not** confirmed by this skill's own live round-trip
(`scripts/verify-range-annotation.mjs` — written, ready, and the one script this repository has
that would close this gap the moment a token exists). It was instead pinned by primary source:

- **`chartTypes.ts`**, Datawrapper's own public TypeScript source
  (`datawrapper/datawrapper`, `libs/shared/src/chartTypes.ts`), which exports the exact
  `RangeAnnotation` and `TextAnnotation` types the product itself uses. This is the authoritative
  reference — not a guess, not a third party's reverse-engineering, the actual shipped type:

  ```ts
  type RangeAnnotationPosition = {
      x0: number | string;
      x1: number | string;
      y0: number | string;
      y1: number | string;
      plot?: string;
      group?: string;
      column?: string;
  };

  export type RangeAnnotation = {
      position: RangeAnnotationPosition;
      id: string;
      showInAllPlots?: boolean;
      display: 'range' | 'line';
      type: 'x' | 'y';
      color: string;
      opacity: number;
      strokeWidth: 1 | 2 | 3;
      strokeType: 'solid' | 'dotted' | 'dashed';
  };
  ```

- **`JsonCRDT.benchmark.ts`** (same repo, same directory) carries a full default `metadata`
  literal for a `d3-lines` chart, confirming `'range-annotations': []` and `'text-annotations': []`
  both live directly under `metadata.visualize`, and confirming `metadata.describe['source-name']`
  and `metadata.describe.intro` as the field names this skill's own `map-spec.mjs` writes to.

- **Two independent third-party re-implementations agree with the primary source and with each
  other**, having each been built against real API responses: a Pydantic model
  (`chekos/Datawrapper`, `datawrapper/charts/models/range_annotations.py`) and a hand-maintained
  field reference (`robertritz/blog`, `.claude/skills/blog-charts/references/datawrapper-fields.md`,
  itself sourced from the same `chartTypes.ts`). Neither adds a field the primary source doesn't
  have; neither is missing one it does.

**The one fact all three sources agree on, and that this skill's own validator and mapper are
built around: a `RangeAnnotation` has no field for text.** There is no `text`, `label`, `caption` or
`displayText` key anywhere in the type. A rule with nothing paired to it is a line with no caption —
exactly the defect `robertritz`'s notes describe hitting on a real published chart. That is why
`validate-spec.mjs` refuses a `rangeAnnotations` entry with no `label`, and why `map-spec.mjs`'s
`buildRangeAnnotation` always emits **two** objects from one editorial entry: the rule
(`range-annotations`) and a paired `text-annotations` entry positioned at the rule's far edge.

## 3. What is genuinely still unverified

- **Whether Datawrapper's renderer actually draws the rule from this exact JSON**, in this
  environment, has not been checked. The type says the shape is accepted; it does not say the
  export pipeline honours every field the way a reader would expect (`robertritz`'s notes record at
  least one type-vs-render mismatch elsewhere in the same schema — `opacity` is typed as `number`
  but the renderer only reads it as an integer 0-100, not the 0-1 the TypeScript type would suggest
  to someone reading it cold; this skill follows the empirically-corrected 0-100 reading, not the
  bare type).
- **`x0`/`x1` span choice.** For a horizontal rule (`type: "y"`), the two ends of the line need an
  x-span. Some third-party notes claim the string sentinels `"-Infinity"`/`"Infinity"` make a rule
  or band extend to the plot edges; this was not independently confirmed here, so `map-spec.mjs`
  does not rely on it — it instead computes `x0`/`x1` from the actual min/max of the chart's own x
  column, which is correct by construction regardless of whether the sentinel trick works.
- **The proof case's PNG** (`scripts/prove-co2.mjs`, `/tmp/dw-beat/co2.png`) could not be rendered
  in this environment for the same reason: no token. If the file at that path does not exist, or
  exists but nobody looked at it and confirmed a rule drawn at 32.5 with its label, treat the
  capability as **unconfirmed by render**, whatever the code claims to send.

## 4. Closing this gap

Run, with a real `DATAWRAPPER_TOKEN` in the environment:

```sh
bun run skills/twin-dw-beat/scripts/verify-range-annotation.mjs /tmp/dw-beat/probe.png
```

It creates a small two-point line chart, PATCHes the candidate shape above, GETs the chart back
(so any field Datawrapper silently dropped or rewrote is visible in `roundTrippedRangeAnnotations`),
exports the PNG, and prints where it wrote it. Open the PNG. If the rule is not visibly drawn at
`y=5` between 2000 and 2010, this document and `map-spec.mjs`'s `buildRangeAnnotation` are wrong and
need correcting from what actually rendered — not from another reading of `chartTypes.ts`.

## Sources

- <https://raw.githubusercontent.com/datawrapper/datawrapper/main/libs/shared/src/chartTypes.ts>
- <https://raw.githubusercontent.com/datawrapper/datawrapper/main/libs/shared/src/crdt/JsonCRDT.benchmark.ts>
- <https://github.com/chekos/Datawrapper> — `datawrapper/charts/models/range_annotations.py`, `mixins.py`
- <https://github.com/robertritz/blog> — `.claude/skills/blog-charts/references/datawrapper-fields.md`
- <https://www.datawrapper.de/academy/range-highlights-and-lines> — user-facing description,
  confirms range highlights sit behind data/gridlines and lines sit on top
- <https://www.datawrapper.de/academy/customizing-your-line-chart> — confirms range annotations
  carry no built-in label and recommends a separate text annotation
- <https://developer.datawrapper.de/docs/chart-properties> — the developer docs' own admission that
  `visualize` is not exhaustively documented and changes per chart type
