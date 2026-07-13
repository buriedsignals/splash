# Newsroom profile — journalist-facing, reusable house-style defaults — design

> Extend the F2 brand profile (colours-only, agent-manual, chart-only) into a documented,
> journalist-facing **newsroom profile**: a `.md` the newsroom fills ONCE, carrying the defaults
> currently re-entered on every visual — brand colours **+ default source/outlet + language +
> credit format** — mechanically loaded by the pipeline and merged onto every element (the
> per-element value always wins). Logo/font stay deferred.
>
> Grounded against the tree on 2026-07-13 (workflow `ground-newsroom-style`, file:line below).

## Why (the gaps this closes)

The F2 profile exists but is thin and unreliable:
- **Scope**: `BrandProfile` carries `{ palette, accent }` only (`skills/atelier/src/brand-profile.ts:16-21`). Source name, language, and credit format have no profile home — they are re-supplied/re-derived every element (source on every producer spec, `chart-native/src/spec-to-config.ts:32`, `dw-chart/src/chart-spec.ts:190`; `lang` re-detected from the article each run, `suggest-chart/SKILL.md:22-41`; the "Source :" label derived from `lang` each time).
- **Wiring**: `loadBrandProfile`/`seedBrandColor` are pure, unit-tested functions that **no pipeline code calls** — the only "invocation" is a prose instruction to the orchestrator agent (`skills/atelier/SKILL.md:125`, CADRAGE Q4). Reliability depends on the agent remembering; there is no produce-time enforcement.
- **Discoverability**: no sample profile exists on disk anywhere — a journalist has no idea what to write.
- **Coverage** (out of scope here, noted): brand *colour* reaches only chart-native + dw-chart. Maps, scrolly, image-native have zero brand handling. The default *source/lang* this design adds DO reach every producer (they live on the shared spec), but extending brand *colour* to maps/scrolly/image is a separate follow-up.

## Locked decisions (from brainstorming)

1. **Scope this iteration**: colours (existing) **+ default source/outlet + language + credit format**. Logo/font deferred (cross-cutting typography/compositing — a separate lot).
2. **Format**: the journalist edits a friendly **`NEWSROOM-PROFILE.md`** (the source of truth); the tool reads a machine **`brand.json`**. A conversion bridges them — the markdown-parsing fragility lives at ONE point (the loader/converter), the rest of the pipeline stays on clean JSON.
3. **Wiring**: **mechanical** — `produce-all` loads the profile and merges its fields as DEFAULTS onto each element's spec (the per-element value always wins). No longer agent-memory-dependent.

## The journalist-facing file — `NEWSROOM-PROFILE.md`

YAML-frontmatter markdown: structured, filled once, with an explanatory body. A fully-filled
sample ships so a non-technical newsroom copies + edits values.

```markdown
---
# Profil de rédaction — rempli UNE FOIS, réutilisé sur chaque visuel
palette:                    # couleurs de la charte ; la 1re = principale
  - "#0A5C36"               # vert maison (principal)
  - "#C8102E"               # accent
accent: "#C8102E"
source:                     # attribution par défaut (l'article peut la surcharger)
  name: "Heidi.news"
  url: "https://heidi.news"
lang: "fr"                  # langue par défaut des livrables (BCP-47)
credit: "Source : {name}"   # format du crédit ; vide = auto d'après la langue
---

# Comment remplir ce profil
- **palette** … - **source** … - **lang** … - **credit** …
(guide explicatif pour une rédaction non-technique)
```

## Architecture

### 1. Extended schema — `skills/atelier/src/brand-profile.ts`

```ts
export interface BrandProfile {
  palette: string[];              // existing — palette[0] = primary house colour
  accent?: string;                // existing
  source?: { name: string; url?: string }; // NEW — default attribution
  lang?: string;                  // NEW — default BCP-47 deliverable language
  credit?: string;                // NEW — credit label template, "{name}" placeholder; empty = auto-from-lang
}
```

`palette` stays REQUIRED for a profile to be "brand" (an empty palette still yields a usable
profile if `source`/`lang`/`credit` are present — so a newsroom that only wants a default source
but no house colour is valid). Adjust `parseBrandProfile` so a profile with **any** usable field
returns non-null (today it returns null unless `palette.length > 0`).

