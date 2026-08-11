---
date: 2026-08-10
updated: 2026-08-11
topic: splash-data2story-human-gated-production
status: in-progress
---

# Splash × Data2Story: human-gated visual production

## Summary

Evolve Splash from a beat-at-a-time, parameter-led flow into a chat-first production
system that turns a journalist's local working directory and evidence package into
reviewable visual outputs. Splash remains local-first and human-gated. It does not
become a separate required application, an article-writing system, or a fixed
multi-agent newsroom.

The redesign adopts selected Data2Story ideas: optional context research, explicit
computed findings, an evidence-grounded editorial angle, media rationale, render
quality review, and traceability from a claim to its sources and calculations. It
does not adopt Data2Story's seven fixed roles, article-only output, mandatory
multimedia density, reader-facing evidence viewer, or absence of editorial gates.

The intended entry point is natural language: a journalist brings a Spotlight
package, article materials, and/or local data, then asks for visuals for a story.
Splash silently analyses the material, proposes a supported takeaway for
confirmation, asks one simple publication-context question, and proposes an
editable production plan. It produces real draft artifacts for review after that
plan is accepted or revised.

## Status and evidence

### Review baseline and confirmed current behavior

This PRD was written against the doctrine-twin ref `rd-dev` at commit `542e9f9a`.
That reviewed tree was intentionally consolidated as the Splash product baseline
on `main` on 2026-08-11. References to `rd-dev` below describe the historical
review fixture, not a branch that still needs to be merged.

In particular, `suggest-article`, `suggest-chart`, `ProposalSet`, and
`accepted.json` did not exist in that fixture and MUST NOT be described as its
compatibility baseline. If a later integration must support those records, it
needs a separately named adapter and fixtures from the lineage that actually
owns them.

The reviewed `rd-dev` implementation is a local, prose-first state machine. Its
root skills are `splash`, `intake`, `storyboard`, `deliver`, and craft producers
such as `chart-beat`, `chart-web`, `chart-video`, `map-beat`, `map-web`, and
`scrolly`. The important on-disk contracts are:

| Concern | Historical baseline artifact or reader |
| --- | --- |
| Frozen source | `source/article.md`, `source/data.csv`, `source/profile.json` |
| Editorial framing and choices | `STORYBOARD.md`, plus optional `SUBJECTS.md` |
| Produced work | `beats/<beat>/renders/` |
| Human approval | `beats/<beat>/APPROVED.md` |
| Delivery | `export/<beat>/HANDOVER.md` and delivery receipts |
| Phase recovery | `skills/splash/scripts/where.mjs` |

The branch already expresses valuable constraints: state should be recoverable
from disk; a confirmed takeaway precedes production; producer reachability is
checked; a journalist should see a real render before approval; and delivery is
selected rather than an automatic dump of every format. Targeted legacy tests for
intake, storyboard, phase recovery, and delivery pass, so those behaviors are the
starting material to preserve.

At that historical baseline, the adversarial review found the following gaps.
The delivery items in this list have since landed; the current-status subsection
below separates those fixes from the requirements still outstanding:

- `intake/scripts/freeze.mjs` accepts only an article and CSV, writes its three
  files sequentially, and has no evidence manifest, provenance graph, atomic
  commit, or recovery protocol.
- `STORYBOARD.md` is parsed by a narrow flat parser and requires six separate
  “hand of the journalist” fields plus medium, genre, and sometimes size. It
  cannot safely represent the versioned nested plan or the one-question planning
  experience specified below.
- Grounding currently treats an unbound numeric token as supported when it merely
  falls inside any numeric column's minimum/maximum range. It can also report a
  whole takeaway as supported when only one of several claims is supported. The
  frozen profile omits row data needed by several comparison checks.
- Phase recovery discovers beats from existing render directories, so a planned
  but unrendered output can disappear from completion accounting. Approval files
  are not bound to a render digest, plan version, findings, or QA result, and the
  delivery API can be called without independently enforcing those gates.
- Storyboard guidance permits external reference research without first recording
  the journalist's consent.
- Delivery recursively clears a caller-supplied export directory without proving
  that it is the intended `export/<beat>/` path. It replaces the last good export
  before all local and remote steps succeed, and remote calls have no bounded
  timeout or reconciliation state.
