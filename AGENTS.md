# Splash agent guidance

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
- `docs/splash/2026-08-10-data2story-human-gated-production-prd.md` — active
  requirements and remaining implementation work.
- `docs/residual-review-findings/feat-data2story-human-gated-production.md` —
  landed hardening and the one remaining live verification item.
- `docs/splash/data2story-consolidation-status.html` — readable consolidation
  status page derived from those two records.
- `skills/splash/SKILL.md` — executable orchestration contract.
- `skills/doctrine/SKILL.md` and its references — visual and editorial doctrine.

Dated plans, surveys, audits, feedback files, and proof artifacts preserve the
state measured when they were written. Do not treat them as current operating
instructions unless a canonical document above links to them as such.

## Repository workflow

- Use colocated Jujutsu for working-copy changes, history, bookmarks, fetches,
  and pushes. Treat Git as a read-only compatibility view.
- Preserve unrelated working-copy changes and generated evidence.
- Keep skills self-contained. Do not introduce cross-skill runtime imports where
  the existing parity-copy pattern is deliberate.
- Use the smallest craft skill that fits the approved editorial intent. Ranking
  informs agent judgment; it does not replace that judgment or override the
  journalist's confirmed takeaway.

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
