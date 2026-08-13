# Splash publication format gate PRD

Status: implemented
Date: 2026-08-13
Owner: Splash
Scope: storyboard orchestration, persisted story state, production dispatch, and delivery terminology

## Summary

Splash must ask the journalist whether a visual should be produced as a static graphic, interactive
web page, video, or scrollytelling piece before it chooses a treatment or starts production. The
current workflow calls this choice `genre`, presents it as one movement inside a long storyboard
exchange, and relies on prose deep in a reference file to make the agent stop. In a real run, the
agent recommended web, completed the remaining storyboard work, and asked for one blanket
confirmation. The journalist never received a distinct publication-format decision.

This change renames `genre` to `format` throughout Splash's canonical contracts and makes G2b a
real stop-and-wait gate. The agent recommends one reachable format, explains the alternatives,
asks one question, and ends its turn. It records `format` only after the journalist replies. Story
state reports the pending gate explicitly so a new session resumes at the same decision.

The rename is semantic as well as editorial. `format` replaces `genre` in `STORYBOARD.md`, runtime
APIs, gate readers, catalog names, tests, handovers, and the post-delivery offer to make the same
beat in another format. Existing storyboards that contain `genre` remain readable through one
compatibility boundary implemented by both independent storyboard readers; Splash never writes new
`genre` fields.

## Problem

The current contract has three weaknesses.

First, the journalist-facing decision is obscured by the word “genre.” In Splash, the values are
`static`, `web`, `video`, and `scrolly`. These are publication formats that determine which producer
runs and what the newsroom receives. “Genre” makes this consequential choice sound like an internal
classification.

Second, the stop condition is not prominent enough. The storyboard reference says “one question at
a time” and “silence is not consent,” but the top-level orchestrator dispatches the whole storyboard
phase as one unit. Nothing near that dispatch says to end the turn at G2b. The tested run therefore
treated a recommendation as part of its own reasoning and advanced to reference research, palette,
and candidate selection before the journalist answered.

Third, persisted state can say only that a story is somewhere in `storyboard`. It reports all
missing fields but does not identify the next ordered decision. A resumed agent cannot directly
read “G2b is waiting for the journalist to choose a publication format.”

The failure is observable in the heat-pump test: context stated a preference for full-width web
with a static fallback; the agent converted that preference into a web recommendation and asked for
approval only after completing movements ②–⑩. A preference in source material is evidence for a
recommendation, not the journalist's confirmation.

## Goals

- Give the journalist a distinct choice between Static / print, Interactive web, Video, and
  Scrollytelling before production.
- Rename the canonical concept and field from `genre` to `format`.
- Make the format gate stop the current agent turn and wait for an explicit reply.
- Keep recommendations useful: Splash should propose one format and explain its trade-off rather
  than present an unranked menu.
- Persist enough ordered state for any supported host to resume at the pending decision.
- Prevent a proposed or inferred format from being treated as confirmed.
- Preserve existing story data through a narrow, explicit legacy reader.
- Test the conversation behavior, not only the final file schema.

## Non-goals

- Renaming craft skills such as `chart-web`, `chart-video`, or `scrolly`.
- Renaming the values `static`, `web`, `video`, and `scrolly`. “Static / print” is the
  journalist-facing label for the canonical value `static`; static graphics may also be used in
  non-interactive digital contexts.
- Combining publication format with visual medium. `chart`, `map`, and `image` remain media.
- Combining publication format with chart treatment. Slope, dumbbell, line, and choropleth remain
  treatments or types.
- Combining publication format with delivery packaging. `owned-file`, `source-bundle`, `embed`,
  and `cms-insertion` remain delivery forms chosen after an approved render.
- Building a new standalone Splash harness. Splash remains a portable skill pack for its supported
  hosts. Host-specific adapters may repeat the gate rule, but the canonical behavior lives in the
  Splash and storyboard skills.
- Producing every requested format in parallel. G2b chooses the first format to produce.
- Building automatic production scheduling from the post-delivery “another format” answer. The
  current receipt records an answer but does not create a new output; this PRD renames and preserves
  that mechanism without claiming that downstream path exists.

