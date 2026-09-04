---
name: intake
description: Use to freeze a journalist's article and data into a story's source/ folder and silently profile the data — the INTAKE phase of the doctrine twin, asking nothing and never revisited.
---

# intake — freeze the source, profile the data

## Overview

Turns the article and CSV a journalist brought into a **frozen, immutable record**: `source/article.md`, `source/data.csv`, `source/profile.json`. This phase is **silent** — it asks the journalist nothing. It reads, it parses, it types the columns, it writes. Once frozen, the source is never modified again; a second freeze attempt is refused, so the record of what was actually analysed can never drift out from under the rest of the pipeline.

## When to use

- At the start of a story, right after the story workspace exists (a `stories/<slug>/` directory with the `source/` subdirectory for intake to write into), before any framing or design work.
- When you need a reliable `{type, min, max, missing, distinct}` per column to reason about later — never call a downstream phase against a CSV that hasn't been through here first.
- **Not** for re-profiling after the journalist edits their data — that requires a fresh story (frozen means frozen).

## The one gotcha that will waste your day (read first)

**`Number(v)` lies.** `Number("0x10")` is `16`, `Number(" 12 ")` is `12`, `Number("")` is `0`. A naive numeric-type check built on raw `Number()` will silently type a hex product code or postal code as a number, and can drag a column's min/max toward zero from blank cells. `profile.mjs` guards this with a strict decimal-literal regex (`NUMERIC_RE`) run *before* `Number()` is trusted, and blank values are trimmed and set aside as `missing` before typing ever sees them. If you touch `typeOf`, keep that ordering — regex first, `Number()` second, never `Number()` alone.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Reader | `scripts/csv.mjs` | `parseCsv(text)` — a real RFC 4180 reader: quoted fields, embedded commas/newlines, doubled quotes, CRLF **and** lone-CR line endings |
| Profiler | `scripts/profile.mjs` | `profileTable(rows)` — types each column (`number`/`date`/`text`), counts missing/distinct, ranges numeric columns and totals them (`min`, `max`, `sum`) |
| Orchestrator | `scripts/freeze.mjs` | `freezeSource({storyDir, articlePath, dataPath})` — reads both source files once, profiles the data, writes the three frozen artifacts, refuses a second call |

## How it works (the shape)

1. **Parse** the CSV with a real state machine (quoted/unquoted, not a `.split(",")`) — `parseCsv` in `csv.mjs`.
2. **Profile** the parsed rows: each column gets a strict-numeric-literal type check, a missing count (blank cells counted, never dropped), a distinct count, and — for numeric columns only — a `min`, a `max` and a `sum`, in `profileTable` in `profile.mjs`. The `sum` is there for one named downstream reader: `storyboard`'s grounding check, which cannot otherwise place a part-to-whole total, because a total is by construction outside the range of the column it sums.
3. **Freeze**: `freezeSource` checks `source/article.md` doesn't already exist (refuses with `"already frozen"` if it does), then reads the article and CSV, runs the profiler, and writes all three files into `source/`. A read failure (missing file, permission denied, no `source/` directory to write into) surfaces its real error — it is never mislabelled as "already frozen" and never swallowed.

## Quick start

```js
import { freezeSource } from "./scripts/freeze.mjs";

const { article, data, profile } = await freezeSource({
  storyDir: "/path/to/stories/my-story",
  articlePath: "/path/to/draft.md",
  dataPath: "/path/to/rainfall.csv",
});
// source/article.md, source/data.csv, source/profile.json now exist and are frozen.
```

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| Which story workspace to freeze into | `storyDir` | `freezeSource()` call |
| Which article file to freeze | `articlePath` | `freezeSource()` call |
| Which CSV to freeze and profile | `dataPath` | `freezeSource()` call |

## Files

- `scripts/manifest.mjs` — **`source/MANIFEST.json`: n sources, each bound by digest** (#37). The
  prose entry carries `sections` — the article's headings with id, level and line, derived at freeze
  (`articleSections`, #61) — so the storyboard's placement question can offer real positions.
  Freezing bought a real guarantee — the record of what was analysed cannot drift underneath it —
  but the shape it took did not fit the material journalists arrive with. One article path, one
  data path, three fixed filenames, and a refusal on the second call meant a real investigation with
  20 article sections, 9 datasets and 14 photographs had to concatenate its sections into one
  2,746-line file, keep one CSV and discard eight, and create a **second story** to reach its own
  photographs. One piece of reporting became four stories or one impoverished one.

  Content-addressing gets the same guarantee without the collapse, and it is the twin's own
  established answer one phase earlier — `deliver`'s `.delivery-manifest.json` already binds
  artifacts by digest and `whereIs` already reopens on a mismatch. A story now holds *n* sources by
  `id`, `path`, `kind` and `digest`; every table is profiled; and a slot names the one it draws on
  with `source:`. With one table a slot needs no `source:`; with nine it does, because picking one
  for it is how a beat comes to cite a table it was not built from.

  **What is still refused is SILENT change.** `driftedSources` names the source that moved, so the
  beats that read it reopen and the rest of the story does not. The refusal on change *itself* is
  gone: it never prevented the edit, it just meant the story was abandoned and recreated, and the
  audit trail of what changed was lost rather than preserved.

- `references/ourworldindata-csv-filter-trap.md` — how Our World in Data's CSV endpoint silently ignores country filters without `&csvType=filtered`, and the rule: always count rows to verify a dataset arrived as expected.
- `scripts/csv.mjs` — `parseCsv`, the RFC 4180 reader.
- `scripts/profile.mjs` — `profileTable`, the column profiler.
- `scripts/freeze.mjs` — `freezeSource`, the orchestrator (depends on the two above).
- `test/{csv,profile,freeze}.test.ts` — `bun:test` coverage, including regression tests for the hex/empty-table and lone-CR fixes made on top of the original design.
