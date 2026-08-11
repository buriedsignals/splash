# Splash

Local-first visual journalism for newsrooms. Splash turns reporting material and
data into web, video, print, and static visual outputs while keeping source files,
editorial decisions, rendered drafts, approvals, and delivery artifacts in a
journalist-owned working directory.

This repository is the consolidated Splash development line. The former
doctrine-twin implementation is now the product baseline on `main`.

## Overview

Splash is a skill pack used through an AI assistant rather than a hosted
application. Its workflow freezes supplied reporting material, develops a
storyboard, produces real draft visuals, waits for human approval, and exports a
format-specific handover. The current Data2Story redesign is specified in
[`docs/splash/2026-08-10-data2story-human-gated-production-prd.md`](docs/splash/2026-08-10-data2story-human-gated-production-prd.md).

The implementation is local-first: stories live under `stories/`, credentials
stay in the installed Splash root, and every delivery is a file or directory the
newsroom controls.

## Tech stack

- Bun and JavaScript/TypeScript
- React and Remotion for rendered visual output
- D3 modules for chart geometry and scales
- MapLibre GL for interactive maps
- Resvg and Puppeteer for SVG/browser rendering and proofs

## Quick start

Prerequisites: macOS or Linux (Windows through WSL), Git, and
[Bun](https://bun.sh/).

From the repository root:

```bash
bun install --frozen-lockfile
bun test skills/deliver/test
bun run matrix:check
bun run survey:check
```

To install a local newsroom copy without automatically opening a browser:

```bash
bash installer/install.sh --headless
```

`--headless` still starts the local configurator and prints its URL. For an
unattended install that defers newsroom and credential setup, use
`bash installer/install.sh --skip-configure` instead.

The installer defaults to `~/Splash`, installs dependencies, places flat skill
links in `~/.agents/skills/` for Goose, Codex, and Gemini, and creates
`splash-doctor`. It does not create a separate Goose link or a root Claude link.
Use `--root <path>` to choose a different local root.

## Environment variables

Copy `.env.example` to `.env` in the installed Splash root. The available values
cover MapTiler, Datawrapper, Cloudflare Pages, and optional CMS credentials. Do
not commit `.env` or real keys.

## Deployment and delivery

Splash itself runs locally. Delivery is selected per approved output: owned
files and source bundles remain local, CMS insertion produces an insertion
package, and hosted embeds use the configured deployment provider. A completed
delivery is written to `stories/<story>/export/<beat>/` with `HANDOVER.md` and a
delivery receipt.

## Documentation

- [`AGENTS.md`](AGENTS.md) — repository workflow and product constraints
- [Data2Story production PRD](docs/splash/2026-08-10-data2story-human-gated-production-prd.md)
  — active requirements and remaining work
- [Consolidation status](docs/splash/data2story-consolidation-status.html) —
  readable HTML overview of what landed and what remains
- [Residual findings](docs/residual-review-findings/feat-data2story-human-gated-production.md)
  — completed hardening and outstanding live verification
- [`skills/splash/SKILL.md`](skills/splash/SKILL.md) — orchestration and
  human-gated workflow
- [`skills/deliver/SKILL.md`](skills/deliver/SKILL.md) — delivery forms,
  safeguards, and handover contract
- `survey/` — dated design and host-compatibility measurements
- `proof/` — rendered examples and parity proofs

## Project structure

```text
skills/       Product skills and their tests
shared/       Shared rendering primitives
stories/      Local story workspaces and artifacts
installer/    Local installer, configurator, and doctor
scripts/      Repository checks and generated matrices
proof/        Rendered proof cases
survey/       Design and compatibility research
docs/         Product requirements and decisions
```

## Acknowledgements

Splash's human-gated production redesign adapts selected ideas from Qinghong Lin
et al.'s [Data2Story paper](https://arxiv.org/abs/2606.11176) and the
[Data2Story open-source project](https://github.com/QinghongLin/data2story-skill),
especially evidence traceability, explicit planning, and quality review. Splash
uses Data2Story as a design reference only: it does not install, invoke, or
require Data2Story skills at runtime, and it does not adopt the project's fixed
role topology or article-only workflow.

## License

Splash is available under the [MIT License](LICENSE).
