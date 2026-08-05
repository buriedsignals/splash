---
name: splash-production
description: "Use as phase 5 of the splash flow: run the producer for the pinned format, surface the render, and take the journalist's approval on what they can see. Invoked by skills/splash at the PRODUCTION step, never directly by a journalist. Keywords production, gate 3, produce-all, render, review, approval, present."
---

# splash-production — PRODUCTION — build the pinned format, and show it before asking anything. Gate 3.

### 5. PRODUCTION

PRODUCTION is a coded, **drop-proof** loop — you do NOT run producers one at a time from prose.
You assemble the accepted proposals into one file and let `produce-all` produce every one of them,
so a secondary proposal can never silently drop. If the element/format needs to change during
PRODUCTION (a fallback, a journalist request, a retry) — go back through `suggest-chart` for the new
routing, the same way `needs-fallback` (5d) already re-emits via suggest-chart; never hand-author the
producer spec yourself (see Never).

**5a. Validate each spec first.** For every accepted proposal, run the producer's spec validator
(`validateChartSpec` for charts; `validateChoroplethConfig` / `validateLocatorConfig` /
`validateSymbolConfig` / `validateMapSpec` for maps) and fix any warning — in particular a title that
reads as a label rather than the insight — so a weak spec never reaches GATE 3. The spec's `source`
must be the one already established at Gate 2c (name + a specific traceable URL, or the honest prose
fallback per 2c — the genuine no-dataset case, or a hedged source left unconfirmed; never a confident
citation over a « je crois ») — never a placeholder, never the `suggest-article` `dataSource.table` filename
slipped in as the label (see suggest-article's Gotcha (4)). **A reserved placeholder URL
(`…example.com`, `.test`, `.invalid`, `localhost`, RFC 2606/6761) is MECHANICALLY rejected by the spine's
validation gate (GUARD 2, `src/source-guard.ts`) — the proposal comes back `status:"failed"`, never
produced; a name-only prose source with no URL still passes.**

**5b. Assemble `exports/<slug>/accepted.json`** — an array, one entry per accepted proposal:
`{ "id": "<stable-id>", "producer": "dw-chart|chart-native|map-dw|map-native|scrolly",
"format": "static|interactive|video|scrolly", "spec": <the validated producer spec>,
"confirmedTakeaway": "<the takeaway the journalist EXPLICITLY confirmed FOR THIS ELEMENT (Gate 1b),
VERBATIM — every part of that element's multi-part takeaway, never a paraphrase, and never a combined
multi-element string shared across entries>",
"provenance": "table|prose|none", "confirmedTable": <true ONLY after an actual Gate 2b prose-table
confirmation — stays false/absent for "table" (and "none") provenance, which never go through 2b;
never set it true on a table-provenance proposal just because it looks accepted>,
"channel": "social-vertical|social-feed|article-web",
"sourceHint": <OPTIONAL — `suggest-article`'s `sourceHint` verbatim, `{ "name"?, "url"? }`, set ONLY
when the ARTICLE itself named a source/URL; omit entirely when it named none>,
"skillsInvoked": ["splash:cadrage-guided" | "splash:cadrage-direct", "<each sub-skill you actually
invoked>", …] }`.
`producer` + `format` are what suggest-chart routed; `provenance` comes from suggest-article.
**`sourceHint`, when the article named a source, MUST be carried onto the accepted proposal** — the
spine's source guards (`validateAccepted` → `sourceNamePreservedReason` / `sourceUrlFidelityReason`)
consume it to FAIL (B) a named org collapsed to the generic "reported in this article" fallback, and
(D) a shipped URL that diverges from the journalist-provided one. This is prose-enforced the same way
as `channel` and `confirmedTakeaway`: there is no script that transforms `suggest-article`'s in-context
ProposalSet into `accepted.json` — YOU copy the hint across here, verbatim. Dropping `sourceHint`
silently disarms those guards, exactly like dropping `channel` disarms the format gate. **Backstop:**
when the shipped `source` is the generic fallback but no `sourceHint` was threaded (on a `table`-backed
claim), `validateAccepted` emits a non-blocking render-gate WARNING (`ProposalResult.warnings`) so a
dropped hint is no longer fully silent — treat that warning as "confirm the article really named no
source; if it did, thread the hint and re-produce". It is advisory only; it never blocks the produce.

- **`skillsInvoked`** (REQUIRED on new proposals): the skills you actually invoked for this
  element, first entry declaring the branch — `"splash:cadrage-guided"` or
  `"splash:cadrage-direct"` — then e.g. `"suggest-article"`, `"suggest-chart"`. Copied across
  like `channel`/`confirmedTakeaway`; the spine gate warns when absent and FAILS a guided
  entry without `suggest-chart` (GUARD 5).
- **`anchor`** (copy it across when `suggest-article` provided one): the element's placement in
  the article — `{ paragraphIndex, quote }`, the passage this visual serves. Copied verbatim
  like `sourceHint`; EXPORT emits it at hand-over (§6, delivery placement).
- **`freeStanding: true`** — the OTHER way to declare a placement, and it is a declaration, not a
  blank. It says this element belongs to the piece as a whole rather than to one passage: an
  opening visual, a closing one, a standalone card. Use it whenever there is no passage to anchor
  on, instead of leaving both fields out.

  **Once an article was read, silence is not an option: the export REFUSES an element that declares
  neither.** An `anchor` or `freeStanding: true` — one of the two, per element. This is the one
  place the flow makes you say something you could previously omit, and the reason is that an
  omitted placement is indistinguishable from a forgotten one: the journalist receives a finished
  visual with no idea where it goes, which is exactly what suggest-article did the work to prevent.
  A run with no article at all (a bare topic) is unaffected — nothing to place it in, nothing
  refused. Neither is a direct-branch run that never read one.

**`confirmedTakeaway` is REQUIRED** — the spine's validation gate (`src/validate-gate.ts`) FAILS any
proposal missing/empty it (GUARD 3), on both branches. It is the Gate-1b presence lever: Gate 3a quotes
it VERBATIM against the produced title, part by part — copy the confirmed wording exactly, never a
paraphrase that drops a part. **Per-element, never shared:** each entry carries its OWN confirmed claim;
the same gate FAILS two proposals of a batch with the byte-identical `confirmedTakeaway` (GUARD 3b).
**`channel` is REQUIRED** — the CADRAGE Q6 pick, copied verbatim; `produce-all`'s channel/format gate
reads it to enforce "not-embed ⇒ never interactive/scrolly", and an ABSENT channel falls back to the
permissive `article-web` (a dropped `channel` would ship an interactive nobody asked for; a GARBLED one
fails closed). Never omit it. See `docs/splash/guardrails.md`.

**Record each flow decision mechanically (does NOT replace the gate — it feeds it).**
After the corroborating step, run the sanctioned writer so the spine can verify it:
- after suggest-chart produced `candidates.json`:
  `bun skills/splash/scripts/save-decision.mjs suggest-chart-invoked <runDir>`
- when citing the article's source:
  `bun skills/splash/scripts/save-decision.mjs source-fidelity <runDir> --payload '{"article":"…","sourceName":"…","sourceUrl":"…"}'`
- when escalating to chart-native on a dw-reachable type:
  `bun skills/splash/scripts/save-decision.mjs producer-escalation <runDir> --payload '{"escalationReason":"…"}'`
`<runDir>` is the directory that holds `accepted.json`/`candidates.json`. The writer REFUSES a
decision whose evidence is missing — you cannot record a routing that did not happen.

**Before producing: the menu is a precondition, checkable directly.** `produce-all` itself refuses
to start when no ranked menu was ever written down for this story — the same disk fact is available
standalone, so a missing menu is caught before the heavier script even runs:
```bash
bun lib/host/cli.ts precheck --stage production --dir exports/<slug>
```
A non-zero exit means `candidates.json` is absent (PROPOSITION's Stage-1 write never happened, or
happened somewhere else) — production does not start until it exists, for every proposal EXCEPT
the direct branch: an `accepted.json` where every proposal is `skillsInvoked: ["splash:cadrage-direct"]`
(the journalist NAMED the visual) needs no menu, and `precheck` reads that same file beside `--dir`
to grant the same exemption `produce-all` itself applies.

**5c. Produce everything at once** — the report lands in a FILE by itself (the gates and EXPORT read
it back):
```bash
bun skills/splash/scripts/produce-all.mjs exports/<slug>/accepted.json exports/<slug>
```
`produce-all` iterates EVERY proposal, dispatches to the right producer + format, and writes
`{ results: [{ id, producer, actualProducer, format, status, outputs?, publicUrl?, reason?, error?, renderApproved }] }`.
It exits non-zero only if some `status` is `"failed"`. **`produce-all` WRITES `exports/<slug>/report.json`
itself** — you do not have to redirect, and forgetting to is no longer a way to lose the render gate
and the sign-off (both take that file as an argument; a real host run produced a correct chart, forgot
the `>`, and left both unreachable with nothing reporting it). It still prints the report on stdout,
so `> exports/<slug>/report.json` remains legal and writes the same bytes; producer progress goes to
stderr, so stdout stays pure JSON.
**Producer-match guard (GUARD 1, `src/producer-guard.ts`):** `actualProducer` records what ACTUALLY
ran; `produce-all` fails-hard when it diverges from the accepted `producer` (a silent dw-chart→chart-native
flip is refused). The ONE sanctioned switch is the native→dw fallback (`needs-fallback`, below); any other
element/format change goes back through `suggest-chart` (5d / see Never) — never hand-swap the producer in
`accepted.json`. See `docs/splash/guardrails.md`.

Before dispatch, `produce-all` re-validates EVERY accepted proposal at the spine
(`src/validate-gate.ts` → `validateAccepted`): the producer's own validator, the placeholder-source
guard (GUARD 2), and the deterministic guardrail-parity gate (aspect↔type, chart-native furniture,
subject-fit) — there is no trust boundary with `suggest-chart` (same LLM), so a HAND-AUTHORED spec must
clear the identical bar or it comes back `status:"failed"`. Guard details: `docs/splash/guardrails.md`.
The SEMANTIC parts (is the title really the insight? the RIGHT chart?) have no gold at produce and stay
the render-review's job (GATE 3); validator WARNINGS stay advisory here, surfaced at the render gate.

**Every re-produce (any re-run of 5c) writes a WHOLLY FRESH `report.json`** — `renderApproved:false` and
`reviewed` absent for EVERY proposal, even one already approved before the correction (a re-produced
artifact has never been through Gate 3). So Gate 3a then 3b MUST run again, in order, on the NEW render;
never call `gate-render` right after a re-produce assuming a prior sign-off holds (see Never), and never
hand-edit `report.json` to restore a prior approval. The render-provenance guard refuses a stale-generation
approval — `docs/splash/guardrails.md`.
Each proposal's artifacts land in a **per-proposal subdir** `exports/<slug>/<id>/` — that subdir (not the
parent `exports/<slug>`) is the `<outDir>` you hand to the EXPORT scripts below.

