# Editorial exchange audit — what the proposal carries, and who reads it

Scope: the proposal mechanism (candidates offered, journalist picks/amends), not a Q&A script.
Entry points: `skills/storyboard/scripts/propose.mjs` (G2a/G2b), `skills/palette/scripts/palette.mjs`,
gate machinery `skills/storyboard/scripts/gate-contract.mjs` (carried into `splash/`, `analyst/`).

## Direction / style — the chart/map type and format

| | |
|---|---|
| Composed | `proposeMediums`/`proposeFormats` (propose.mjs:814,860), `formatCandidates` (propose.mjs:1107) — ranks types from `type-survey.md` + `chart-choice.md`, states reach/refusal per candidate |
| Gate | G2a (medium+intent), G2b (format) — `gate-contract.mjs` `formatGap`/`producerGap` |
| Artefact | `STORYBOARD.md` slot fields `medium`, `format`, `intent`, `chosen` (`REQUIRED_SLOT_FIELDS`, gate-contract.mjs:79) |
| Consumer per export | static/web/video: craft SKILL.md instructs the agent to read the closed slot and pass `--type`/`--beat` to `scaffold-*-beat.mjs` (e.g. `skills/chart-video/scripts/scaffold-video-beat.mjs`); scrolly: `skills/scrolly/SKILL.md:25` requires a closed STORYBOARD picking scrolly. `producer-gate.mjs` (custom vs Datawrapper) is mechanically checked. No scaffold script parses STORYBOARD.md itself — consumption is agent-mediated, not programmatic |
| Verdict | **Proposed and recorded; consumed, but only via the agent reading the file, not a programmatic read in any scaffold** |

## Palette — ground, accent, house accents, typeface

| | |
|---|---|
| Composed | `proposePalette`/`paletteDecision` (palette.mjs:144,266), `typefaceDecision` (typeface.mjs:99) — subject convention → newsroom → journalist, WCAG floor measured before proposing |
| Gate | Not a numbered gate; asked only when `paletteDecision.ask === true`, else derived silently from `NEWSROOM.md` |
| Artefact | `PALETTE.md`, `TYPEFACE.md` per story (or per beat via the escape hatch) |
| Consumer per export | ALL FOUR: every craft skill's `colour.mjs`/`render-*.mjs` calls `readPalette` (confirmed in chart-beat, chart-video, chart-web, scrolly, map-beat, map-web, image-beat, dw-beat) |
| Verdict | **Proposed, recorded, and genuinely consumed by all four exports — the strongest of the four** |

## Precision — rounding, what is asserted, label exactness

| | |
|---|---|
| Composed | Nowhere upstream of production. No `propose*` function in `propose.mjs`/`palette.mjs` builds a precision candidate. The closest recorded fact is G1's `grounding`/`claimShape` (gate-contract.mjs:63,439) — `supported`/`unverifiable`/`overridden` |
| Gate | G1 closes `grounding`, but nothing downstream keys off its value |
| Artefact | `grounding`/`claimShape` land in `STORYBOARD.md`, but the actual "Precision" section (rounding rule, which sentences are asserted) is written **per beat**, inside `BRIEF.md`, by the producing skill itself — e.g. `proof/scrolly-line-swiss-co2/BRIEF.md:28` ("Precision" heading), per `skills/scrolly/references/types/line.md:26` ("BRIEF.md records the choreography table and precision section, not the shape") |
| Consumer per export | `grounding`/`claimShape` are read ONLY inside gate-contract.mjs/propose.mjs — `grep` across chart-beat/chart-video/chart-web/scrolly/map-*/image-beat/dw-beat scripts returns zero hits. The BRIEF.md "Precision" section is self-authored and self-consumed by the same beat, never a candidate the journalist picked from |
| Verdict | **Never proposed as a candidate. `grounding` is recorded and never read by any producer. The actual precision decision is invented downstream, per beat, by whoever writes BRIEF.md** |

## Orchestration / interaction — choreography, timing, hover, single frame

| | |
|---|---|
| Composed | `visualCatalogueEntries` (propose.mjs:341) attaches `interaction: pair.interaction` (`{kind, promise}`) from `references/visual-catalog.json`'s `formatPairs` — e.g. `chart/scrolly → {kind: "scroll", promise: "…every card changes the picture"}`. This is the only place an interaction promise is composed as data |
| Gate | None. `visualCatalogueEntries`/`visualCatalogueEntry` are exported but **called nowhere** outside their own test (`skills/storyboard/test/visual-catalog.test.ts`) — not from `storyboard.mjs`, not from `formatCandidates`, not from any craft skill |
| Artefact | None. No `orchestration`/`interaction` field exists in `REQUIRED_SCALARS`/`REQUIRED_SLOT_FIELDS` or `STORYBOARD.md` |
| Per export | **static**: single frame, nothing to orchestrate, correctly asked-nothing. **video**: choreography (`establish/reference/reveal/subject/conclusion/hold`) is written by the agent straight into the beat's own `BRIEF.md` "## The choreography" table, per `skills/chart-video/references/directed-type-choreography.md` — never proposed, never a journalist pick. **scrolly**: same — `BRIEF.md`'s "## The choreography" card table (`proof/scrolly-line-swiss-co2/BRIEF.md:13`), authored per beat against `directed-type-choreography.md`. **web**: `skills/chart-web/references/directed-interaction.md` drives hover/tap/keyboard detail, same pattern — per-beat, not proposed |
| Verdict | **Composed as inert catalogue data, never wired into the proposal or into any gate; every export invents its own orchestration downstream at production time, with no journalist-facing candidate and no recorded artefact** |

## Gaps, worst first

1. **Orchestration/interaction has no proposal, no gate, no artefact for any of the four exports.** `visualCatalogueEntries.interaction` is the only code that composes it and is dead (test-only caller). Video, web and scrolly each reinvent choreography per beat from a doctrine reference file, with no mechanism stopping two beats of the same type from choreographing differently for no editorial reason, and no way for the journalist to have chosen or amended it.
2. **Precision is recorded (`grounding`/`claimShape`) but zero producers read it.** A claim graded `unverifiable` at G1 has no enforced effect on how the number is later asserted or rounded in `BRIEF.md` — the two are unconnected in code, only by convention/discipline in the reference docs.
3. **Direction/style consumption is agent-mediated, not mechanical**: no scaffold script parses `STORYBOARD.md`; an agent that skips reading the closed slot and hand-types `--type` is not caught by any script (only `producer-gate.mjs`'s custom/Datawrapper split is enforced in code).
4. **Vocabulary drift, minor**: `skills/map-beat/SKILL.md:283` still says "VIDEO genre" in prose; the code canonicalizes `genre` → `format` as a legacy alias (`gate-contract.mjs:375-386`) and machinery is unaffected, but a fresh read of that line teaches the wrong field name.
