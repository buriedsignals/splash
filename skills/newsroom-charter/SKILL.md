---
name: newsroom-charter
description: Use when a newsroom has no NEWSROOM-PROFILE.md and the journalist does not know their own house colours — derives a proposed charter (brand colour, ground, typefaces) by MEASURING the newsroom's own website, shows every value with where it was read, and writes the profile only after the journalist validates it. Refuses and falls back to asking when the site declares nothing. Keywords charte, charte graphique, house style, brand colour, couleur maison, newsroom profile, NEWSROOM-PROFILE, palette, identité visuelle, design profile, extract colours from site, theme.
---

# newsroom-charter — derive a newsroom's house style from its own website

## Overview

Splash applies a newsroom's house style only when `NEWSROOM-PROFILE.md` already exists, and that
file asks for `#rrggbb`. A journalist is not a designer and does not know their newsroom's hex —
so the profile stays unwritten and every visual ships in Splash's generic auto-colour. This skill
closes that hole from the one place the answer already lives: **the newsroom's own website**,
which has been serving its brand colour to readers for years.

It **measures** the site, **shows** what it read and **where** it read it, and writes the profile
**only after the journalist says yes**. It is the ② orchestration half of a deterministic ③
extractor (`lib/newsroom/charter.ts`); the extractor does the reading, this skill owns the
conversation and the gate.

## When to use

- The journalist has no `NEWSROOM-PROFILE.md` and wants their visuals to look like their outlet.
- Or they have one and want to add the colour they left blank.
- Or they say some version of « je ne sais pas quelle est notre couleur » / « je ne suis pas
  graphiste ».
- Requirement to proceed: **the newsroom's public site address**. That is the only input.

## The gotcha — a measurement is not a decision

Non-negotiable, and the reason this skill exists in two halves:

- **A colour read off a site is a MEASUREMENT.** A colour the journalist confirms is a
  **DECISION**. Never present the first as the second, never write the first to disk. Same rule
  that makes `suggest-image` ask for a photograph's credit instead of writing one.
- **Always show the receipt.** Every value is relayed with where it came from — « cette couleur
  vient du logo », « c'est la couleur des liens dans vos articles ». A journalist can only
  disagree with a value whose origin they can see.
- **The site may not answer, and that is a legitimate outcome.** A white site with black text and
  a raster logo declares no brand hue. Say so and ask the question — never pick the least-grey
  pixel and call it the house colour.
- **Never raise the confidence the extractor states.** `inferred` means the site names nothing and
  the value is a guess; relay it as a guess. `declared` means the site literally states it.
- The two subcommands **cannot reach each other**: `read` writes nothing, and `write` never sees
  the site or the proposal — it takes values on the command line. That is a guard against the two
  coupling SILENTLY; it is not proof a human was involved. `--confirmed` is self-attested, and
  nothing stops an agent from reading a hex off `read`'s output and typing it into `write` on the
  next call. **The gate below is the control, not the flag.** If the newsroom ever needs evidence
  rather than a guard, that is the sign-off primitive (`apply-signoff.mjs` / `requiredSigners`),
  not this boolean.

## Architecture

```
journalist gives a URL          ② newsroom-charter (THIS skill, gated)      ③ the profile
──────────────────────         ─────────────────────────────────────      ─────────────────
site address            →  read: fetch page + same-host stylesheets   →  NEWSROOM-PROFILE.md
                             → rank by HOW DELIBERATELY declared          (palette /
                             → show every value + its receipt              source / lang / theme)
                             → MANDATORY GATE (confirm / correct / drop)
                             → write: only the values the journalist typed back
```

The extractor is `lib/newsroom/charter.ts` (pure, never throws), the bounded fetch is
`lib/newsroom/charter-fetch.ts`, and the writer is `lib/newsroom/profile-write.ts` — the same one
the setup page uses, so a charter-written profile and a hand-filled one are the same file.

## How it works

1. **Ask for the site.** « Quelle est l'adresse du site de votre rédaction ? Je vais y lire les
   couleurs que vous publiez déjà — je ne changerai rien sans votre accord. » Nothing else is
   needed. Do NOT ask for a hex; that is the whole point.

2. **Measure.**
   ```bash
   bun skills/splash/scripts/propose-charter.mjs read <site-url>
   ```
   If the site refuses a plain fetch (a 403 behind a bot wall), get the HTML by any means —
   `firecrawl scrape <url>` is installed — save it, and read from the file instead:
   `… read --html-file page.html --url <site-url>`. Say in the relay that only the saved page
   was seen, never its stylesheets.

3. **Read the output honestly.** It carries ranked candidates with a `signal` per reading, the
   ground, the typefaces, and a `What this reading cannot promise` section. **Relay that section
   too** — an extraction that hid its own caveats would be the fabricated finding this project
   forbids. Never present a `declared`-confidence value and an `inferred` one in the same tone.

