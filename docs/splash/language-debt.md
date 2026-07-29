# Language debt

Splash finishes deliverables in **four** languages: `en`, `fr`, `de`, `it`. Any other is
REFUSED at the offer (`lib/core/language-coverage.ts`), not shipped mixed.

This file is a debt that must SHRINK. It is not a description of a settled state.

## What a fifth language needs

| table | file | what a row is |
|---|---|---|
| furniture labels | `lib/core/locale.ts` `LOCALES` | separators + the `Source:` label |
| generated story copy | `lib/core/story-copy.ts` `STORY_COPY` | superlatives, ordinals, span/gap clauses, photo label |
| source questionnaire | `lib/newsroom/ui-copy.ts` `SOURCE_QUESTION_TABLE` | the five source-class questions |
| Datawrapper locale | `skills/dw-chart/src/spec-to-metadata.ts` `dwLocale` | the regional tag DW reads |
| coverage list | `lib/core/language-coverage.ts` `COVERED_LANGS` | the last line to change, once the four above have a row |

## Already half-there

`dwLocale` maps **seven** tags (`fr, en, de, es, it, nl, pt`). `es`, `nl` and `pt` therefore have
their Datawrapper number formatting and nothing else — which is exactly the mixed deliverable the
refusal exists to prevent. They are the three cheapest rows to complete.
