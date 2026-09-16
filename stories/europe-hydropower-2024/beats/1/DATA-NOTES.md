# Data notes — beat 1

Produced mechanically by `skills/analyst/scripts/build-data.mjs`. No human edits;
rebuild rather than touch.

## Inputs

- `storyboard`: sha256:5485478a6d0123e234db7fcad40630ce12d2bee6123a7ef2b6e2fe4394eff7ac
- `profile`: sha256:36f2ee5a6df7abe97963c6d9032189af87259a2c6d5fc42fbfc4c98d086f6110
- `sourceData`: sha256:09a71681ce22f61559e0e01de57189b7ab099489cac5edd8633fe5652f7885b4

## Derivations

- None. Every value passes through as frozen — no imputation, no aggregation,
  no unit conversion, no rounding. Display rounding is the craft skill's decision,
  taken per `references/data-rules.md`.
- Nulls preserved as `null`:
  - `other_renewables_generation__twh`: 1 of 41 rows
  - `solar_generation__twh`: 1 of 41 rows
  - `wind_generation__twh`: 1 of 41 rows
  - `hydro_generation__twh`: 1 of 41 rows
  - `nuclear_generation__twh`: 1 of 41 rows
  - `gas_generation__twh`: 1 of 41 rows
  - `oil_generation__twh`: 1 of 41 rows
  - `coal_generation__twh`: 1 of 41 rows

## Exclusions

- None. All 41 frozen rows are carried.

## Profile citations

- `entity` typed `text` from `source/profile.json`.
- `code` typed `text` from `source/profile.json`.
- `year` typed `number` from `source/profile.json`.
- `other_renewables_generation__twh` typed `number` from `source/profile.json`.
- `bioenergy_stacked_generation__twh` typed `number` from `source/profile.json`.
- `solar_generation__twh` typed `number` from `source/profile.json`.
- `wind_generation__twh` typed `number` from `source/profile.json`.
- `hydro_generation__twh` typed `number` from `source/profile.json`.
- `nuclear_generation__twh` typed `number` from `source/profile.json`.
- `gas_generation__twh` typed `number` from `source/profile.json`.
- `oil_generation__twh` typed `number` from `source/profile.json`.
- `coal_generation__twh` typed `number` from `source/profile.json`.