## Terminology

| Concept | Canonical values | Journalist-facing question |
| --- | --- | --- |
| Medium | `chart`, `map`, `image` | What kind of visual evidence is this? |
| Format | `static`, `web`, `video`, `scrolly` | How should readers receive it: Static / print, Interactive web, Video, or Scrollytelling? |
| Treatment | `slope`, `dumbbell`, `line`, and other type IDs | Which visual treatment best proves the takeaway? |
| Size | `landscape`, `square`, `portrait` | Which frame should a static graphic or video use? |
| Delivery form | `owned-file`, `source-bundle`, `embed`, `cms-insertion` | How should the approved output leave Splash? |

Journalist-facing copy must use “publication format” or “format.” Maintainer-facing code and
documentation must also use `format`, except inside the isolated legacy compatibility reader and
tests that prove it works.

## Required user flow

G2b occurs after the journalist has confirmed the medium and before size, reference selection,
palette, final treatment selection, or production.

For the heat-pump test, the G2b turn should have ended in this shape:

> Which publication format should Splash make first?
>
> Recommended: **Interactive web**, because the article calls for a full-width web treatment and
> the chart can expose exact country values on hover, tap, and keyboard focus.
>
> - **Static / print:** one fixed graphic, suitable for print and non-interactive placement.
> - **Interactive web:** a responsive page with exact values available on interaction.
> - **Video:** a timed build for broadcast or social video.
> - **Scrollytelling:** a fixed visual whose state changes with the article's scroll sequence.
>
> Which should I produce first?

The agent must then end its turn. It must not select a slope chart, run reference research, choose a
palette, write `format: web`, create a beat, or invoke a producer until the journalist replies.

Only reachable formats are selectable. An unavailable format is still named, with the concrete
reason it is unavailable, so absence is not mistaken for omission. A preferred format found in
`context.md`, an article, newsroom configuration, or prior transcript changes the recommendation;
it never closes G2b.

If the journalist chooses `static` or `video`, Splash proceeds to G2c and asks for size. If the
journalist chooses `web` or `scrolly`, Splash records no size and proceeds to the reference loop.

## Functional requirements

### R1. Rename the canonical contract

New `STORYBOARD.md` files and all rewritten storyboards must use:

```yaml
slots:
  - id: 1
    proves: "Every sampled country increased adoption while the 2025 gap remained wide."
    medium: chart
    format: web
    reachable: yes
```

They must not write `genre:`. Gate errors, handovers, maintainer notes, and user-facing copy must not
describe `static`, `web`, `video`, or `scrolly` as genres.

The corresponding runtime vocabulary must be renamed, including these public module surfaces:

- `GENRE_CATALOG` → `FORMAT_CATALOG`
- `genresFor` → `formatsFor`
- `genreGap` → `formatGap`
- `proposeGenres` → `proposeFormats`
- `SIZED_GENRES` → `SIZED_FORMATS`
- `FORMS_BY_GENRE` → `FORMS_BY_FORMAT`
- option and payload fields named `genre` → `format`
- the “another genre” delivery offer and receipt → “another format”

Files whose primary responsibility is the renamed concept must be renamed as part of the same
change, including the catalog and post-delivery offer modules and their tests. The implementation
must not leave aliases spread through production code.

### R2. Make G2b a blocking human gate

The top of `skills/splash/SKILL.md` must carry the same high-salience operational rule used by the
working Spotlight orchestration pattern:

> At every human gate, present the decision and recommendation, then end the turn. Do not continue,
> self-approve, or treat silence as approval. Act on the decision only after the user's next message.

The rule must name G2b explicitly as the publication-format gate. `skills/storyboard/SKILL.md` must
repeat the local form of the rule beside the format exchange. The longer exchange reference remains
supporting detail rather than the sole enforcement point.

One turn may contain analysis needed to prepare the format recommendation. It may contain only one
question requiring a decision, and nothing belonging to a later movement.

### R3. Record confirmation, not recommendation

The canonical `format` field records the confirmed decision. Splash writes it only in response to
an explicit journalist selection in the current or immediately preceding user message.