### 2. Markdown source of truth — `NEWSROOM-PROFILE.md` → `brand.json`

A new **frontmatter parser** (in `brand-profile.ts` or a sibling `newsroom-profile.ts`):
`parseNewsroomMarkdown(md: string): BrandProfile | null`. Deterministic, dependency-free
(no YAML lib): extract the block between the first two `---` fences; strip line comments (a `#`
that is NOT inside a quoted span — so a quoted hex `"#0A5C36"` survives, a trailing `# comment`
is dropped); parse the constrained shape (top-level `key: value`, 2-space-nested `source:` with
`name:`/`url:`, and a `palette:` list of `- "#hex"`). Only the known fields are read; unknown
keys ignored. Malformed → null (the loader falls back, never throws).

### 3. Loader — one entry point, `.md` wins, `brand.json` is the cache

`loadNewsroomProfile(projectDir): BrandProfile | null` replaces/wraps `loadBrandProfile`:
- if `NEWSROOM-PROFILE.md` exists → parse it (source of truth), write the parsed `BrandProfile`
  to `brand.json` (machine cache, inspectable), return it;
- else if `brand.json` exists → parse it (existing JSON path), return it;
- else → null.
Never throws (a broken profile must not break production).

### 4. Merge as defaults — `mergeProfileDefaults(spec, profile)`

Seeds the profile's fields onto a producer spec, **spec value always wins**:
- colour: reuse the existing `seedBrandColor` (keeps `brandExplicit` semantics — a non-CVD-safe
  house colour is kept + downgraded to a render-review concern, policy b);
- `source`: `spec.source ??= profile.source`;
- `lang`: `spec.lang ??= profile.lang`;
- `credit`: passed through so the producer's label uses the template when set, else the existing
  lang-derived "Source :"/"Source:".
Pure, unit-testable.

### 5. Mechanical wiring — `skills/atelier/scripts/produce-all.mjs`

Before producing each element, load the profile once and merge its defaults onto the element's
spec: `spec = mergeProfileDefaults(spec, loadNewsroomProfile(projectDir))`. This closes the
file→spec wiring gap: the house style is applied at produce time regardless of whether the
orchestrator agent remembered. `SKILL.md:125` (CADRAGE Q4) is updated to reflect that the
profile is now auto-applied (the agent still *announces* it for veto, but no longer has to
load it manually).

### 6. Example + guide

Ship a filled `NEWSROOM-PROFILE.example.md` (a fictional newsroom) + the guide body, so a
newsroom copies it to `NEWSROOM-PROFILE.md` and edits values. Referenced from `SKILL.md` / the
installer.

## Verification

- Unit: `parseNewsroomMarkdown` (well-formed → profile; comments stripped but quoted hex kept;
  missing frontmatter → null; malformed → null; partial profiles — source-only, palette-only).
- Unit: `mergeProfileDefaults` (spec value wins for colour/source/lang; profile fills only the
  gaps; `brandExplicit` preserved via `seedBrandColor`).
- Unit: `loadNewsroomProfile` (`.md` present → parses + writes `brand.json`; only `brand.json`
  present → reads it; neither → null; broken file → null, no throw).
- Integration: a `produce-all` test asserting a spec with no source/lang picks up the profile
  defaults, and a spec that sets its own source keeps it.
- The gate (`bun run check`) stays 20/20 (new tests under `skills/atelier`, no new gate row).
- Then a **QA wave** with a "house-style" persona (a newsroom imposing its palette + source +
  language), gated on the monthly-spend status (the harness spawns `claude` subprocesses).

## Out of scope (noted follow-ups)

- Brand **colour** for maps / map-dw / scrolly / image-native (today chart-native + dw-chart
  only) — a per-producer plumbing lot.
- **Logo** and **font** profile fields (compositing + typography across every producer).
- A hosted/central profile (vs per-project file) — the F2 design's "env vs hosted profile later".

## Risks

- **Markdown-parsing fragility**: mitigated by isolating it to the loader + writing the parsed
  `brand.json` cache (inspectable), + malformed → null (never breaks production), + unit tests
  on comment/quote edge cases.
- **A stale `brand.json` cache** if the `.md` changes: mitigated by always re-parsing the `.md`
  when present (the `.md` is the source of truth; `brand.json` is regenerated each load).
