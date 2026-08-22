---
name: analyst
description: Use at the top of Splash production, per beat and before any craft skill — reads the closed STORYBOARD slot, the frozen profile, and the frozen data, and writes the chart-ready beats/<id>/data.json plus DATA-NOTES.md. Refuses, writing nothing, when Gate 2 is unclosed for the slot or the frozen sources are missing or no longer agree.
---

# analyst — freeze the beat's chart-ready data

## Overview

Production's pre-step. Between a closed storyboard and the first line of a craft component sits a
mechanical question: **what data does this beat actually draw?** This skill answers it once, into
a file. `buildData({storyDir, slotId})` (`scripts/build-data.mjs`) validates the slot has really
left Gate 2, re-checks the frozen pair (`source/profile.json` still describing
`source/data.csv`), transforms the frozen rows into a compact `{columns, rows}` artifact with
nulls preserved and series typed from the profile, and writes `beats/<id>/data.json` plus its
human-readable companion `DATA-NOTES.md`. The artifact's `meta.hashes` records the sha256 of the
storyboard, the profile and the source data it was built from — so every downstream reader can
prove which inputs it came from without trusting anyone's memory.

The skill is deliberately small and produces nothing visual. It never chooses a chart type (that
decision is the storyboard's), never approves pixels, and never edits the frozen source. Its
whole value is that a craft skill starts from a file, not from a re-reading of the CSV in whatever
way suits the moment.

## When to use

- At the **top of production, per beat**, before `BRIEF.md` and before dispatching any craft
  skill — exactly when `whereIs` reports `beat <id>: run analyst (data.json)`.
- Again after an editor-feedback revision reopens production, if the revision changed what the
  beat must show: rebuild the artifact rather than editing it.
- **Not** during intake or framing — those phases' files do not exist yet, and this skill
  refuses loudly when asked for them.
- **Not** for image beats: a photograph carries no data contract.

## The one gotcha that will waste your day (read first)

**A refusal is the product working, and it must write nothing.** Every check runs before the
first write: a slot whose `chosen` is off its candidate list, a profile that disagrees with its
CSV, a `data.json` already on disk built from different hashes — all refuse with the reason named,
and the story directory is left exactly as found. The failure mode this prevents is quiet: a
half-built artifact that a craft skill then treats as current. If you are tempted to "just write
the file anyway, the data looked fine" — that temptation is the defect class the hash record
exists to catch.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Transform | `scripts/build-data.mjs` | `parseStoryboardForAnalyst`, `slotRefusal`, `buildData({storyDir, slotId, fs})` — validate everything, write last; injectable `fs` per house style, no network seam because there is no network I/O |
| CSV reader | `scripts/csv.mjs` | Carried byte-identical copy of `intake`'s RFC 4180 reader — skills never import across boundaries at runtime |
| Profiler | `scripts/profile.mjs` | Carried byte-identical copy of `intake`'s `profileTable`, used to re-verify the frozen profile against the frozen data |
| Rules | `references/data-rules.md` | The consulted rules: rounding policy, null handling, aggregation honesty (no imputation), unit normalization |

## How it works (the shape)

1. **Read the contract, not the conversation.** `STORYBOARD.md` is parsed for its scalars and
   slots; `slotRefusal` names every way slot `<id>` has not left Gate 2 — unresolved grounding,
   unclosed reference loop, nothing chosen, a `chosen` off its own candidate list, a medium that
   carries no data contract, a medium/format never confirmed reachable. Any one of them refuses.
2. **Re-verify the frozen pair.** The profiler runs again over `source/data.csv` and the result
   must equal `source/profile.json` byte-for-byte after JSON round-trip. A swapped CSV, a
   hand-edited profile, a story directory copied halfway — all refused here instead of surfacing
   as a chart that quietly mislabels its own axes.
3. **Hash the three inputs.** sha256 of the storyboard bytes, the profile bytes, the data bytes,
  recorded in `meta.hashes`. If `data.json` already exists and was built from different inputs,
  the rebuild refuses — a source moved under an artifact someone may be rendering from. The
  refusal is the default; passing `rebuild: true` (CLI: `--rebuild`) acknowledges the drift in
  the operator's name and rewrites from current inputs, refreshing `meta.hashes`.
4. **Transform.** Columns carry their names and their types **from the frozen profile** (the
   analyst never re-types); rows pass through compactly, blank cells as `null`, numbers as
   numbers, everything else as text. No rounding, no imputation, no aggregation, no unit
   conversion — see `references/data-rules.md`.
5. **Write both files.** `data.json` is machine-read and compact;
   `DATA-NOTES.md` records the input hashes, derivations (none, by construction), null counts per
   column, exclusions (none — all frozen rows carried), and the profile citation for every
   column's type. It is the document a journalist reads to see what their chart is standing on.

## Quick start

```sh
# whereIs said: {"phase":"production","missing":["beat 1: run analyst (data.json)"]}
bun skills/analyst/scripts/build-data.mjs stories/annemasse-rain 1
# → wrote stories/annemasse-rain/beats/1/data.json
# → wrote stories/annemasse-rain/beats/1/DATA-NOTES.md
```

```js
import { buildData } from "./scripts/build-data.mjs";

const { wrote } = await buildData({ storyDir: "stories/annemasse-rain", slotId: "1" });
// wrote = [beats/1/data.json, beats/1/DATA-NOTES.md]; a refusal THROWS naming the gap and
// leaves the directory untouched.
```

Then dispatch the craft skill. It reads `beats/<id>/data.json` — never the CSV directly — so the
chart and its source line cannot drift apart.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| Which mediums owe a data contract | `2` (`chart`, `map`) — mirrors `whereIs`'s own `ANALYST_MEDIUMS` | `ANALYST_MEDIUMS`, `build-data.mjs`; mirrored in `splash/scripts/where.mjs` |
| Which slot fields must be recorded before the transform runs | `slotRefusal` — grounding, reference, chosen-among-candidates, reachable, medium | `slotRefusal`, `build-data.mjs` |
| What a blank cell becomes | always `null` — there is no knob; imputation is refused by design | `references/data-rules.md` |
| Artifact shape version | `schemaVersion: 1` | `SCHEMA_VERSION`, `build-data.mjs` |

## Files
- `scripts/build-data.mjs` — the transform and the CLI (`bun scripts/build-data.mjs <storyDir>
  <slotId> [--rebuild]`; exit 1 refuses having written nothing).
- `scripts/csv.mjs`, `scripts/profile.mjs` — carried copies of `intake`'s reader and profiler,
  kept identical by `test/parity.test.ts`.
- `references/data-rules.md` — rounding, nulls, aggregation honesty, unit normalization.
- `assets/sample-data/rainfall.csv` — eleven readings with one genuinely missing cell, so the
  seed proof shows how a hole is carried, never filled.
- `assets/sample-data/story/` — the fixture story the proof builds from: frozen article, frozen
  profile, and a Gate-2-complete storyboard.
- `output-proof/` — the exact `data.json` + `DATA-NOTES.md` this skill's script produces from
  that fixture; `test/canon.test.ts` rebuilds them into a temp directory and requires equality.
- `test/canon.test.ts` — the canon's shape plus behavior: refusals write nothing, hash mismatch
  refuses, nulls survive, the sample table clears eight rows.
- `test/parity.test.ts` — the carried copies against their intake originals.