An inferred preference, the agent's recommendation, a default, a previously generated draft, or
silence must not populate `format`. Proposal prose may be regenerated from the frozen story state;
it must not be stored in the confirmed field.

The existing `confirmReachable` operation becomes `confirmFormatReachable` and runs only after the
journalist's selection. Its `reachable: yes` result proves only that the selected medium/format
pair has both a producer and a delivery path; it does not prove who selected it.

Splash's portable skill runtime cannot independently authenticate the provenance of a chat message.
The human boundary is therefore enforced by the top-level stop instruction, absence of `format`
before the reply, and a real-host transcript test. The implementation and documentation must not
claim cryptographic or filesystem proof that a named person made the decision. A future host with
authenticated message IDs may add a bound decision receipt without changing the canonical format
vocabulary.

### R4. Expose the pending ordered decision

`whereIs(storyDir)` must retain its top-level phase result and add ordered gate state. When the
medium is confirmed but format is absent, it returns the equivalent of:

```json
{
  "phase": "storyboard",
  "gate": "G2b",
  "awaiting": "format",
  "slotId": "1"
}
```

The exact JSON representation may follow existing return conventions, but `gate`, `awaiting`, and
the affected slot must be directly inspectable. The agent must not infer the next question from an
unordered list of every missing field.

The storyboard phase must persist a provisional slot before G2a begins. The slot has an ID and the
confirmed claim it is intended to prove in `proves`; `medium`, `format`, `size`, and `chosen` are
added only as their decisions close. A provisional slot without `id` or `proves` is incomplete and
must be reported rather than advanced. This gives the state reader one place to record and recover
each ordered sub-gate without duplicating confirmed values at story level.

For multiple slots, the persisted `slots` array is the total order. Splash completes G2a → G2b →
G2c for the first incomplete slot before asking about the next slot. A `web` or `scrolly` selection
closes G2c immediately with no `size` field; a `static` or `video` selection leaves G2c awaiting a
size. Only after every slot has completed G2a–G2c does the story advance to the reference loop.
`whereIs` returns the first incomplete slot in array order. Reordering slots is itself an explicit
storyboard revision, never an incidental result of resume.

### R5. Keep format and delivery form separate

Selecting `web` at G2b chooses the web producer. It does not choose `owned-file`, `embed`,
`cms-insertion`, or `source-bundle`. Splash asks that delivery-form question only after a rendered
output passes QA and the journalist approves it at G3.

All prompts must use “publication format” at G2b and “delivery form” at G4. Tests must reject copy
that calls the G4 choice “format” without the word “delivery,” because the two decisions otherwise
become ambiguous again.

### R6. Preserve legacy storyboards at the persisted-state boundary

Splash has two independent readers of `STORYBOARD.md`: the storyboard parser and `whereIs`. Both
must accept a legacy slot containing `genre` when `format` is absent and normalize it in memory to
`format`. They must behave identically as follows:

- `genre: web`, no `format` → read as `format: web` and mark the document as legacy.
- `format: web`, no `genre` → canonical.
- both fields with the same value → read successfully, mark for cleanup on the next explicit write.
- both fields with different values → fail closed and name the conflict.

The independence rule remains in force: runtime code does not add a cross-skill import merely to
share the parser. Parity tests must exercise canonical, legacy, dual-equal, and dual-conflicting
documents through both readers and require the same result. If implementation instead chooses one
shared persisted-state parser, that is an explicit architecture change and must replace the current
no-cross-skill-import contract and its tests in the same change; it may not happen accidentally.

One canonical storyboard mutation operation must own serialization and atomic replacement. Every
new storyboard write routes through it. It preserves prose, unknown frontmatter fields, quoting
where semantically relevant, slot order, and all bytes outside fields it intentionally updates.
For a legacy storyboard, the next explicit mutation replaces `genre` with `format`; reading alone
does not mutate a journalist's files. An interrupted write leaves the last complete storyboard
intact. Repository-owned fixtures and active test stories are migrated in the implementation
change; already delivered exports remain immutable historical artifacts.

