# Refusal routes — the registry the spec's risk section asks for

The 2026-07-28 spec ("des refus qui mordent", §6) makes deviation a requirement: a refusal must
not just stop, it must name the act that resolves it — and it demands a tracked list of which
refusals still have no such act. This is that list. Every code in `REFUSAL_CODES`
(`lib/core/routed-refusal.ts`) has a row below; `lib/core/routed-refusal.test.ts` fails the build
if a code is missing here, or if a route with no `command` is not spelled out as having none.

Two renderings share one record (`lib/core/routed-refusal.ts`): `journalistSentence()` carries
`message` + `route.step` — what a journalist is told, never an internal name. `refusalSentence()`
adds `route.command` — for the orchestrator that runs it. The table below is the catalogue behind
both.

**Not every code is wired to the constructor.** `routed(code, message)` is the one place a
`RoutedRefusal` is minted from this table, so a code that is never passed to `routed()` is
reserved in the catalogue (exhaustiveness-tested, ready to be pointed at) without a live call
site actually raising it that way today. The "what emits it" column says which is which — a
plain `Error()` worded the same as a route's `step` is a real refusal, just not one that went
through this constructor.

| code | what is missing | the step | the command (or "no command", with the reason) | what emits it |
|---|---|---|---|---|
| `no-candidates-menu` | no ranked list of visuals was ever written down for this run directory — `candidates.json` does not exist | ask the suggester for the ranked list of visuals and keep the list it returns, then choose from it | no command — the act is a skill invocation inside the session (asking the suggester), not a process; a command here would sit in front of a reader that has nothing to run | `lib/loop/preconditions.ts`'s `productionPrecondition()`, via `routed()`. Read directly by `skills/splash/scripts/produce-all.mjs` (stops the batch before any engine runs) and by `lib/host/gates.ts`'s `describePrecheck({stage:"production"})`, reachable as `bun lib/host/cli.ts precheck --stage production --dir <runDir>` |
| `production-folder-handed-over` | the folder being handed over still holds files the build leaves behind (`config.json`, `native-source.json`, `source-manifest.json`, `report.json`, `accepted.json`, `candidates.json`) — it is the working directory, not the finished export (one measured exemption: a runnable `code-source` bundle keeps its own `config.json` by design) | hand over the export, not the folder the build left behind | `bun skills/splash/scripts/export-code.mjs <outDir> <exportDir> --results <report.json> --id <proposalId> [--form <form>]` | `lib/loop/preconditions.ts`'s `exportPrecondition()`, via `routed()`. Read by `skills/splash/src/export-guard.ts`'s `assertDelivered()` (throws `refusalSentence(...)`) and by `lib/host/gates.ts`'s `describePrecheck({stage:"export"})`, reachable as `bun lib/host/cli.ts precheck --stage export --dir <dir> --format <format> [--form <form>]` |
| `render-not-shown` | nobody has been shown this visual yet, so there is nothing to have an opinion about | show the visual first, then ask what the journalist thinks of it | `bun lib/host/cli.ts present --path <artifact>` | `lib/loop/presentation.ts`'s `shownCovers()`, via `routed()`. Read by `skills/splash/src/gate.ts`'s `applyRenderGate()` before it will record an approval |
| `approval-subject-mismatch` | the visual has changed since it was last shown — the bytes an approval is about to be recorded over hash differently now | show the visual as it is now — it has changed since it was last shown — and ask again | `bun lib/host/cli.ts present --path <artifact>` | same call site as `render-not-shown` — `lib/loop/presentation.ts`'s `shownCovers()`, read by `applyRenderGate()` |
| `probe-not-run` | a mechanical check was claimed without the command that answers it, or the command it names never actually ran | give each mechanical check the command that runs it, and let the result decide | `bun lib/host/cli.ts probe < probes.json` | reserved in the catalogue — no call site currently constructs this `RoutedRefusal` via `routed()`. The discipline it names is enforced instead by `lib/loop/probe-run.ts`'s `runProbes()` (a probe with no command is recorded as a `"concern"` outcome, never a pass — this module never throws, by design) and by `skills/splash/src/review-gate.ts`'s `validateProbes()` (a mechanical probe with no `command` array throws a plain `Error`, worded the same class of thing as this route's step, before `applyReviewGate` runs) |
| `reviewer-not-attributed` | this review carries editorial judgements and does not say who made them | have the editorial pass done by someone who did not write this visual, and record who did it | `bun skills/splash/scripts/review-gate.mjs <report.json> <id> --probes <probes.json> --reviewer <name@version>` | reserved in the catalogue — no call site currently constructs this `RoutedRefusal` via `routed()`. The actual refusal is a plain `Error` thrown by `skills/splash/src/review-gate.ts`'s `applyReviewGate()` (an editorial probe present, no `reviewer` argument given) and by `skills/splash/src/export-guard.ts`'s `assertShippable()` (an editorial verdict recorded with no `reviewer.independentSemanticReview === "available"`), both worded to match this route's step verbatim |
| `late-render-refusal` | a render-time guard (a contrast check) refused its subject — the specific reason is decided per-guard, only measurable at render | read the guard's own message for the fix — it is measured per-guard at render, not a single fixed command | no command — a late refusal's real route is guard-specific, supplied at its call site, not a fixed command this catalogue entry could hold; the entry exists solely to keep `REFUSAL_ROUTES` exhaustive over `REFUSAL_CODES` | `skills/splash/src/late-refusal.ts`'s `lateRefusalSentence()` / `recordLateRefusal()`, called from the three contrast guards: `skills/chart-native/scripts/snap-contrast.mjs`, `skills/chart-native/scripts/snap-interactive-contrast.mjs`, `skills/map-native/scripts/snap-contrast.mjs`. Builds its `RoutedRefusal` by hand (not via `routed()`), because its `route.step` is the guard's own message, decided per call |
| `placement-undeclared` | this run read an article (`opportunities.json` present in the run directory, or the accepted proposal's `skillsInvoked` lists `suggest-article`) but the accepted entry declares neither `anchor` nor `freeStanding` — the hand-over has nothing to tell the journalist about WHERE the element goes | add an anchor (`anchor: { paragraphIndex, quote }`, copied from suggest-article's opportunity) or `freeStanding: true` to this entry in accepted.json, then re-run the export — never invent a paragraph: if the article bound this element to no passage, say so with freeStanding | `bun skills/splash/scripts/export-code.mjs <outDir> <exportDir> --results <report.json> --id <proposalId> [--form <form>]` — the same shape as `production-folder-handed-over`'s command, re-verified against `export-code.mjs`'s own usage comment; the fix is an entry-level field so re-running this exact command (after editing accepted.json) is all it takes, no re-produce | `skills/splash/src/placement.ts`'s `undeclaredPlacementRefusal()`, via `routed()`. Wired in `skills/splash/scripts/export-code.mjs`, right after `resolvePlacement()` and before any mkdir/copy — a refusal here leaves the journalist's export folder untouched |

Three fixes landed on this registry, all the same class of bug — a `command` that read as
"runnable as written" but was not, because it was never checked against the real CLI it names:

- `reviewer-not-attributed` used to name a `--reviewer-output <findings.json>` flag that
  `skills/splash/scripts/review-gate.mjs` never implemented — the script only parses
  `--reviewer <name>@<version>`.
- `production-folder-handed-over` used to read `export-code.mjs <report.json> <id> --form <form>`
  — two bare positionals. The script's own header takes `<outDir> <exportDir>` as positionals and
  `--results <report.json> --id <proposalId>` as flags; the old form has neither the right
  positional count nor the right flags.
- `probe-not-run` used to name a `--spec <probes.json>` flag `lib/host/cli.ts`'s `probe` command
  never implements — it reads its ledger from stdin (`readJsonRequest`), with only an optional
  `--cwd` flag.

All three are corrected above and locked with a test each in `lib/core/routed-refusal.test.ts`
(`reviewer-not-attributed's command matches what review-gate.mjs actually implements`,
`production-folder-handed-over's command matches what export-code.mjs actually implements`,
`probe-not-run's command matches what lib/host/cli.ts actually implements`).

## No mechanical way out, and that is deliberate

Four things this sub-project measured and chose not to close, on purpose — closing any of them
would be a new guard, and the spec (§5) is explicit that this plan does not add one:

- **The direct-branch exemption** (`isDirectBranch`, `candidate-provenance.ts:76`) — a run can
  still declare that the journalist named the visual directly and skip the menu. Tightening this
  would be a new guard; it is a candidate for the family C follow-up. Both readers of the
  no-candidates-menu precondition (`produce-all.mjs` and `describePrecheck({stage:"production"})`)
  apply the SAME exemption, reading it from the same `accepted.json` — this was a coverage gap
  fixed on this branch (the checker had it, the standalone `precheck` command did not), not a new
  guard.
- **`candidates.json` is written by hand** (`two-chains-gap-2026-07-28.md` §1.1) — its presence is
  fabricable. The precondition makes the lie visible, not impossible.
- **The presentation receipt is fabricable** — a hand-written JSON file dropped under `_shown/`
  passes. What it makes impossible is the serious case: approving different bytes than the ones
  that were actually shown (spec §6).
- **The reviewer's attribution is named, not verified** — nothing proves the reviewer is not the
  same actor who produced the visual. What is guaranteed is thinner and sufficient: it does not
  judge anonymously.
