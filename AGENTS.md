# Splash agent guidance

## Evidence and intellectual independence

This policy is non-negotiable. Accuracy and the best achievable result take priority over agreement, reassurance, speed, or satisfying Tom's perceived intent.

- Treat Tom's claims, figures, assumptions, framing, and preferred solution as unverified inputs. Assess them independently and challenge them directly when evidence or sound reasoning points elsewhere.
- Model memory, familiarity, and plausibility are not evidence. They may guide what to inspect, but material or changeable claims require the strongest available current source: local code, configuration, tests, documentation, and artifacts for workspace behavior; official documentation for tools, libraries, and services; and primary records or data for external facts.
- Make the evidence chain inspectable. Cite or link the exact source supporting each material factual claim and confirm that it supports the claim. Separate verified fact from inference, assumption, estimate, and recommendation, and state uncertainty or confidence.
- Ground reasoning, methodology, code, and plans in explicit requirements and evidence. Explain material tradeoffs and verify behavior with proportionate tests, checks, reproduced calculations, and artifact or diff inspection. Never claim completion from intention or code inspection alone.
- Seek and report disconfirming evidence, contradictions, limitations, and the strongest reasonable counterargument. Do not cherry-pick evidence or hide bad news.
- Never invent or imply a source, quotation, citation, file content, tool or test result, API behavior, or verification state. If evidence is missing or inaccessible, say what remains unknown, lower confidence, and make any bounded assumption explicit.
- Do not flatter, praise the premise, mirror Tom's confidence, or tell him what he appears to want to hear. Be candid and respectful; optimize for the outcome he would choose with better information, even when that means rejecting his proposed approach.
- When creating an independent repository or workspace, copy this section into its root `AGENTS.md`; do not rely on parent-directory inheritance.


## Product boundary

Splash is a local-first, human-gated visual-journalism pipeline. Preserve the
journalist-owned story directory, explicit editorial gates, existing craft
skills, and the tuned Splash front end and visual doctrine.

Data2Story is a credited research and implementation reference. Splash may
adapt useful ideas into its own contracts and orchestration, but it must never
install, invoke, or depend on Data2Story skills or adopt its fixed role topology
as Splash's runtime architecture.

## Canonical documentation

- `README.md` — current product, installation, and repository overview.
- `docs/splash/interactive-preflight-verification.md` — durable implementation evidence and the
  remaining release blockers for interactive setup and visual selection.
- `docs/splash/2026-08-14-interactive-preflight-and-visual-selection-prd.md` — active engineering
  plan retained only until its explicit release-closure gate permits deletion.
- `docs/residual-review-findings/feat-data2story-human-gated-production.md` —
  landed hardening and the one remaining live verification item.
- `skills/splash/SKILL.md` — executable orchestration contract.
- `skills/doctrine/SKILL.md` and its references — visual and editorial doctrine.

Proof fixtures preserve measured behavior and remain test inputs; they are not
current operating instructions unless a canonical document above links to them.

## Repository workflow

- Use colocated Jujutsu for working-copy changes, history, bookmarks, fetches,
  and pushes. Treat Git as a read-only compatibility view.
- Preserve unrelated working-copy changes and generated evidence.
- Keep skills self-contained. Do not introduce cross-skill runtime imports where
  the existing parity-copy pattern is deliberate.
- Use the smallest craft skill that fits the approved editorial intent. Ranking
  informs agent judgment; it does not replace that judgment or override the
  journalist's confirmed takeaway.
- **No tool attribution in any artefact.** A commit message, a code comment, a
  rendered file and a document in this repository never name the assistant that
  produced them — no co-author trailer, no session link, no generated-with line.
  A runtime that appends one has to be corrected at the point the message is
  written, not afterwards.
- **Never `git commit --amend` in a shared working tree.** Two agents worked this
  tree at once on 2026-08-20; an amend taken to strip an injected trailer absorbed
  the other's staged files and dropped their commit. Write the message correctly
  the first time; if an amend is genuinely unavoidable, verify with
  `git show --stat HEAD` that it carries only your own files.

## Production output revisions

Every story created by Splash has its own `stories/<slug>/AGENTS.md`. Read that
file before responding to editor feedback on a published visual. The invariant
is: `beats/<outputId>/` is editable production source and
`export/<outputId>/` is the current delivery, never the source. Hosted outputs
also carry `export/<outputId>/DEPLOYMENT.json`, which links the public URL and
deployment back to the canonical beat. Re-render, re-review, and re-materialise
from the beat; do not patch exported files in place. Creating or updating
`beats/<outputId>/FEEDBACK.md` is the durable revision trigger consumed by `whereIs`.

## Installation and host projection

The canonical development activation is `bash installer/install.sh`. It hands the current checkout
to one Engine plan/apply transaction. Engine owns dependency and compatible-browser installation,
the no-value smoke gate, direct skill projections, Goose registration, receipts, doctor, repair,
and uninstall. Do not add a second Splash lifecycle or mutate those paths after Engine commits.

Engine projects every directory under `skills/` containing `SKILL.md` as one flat link in the shared
agents store. Derive that inventory from the filesystem; do not maintain another hard-coded skill
list or add separate Goose or Claude skill links. `installer/place-skills.mjs` is retained only as
the setup page's non-mutating compatibility/dry-run model. It is not an installer.

Stories and `NEWSROOM.md` are external, data-bearing state. Provider credentials and validation
receipts belong only to Engine's operating-system credential broker. The adopted checkout,
dependency tree, managed browser, skill links, and `extensions.splash` registration are removable
Engine-owned state.

## Verification

Run checks in proportion to the change. The release baseline is:

```bash
bun install --frozen-lockfile
bun --no-env-file test
bun --no-env-file run matrix:check
bun --no-env-file run survey:check
bun --no-env-file run catalog:check
bun --no-env-file run guards:check
```

`guards:check` is the one that is not about this change alone. `GUARDS.md` is generated from
`skills/doctrine/references/guard-catalogue.json`, the single written list of what this project has
earned. A fix or a capability that touches a mechanism more than one skill has is declared as a
**rule**, at the moment it is made — not later. A rule declares the **traits** it requires, never
skills: the set it reaches is derived, so a skill that acquires the trait inherits the rule without
anyone remembering. The suite **refuses debt**: a reachable cell nobody carries is a named red, and
the only two ways out are to carry it, or to write an exception with the measurement behind it.
**Removing a trait to escape a rule is refused by that trait's witness.**

For installer, host-projection, or MCP-app changes, also run the focused suites and the canonical
Engine doctor or lifecycle checks appropriate to the change:

```bash
bun --no-env-file test installer/test apps/goose/test
bun installer/place-skills.mjs --root "$PWD" --home /tmp/splash-skills-check --dry-run
bsig doctor --product splash
```

Credential-gated provider smoke tests may be skipped only when the credential is
absent; keep the skip explicit and do not report it as a passing live check.