No runtime API accepts both `{genre}` and `{format}`. Compatibility is limited to the persisted
storyboard input boundary so the new vocabulary cannot split into two long-lived APIs.

### R7. Rename the post-delivery choice

After one format has been delivered, Splash may offer the same beat in another reachable format.
The current “another genre” functions, receipt, messages, and close-state checks must become
“another format.” This change remains a terminology and compatibility migration: recording
`taken <format>` does not itself create a new output or claim that production has started.

Declining the offer remains a recorded answer. The rename must not change the delivery close
semantics. Existing immutable exports containing `.another-genre` remain readable. The renamed
reader uses `.another-format` when present, falls back to `.another-genre`, accepts matching dual
receipts, and fails closed on conflicting dual receipts. A new explicit answer writes
`.another-format`; it does not rewrite the legacy export merely because it was read.

### R8. Preserve capability and dispatch behavior

The rename must not widen what Splash can produce. The existing medium/format reachability matrix
remains authoritative:

- chart: static, web, video, scrolly
- map: static, web, video, scrolly
- image: static, scrolly

Production dispatch continues to select a craft skill from the confirmed `{medium, format}` pair.
Delivery continues to offer only forms supported by the confirmed format and the current
environment.

Datawrapper keeps its provider-specific vocabulary behind its producer boundary. Canonical
`format: web` maps to Datawrapper `format: interactive`; canonical `format: static` maps to
Datawrapper `format: static`. Provider payloads must namespace or locally contain that field so the
two vocabularies cannot be passed through interchangeably. Tests must pin both mappings.

## Acceptance criteria

1. Given a confirmed chart medium and no format, `whereIs` reports `storyboard`, `G2b`, and
   `awaiting: format` for the correct slot.
2. Given the heat-pump fixture and its web preference, the next assistant turn recommends
   Interactive web, names Static / print, Video, and Scrollytelling with trade-offs, asks which
   format to produce first, and ends.
3. Before the user's answer, the provisional slot contains `id` and `proves` but no confirmed
   `format`, no `reachable: yes` for that pair, no chosen treatment, and no beat source or render.
4. After the user answers “web,” the storyboard records `format: web`; G2c asks no size question;
   the next ordered state is the reference loop.
5. After the user answers “static,” the storyboard records `format: static`; the next ordered state
   is G2c awaiting size.
6. A source preference such as “full-width on web” changes the recommendation but does not populate
   `format` before a user reply.
7. New and rewritten storyboards, generated handovers, user-facing prompts, runtime option names,
   and canonical documentation contain no `genre` terminology.
8. A legacy `genre: web` storyboard resumes successfully and is normalized in memory by both
   independent readers. A conflicting `genre`/`format` pair fails with the same specific error in
   both readers.
9. `offerForms` and `materialise` accept `format` and reject `genre` in their canonical APIs.
10. A canonical storyboard mutation upgrades `genre` to `format` atomically while preserving its
    prose, unrelated frontmatter, and slot order; an injected write failure preserves the last
    complete file.
11. A two-slot storyboard resumes at the first incomplete slot and completes G2a → G2b → G2c per
    slot before the reference loop.
12. Post-delivery copy asks about “another format”; legacy and canonical receipt names preserve the
    existing close-state behavior, and no response is represented as a newly scheduled output.
13. Datawrapper receives `interactive` for canonical `web` and `static` for canonical `static`.
14. All existing reachability, size, render, delivery, and replacement tests pass after the rename.
15. A transcript-level conformance test fails if G2b and any later storyboard movement occur in the
    same assistant turn.

## Verification

The implementation is not complete with string-search and unit tests alone. Verification must
include:

- Parser and gate unit tests for canonical, legacy, dual-equal, and dual-conflicting fields through
  both independent readers.
- Canonical-writer tests for preservation and interrupted atomic replacement.
- `whereIs` state-transition tests covering G2a → G2b → G2c/reference for every format and for an
  interrupted two-slot storyboard.
- Catalog parity tests proving every `{medium, format}` pair still maps to an existing producer and
  a supported delivery path.
- Delivery tests proving `FORMS_BY_FORMAT`, insertion preference, handover generation, and
  replacement behavior retain their current results.
