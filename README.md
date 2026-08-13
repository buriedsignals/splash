# Splash

Local-first visual journalism for newsrooms. Splash turns reporting material and
data into web, video, scrollytelling, and static visual outputs while keeping source files,
editorial decisions, rendered drafts, approvals, and delivery artifacts in a
journalist-owned working directory.

This repository is the consolidated Splash development line. The former
doctrine-twin implementation is now the product baseline on `main`.

## Overview

Splash is a skill pack used through an AI assistant rather than a hosted
application. Its workflow freezes supplied reporting material, develops a
storyboard, produces real draft visuals, waits for human approval, and exports a
format-specific handover.

The implementation is local-first: stories live under `stories/`, credentials
stay in the installed Splash root, and every delivery is a file or directory the
newsroom controls.

## Migration note: publication format

As of 2026-08-14, Splash calls the `static`, `web`, `video`, and `scrolly` choice
`format` throughout its canonical story and JavaScript contracts. Legacy
`STORYBOARD.md` slots containing `genre` remain readable and are upgraded to
`format` on their next explicit storyboard write; old JavaScript symbol names are
not retained. Historical `.another-genre` delivery receipts remain readable,
while new answers are written to `.another-format`.

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
package, and “Deploy and receive embed code” automatically publishes a web
output to Cloudflare Pages. Cloudflare is an implementation detail, not another
editorial question. Each hosted output gets a stable per-output project URL, an
iframe snippet, and a deployment receipt. A later approved revision updates the
same URL.

Each installation persists `stories/.splash-instance-id` locally so two Splash roots using the
same Cloudflare account cannot derive the same Pages project from common story/output slugs. Each
story then keeps editable and delivered material separate:

```text
stories/
  .splash-instance-id                local deployment namespace; never commit
  <story>/
    AGENTS.md                         revision instructions for a fresh session
    source/                           frozen reporting material
    STORYBOARD.md                     editorial decisions and producer choice
    beats/<outputId>/                 canonical editable visual source
      renders/                        current review target
      spec.json                       Datawrapper source spec, when delegated
      DATAWRAPPER.json                reusable Datawrapper chart ID, when delegated
    export/<outputId>/                current delivered form; never edit as source
      HANDOVER.md
      DEPLOYMENT.json                 hosted deployment → editable beat link
      EMBED_URL.txt
      EMBED_CODE.html
```

For editor feedback, start with the story's `AGENTS.md` and the relevant
`DEPLOYMENT.json`, edit the matching beat, render and approve it again, then
materialise the same delivery form. `beats/<outputId>/FEEDBACK.md` is the durable trigger that makes
a fresh `whereIs` session reopen production and then delivery. Local delivery keeps the prior export
intact until replacement completes; a remotely completed Cloudflare operation may precede the local
receipt and is reconciled from the hosted-operation record on retry.

## Documentation

- [`AGENTS.md`](AGENTS.md) — repository workflow and product constraints
- [Residual findings](docs/residual-review-findings/feat-data2story-human-gated-production.md)
  — completed delivery hardening and outstanding live verification
- [`skills/splash/SKILL.md`](skills/splash/SKILL.md) — orchestration and
  human-gated workflow
- [`skills/deliver/SKILL.md`](skills/deliver/SKILL.md) — delivery forms,
  safeguards, and handover contract
- `proof/` — rendered examples and parity proofs

## Project structure

```text
skills/       Product skills and their tests
shared/       Shared rendering primitives
stories/      Local story workspaces and artifacts
installer/    Local installer, configurator, and doctor
scripts/      Repository checks and generated matrices
proof/        Rendered proof cases
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