- At the historical baseline, CI and installation documentation named scripts,
  paths, or skill layouts absent from `rd-dev`. Current `main` has corrected the
  test environment and documentation contract; the remaining product gaps above
  are still requirements of this PRD.

### Current implementation status — 2026-08-11

The consolidation and delivery-hardening slice are complete on `main`:

- the doctrine-twin workflow and its 15 Splash-owned skills are the canonical
  repository baseline;
- delivery derives destinations from stable story/output IDs and rejects legacy
  caller-controlled replacement paths;
- `OUTPUT-REVIEW.json` binds approval and QA to the output, render digest, plan
  version, and finding IDs;
- local replacement is journaled, recoverable, and preserves the last good
  export through injected failure;
- Cloudflare delivery has bounded requests and persisted reconciliation for
  ambiguous remote outcomes; and
- the repository test environment, generated checks, README, and Data2Story
  acknowledgement are in place.

The evidence package, optional context acquisition, semantic per-claim trace,
canonical versioned production plan, multi-output lifecycle, handoff adapters,
and newsroom pilot remain active PRD work. The detailed delivery record is in
[`docs/residual-review-findings/feat-data2story-human-gated-production.md`](../residual-review-findings/feat-data2story-human-gated-production.md).

### Sources of design context

Data2Story is described by Lin et al. as a virtual newsroom that traces claims,
angles, and assets back to data, code, or external references, and generates
multimodal articles. The paper reports that human-authored pieces retain an edge
in editorial angle, creative design, and presentation, and recommends adding a
human feedback loop for greater reliability. Splash therefore adopts selected
ideas about explicit findings, provenance, media rationale, and QA while keeping
journalist and editor gates.

Data2Story's Inspector trace is evidence of auditability, not proof that a claim is
factually correct. Splash MUST independently validate claim support and surface
what it cannot verify; a trace link alone never earns a `supported` verdict.

