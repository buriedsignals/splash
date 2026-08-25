# Data notes — beat 1

Produced mechanically by `skills/analyst/scripts/build-data.mjs`. No human edits;
rebuild rather than touch.

## Inputs

- `storyboard`: sha256:f05e60eccd35dab14e5da003a887700b20fd8a92d355912ad38542f45790688c
- `profile`: sha256:c8ea3a144501021f0c68e332ad320c325f4c7141c2c10a712715bf0047e25956
- `sourceData`: sha256:646c610dbcadfe9e37bccf349db1812a04a44b87859e19f36fa40183c6f327ff

## Derivations

- None. Every value passes through as frozen — no imputation, no aggregation,
  no unit conversion, no rounding. Display rounding is the craft skill's decision,
  taken per `references/data-rules.md`.
- Nulls preserved as `null`:
  - `days_of_rain`: 1 of 11 rows

## Exclusions

- None. All 11 frozen rows are carried.

## Profile citations

- `year` typed `number` from `source/profile.json`.
- `station` typed `text` from `source/profile.json`.
- `rainfall_mm` typed `number` from `source/profile.json`.
- `days_of_rain` typed `number` from `source/profile.json`.
