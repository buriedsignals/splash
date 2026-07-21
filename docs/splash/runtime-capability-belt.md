# Runtime capability belt (production phase)

> Belt-and-suspenders: the chain-verified export (`skills/splash/src/render-provenance.ts`,
> `assertChainProvenance`) is the **suspenders** — the structural defense Splash owns in its own code
> (spec `docs/superpowers/specs/2026-07-21-strict-production-seam-design.md` §3.1–3.3, tasks 1–3 of the
> strict-production-seam branch). This document describes the **belt** — a runtime/integration control
> that sits below the app layer. It is a recommendation for the harness/installer that hosts Splash, **not
> a code change in this repo** (spec §3.5 — out of Splash's code scope).

## What Splash owns

Splash is a skill: prose + scripts invoked by an actor (a Claude Code session) that already has its own
Bash/Grep/Write tools. Splash's `SKILL.md` can *ask* the actor not to hand-author a `spec.json` or hand-plant
a file into a producer's output directory — but a prompt-level "Never" is guidance, not an execution boundary.
The actor could, in principle, ignore it.

What Splash *can* enforce mechanically, in its own code, is what happens at the **export gate**:
`assertChainProvenance(report, id, exportDir, reportPath)` refuses to ship any artifact whose chain does not
trace `candidates.json → accepted.json → produce-all → outputs` — i.e. whose producer is not in the
candidates menu, whose accepted spec does not hash to the produced result's `acceptedConfigHash`, or whose
outputs are hand-planted or stale relative to the produce generation. A hand-authored spec or a bypassing
artifact is **mechanically unshippable**, regardless of what the actor was asked to avoid. This is the
suspenders: real, already merged, enforced in code.

## What the suspenders cannot do

The chain-verified export only catches a bypass **at the export boundary**. It does not stop an actor from
spending a turn writing `src/*.ts`, running an ad-hoc script, or hand-planting a file mid-session — it only
guarantees that artifact can never be shipped. Nothing in Splash's own code can revoke the actor's tool
access; a skill has no privilege over the harness that invokes it.

## The belt: a runtime tool restriction, owned by the integration

The audit that motivated this seam (`docs/splash/audit-2026-07-21-orchestration-and-quality.md` §1) makes the
underlying point explicitly, citing OWASP: **an allowlist enforced only as a prompt request is not an
execution boundary.** A rule the model is *asked* to follow (`SKILL.md`'s "Never …" bullets) can be
sidestepped by the model itself; only a control that lives **below the application layer** — something the
actor cannot talk its way around — is a real boundary.

For Splash, that means the harness/installer hosting a production run should, during the PRODUCTION phase
specifically:

- Restrict the actor's tool allowlist so freehand file authoring under `skills/**/src`, `skills/**/scripts`,
  or `exports/**` is not available as an action at all — not merely discouraged.
- Concretely, in Claude Code terms: a `--permission-mode` (or equivalent settings-level tool restriction)
  scoped to the production phase of the flow, allowing only the sanctioned pipeline entry points
  (`produce-all`, `review-gate`, `gate-render`, `export-code`, and the producers' own scripts) and denying
  raw `Write`/`Edit`/`Bash` access to the skill's source tree.
- More generally, an OS-level sandbox (the layer OWASP's point ultimately points to) is a stronger version of
  the same control — the actor's process itself cannot reach the filesystem paths it should not touch,
  independent of what tools the harness exposes.

## Scope note

This document is a **recommendation for the integration/harness**, not an implementation in this repo.
Splash's code scope ends at the chain-verified export (the suspenders); the belt is explicitly out of scope
for the strict-production-seam spec (§3.5) and is not implemented here. Anyone wiring Splash into a
production harness should read this before assuming the "Never" bullets in `SKILL.md` are, by themselves, a
security boundary — they are not; the export gate is the boundary Splash owns, and a runtime tool
restriction is the boundary the integration should add.
