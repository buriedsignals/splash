<div align="center">

# Splash

### Human-gated visual journalism for AI agents

**Turns reporting material into web, video, scrollytelling, and static visuals — storyboard approval, real rendered drafts, and per-output delivery, all in a journalist-owned story directory. 16 skills, 4 formats, local-first.**

[Workflow](#workflow) | [Delivery](#delivery-and-delivery) | [Install](#install) | [Story Directory](#story-directory)

[![License: MIT](https://img.shields.io/badge/license-MIT-00c853?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](LICENSE)[![16 Skills](https://img.shields.io/badge/skills-16-0080ff?style=for-the-badge&logo=bookstack&logoColor=white)](#workflow)[![4 Formats](https://img.shields.io/badge/formats-web_·_video_·_scrolly_·_static-aa00ff?style=for-the-badge&logo=layout&logoColor=white)](#workflow)[![Local-first](https://img.shields.io/badge/local_first-Engine_credentials_+_owned_files-00bfa5?style=for-the-badge&logo=shield&logoColor=white)](#credentials)

[![Stars](https://img.shields.io/github/stars/buriedsignals/splash?style=flat-square&logo=github&label=Stars)](https://github.com/buriedsignals/splash/stargazers)[![Issues](https://img.shields.io/github/issues/buriedsignals/splash?style=flat-square&logo=github&label=Issues)](https://github.com/buriedsignals/splash/issues)[![Last Commit](https://img.shields.io/github/last-commit/buriedsignals/splash?style=flat-square&logo=github&label=Last%20Commit)](https://github.com/buriedsignals/splash/commits)[![Contributors](https://img.shields.io/github/contributors/buriedsignals/splash?style=flat-square&logo=github&label=Contributors)](https://github.com/buriedsignals/splash/graphs/contributors)

Built by [**Buried Signals**](https://buriedsignals.com/) • [tom@buriedsignals.com](mailto:tom@buriedsignals.com)

</div>

---

Splash turns reporting material and data into finished visual journalism. It
freezes the supplied reporting material, develops a storyboard, produces real
rendered drafts, waits for human approval, and exports a format-specific
handover — while source files, editorial decisions, rendered drafts,
approvals, and delivery artifacts stay in a journalist-owned working
directory.

It is a skill pack used through an AI assistant rather than a hosted
application. The implementation is local-first: stories and newsroom
configuration live outside the replaceable Splash checkout, credentials stay
in the operating system's protected store through Engine, and every delivery
is a file or directory the newsroom controls.

## What Splash Does

- Freezes supplied reporting material into an immutable story source before
  any production starts.
- Develops a storyboard and waits for editorial approval of the angle,
  format, and visual approach.
- Produces real rendered drafts — charts, maps, scrollytelling, video, and
  static graphics — not mockups or descriptions.
- Waits for human approval on every rendered output before delivery.
- Delivers per approved output: owned local files, a CMS insertion package,
  or an automatic Cloudflare Pages publish with embed code.
- Keeps editable production source and delivered exports strictly separated
  per output, so editor feedback reopens production without touching the
  delivered form.
- Ranks and selects the smallest craft skill that fits the approved editorial
  intent; ranking informs agent judgment, it does not replace it.

## Workflow

```text
Intake
  -> Storyboard                    [gate: editorial approval]
  -> Beats: chart / map / image / video / scrolly
  -> Render + human approval       [gate: visual approval]
  -> Deliver: local files / CMS package / Cloudflare Pages
  -> Editor feedback -> reopen beat -> re-render -> re-deliver
```

Every gate is explicit. Splash does not auto-advance through storyboard
approval, rendered-output approval, or the delivery decision. Craft-skill
selection is ranked, but the journalist's confirmed takeaway always wins.

## Story Directory

Each story gets a journalist-owned working directory:

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

`beats/<outputId>/` is editable production source; `export/<outputId>/` is the
current delivery, never the source. For editor feedback, start with the
story's `AGENTS.md`, edit the matching beat, render and approve again, then
materialise the same delivery form.

## Delivery and delivery

Delivery is selected per approved output:

- **Owned files** — source bundles and rendered assets stay local.
- **CMS insertion** — produces a local insertion package; Splash never calls
  a CMS itself.
- **Deploy and receive embed code** — publishes the web output to Cloudflare
  Pages automatically. Each hosted output gets a stable per-output project
  URL, an iframe snippet, and a deployment receipt. A later approved revision
  updates the same URL.

Cloudflare is an implementation detail, not another editorial question. Local
delivery keeps the prior export intact until replacement completes.

## Credentials

Credentials are stored through Engine's operating-system credential broker —
never in MCP arguments, model context, committed files, or Splash's loopback
pages. The Splash studio and setup page report the exact credential IDs, status,
and provider links; neither accepts a secret.

Indicator Labs users save credentials in the desktop app. For an open-source
installation, a trusted local agent can prepare Engine's protected `bsig`
stdin/keychain flow for the exact ID while the user enters the value only through
a private operating-system or terminal prompt. Never place a value in chat,
command arguments, shell history, a repository file, or a Splash page. Refresh
Readiness after setup. Map craft's provider-bearing bake is a fixed Engine
operation: each beat supplies a strict story-local `MAP-BAKE.json`, and Engine
verifies camera, GeoJSON/data digests, managed browser, and installed runtime
before hydrating `MAPTILER_KEY`.

## Install

Managed journalist install is Indicator Labs on Mac or Windows. Join at
[buriedsignals.com/join](https://buriedsignals.com/join). Indicator Labs adds
guided setup, credential management, repair, and automatic updates.

Agent-led manual installation uses the same Engine through its public signed
standalone release. Fetch the JSON response for the host platform:

```text
https://navigator.indicator.media/api/artifacts/bootstrap/bsig/<platform>
```

`<platform>` is `darwin-arm64`, `darwin-amd64`, `linux-arm64`,
`linux-amd64`, or `windows-amd64`. Download the returned archive, checksum,
signature, and public key; verify both SHA-256 and Minisign before extracting
or executing `bsig`. Then run `bsig catalog sync`.

Windows 11 amd64 is a **prepared host**: Engine does not install Goose Desktop,
Git, Bun, Docker, or Node. Missing tools fail at plan time. An agent installs
the catalog-pinned release with `bsig plan install splash`, reviews the emitted
plan, and applies that exact `plan.json`. After doctor is green, launch Goose
from the Start menu. Do not run `install.sh` on Windows.

Contributor / development checkout on macOS or Linux:

```bash
git clone https://github.com/buriedsignals/splash.git
cd splash
bun install --frozen-lockfile
bash installer/install.sh --bsig /absolute/path/to/bsig
```

`installer/install.sh` adopts the checkout through one Engine transaction,
installs the dependency and browser payload, runs the no-value smoke check,
projects the shipped skills, and registers Splash with Goose when present.
Stories and newsroom configuration remain outside the replaceable checkout.

For the canonical manifest, runtime, data-path, and Goose-registration health
check, run `bsig doctor --product splash`.

## Install from source (agents)

Engine is the supported path above. An agent pointed at this repository can
install the runtime set without cloning the whole repository: `install-set.txt`
names the directories a runtime needs; everything else is documentation, proofs,
and development tooling.

```bash
git clone --filter=blob:none --sparse https://github.com/buriedsignals/splash.git splash
cd splash
git sparse-checkout set $(grep -v '^#' install-set.txt)
bun install --frozen-lockfile --production --ignore-scripts
```

Rendering drives Chrome: an installed Google Chrome is found automatically, or
set `CHROME_PATH`, or run `bunx @puppeteer/browsers install chrome@stable`.

Then link the skills into your agent's skills directory (Windows: use
`New-Item -ItemType Junction` in place of `ln -s`):

| Agent | Link |
|---|---|
| Goose, Cursor, Codex, Gemini (shared agents store) | `mkdir -p ~/.agents/skills/splash && for s in skills/*/; do ln -s "$PWD/$s" ~/.agents/skills/splash/$(basename "$s"); done` |
| Claude Code | `ln -s "$PWD" ~/.claude/skills/splash` |

These are the same links Engine creates; a later Engine install adopts or
replaces them. Provider keys are never read from this checkout — see
[Credentials](#credentials).

## Skills

| Skill | Purpose |
|---|---|
| `intake` | Freezes reporting material into the story source. |
| `storyboard` | Editorial decisions, format choice, visual approach. |
| `chart-beat` / `chart-web` / `chart-video` | Chart production per delivery format. |
| `map-beat` / `map-web` | Map production with Engine-verified bakes. |
| `image-beat` | Static and illustrated outputs. |
| `scrolly` | Scrollytelling production. |
| `dw-beat` | Datawrapper-delegated charts. |
| `analyst` | Dataset profiling before visual selection. |
| `palette` | Newsroom palette and visual identity. |
| `newsroom-charter` | Newsroom configuration and constraints. |
| `doctrine` | Visual and editorial doctrine. |
| `splash` | Orchestration and human-gated workflow. |
| `deliver` | Delivery forms, safeguards, and handover contract. |

## Documentation

| Doc | For |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Repository workflow and product constraints. |
| [`llms.txt`](llms.txt) | Compact public AI index. |
| [`llms_full.txt`](llms_full.txt) | Flattened public AI reference for one-shot ingestion. |
| [`skills/splash/SKILL.md`](skills/splash/SKILL.md) | Orchestration and human-gated workflow. |
| [`skills/deliver/SKILL.md`](skills/deliver/SKILL.md) | Delivery forms, safeguards, and handover contract. |
| [`skills/doctrine/SKILL.md`](skills/doctrine/SKILL.md) | Visual and editorial doctrine. |
| [Interactive setup verification](docs/splash/interactive-preflight-verification.md) | Durable implementation evidence and release blockers. |
| [Residual findings](docs/residual-review-findings/feat-data2story-human-gated-production.md) | Completed delivery hardening and outstanding verification. |

## What Belongs Where

- **Splash** is visual journalism: storyboards, rendered visuals, approvals,
  and delivery.
- **Spotlight** is active OSINT casework: leads, evidence, fact-checks, and
  review artifacts.
- **Anomaly** is structured-data investigation: detectors, replay, reviewed
  findings, and portable cases.
- Splash consumes reviewed material from either and produces the visual form
  readers see.

## Attribution

Splash's human-gated production redesign adapts selected ideas from Qinghong
Lin et al.'s [Data2Story paper](https://arxiv.org/abs/2606.11176) and the
[Data2Story open-source project](https://github.com/QinghongLin/data2story-skill)
— especially evidence traceability, explicit planning, and quality review.
Splash uses Data2Story as a design reference only: it does not install,
invoke, or require Data2Story skills at runtime, and it does not adopt the
project's fixed role topology or article-only workflow.

## Acknowledgements

Splash stands on open work — open-source projects and open methods. A sincere
thank-you to every project below. *(Listing does not imply affiliation or
endorsement.)*

| Category | Projects we're grateful to |
|----------|----------------------------|
| **Runtime** | [Bun](https://bun.sh/) (Bun Software, MIT) |
| **Rendering** | [React](https://react.dev/) (Meta, MIT) · [Remotion](https://www.remotion.dev/) (Remotion — video rendering) · [D3](https://d3js.org/) (Mike Bostock, ISC — chart geometry and scales) · [Resvg](https://github.com/linebender/resvg) (linebender, MIT — SVG rendering) · [Puppeteer](https://pptr.dev/) (Google, Apache-2.0 — browser rendering and proofs) |
| **Maps** | [MapLibre GL](https://maplibre.org/) (BSD-3.0 — interactive maps) · [MapTiler](https://www.maptiler.com/) (map tiles) |
| **Charts** | [Datawrapper](https://www.datawrapper.de/) (Datawrapper GmbH — delegated chart production) |
| **Delivery** | [Cloudflare Pages](https://pages.cloudflare.com/) (Cloudflare — hosted output publishing) |
| **Methodology** | [Data2Story](https://github.com/QinghongLin/data2story-skill) by Qinghong Lin, Batu EI, Yuhong Shi, Pan Lu, Philip Torr, James Zou (arXiv:2606.11176 — design reference for evidence traceability and human-gated production) |

> Built something here we should credit, or want a listing changed or removed?
> Open an issue or PR — we'll fix it fast.

## License

Splash is available under the [MIT License](LICENSE).
