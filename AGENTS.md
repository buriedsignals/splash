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

## Production output revisions

Every story created by Splash has its own `stories/<slug>/AGENTS.md`. Read that
file before responding to editor feedback on a published visual. The invariant
is: `beats/<outputId>/` is editable production source and
`export/<outputId>/` is the current delivery, never the source. Hosted outputs
also carry `export/<outputId>/DEPLOYMENT.json`, which links the public URL and
deployment back to the canonical beat. Re-render, re-review, and re-materialise
from the beat; do not patch exported files in place. Creating or updating
`beats/<outputId>/FEEDBACK.md` is the durable revision trigger consumed by `whereIs`.

## Host discovery

`installer/place-skills.mjs` discovers every directory under `skills/` that has
a `SKILL.md` and places one flat symlink per skill in
`~/.agents/skills/`. Goose, Codex, and Gemini use that shared store. Do not add a
separate `~/.goose` link or a root `~/.claude/skills/splash` link.

The current repository ships 15 skills. Derive the inventory from the
filesystem rather than maintaining a second hard-coded installer list.

## Verification

Run checks in proportion to the change. The release baseline is:

```bash
bun install --frozen-lockfile
bun test
bun run matrix:check
bun run survey:check
```

For installer or host-discovery changes, also run:

```bash
bun test installer/test
bun installer/place-skills.mjs --root "$PWD" --home /tmp/splash-skills-check --dry-run
```

Credential-gated provider smoke tests may be skipped only when the credential is
absent; keep the skip explicit and do not report it as a passing live check.
