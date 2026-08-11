# Installing Splash for Codex

Splash skills use Codex's standard local skill discovery. This guide is for a
direct repository clone; the newsroom installer performs the same host wiring
when installing a separate local copy.

Codex supports symlinked skill directories under `~/.agents/skills/` and detects
skill changes automatically. See the official
[Codex skill documentation](https://developers.openai.com/codex/skills).

## Prerequisites

- Codex CLI or the Codex desktop/IDE experience
- [Bun](https://bun.sh/)
- Git, or Jujutsu when working in this development workspace

## Install from a direct clone

From the Splash repository root:

```bash
bun install --frozen-lockfile
bun installer/place-skills.mjs --root "$PWD" --dry-run
bun installer/place-skills.mjs --root "$PWD"
```

The placement script discovers directories containing `SKILL.md` and creates
one flat symlink per skill under `~/.agents/skills/`. That shared store is read
by Codex and Goose, so Splash does not create a separate `~/.goose` link or a
root `~/.claude/skills/splash` link.

The current 15 skills are:

```text
chart-beat       chart-video      chart-web       deliver
doctrine         dw-beat          image-beat      intake
map-beat         map-web          newsroom-charter palette
scrolly          splash           storyboard
```

## Configure Splash

Either run the local configurator:

```bash
bun installer/configure.mjs --root "$PWD"
```

or copy `.env.example` to `.env` and fill only the capabilities you need:

- `MAPTILER_KEY`
- `MAPTILER_DELIVERY_KEY`
- `DATAWRAPPER_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- optional `CMS_KIND`, `CMS_ENDPOINT`, and `CMS_TOKEN`

Do not commit `.env`. `splash-doctor` or
`bun installer/doctor.mjs --root "$PWD"` reports which optional capabilities are
available.

Provider-backed producers need outbound network access. If Codex is using the
`workspace-write` sandbox, the supported setting is:

```toml
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = true
```

Merge this into `~/.codex/config.toml`; do not overwrite unrelated settings. The
current setting is documented in the official
[Codex configuration reference](https://developers.openai.com/codex/config-reference).

## Verify

Restart Codex if the skills do not appear immediately, then run `/skills`. You
should see the 15 names above. Invoke the orchestrator explicitly with `$splash`
or describe a matching visual-journalism task.

Repository checks:

```bash
bun test installer/test
bun test skills/splash/test
bun installer/place-skills.mjs --root "$PWD" --dry-run
```

## Update

Update the checkout with its normal version-control workflow. Symlinked skills
reflect file changes immediately. Rerun `place-skills.mjs` when the repository
adds or removes a skill directory.

## Remove the local links

Inspect `~/.agents/skills/` and remove only symlinks whose resolved targets are
inside this Splash checkout. Do not delete colliding real files or directories;
the installer deliberately refuses to overwrite them as well.