- Paper: [Data Journalist Agent: Transforming Data into Verifiable Multimodal Stories](https://arxiv.org/html/2606.11176v1).
- Open-source reference: [QinghongLin/data2story-skill](https://github.com/QinghongLin/data2story-skill).
- Historical Splash review baseline: `rd-dev` at `542e9f9a`, including its skill
  instructions, scripts, tests, README, and CI configuration. The reviewed
  implementation is now consolidated on `main`.

## Problem

A journalist with a prepared investigation often has more than an article and a
CSV. They have a Spotlight handoff, source URLs, extracts, local tables, notes,
and caveats. They need help deciding what the evidence can support and which
visual outputs fit publication needs. They should not have to translate that work
into a fixed pipeline or choose, at the start, between a lone graphic, several
embeds, or a visual-story package.

Splash must retain its safeguards while making these inputs and decisions visible
as production artifacts. The editor needs a compact, reviewable angle/evidence
brief and links to real drafts, not a concept-only approval stage. The journalist
must remain the author of the written story.

## Goals

1. Start a Splash run from a local working directory, including a Spotlight
   handoff, without a required separate UI or form.
2. Preserve source material and local data in a reusable evidence package with
   provenance, limitations, and stable identifiers.
3. Let Splash make and verify explicit computed findings before proposing an
   editorial angle or visual production plan.
4. Make the plan editable in conversation and able to contain several editorial
   units and several distribution outputs.
5. Produce real draft artifacts, apply accessibility and responsive defaults, run
   render QA, and record approvals and revisions for each output.
6. Support independent embeds, packaged visual stories when warranted, and common
   web-story plus promotional-vertical-video bundles without requiring every
   format.
7. Give editors traceable evidence for every recommended takeaway, visual claim,
   and calculated value.

## Non-goals

- No separate mandatory Splash web UI, fixed wizard, or HTML intake selector.
- No automated authorship of the journalist's article. Optional visual-support
  copy may be drafted and remain editable.
- No fixed seven-role Data2Story pipeline or requirement to launch sub-agents.
- No default packaged visual story, mandatory multimedia rule, or requirement to
  generate all supported output formats.
- No reader-facing evidence browser in this phase. Evidence traceability serves
  production and editorial review first.
- No removal of existing human gates, producer selection grounded in Splash's
  knowledge files, format-specific production, or local ownership of exports.
- No commitment in this PRD to a particular database, cloud service, schema
  library, orchestration runtime, or external research provider.

## Product model

### Core concepts

| Concept | Meaning | Examples |
| --- | --- | --- |
| Evidence package | Reusable local record of inputs and their provenance | Spotlight handoff, article draft, URL captures, CSV, notebook result |
| Finding | A reproducible, scoped result calculated from package material | "Rent rose 18% from 2019 to 2025" |
| Angle | The confirmed editorial takeaway grounded in selected findings | "Rents rose faster than incomes in the border towns" |
| Editorial unit | One independent visual idea that makes one claim | comparison chart, locator map, explanatory scrolly step |
| Distribution output | A rendered deliverable for a publication context | responsive embed, 9:16 video, print PNG |
| Production plan | Editable record linking angle, evidence, units, outputs, rationale, and review state | a plan with two embeds and one social derivative |

An editorial unit is not a delivery format. One unit can produce more than one
approved derivative where that is editorially justified. A plan can also contain
several units that each have different outputs. A packaged visual story is a
topology made of coordinated units; Splash recommends it only when the evidence
and narrative need it.

### Proposed conversational flow

1. **Open locally.** The journalist runs Splash in a working directory or asks
   from a Spotlight handoff: “I have this package and am writing a story. What
   visuals should we make?” Splash discovers declared local materials and asks
   only for a missing path, file, or consent to use optional external context.
2. **Silent intake and analysis.** Splash records material, provenance, and
   content hashes where possible; reads the handoff and local data; identifies
   candidate findings; and marks unknowns or conflicts.
3. **Supported-takeaway confirmation.** Splash proposes one concise takeaway,
   citing the candidate findings and caveats in the conversation. The journalist
   confirms, corrects, narrows, or rejects it. This remains a hard editorial gate.
4. **Publication context.** Splash asks one plain-language draft prompt such as:
   “Where will this story mainly appear: a web article, social video, print, or a
   mix?” It may infer a likely context from the handoff and ask for confirmation.
   The wording and choices are test material, not final UX.
5. **Editable production plan.** Splash proposes the angle, evidence and caveats,
   recommended independent units or a packaged topology, output derivatives, and
   a short media rationale. The journalist edits it conversationally: add/remove
   a unit, change an output, revise the angle, or ask for another supported path.
6. **Draft production and QA.** For approved plan entries, Splash uses existing
   suggesters and producers to create real draft artifacts. It runs format-aware
   render, accessibility, responsive, attribution, and source-fidelity checks.
7. **Review and revision.** Splash presents each draft link or local path beside a
   compact angle/evidence brief. Journalist and editor approve, request a change,
   or reject per output. A changed render re-enters QA before it can be exported.
8. **Export and handoff.** Splash exports only approved outputs in their
   format-specific delivery form, preserves the plan and evidence records locally,
   and can prepare a downstream handoff.

The flow never opens by asking the journalist to choose “one visual,” “multiple
embeds,” or “packaged visual story.” Those are planning outcomes.

## Requirements

### Intake and evidence package

- Splash MUST accept local article files, pasted text, URLs, source materials,
  data files, and structured handoffs from Spotlight, Data Navigator, and
  external-context acquisition.
- Intake MUST retain original location or URL, acquisition time when known,
  source identity, supplied attribution, checksum when feasible, and stated
  limitations. It MUST distinguish supplied material from Splash-derived work.
- A package MUST allow local files and URLs to coexist without pretending that a
  URL capture is the original publication or that an article mention is a dataset.
- Package creation MUST stage all required artifacts and expose them as complete
  only after validation succeeds. A crash or failed write MUST leave either the
  last complete package or a recognizable, recoverable staging record; it MUST
  NOT leave `article.md` as a false “already frozen” sentinel over missing data.
- Repeating the same intake request MUST be idempotent when the inputs match and
  fail with an actionable conflict when they differ. Only an actual not-found
  error may be interpreted as absence; permission, corruption, and parse errors
  MUST remain visible and fail closed.
- Local input and output paths MUST be resolved against declared roots. Traversal,
  symlink escape, and aliasing outside those roots MUST be rejected before any
  read, write, replacement, or recursive deletion.
- External context research MUST be optional, separable from journalist-supplied
  evidence, and preceded by an explicit recorded consent decision. Declining it
  MUST leave the local workflow usable. Context may inform framing but cannot turn
  an unsupported numeric claim into a supported one.
- URL material is untrusted input. Acquisition MUST allow only intended HTTP(S)
  targets; resolve and re-check every redirect; block loopback, link-local,
  private, metadata, and other non-public destinations; constrain subresource
  fetching; and enforce time, byte, redirect, and accepted-content-type limits.
  Captured bytes and final canonical URL MUST be recorded.
- Define an eventual `Handoff to Splash` orchestration skill contract. Until it
  exists, file-based and pasted structured handoffs are sufficient.

### Findings, angle, and traceability

- A computed finding MUST identify its input evidence IDs, calculation or
  transformation reference, result, scope, assumptions, and caveats.
- A numeric claim is `supported` only when it is semantically bound to the exact
  source row(s), field(s), aggregate, or reproducible calculation that establish
  it. Mere membership in a column's minimum/maximum range is never support.
- Every independently checkable claim in a takeaway MUST receive its own verdict.
  The takeaway may be `supported` only when all such claims are supported. A mix
  of supported and unverifiable claims MUST remain unresolved unless a human
  records an explicit, reasoned override; a contradiction can never be silently
  downgraded to unverifiable.
- A plan angle MUST reference one or more finding IDs. A visual claim, title,
  annotation, and optional visual-support copy MUST link to the finding(s) that
  support it.
- A trace record MUST distinguish direct source claims, calculations performed
  locally, and editorial interpretation. It MUST not imply that an interpretation
  is a source quotation or that an auditable chain is factual verification.
- Verification status MUST use a closed vocabulary with defined transition rules:
  `supported`, `unverifiable`, `contradicted`, or `overridden`. An override MUST
  name the original verdict, reviewer, reason, and time; it MUST remain visible in
  the plan, review package, and export record.
- The current confirmed-takeaway mechanism remains mandatory. The proposed
  takeaway is a draft until the journalist confirms it, and confirmation cannot
  advance to planning unless the result is supported or explicitly overridden.

### Plan and topology

- The production plan MUST be a versioned local artifact that can be revised in
  conversation before and after production starts.
- The plan MUST have one canonical schema and serializer. Unknown versions and
  unknown fields MUST be preserved and surfaced for compatibility review rather
  than flattened, discarded, or treated as verified.
- Each plan revision MUST show what changed, why, affected units/outputs, and
  whether previously approved output needs new review.
- A plan MUST model `editorialUnits[]` separately from `outputs[]`; outputs may
  reference one unit or an ordered group of units.
- The authoritative `outputs[]` list, not the presence of render directories,
  MUST drive production, review, delivery, and completion accounting. Planned but
  unrendered outputs remain visible as incomplete work.
- The planner MUST recommend a packaged story only with a recorded narrative and
  evidence rationale. Independent embeds remain a first-class recommendation.
- Recommendations MUST continue to use Splash's existing knowledge files and
  producer reachability checks. A plan cannot offer an unsupported producer or
  format as though it were available.

### Production, review, and export

- Splash MUST create draft visuals before seeking final editorial approval. A
  proposal-only or concept-image stage cannot substitute for the draft.
- Accessibility, responsive behavior, source treatment, language, and newsroom
  style MUST start from defaults and be evaluated by QA gates. They are not broad
  configuration questions at intake.
- Each output MUST have its own lifecycle: `planned`, `drafted`, `qa-passed`,
  `in-review`, `changes-requested`, `approved`, `exported`, or `rejected`.
- An editor review package MUST include the draft link/path, angle, selected
  findings, sources/caveats, media rationale, QA result, and requested decision.
- Approval MUST be bound to the output ID, exact draft digest, plan version,
  finding IDs, and passing QA run. A changed draft, affected plan revision, or
  changed finding invalidates that approval. Unaffected outputs retain approval.
- Every public delivery entry point, including direct calls to `materialise`, MUST
  independently enforce the same current-draft, QA, and approval preconditions;
  conversational sequencing alone is not a security boundary.
- Export destinations MUST be derived from validated story and output IDs, then
  proven contained inside the story's export root with an explicit symlink policy.
  A caller-supplied path MUST NOT be able to select a recursive-delete target.
- Delivery MUST stage and validate a complete replacement before atomically
  publishing it. A failed build, copy, handover, or remote deployment MUST leave
  the last good local export intact. Remote operations MUST have bounded timeouts,
  idempotency where available, and a recorded reconciliation state for ambiguous
  outcomes.
- Export MUST stay format-specific: web embed delivery, vertical-video delivery,
  and print/static export retain their existing producer and delivery safeguards.

### Delivery-plan evolution

The data model and planner MUST support these cases without special modes:

| Case | Editorial units | Outputs |
| --- | --- | --- |
| Web story plus promotion | One or more web units | web embed(s) plus an optional 9:16 derivative |
| Video only | One motion-capable unit | approved video output only |
| Print only | One or more static units | print-ready static output(s) only |
| Mixed package | independent and/or ordered units | selected web, video, social, and print outputs |

No case creates an obligation to generate the other formats. The publication
context sets constraints; the plan chooses the outputs.

## Proposed local artifacts and contracts

Names and serialization format are implementation decisions. The fields below are
the required logical contract.

### Evidence package

```text
EvidencePackage
  id, schemaVersion, state: staging | complete, createdAt, workingDirectory
  materials[]: EvidenceMaterial
  handoffs[]: StructuredHandoff
  externalContext[]: ContextRecord
  findings[]: Finding
  consentDecisions[], contentDigest, provenancePolicy, limitations

EvidenceMaterial
  id, kind, localPath?, canonicalUrl?, title?, publisher?, acquiredAt?
  suppliedBy, checksum?, citation, rightsOrUseNote?, limitations[]

Finding
  id, statement, result, unit?, scope
  evidenceIds[], calculationRef?, methodSummary, assumptions[], caveats[]
  verificationStatus: supported | unverifiable | contradicted | overridden
  override?: { priorStatus, reviewer, reason, decidedAt }
```

### Structured handoff

```text
StructuredHandoff
  schemaVersion, producer, handoffId, createdAt
  storyContext, materials[], findings[], sourceNotes[], caveats[]
  requestedOutcome?, verificationState
```

`producer` may initially be `spotlight`, `data-navigator`, or `external-context`.
Unknown schema versions must be preserved as an attachment and surfaced as a
compatibility concern rather than silently treated as verified evidence.

### Production plan and review record

```text
ProductionPlan
  id, schemaVersion, version, evidencePackageId
  angle: { text, findingIds, confirmedAt?, confirmedBy? }
  selectedFindings[], sourceAndCaveatBrief
  editorialUnits[]: { id, claim, findingIds, rationale, producerRoute, status }
  outputs[]: { id, unitIds, kind, context, format, status, derivativeOf? }
  topology: independent | packaged
  topologyRationale?, revisions[]

OutputReview
  outputId, planVersion, draftRef, draftDigest, findingIds[], qaRuns[]
  angleEvidenceBrief
  decision: approve | changes-requested | reject
  reviewer?, decidedAt?, notes?, replacesReviewId?

ExportRecord
  outputId, planVersion, draftDigest, reviewId, findingIds[]
  deliveryForm, destination, status, createdAt, completedAt?
```

The package `contentDigest` covers its canonical manifest and material digests,
not mutable staging paths. An output's `draftRef`, review, and export record retain
the exact plan version and evidence/finding IDs used to produce it. This gives an
editor a compact audit path without building a public evidence viewer and makes
stale approvals mechanically detectable.

## Migration plan

1. **Harden the reviewed baseline.** Before adding the new model, contain export
   paths, remove caller-controlled recursive deletion, make delivery atomic,
   enforce approval and QA inside delivery APIs, distinguish missing files from
   filesystem failures, and make CI run commands and paths that exist in the
   consolidated repository. **Status:** delivery hardening and CI repair landed;
   evidence/intake hardening remains in Phase 0.
2. **Document and adapt the actual artifacts.** Add schemas and fixtures plus a
   compatibility adapter from `source/`, `STORYBOARD.md`, beat directories,
   `APPROVED.md`, and `HANDOVER.md` to a one-unit/one-output plan. If the separate
   `ProposalSet`/`accepted.json` lineage must also migrate, discover and test it as
   a second adapter; do not invent that contract from this branch.
3. **Create evidence and plan records.** Wrap current intake, storyboard candidate
   generation, genre/capability checks, and producer routing with atomic evidence
   package and plan creation. A single beat and output remains a valid plan shape.
4. **Introduce bound per-output review.** Replace bare approval existence checks
   with records keyed by output and draft digest; make phase recovery enumerate
   the plan rather than only directories that happen to contain renders.
5. **Add derivatives and topology.** Model a selected additional genre as a new
   output with its own production, QA, review, and delivery lifecycle. Add
   multi-unit packages only through validated producer routes.
6. **Publish upstream handoffs.** Version the `Handoff to Splash` schema and add
   Spotlight and Data Navigator adapters after fixture interchange passes.
7. **Retire the parameter interview.** Replace the six-field hand plus mandatory
   medium/genre/size exchange only after journalist testing confirms that the
   natural-language opening and editable plan are understandable and no gate has
   weakened.

Existing `source/`, `STORYBOARD.md`, `SUBJECTS.md`, beat approval, handover, and
export artifacts remain readable during migration. Do not bulk-convert prior runs
unless a recovery need requires it.

## Phased delivery and acceptance criteria

### Phase 0: baseline hardening and contract tests

Deliver: the safety fixes required to preserve user data, approved artifact
schemas, an adapter fixture for the actual `rd-dev` artifacts, and tests for
source/calculation traceability.

Accept when:

- a Spotlight-style fixture, a local article, and a CSV can form one package;
- package creation is atomic or recoverable under injected failure, and retrying
  identical intake cannot wedge the story;
- every proposed finding names its inputs and calculation or says no calculation
  was performed;
- an unsupported, contradicted, or mixed supported/unverifiable takeaway cannot be
  recorded as supported before planning;
- a numeric token that merely falls inside an unrelated column range is not
  accepted as evidence;
- no external context is fetched without an explicit recorded decision, and URL
  safety tests cover redirects to private or local destinations and response
  limits;
- traversal, absolute-path, and symlink-escape fixtures cannot read or replace
  material outside their declared roots;
- a failed delivery leaves the previous export byte-for-byte intact, and direct
  delivery refuses missing, stale, or mismatched QA and approval records;
- phase recovery treats only not-found as absence and surfaces permission,
  corruption, and parse errors;
- CI installs from the lockfile and runs real current test/check commands against
  paths present on the branch.

### Phase 1: conversational plan prototype

Deliver: natural-language intake, takeaway confirmation, publication-context
prompt, and editable one-unit/one-output plan.

Accept when:

- the opening does not ask the journalist to choose among visual topology modes;
- after any missing-path or external-context consent decision, the normal path
  asks one publication-context question rather than serial subject, comparison,
  limits, placement, credit, effective-date, medium, genre, and size questions;
- changing the angle, caveat, or output updates the plan history;
- existing storyboard candidate generation, genre/capability checks, knowledge
  files, and producer reachability remain inputs to opportunity and route
  decisions;
- a journalist can decline optional visual-support copy and continue normally.

### Phase 2: production and review integration

Deliver: real draft links/paths and per-output QA/review state connected to the
current production and export guards.

Accept when:

- a draft cannot be approved or exported until its own render QA passes;
- a planned but unrendered output remains visible and prevents false completion;
- replacing render bytes or changing an affected plan/finding invalidates the
  bound approval, while an unchanged output keeps its valid approval;
- an editor receives the compact angle/evidence brief with the actual draft;
- changing one derivative reopens review only for that derivative;
- source labels, responsive checks, and accessibility checks run without asking
  the journalist to configure them at the start.

### Phase 3: multi-unit and delivery bundles

Deliver: independent embeds, evidence-justified packaged topology, and selected
web/video/print output bundles.

Accept when:

- web-plus-vertical, video-only, print-only, and mixed fixtures each produce only
  their chosen outputs;
- accepting an additional genre creates a real output and cannot close the story
  until that output completes its own QA, approval, and selected delivery;
- a package recommendation records why a sequence is better than independent
  units, and an independent alternative remains available when credible;
- producer reachability and channel/format guards reject invalid derivatives.

### Phase 4: handoff interoperability and newsroom pilot

Deliver: versioned handoff contract, adapters, and moderated tests with
journalists and editors.

Accept when:

- Spotlight and Data Navigator handoff fixtures preserve source IDs, caveats, and
  verification state end to end;
- journalists can correct a proposed angle and production plan without losing
  provenance;
- editors can approve or return a draft using the review package alone;
- pilot feedback is recorded separately from product claims, and prompt wording
  is revised from observed use.

## Validation approach

- Contract tests for package, handoff, finding, plan, output, and review records.
- Regression fixtures for the real `rd-dev` source/storyboard/beat/export layout,
  proving existing one-format flows remain valid compatibility cases and
  producer/format safeguards still fail closed.
- Claim-grounding tests that bind values to exact fields, rows, and calculations;
  include unrelated in-range numbers, a takeaway with several claim verdicts,
  absent row data, contradicted comparisons, and reasoned overrides.
- Fixture-based trace checks from a rendered title, annotation, and support-copy
  sentence back to finding, source, and calculation records.
- State-machine tests generated from the canonical output lifecycle, including
  unrendered planned outputs, direct API calls, changed draft digests, stale plan
  versions, accepted derivatives, crashes, retries, and corrupt artifacts.
- Filesystem and network trust-boundary tests for traversal, absolute paths,
  symlink escape, redirect revalidation, non-public addresses, response limits,
  timeout, and ambiguous remote outcomes.
- Fault-injection tests at every intake and delivery write boundary, asserting
  that incomplete state is recoverable and the last good package/export survives.
- Render QA across responsive viewport, assistive markup, source presentation,
  language, and output-specific format constraints.
- Moderated usability sessions with journalists: test the draft prompts, whether
  they understand the supported-takeaway confirmation, and whether the plan feels
  editable rather than like an opaque form.
- Editorial review sessions: test whether the angle/evidence brief is sufficient
  to make an approval decision without a separate evidence viewer.
- CI validation from a clean lockfile install: targeted contract and state tests,
  the complete suite, and every script named by the workflow and README. A missing
  script or zero-job workflow is a failure, not a skipped check.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| The plan becomes a hidden second UI | Keep it a local, conversational artifact with a readable file representation; test revision language with journalists. |
| Traceability looks stronger than the evidence | Separate direct sources, calculations, and interpretation; bind support semantically; surface caveats and overrides; state that auditability is not factual verification. |
| External research contaminates supplied reporting | Keep context opt-in, labeled, and separate; record consent before fetching; require journalist/editor confirmation before it supports an angle. |
| A URL reaches an internal service or returns an unbounded payload | Enforce the URL trust boundary after DNS resolution and every redirect; bound type, bytes, redirects, and time. |
| A path escapes the story and delivery deletes unrelated files | Derive destinations internally, resolve containment and symlinks before mutation, stage replacements, and test adversarial paths. |
| Multi-output planning causes overproduction | Outputs are explicit plan entries; only approved entries are produced; no bundle implies all formats. |
| More artifacts weaken existing gates | Generate all callers from one state model; bind approvals to draft and plan identity; enforce gates again at the delivery boundary. |
| A packaged story becomes a fashionable default | Require topology rationale and test independent-embed recommendations as an equal path. |
| Partial writes make a story unrecoverable | Stage, validate, and atomically commit packages and exports; preserve the prior good version and expose recovery state. |
| Migration breaks local archives | Use adapters for observed artifacts and preserve old records read-only; never assume one lineage's record names exist in another. |
| Unrelated Git histories are merged as if one branch were ahead | Choose the shipping baseline explicitly and transplant reviewed content in a clean Jujutsu change; do not use an ordinary merge to conceal unrelated ancestry. |

## README implementation record

Completed on 2026-08-11. `README.md` now describes the consolidated local-first
product, uses current repository commands and paths, links this PRD, and credits
the Data2Story paper and open-source reference while stating that Splash neither
installs nor invokes Data2Story skills.

## Historical branch and integration note

The 2026-08-10 review found no `rm-dev` branch. It reviewed `rd-dev` at
`542e9f9a`, also advertised by `origin/rd-dev` and `origin/splash-twin`, and found
that it had no common ancestor with the then-current `main`. That evidence is why
the implementation used an intentional baseline promotion instead of an ordinary
merge that implied shared ancestry.

That integration is complete. The doctrine-twin content is the product baseline
on `main`; no reader should now pull, merge, or reconstruct `rd-dev` to continue
this PRD. New implementation work starts from current `main` in a clean Jujutsu
change and preserves the historical fixture only for compatibility tests.
