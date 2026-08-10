---
name: twin-newsroom-charter
description: Use to derive a proposed newsroom charter — brand colour, ground, typefaces — by measuring the newsroom's own website, when the journalist doesn't have a NEWSROOM.md yet and doesn't know their house colours off the top of their head. Every value ships with where it was read; nothing is written until the journalist confirms it.
---

# twin-newsroom-charter — measure the site, show the evidence, ask when it's silent

## Overview

`preflight.mjs` (in `twin/skills/splash-twin`) already reads and validates a `NEWSROOM.md`, but
nothing in this branch has ever *produced* one — a journalist who doesn't already know their house
hex codes has no path to a first draft except typing guesses into the front matter by hand. This
skill is that path. Given a newsroom's URL, it fetches the homepage and a bounded handful of its
own stylesheets, reads what they **declare** — a `theme-color` meta tag, a `:root` custom
property, a `background` rule on `html`/`body`, a `font-family` stack, an alternate-language link —
and turns that into a charter proposal: `name`, `url`, `languages`, `brandColor`, `accents`,
`ground`, `typefaces`, the exact front matter `NEWSROOM.example.md` documents.

Two of those fields are PLURAL, because a newsroom rarely has one of either, and extending
`NEWSROOM.md` without extending the derivation would only move the typing back to the journalist:

- **`languages`** comes from `<html lang>` plus the site's own alternate-language declarations
  (`<link rel="alternate" hreflang="…">`, `og:locale:alternate`) — a multilingual newsroom has
  already written that list down so search engines can find its other editions. A site declaring
  one language resolves to one language, which is an ANSWER, not a gap.
- **`accents`** collects the further brand-named colours beyond the one that became `brandColor`,
  held to exactly the same bar (non-neutral, unqualified selector, a `brand`/`primary`/`accent`
  name hint) so a design system's status colours stay out. Its absence is the one null this skill
  does NOT turn into a question: a newsroom with one accent colour has one accent colour, and it is
  reported in `nothingFurther` instead of `unresolved`. Asking for a second house colour would be
  inventing a need rather than filling a gap.

Three rules shape every line of this skill more than the extraction technique does:

1. **Every value ships beside the declaration it was read from.** Not `brandColor: #d5121e`
   floating alone — that value next to `<meta name="theme-color" content="#d5121e"/>`, so a
   journalist can look at the real tag and agree or correct it. A value with no evidence attached
   is not a proposal, it's an assertion.
2. **It proposes; it never writes.** `deriveCharter` has no write path — not a commented-out one,
   not a flag that turns it on. It returns a structured proposal; `formatProposal` renders that as
   readable markdown. Turning a confirmed proposal into an actual `NEWSROOM.md` happens outside
   this skill, by hand, the same way `NEWSROOM.md` is authored today.
3. **A field with no honest evidence is `null`, named in `unresolved`, and turned into a question
   — never filled with a plausible-looking default.** Run this against four real newsrooms
   (Quick start) and one of them — nzz.ch — comes back with **both colour fields unresolved**,
   `brandColor` and `ground` alike, because nothing on that page or in its stylesheets declares
   either one plainly. That is not a bug this skill failed to work around; a fabricated palette
   that *looked* measured would have been the actual failure.

## When to use

- A journalist is setting up a newsroom's `NEWSROOM.md` for the first time and doesn't know their
  brand hex, ground hex, or house typefaces from memory — before `splash-twin`'s
  `runPreflight` can pass, because a `NEWSROOM.md` with real values has to exist somewhere first.
- To refresh a stale proposal after a newsroom's site redesign — this skill never reads an
  existing `NEWSROOM.md`, so re-running it costs nothing and never conflicts with one.
- **Not** for a newsroom that already has a validated `NEWSROOM.md` — there is nothing this skill
  adds once `preflight.mjs` is already green.
- **Not** for anything beyond the front matter's three derivable fields. It never proposes prose,
  a tagline, or anything editorial — those are the journalist's, always were.

## The one gotcha that will waste your day (read first)

