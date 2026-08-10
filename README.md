# Splash

Local-first visual journalism for newsrooms. Splash turns reporting material and
data into web, video, print, and static visual outputs while keeping source files,
editorial decisions, rendered drafts, approvals, and delivery artifacts in a
journalist-owned working directory.

This repository is the `rd-dev` doctrine-twin lineage. It remains separate from
`main` while the two products are evaluated; changes based on this lineage should
not be merged as though the histories shared an ancestor.

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

To install a local newsroom copy without opening the configurator:

```bash
bash installer/install.sh --headless
```

The installer defaults to `~/Splash`, installs dependencies, configures the AI
host skill links, and creates `splash-doctor`. Use `--root <path>` to choose a
different local root or `--skip-configure` to defer newsroom and credential
setup.

## Environment variables

Copy `.env.example` to `.env` in the installed Splash root. The available values
cover interface language, MapTiler, Datawrapper, and optional hosted-embed
credentials. Do not commit `.env` or real keys.

## Deployment and delivery

Splash itself runs locally. Delivery is selected per approved output: owned
files and source bundles remain local, CMS insertion produces an insertion
package, and hosted embeds use the configured deployment provider. A completed
delivery is written to `stories/<story>/export/<beat>/` with `HANDOVER.md` and a
delivery receipt.

## Documentation

- `docs/splash/` — product requirements and implementation decisions
- `skills/splash/SKILL.md` — orchestration and human-gated workflow
- `skills/deliver/SKILL.md` — delivery forms, safeguards, and handover contract
- `survey/` — measured design and host-compatibility research
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
is not a Data2Story fork and does not adopt its fixed role topology or
article-only workflow.

## License

Splash is available under the [MIT License](LICENSE).
