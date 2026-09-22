# Data notes — beat 1

Produced mechanically by `skills/analyst/scripts/build-data.mjs`. No human edits;
rebuild rather than touch.

## Inputs

- `storyboard`: sha256:e36a9bc8687cc6b08e08bd0b91359ffe397b5bc1ceef0617b9c0a4d7cb828bbf
- `profile`: sha256:82bb60ccbdc99a5e74fb6cde95e44f86c331c508634c0a920acc09552707b4d4
- `sourceData`: sha256:646c610dbcadfe9e37bccf349db1812a04a44b87859e19f36fa40183c6f327ff

## Derivations

- None. Every value passes through as frozen — no imputation, no aggregation,
  no unit conversion, no rounding. Display rounding is the craft skill's decision,
  taken per `references/data-rules.md`.
- Nulls preserved as `null`:
  - `days_of_rain`: 1 of 11 rows

## Exclusions

- None. All 11 frozen rows are carried, because no population is recorded on the slot.
- That absence is a state, not a silence: whichever rows the beat draws are chosen in its component and written down nowhere.

## The two forms

- `data.json` is the typed contract, with its own meta and hashes.
- `data.csv` holds the same carried rows, because every worked example's runner in this corpus reads a CSV beside the beat — one call writes both, so they cannot drift.

## Profile citations

- `year` typed `number` from `source/profile.json`.
- `station` typed `text` from `source/profile.json`.
- `rainfall_mm` typed `number` from `source/profile.json`.
- `days_of_rain` typed `number` from `source/profile.json`.