- Post-delivery receipt tests for legacy-only, canonical-only, matching-dual, and conflicting-dual
  states.
- Datawrapper producer-boundary tests for both canonical mappings.
- A repository search allowing `genre` only in the legacy adapter, migration fixtures, historical
  records that are intentionally immutable, and the PRD's description of the rename.
- A scripted conversation fixture for the heat-pump story that asserts a turn boundary at G2b and
  inspects the filesystem before and after the journalist's reply.
- At least one real run in a supported host. The acceptance record must include the G2b prompt, the
  journalist's reply, the next `whereIs` result, and the resulting `STORYBOARD.md` diff.
- The repository release baseline: `bun test`, `bun run matrix:check`, and
  `bun run survey:check`.

## Acceptance record

Verified in a fresh Codex host on 2026-08-14 against an isolated copy of the heat-pump fixture.
Before the journalist's reply, `whereIs` returned `storyboard`, `G2b`, `awaiting: format`, and
`slotId: "1"`. The host produced this turn and stopped:

> Which publication format should Splash make first?
>
> Recommended: **Interactive web**, because the article calls for a full-width web treatment and
> exact country values can remain available on interaction.
>
> - **Static / print:** one fixed graphic, suitable for print and non-interactive placement.
> - **Interactive web:** a responsive page with exact values available on hover, tap, and keyboard
>   focus.
> - **Video:** a timed build for broadcast or social video.
> - **Scrollytelling:** a fixed visual whose state changes with the article's scroll sequence.
>
> Which should I produce first?

The journalist replied, “Interactive web.” The canonical atomic mutation produced only this
storyboard change:

```diff
     proves: "Every sampled country increased adoption while the 2025 gap remained wide."
     medium: chart
+    format: web
+    reachable: yes
 ---
```

`whereIs` then returned `storyboard`, `G2-reference`, and `awaiting: reference`. `size`, reference
selection, treatment selection, and `chosen` remained absent; `beats/` and `export/` remained empty.
Before the reply, the storyboard and complete fixture manifest were byte-identical across the G2b
turn. The host did not run reference research, palette work, production, rendering, or delivery.
The exact assistant turn, journalist reply, pre/post storyboards, diff, and SHA-256 manifests are
pinned by `skills/storyboard/test/fixtures/publication-format-host-acceptance.mjs` and exercised as
one conversation/filesystem conformance case in `publication-format-gate.test.ts`.

Release verification passed in the same working tree: `bun test` reported 2,967 passing tests and
zero failures; `bun run matrix:check` and `bun run survey:check` both reported their generated
documents current.

## Rollout and migration

Land the vocabulary rename, legacy reader, ordered state, prompts, and tests together. A partial
change would create the exact split this work is meant to remove: one gate writing `format` while a
producer or delivery path still reads `genre`.

On first read, existing stories continue without modification. On the next explicit storyboard
write, the canonical serializer upgrades them to `format`. The release notes must call out the
field rename for anyone with scripts that inspect `STORYBOARD.md`; no compatibility promise is made
for direct imports of the old JavaScript symbol names.

The change is ready to ship only after the real-host run stops at G2b. Passing schema tests without
that observed turn boundary is insufficient.

## Source evidence

- At authoring, Splash grouped G1 and G2a–G2c inside one `storyboard` phase:
  `skills/splash/SKILL.md`.
- The pre-change exchange called G2b “genre” and listed static, web, video, and scrolly:
  `skills/storyboard/references/exchange.md`.
- Pre-change tests verified movement order but did not verify that the agent ended its turn:
  `skills/storyboard/test/exchange-shape.test.ts`.
- Before implementation, `whereIs` validated the final slot fields but exposed no ordered pending
  sub-gate:
  `skills/splash/scripts/where.mjs`.
- Spotlight's working orchestration repeats the human-gate rule in both its top-level skill and its
  Flue agent instructions, including the explicit command to end the turn:
  `../spotlight/skills/spotlight/SKILL.md` and `../spotlight/harness/flue/src/agents/spotlight.ts`.
