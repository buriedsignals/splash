# The promise vocabulary, one resource per language

`../interaction-promises-are-kept.test.ts` reads a delivered page's own accessible text and asks
which of `hover`, `tap` and `keyboard` that page PROMISES its reader. Which words carry that promise
depends on the language the page is written in, and nothing else.

THE RULE THIS DIRECTORY EXISTS FOR. Everything that is the tool is written in English — code,
comments, tests, sheets. Everything the tool PRODUCES adapts to the language the journalist
declared. A promise sentence is produced, so its words are per-language data, not a constant in a
guard. The guard held an English-only list against an all-French corpus for as long as the corpus
existed and was green about reading nothing at all; a hard-coded French + English pair would have
been blind again the first time a newsroom filed `languages: de`.

## Adding a language

Add ONE file, `<tag>.ts`, named by the BCP 47 tag the pages declare (`de.ts`, `pt-BR.ts`). Nothing
else changes — the guard discovers this directory, it holds no list. A beat written in a language
with no file here does not pass quietly: the guard fails that beat by name, saying which language it
declared and that this directory has no resource for it.

## What a file owes

A default export of `{ name, input: { hover, tap, keyboard }, reveal }`.

- `input.<mode>` — the words that name the INPUT. Word-bounded, so a word that merely contains the
  token never counts.
- `reveal` — the words that say something is DISCLOSED by that input. A sentence promises a mode
  only when it carries both halves, which is what keeps "the table below lists every value" from
  reading as a keyboard promise.

Both halves are `RegExp` rather than word lists because inflection is the whole problem: `survol`,
`survolez`, `survoler` and `survolant` are one promise, and `touche` (a keyboard KEY) is not one at
all. A file is expected to carry the reasoning for its own exclusions as comments, in English.
