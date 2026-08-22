# Data notes — beat 1

Produced mechanically by `skills/analyst/scripts/build-data.mjs`. No human edits;
rebuild rather than touch.

## Inputs

- `storyboard`: sha256:3285c66ed6e619e02ceeb297e33af06d99b1ce38c3a28a24bd4e4ad09050745d
- `profile`: sha256:cc6ffa1d464c206a9fbc48f91a2c7a436707ea62698a9b7c928ccb654aefaf37
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