**A `:root` block on a real newsroom's site is not a short list of brand tokens — it's the whole
design system, and most of it is noise wearing a colour.** Heidi.news's own stylesheet declares
colour custom properties for `--card-warning-border-color`, `--color-danger-400`,
`--color-grey-00`, and dozens more — real hex values, all of them, none of them the brand colour.
A naive "grab any hex-valued custom property under `:root`" would report `--color-danger-400`
(`#d5121e`, coincidentally identical to Heidi's real theme-color — a lucky collision, not a
signal) with the exact same confidence as the one that's actually named for the job. This is why
`derive-charter.mjs` treats a `theme-color` meta tag as the *only* high-confidence signal for
`brandColor`, and falls back to a **named-hint** search (`brand`/`primary`/`accent` in the
property's own name) only when no meta tag exists at all — and even then, ships the full
declaration as evidence so a wrong guess is visibly wrong, not silently plausible. An earlier
version of that hint list also matched `theme` and `highlight`, and promptly picked
`--swiper-theme-color` (`#007aff`) off nzz.ch's site — the Swiper carousel library's own default
blue, nothing to do with the NZZ brand. Found by running this against a real site, not reasoned
out in advance; see `references/site-declarations.md` for the rest of what surprised the first
implementation.

The same caution applies to `ground`: a selector like `html.short-video` or `:root.dark` is real
evidence of a real declaration, but it names a component's or a theme-toggle's own conditional
override, not the page's plain default. `derive-charter.mjs` only accepts an **unqualified**
`html`, `body`, or bare `:root` rule for `ground` — a qualified one is left in `candidates` for
the record, never auto-picked. On lemonde.fr, that means `ground` comes back `null` even though a
background *is* declared in the fetched CSS — correctly, because the only one found is scoped to a
video-player mode, not the site's own default background.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Bounded fetch | `scripts/fetch-document.mjs` | `fetchWithTimeout(url, opts)` — races a real request against a hard timer; never hangs, whatever the far end (or a test double) does |
| Pure readers | `scripts/extract.mjs` | `extractThemeColor`, `extractName`, `extractLanguage`, `extractStylesheetHrefs`, `extractInlineStyleBlocks`, `extractRootCustomProperties`, `extractBackgroundDeclarations`, `extractFontFamilies` — no network, text in, evidence out |
| Orchestrator | `scripts/derive-charter.mjs` | `deriveCharter({url, fetchFn, timeoutMs, maxStylesheets})` — fetches the page and its stylesheets, runs every reader, picks the highest-confidence candidate per field, names every field it couldn't |
| Renderer | `scripts/format-proposal.mjs` | `formatProposal(proposal)` — the human-facing markdown: the NEWSROOM.md front-matter shape, every value's evidence, every unresolved field as a question |

## How it works (the shape)

1. **Fetch the page, bounded.** `fetchWithTimeout` races the request against a timer that always
   wins — a hung connection, a fake test double that never resolves, a real DNS failure, all come
   back as a structured `{ok, status, text, error}`, never an unhandled rejection and never a
   silent empty page standing in for "nothing here."
2. **On failure, stop and hand back the honest fallback.** `deriveCharter` returns `{ok: false,
   error, askInstead}` — three concrete questions to ask the journalist directly — and never
   attempts to derive anything from a page it couldn't read.
3. **On success, read what the document itself carries plus a bounded handful of its own
   stylesheets** (`maxStylesheets`, default 4, first-linked-first). Each stylesheet gets its own
   bounded fetch; one failing doesn't fail the others — it's named in `stylesheetsFailed` and the
   rest still contribute.
4. **Every reader in `extract.mjs` only reports what's actually declared.** A `theme-color` not
   shaped like `#rrggbb`/`#rgb` is skipped, not coerced. A `font-family` stack of nothing but
   generic keywords (`inherit`, `sans-serif`, an unresolved `var(--x)`) reports nothing. A
   `background:` match is required to be a real property, not a custom-property NAME that merely
   *contains* the word (`--articleBackground` is not `background:` — see
   `references/extraction-traps.md`).
5. **`derive-charter.mjs` ranks candidates, never averages or merges them.** A `theme-color` meta
   outranks a named custom property for `brandColor`; an unqualified `html`/`body`/`:root` rule
   outranks a qualified one for `ground`; the most-declared font stack outranks a one-off. Every
   field that has no candidate clearing that bar comes back `null`, listed in `unresolved`.
6. **`formatProposal` renders the result — always readable, never written.** The `ok: false` path
   renders the ask-instead questions. The `ok: true` path renders the front-matter block with
   every resolved value quoted, every unresolved one spelled `# UNRESOLVED — ask the journalist`,
   and a "Where each value was read" section pairing every value with its source and its literal
   declaration text.

## Quick start

```js
import { deriveCharter } from "./scripts/derive-charter.mjs";
import { formatProposal } from "./scripts/format-proposal.mjs";

const proposal = await deriveCharter({ url: "https://www.heidi.news" });
console.log(formatProposal(proposal));
```

```yaml
# Charter proposal for https://www.heidi.news

PROPOSED, not written. This is not NEWSROOM.md — copy it there only after the journalist has
confirmed or corrected every line below.

---
name: Heidi.news
url: https://www.heidi.news
language: fr
brandColor: "#d5121e"
ground: # UNRESOLVED — ask the journalist
typefaces: "Sang Bleu Kingdom, Roboto"
---

## Where each value was read
- **name**: `Heidi.news` — <title> — `<title>Heidi.news</title>`
- **language**: `fr` — <html lang> — `<html data-ariato="Heidi BookmarkLoader" lang="fr-CH"`
- **brandColor**: `#d5121e` — meta[name=theme-color] — `<meta name="theme-color" content="#d5121e"/>`
- **ground** — not declared anywhere this skill reads. Ask the journalist directly.
- **typefaces**: `Sang Bleu Kingdom, Roboto` — font-family declarations — `font-family: 'Sang Bleu Kingdom' · font-family: 'Roboto'`
```

(Real output, captured running this skill against the live site — not hand-typed.)

`brandColor` here is `#d5121e` — a red — which is worth naming explicitly: Heidi.news's own
confirmed `NEWSROOM.example.md` carries `brandColor: "#0B7A75"`, a teal, chosen by the newsroom
itself. The `theme-color` meta tag is CMS-level default chrome colouring for mobile browsers, not
necessarily the considered house accent a newsroom would confirm — which is exactly why this
skill's whole design is "propose with evidence, let the journalist decide" rather than "measure
and trust." The measured value and the newsroom's real answer can legitimately differ; the
evidence line is what lets a journalist catch that in one glance instead of trusting a number.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| How long a single fetch (page or stylesheet) may run before it's abandoned | `8000` ms | `DEFAULT_TIMEOUT_MS`, `derive-charter.mjs` (override via `deriveCharter({timeoutMs})`) |
| How many linked stylesheets get fetched and read | `4` | `DEFAULT_MAX_STYLESHEETS`, `derive-charter.mjs` (override via `deriveCharter({maxStylesheets})`) |
| How many candidate font stacks are folded into the proposed `typefaces` value | `2` | `chooseTypefaces`, `derive-charter.mjs` |
| Which custom-property name fragments count as a brand-colour hint | `brand`, `primary`, `accent` | `BRAND_NAME_HINT`, `derive-charter.mjs` |
| Which custom-property name fragments count as a ground-colour hint | `background`, `ground`, `surface`, `page` | `GROUND_NAME_HINT`, `derive-charter.mjs` |
| Which two hex values never count as a confident colour candidate | `#ffffff`, `#000000` | `isNeutralHex`, `extract.mjs` |

## Files

- `scripts/fetch-document.mjs` — `fetchWithTimeout`, the one bounded-network primitive every other
  script builds on.
- `scripts/extract.mjs` — the pure readers: `extractThemeColor`, `extractName`,
  `extractLanguage`, `extractAlternateLanguages`, `extractStylesheetHrefs`, `extractInlineStyleBlocks`,
  `extractRootCustomProperties`, `extractBackgroundDeclarations`, `extractFontFamilies`, plus
  `normalizeHex`/`isNeutralHex`.
- `scripts/derive-charter.mjs` — `deriveCharter`, the orchestrator. No write path.
- `scripts/format-proposal.mjs` — `formatProposal`, the markdown renderer.
- `references/site-declarations.md` — what real newsrooms' sites actually declare (and don't),
  learned running this against heidi.news, lemonde.fr, theguardian.com and nzz.ch.
- `references/extraction-traps.md` — the specific parsing bugs a real site's markup and CSS
  exposed, each pinned by a test in `test/extract.test.ts`.
- `test/fetch-document.test.ts` — the timeout/hang/abort contract, plus one live request against a
  real site.
- `test/extract.test.ts` — every reader, against both synthetic fixtures and the real declaration
  shapes four real newsrooms ship.
- `test/derive-charter.test.ts` — the ranking rules, the honest-fallback path, and a static assertion
  that this module exposes no write-shaped export.
- `test/format-proposal.test.ts` — the rendered markdown, resolved and unresolved alike.