4. **★ GATE — MANDATORY, non-skippable.** Present, in the journalist's language:
   - the proposed **house colour**, with its origin: « Je propose #d5121e — c'est la couleur que
     votre site déclare lui-même aux navigateurs. » / « …c'est la couleur du remplissage de votre
     logo. » / « …c'est la couleur de vos liens ; le site ne nomme aucune couleur de marque, donc
     c'est une déduction, pas une certitude. »
   - the **ground**, ONLY if a dark one was measured — and always with the caveat the extractor
     attaches to it (a page stacks backgrounds; the one on `<body>` may sit behind the white
     column the reader looks at). Ask them to confirm by eye.
     **A ground text cannot be read on is never proposed.** The extractor still REPORTS what the
     site declares (it is a measurement), but it withholds it as a proposal and its notes say so,
     naming a colour of the same shade that does work. Relay that as written — « le fond de votre
     site ne peut pas porter un texte lisible, donc je ne vous le propose pas ; #… est la même
     teinte et fonctionne » — and never talk the journalist into the colour anyway. If they insist
     on it, that decision belongs to the production flow (`choose-ground --answer keep`), where it
     is recorded, not to this skill.
   - the **typefaces**, stated as **noted, not applied**: « J'ai relevé Publico Text — Splash ne
     sait pas encore appliquer une typo, je l'inscris comme information dans le profil. » Never
     imply a chart will use it.
   - the **source name** and the **language** of the deliverables, which the site does not answer
     and which you must ASK for.

   Then say plainly: « Corrige, remplace ou retire ce que tu veux avant que j'écrive quoi que ce
   soit. » Then **confirm back** the final values and get an explicit yes. Never proceed on
   silence; never treat the proposal itself as approval; the journalist's edits win verbatim.

5. **When the site answers nothing** (`confidence: none`, no candidates) — do not improvise.
   This also fires when a colour WAS read but only from unlabelled declarations (bbc.com's
   `#e00000`, out of hashed Emotion classes). The notes name that colour; relay it as « la seule
   couleur que j'ai vue, sans que le site la désigne comme la vôtre », never as a proposal.
   Say it: « Votre site n'affiche aucune couleur de marque que je puisse lire (fond blanc, texte
   noir, logo en image). Quelle est votre couleur ? Si vous ne savez pas, dites-le : Splash
   choisira une couleur adaptée au sujet de chaque visuel, ce qui est un bon défaut. » A profile
   with no palette is valid — `source` + `lang` alone are worth writing.

6. **Write, with the confirmed values only.**
   ```bash
   bun skills/splash/scripts/propose-charter.mjs write . --confirmed \
     --palette "#d5121e" [--theme "#…"|dark] \
     --name "Heidi.news" --site-url "https://www.heidi.news" --lang fr \
     [--typeface "Publico Text"]
   ```
   It refuses without `--confirmed`, and refuses to overwrite an existing profile without
   `--replace` (that file belongs to the newsroom once created). It prints what it wrote — relay
   it, and tell the journalist the file is theirs to edit.

7. **Say what changes.** From now on every chart, map and scrolly is produced in that colour, and
   any single visual can still override it. If the confirmed colour is hard to tell apart for a
   colour-blind reader, Splash **keeps it anyway** (it is their brand) and flags it at review —
   the existing `brandExplicit` policy. Say that rather than silently changing their colour.

## Quick start

```bash
bun skills/splash/scripts/propose-charter.mjs read https://www.heidi.news
# → #d5121e, from <meta name="theme-color"> — confidence: declared
# … journalist confirms …
bun skills/splash/scripts/propose-charter.mjs write . --confirmed \
  --palette "#d5121e" --name "Heidi.news" --site-url "https://www.heidi.news" --lang fr
```

## Tuning knobs (each = one number)

All in `lib/newsroom/charter.ts` unless noted.

- **signal weights**: theme-color 100 · brand-property 90 · masthead 85 · link 75 ·
  accent-property 70 · control 55 · any other declared colour 8 (`WEIGHT`) — the method IS this
  ordering. `accent-property` is an INPUT signal (a site's `--accent` custom property), not a
  proposed field — the charter stopped offering an accent since nothing rendered it
- **FREQUENCY_BONUS_CAP**: 4 — the most a colour can earn from merely being common. It is kept
  under the SMALLEST gap between two adjacent weights (5); nothing bigger is a tiebreak. The
  ordering itself does not depend on it — candidates sort lexicographically on
  (best signal, occurrences, hex), so frequency structurally cannot outrank a declaration
- **FREQUENCY_HALF**: 20 occurrences — where the frequency bonus reaches half its cap
- **MIN_CANDIDATE_SCORE**: 55 — under it nothing is proposed at all (an unlabelled hex out of a
  bundle is not evidence); the colour is named in the notes and the question is asked instead
- **MASTHEAD_WINDOW**: 1200 characters after a `logo`/`masthead` attribute, and only inside an
  actual `<svg>` — a wider window credited a share icon as the masthead
- **EVIDENCE_CAP**: 12 receipts kept per candidate (the count is still exact)
- **NEUTRAL_SATURATION**: 0.18 — below it, a colour is a grey and cannot be a brand hue
- **NEUTRAL_LIGHTNESS_MIN / MAX**: 0.09 / 0.94 — the near-black and near-white cut-offs
- **MERGE_DISTANCE**: 12 (RGB) — two readings closer than this are the same house colour
- **DARK_GROUND_LUMINANCE**: 0.2 — where a measured ground counts as dark
- **GROUND_MIN_ALPHA**: 0.9 — a more transparent colour is a wash, never the page
- **MAX_SHEETS / MAX_BYTES / TIMEOUT_MS**: 8 · 2 MB · 10 s (`charter-fetch.ts`)

## Files

- `skills/newsroom-charter/SKILL.md` — this procedure (②)
- `skills/splash/scripts/propose-charter.mjs` — the `read` / `write` CLI, deliberately split
- `lib/newsroom/charter.ts` — the extractor: signals, ranking, refusal (③, pure)
- `lib/newsroom/charter-fetch.ts` — bounded same-host fetch of the page + its stylesheets
- `lib/newsroom/profile-write.ts` — the single writer of `NEWSROOM-PROFILE.md`
- `NEWSROOM-PROFILE.example.md` — every field the profile reader understands