**5d. Act on each result's `status` (every accepted id appears — nothing is dropped):**
- **`produced`** → go to GATE 3 for that visual.
- **`needs-confirmation`** (a `provenance:"prose"` proposal not yet confirmed) → this is **Gate 2b**:
  show the reconstructed table to the journalist, get an explicit OK, set that proposal's
  `confirmedTable: true` in `accepted.json`, and re-run 5c. Never chart a prose figure unconfirmed.
- **`needs-fallback`** (a native chart type chart-native cannot map) → re-emit a **dw-chart** `ChartSpec`
  for that claim via suggest-chart, replace that proposal's `producer`/`spec` in `accepted.json`, re-run
  5c. Do not hand-translate. This native→dw direction is the ONE producer switch GUARD 1 sanctions; the
  reverse (dw→native) or any other switch is refused (see 5c).
- **`failed`** → surface the `error`; fix the spec or drop the proposal. Never ship a failed visual.
  **A non-zero `produce-all` exit (or any gate refusal) is a HARD STOP the journalist is ALWAYS told
  about — never worked around** by re-authoring code, hand-editing outputs, an ad-hoc script, or a silent
  retry with hidden changes (see Never; the harness `check:conformance-no-fabrication` catches a produce
  exit=1 the run continued past).
  **"Surfaced" means the FACT and the NEXT ACTION, not the engine's internals** (`skills/splash/SKILL.md`
  §Voice): tell him a step failed, what it costs his article, and what to relaunch or decide. The file,
  the line, the function, the hash, the internal id and the reasoning about which guard misfired stay OUT
  of the chat and go to the backlog/defect note — he will not fix this tool, and asking him to arbitrate
  a defect is its own failure. Nothing is softened or hidden by this; only the audience changes. If the
  failure is a **conformance gate** rejecting the accepted spec (e.g. a colour/contrast/format
  violation) — do NOT silently mutate the accepted spec (`baseColor`, format, etc.) to make the gate
  pass without saying so: SURFACE the conformance issue to the journalist as-is, and if the spec
  genuinely needs to change to fix it, re-open GATE 2 for the journalist to re-accept the changed spec —
  never edit-and-reship a spec the journalist never saw (see Never). If the
  failure traces to the PRODUCER/COMPONENT'S own source code rather than the spec — a genuine engine bug,
  not a data/shape problem — do NOT edit that code (`skills/*/src`, any `.tsx`/`.ts` producer file) to force
  the gate green, and do NOT author a NEW ad-hoc script (a case-named `verify-*.mjs`) to stand in for a
  pipeline step: REPORT the bug to the journalist (this visual cannot ship yet) and drop or route around
  the proposal instead (see Never).

