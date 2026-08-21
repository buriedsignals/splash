# Notes for the maintainer — stress round five, beat Y

Nothing in this file is for the journalist. It records what had to be done by hand inside this
story to get a beat out of the delegated Datawrapper path, and why.

## Three things were changed by hand inside this story

1. **The beat parses `source/data.csv` itself** (`beats/1-coverage-vs-size/build-spec.mjs`) instead
   of reading `source/profile.json`. Two of the profiler's five verdicts are unusable here:
   `municipality` is typed as a negative measure (`min: -186`, `max: -1`, `unit: "Commune"`) when it
   is a column of names, and `broadband_pct` — the only measure this story is about — is typed
   `text` because 10 of its 186 values carry a `%` suffix and 6 are blank.

2. **`credit` is written twice, differently.** `STORYBOARD.md` records the canonical sentinel
   `credit: unattributed`; `spec.json` carries `credit: "not stated"`. `buildChartPayload`
   interpolates `spec.credit` raw into `describe["source-name"]`, so the sentinel would have
   printed the word "unattributed" on a published newsroom chart.

3. **This beat carries its own `PALETTE.md`**, recording a white ground, because the delegated
   producer paints on Datawrapper's own surface and has no field to ask for another. The story's
   own `PALETTE.md` still records the house pair and is unchanged. `beats/1-coverage-vs-size/PALETTE.md`
   explains the trade in full.

## What could not be fixed from inside the story

The 186 dots ship in Datawrapper's default blue, not the house accent. `buildChartPayload` sets
`visualize["base-color"]` only when `isBarEncoded(chartType)` matches `/bars|column/`, and a
scatter is left with `custom-colors` alone — the key round three already measured as inert.
Confirmed live on chart `yNwL8`: patching `base-color` to the requested `#5B8A8A` removed every
blue pixel from the export; patching it back restored them. The field works, the producer does
not send it. No edit inside a story can reach it.
