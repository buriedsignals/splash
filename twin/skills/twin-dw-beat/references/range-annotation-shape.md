# The `range-annotations` shape — what is confirmed, what is not

## 1. What a prior live comparison run established

A comparison run against the real Datawrapper API confirmed that the `d3-lines` chart type carries
a `range-annotations` key in `defaultMetadata`, under `visualize`, separate from
`text-annotations`. That is Datawrapper's native reference-line / band feature. Calling the
schema endpoint for a fresh default chart returns only an empty array (`[]`) for that key — it does
not describe the shape of a populated entry.

## 2. CONFIRMED by a live round-trip (2026-08-08)

`scripts/verify-range-annotation.mjs` has now run for real, with a working `DATAWRAPPER_TOKEN`:
chart `jUDCp`, a two-point line from (2000, 1) to (2010, 9), PATCHed with the candidate shape below.
`GET`ting the chart back returned the exact same object (Datawrapper changed nothing — no field
dropped, none rewritten), and the exported PNG shows a solid horizontal rule drawn precisely at
`y=5`, spanning `x0=2000` to `x1=2010`, in the sent colour. This is the shape now shipped by
`map-spec.mjs`'s `buildRangeAnnotation`, **confirmed by render, not only by source**:

```json
{
  "id": "probe-1",
  "type": "y",
  "display": "line",
  "color": "#0B7A75",
  "opacity": 100,
  "strokeWidth": 2,
  "strokeType": "solid",
  "position": { "x0": 2000, "x1": 2010, "y0": 5, "y1": 5 }
}
```

The same day, the real proof case (`scripts/prove-co2.mjs`) rendered clean: a rule at 32.5 labelled
"Niveau de 1967 (32,5 Mt)", with the plotted curve visibly crossing it around 1967 and returning to
it by 2024 — `/tmp/dw-beat/co2.png`, chart `6Nn1Z`, published at
`https://datawrapper.dwcdn.net/6Nn1Z/1/`.

## 2b. Where the shape was pinned from before that (for the record)

Before a token was available, the shape above was pinned by primary source alone, cross-checked
against independent re-implementations — kept here because it is *why* the candidate above was
trusted enough to test, and because the same method is how any future undocumented field on this
API should be approached before a live round-trip is possible:

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

## 3. What is still genuinely unverified, or confirmed NOT to work

- **`x0`/`x1` span choice.** For a horizontal rule (`type: "y"`), the two ends of the line need an
  x-span. Some third-party notes claim the string sentinels `"-Infinity"`/`"Infinity"` make a rule
  or band extend to the plot edges; this was not independently confirmed here, so `map-spec.mjs`
  does not rely on it — it instead computes `x0`/`x1` from the actual min/max of the chart's own x
  column, which is correct by construction and is exactly what rendered correctly on the live probe
  above.
- **`opacity` is 0-100, not the TypeScript type's bare `number`** — confirmed both by third-party
  notes and by this skill's own live chart, which sends `100` for a drawn line and gets a fully
  opaque rule back.
- **Vendor attribution ("Créé avec Datawrapper") is NOT removable from this account via the API.**
  `metadata.publish["force-attribution"]` is a real field (confirmed in `chartTypes.ts` and set on
  every chart this skill creates), but setting it `false` and re-rendering left the credit line
  unchanged — checked live, twice, on chart `KDo4J`. Datawrapper's own pricing page confirms
  attribution removal requires a paid Pro/Business/Enterprise plan; this account (`GET /v3/me` —
  `teams: []`, `primaryTeam: null`) is on the free tier. This is a plan limitation, not a missing
  API call: `force-attribution: false` is still sent, correctly, in case this skill is ever run
  from a paid account, but no static export from this skill carries a bare newsroom source line
  today.
- **The y-axis fit (`custom-range-y`) is confirmed to work and to not anchor at zero** — live on
  `KDo4J`: `["7", "49"]` visibly removed the zero baseline and the `0` tick. `map-spec.mjs` computes
  this from the data's own min/max (plus any y-axis range annotation's value), padded 8%, for every
  chart type except the bar/column family (`isBarEncoded`) — a bar's mark encodes by length from a
  baseline, so it keeps zero in view on purpose.

## 4. Re-running the live round-trip

```sh
bun run skills/twin-dw-beat/scripts/verify-range-annotation.mjs /tmp/dw-beat/probe.png
bun run skills/twin-dw-beat/scripts/prove-co2.mjs
```

Both require `DATAWRAPPER_TOKEN` in the environment. Open the PNGs each one writes. If either the
rule or the fitted y-axis no longer renders as described above, this document and `map-spec.mjs` are
wrong and need correcting from what actually rendered — not from another reading of `chartTypes.ts`.

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