**Bounded retry — a failing produce/validate is never worked around.** When produce-all or a
validator exits non-zero, it is retried ONCE, with the error message quoted verbatim and
shape-only fixes (fix the malformed/missing spec field the error names — a SUBSTANTIVE spec
change still re-opens GATE 2 (5d); never rewrite content to dodge a guard, never switch tools,
never hand-build artifacts). If it fails again: STOP and present the failure to the journalist
honestly (see the Stall protocol, below the flow).

**GATE 3 (render) — per produced visual.**

**3a. Render-review FIRST (mandatory, Layer 2).** Before you show the journalist anything, put the
produced visual through an INDEPENDENT editorial pass per `references/render-review.md`: read the ACTUAL
render + the article + data against the six criteria (title honesty — including that the title matches
the takeaway the journalist confirmed at CADRAGE Gate 1b, not a narrower or different claim — source
traceability, honest encoding, earns-its-place, legibility/a11y, fidelity). **The review MUST QUOTE the
proposal's `confirmedTakeaway` (from `accepted.json`, 5b) VERBATIM and state EXPLICITLY whether the
produced title/insight carries ALL its parts** — a two-part takeaway ("X is falling everywhere AND
Italy is the only riser") needs BOTH parts carried by the visual's title/framing, or the dropped part
recorded as a concern; a review that never quotes the confirmed takeaway, or quotes it without the
part-by-part statement, is NOT a valid render-review (this omission is itself a review failure —
re-run 3a properly). This is the recurring miss this lever exists to close: a chart type that
foregrounds one half of the confirmed claim (a slope showing the fall but not the one riser) silently
drops the other half unless the review names it. **For a SCROLLY, the review MUST likewise verify EACH
step caption against what that step visually shows** — in particular any COMPARATIVE or RANK claim in
a caption (« devant » / "ahead of", « top 3 », "the highest") is checked against the actual data
ordering the step renders; a caption asserting an order the sorted values contradict is a concern (a
shipped beat caption claimed a value ranked « devant » two others while it was lower than both — see
the beat-model rule at PROPOSITION). A scrolly review that never states this per-step caption check is
not a valid render-review either. These catch what the spine's
code gates cannot — a title that misstates the metric, a fabricated or incomplete source, a misleading
encoding. **Never spawn an Agent/Task sub-agent to do this review** — during the splash flow you ONLY
sequence, gate, and invoke producer scripts/sub-skills; a stray Agent/Task call leaks internal plumbing
(an agentId) into the journalist-facing conversation. Review adversarially yourself (try to falsify each
criterion). **For an interactive or scrolly deliverable, a static read (`static.png` / a video frame)
verifies ONLY the still surface — layout, labels, colour, aspect, title, source, emphasis. It shows
NOTHING about hover/tooltip/pan/zoom: never assert an interaction "works" from a still.** An interaction
claim (a tooltip surfaces, its text is legible, it stays in-viewport, a map popup shows the right
name/value) is allowed only by citing the pass of the producer's interaction snapshot — which already ran
fail-hard inside `produce-all` — or re-running it: chart-native `snap-tooltip-contrast.mjs` /
`snap-tooltip-viewport.mjs`, map-native `snap-proof.mjs` (see `references/render-review.md`, "Interaction
claims require an interaction test"). No cited run → record "not interaction-tested", never a pass. Record
it (export is refused without a review record) — **`--probes` is REQUIRED: a PLAN of every check the
review runs, not a self-reported result** — `[{kind: "mechanical", check, command: […]}, {kind:
"editorial", check, outcome: pass|concern|resolved, note?}, ...]` (inline JSON or a file path; see
`references/render-review.md`, "Record it"). **The probes decide, the gate reads them:** a
`mechanical` probe carries the argv that answers it, and `review-gate.mjs` RUNS it itself — the
recorded outcome is what the command's exit code says (0 → `pass`, anything else → `concern`),
never what you write. An `editorial` probe is the half no command can answer (a judgement); it
carries its own `outcome`/`note` untouched, but the moment the plan carries even ONE, **`--reviewer
<name>@<version>`** (e.g. `desk-reader@1.0.0`) is REQUIRED, naming WHO made that judgement — a
review with an editorial probe and no `--reviewer` is refused. The gate refuses an empty ledger, a
probed concern the review silently drops (EACH concern-outcome probe must be referenced by a
surfaced concern quoting its `check` verbatim — `"<check>: <what failed>"`; an unrelated concern
never accounts for it), and a failure keyword (404/absent/missing/mismatch…) no probe outcome
reflects — a probed failure is either surfaced as its own concern (advisory) or explicitly resolved
with evidence, never narrated away. (A fresh DW publish may 404 its `dataset.csv` briefly — a
`mechanical` probe's own command should retry once, internally, after
`DW_DATASET_PROPAGATION_RETRY_MS` before answering `concern`; through this CLI a retry that clears
is recorded as `pass`, never `resolved` — `resolved` is reachable only for an `editorial` probe.)
```bash
bun skills/splash/scripts/review-gate.mjs exports/<slug>/report.json <id> \
  --probes '[...]' [--reviewer <name>@<version>] [concern...]
```

**3b. SURFACE the render, THEN ask — never the reverse.** Before you ask the journalist ANYTHING about
the visual, put the ACTUAL render in front of them: send the artifact file (the PNG/HTML) with
`SendUserFile`, or — for a hosted producer — state the live URL on its own line. **Describing the chart
in prose is NOT showing it** ("barres violettes, fracture 83/16" is a description, not a view); the render
displaying on YOUR side is not the journalist seeing it. Asking "c'est bon ?" / "tu valides ?" before the
journalist can actually SEE the render is the recurring "je veux bien valider mais tu ne me l'as pas
montré" failure — surface FIRST, ask SECOND, every time. Then present the review's concerns TOGETHER with
it and get an explicit "ship it". The concerns are advisory — the journalist is the editor. This
should rarely fire on source now that Gate 2c establishes it proactively before PRODUCTION — but if a
concern is about the source (missing, name-only, generic, or unclear), ask the journalist to supply it as
ONE free-text prompt collecting the label AND the **specific, traceable dataset/page URL** together (e.g.
the Eurostat dataset page for the exact table, the Insee series page — NOT the organisation's homepage) —
never a single-select (see CADRAGE) — then update the spec, **re-run 5c (`produce-all`) to get the NEW
render, and re-run 3a (`review-gate`) on THAT render** before showing again — never jump straight from an
updated spec to 3b (`gate-render`); the fresh report 5c writes resets `reviewed`/`renderApproved` for
exactly this reason (see the ★ note under 5c above), and 3b's approval is only ever for the render just
shown, never a prior one.
Verify quality, not just that it built.

**SHOWING IT IS A COMMAND, not only an intention.** (The duty is also in the Never list below; it
belongs HERE too, in the step where the act happens — a rule found only in an appendix is a rule read
after the mistake.) Open the artifact for the journalist with `present`, which BOTH surfaces it and
writes the receipt the approval gate reads back (`_shown/<file>.json`, `lib/loop/presentation.ts`):
```bash
bun lib/host/cli.ts present --path exports/<slug>/<id>/static.png
```
Skip it and `gate-render` refuses — *« nobody has been shown this visual yet, so there is nothing to
have an opinion about »* — which is correct, and is exactly what a run that described the render in
prose instead of opening it deserves. The refusal names this command, so a run that forgets it can
recover; do not make it earn that.

**After "ship it", record the approval — pass the LOCAL
artifact file path on disk, NEVER the public/cloud URL** (a Datawrapper `publicUrl`, a Cloudflare embed
link, etc.): `gate-render` opens and hashes the file at that path, so a public URL ENOENTs. It must be
the SAME path `present` was given — the gate compares the approved bytes against the shown ones.
```bash
bun skills/splash/scripts/gate-render.mjs exports/<slug>/report.json <id> exports/<slug>/<id>/static.png
```
(swap `static.png` for whichever local file the journalist approved — e.g. `interactive.html`,
`scrolly.html`, or the rendered `.mp4` — always the path under `exports/<slug>/<id>/`, never a URL.)
**PROVENANCE is enforced mechanically** (`src/render-provenance.ts`): the approved file must be an
output the pipeline emitted for the CURRENT produce generation — listed in this report's `outputs`
and no newer than the report's `generatedAt` stamp. A file hand-authored into the build subdir, or an
artifact from a later produce approved against a stale report, is a hard refusal — save the fresh
`report.json` and redo 3a → 3b. **Hosted-DW interactive (a `publicUrl`, NO local render):** never
write a stand-in file into `exports/<slug>/<id>/` (it would leak into export-code's hosted-embed
detection) — capture the reviewed live embed (screenshot or saved page) into the sanctioned
`_review-artifacts/<id>/` directory (SIBLING of the build subdir) and approve THAT file; the gate
accepts it only for a hosted result and only if captured AFTER the current produce generation.
**Capture to an ABSOLUTE, run-scoped path — never a bare relative `exports/...`.** Verifying an
interactive means you may have `cd skills/<producer>/` earlier to run an interaction snap, so a
relative `exports/<slug>/_review-artifacts/<id>/` resolves against THAT cwd and the screenshot lands
under `skills/<producer>/exports/…`. Resolve the absolute capture dir FIRST — anchored on where `report.json` lives, e.g.
`CAP="$(cd exports/<slug> && pwd)/_review-artifacts/<id>"; mkdir -p "$CAP"` — and capture into `$CAP`
(then approve `$CAP/<file>`). If a capture ever lands in the wrong place, that is a mis-path to RE-CAPTURE
at the absolute path (the provenance refusal names it), never to `mv` into position (see Never).
`gate-render` is the ONLY writer of the render approval; EXPORT refuses any visual not render-reviewed
(3a) AND not approved (3b) — so an unreviewed, unseen, or unapproved render can never ship.

_(Under the hood `produce-all` dispatches to `chart-native/scripts/produce-from-spec.mjs`,
`map-native/scripts/produce.mjs`, `scrolly/scripts/produce.mjs`, and the Datawrapper producers — you
call `produce-all`, not them directly. An omitted map-native format still defaults to `static`, never
the full video set.)_
