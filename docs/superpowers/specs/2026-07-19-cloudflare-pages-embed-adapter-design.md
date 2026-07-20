# Cloudflare Pages embed adapter — design

> Replace the fly.io internals of the `embed` delivery form with Cloudflare Pages, driven by
> **pure `fetch`** — no wrangler CLI, no Node.js runtime requirement. Keeps the external
> interface of `deploy-embed.mjs` (gate, `EMBED_URL` stdout contract, `EMBED_URL.txt`).
>
> **Every protocol and platform claim below was measured against the live Cloudflare API on
> 2026-07-19**, not read from documentation and not assumed. The spike lives in
> `scratchpad/wrangler-test/` (`deploy.ts`, `deploy.test.ts` 6/6 green, `measure.ts`).
> Where a measurement contradicts the 2026-07-19 pre-spike design, the measurement wins and
> the contradiction is called out explicitly.

## Why (the gap)

The `embed` delivery form runs a fly.io machine with a persistent volume and uploads the
artifact over sftp (`skills/splash/scripts/deploy-embed.mjs`). For a **self-contained static
HTML file** that is structurally oversized: it needs an account with a card, an app, a
volume, a running machine, and `flyctl`. A static CDN is the right-sized tool.

A second, harder problem: item #5 of the Tom feedback ("prove the embed deploy") was never
provable, because the fly path needs credentials and infrastructure nobody had set up.

## Measured facts (the spike)

These replace the assumptions in the pre-spike design. Each was produced by a real deploy.

| Fact | Measurement | Consequence |
|---|---|---|
| wrangler under Bun | Exits **0 while deploying nothing** — zero deployments recorded, URL never live | Disqualified. A CLI that reports success without delivering is the exact failure class Splash exists to prevent |
| wrangler under system Node | Hard-refuses: requires Node ≥ 22, host has v20.19.0 | Would impose a Node install on every newsroom |
| Asset hash | `blake3(base64(contents) + extension).hex.slice(0,32)` — the **base64 text**, not raw bytes | Reconstructed from wrangler's bundled source; unguessable |
| Upload path | Documented REST upload **does not exist** — Cloudflare documents only wrangler and dashboard drag-and-drop | Three endpoints used here are undocumented. See "Accepted debt" |
| Cold project provisioning | **~100 s** before *any* URL of a new project answers; later deploys land in seconds | Verification window must cover ~200 s or valid first deploys read as failures |
| Blob dedup | **None.** Identical bytes are reported missing and re-uploaded every time | Do not build on dedup; cost is full re-upload per deploy |
| Production branch alias | `<production-branch>.<project>.pages.dev` **404s**; production is served at `<project>.pages.dev` | Constructing the URL uniformly hands out a dead link for a live visual |
| Branch alias normalisation | Cloudflare rewrites the label: `_`→`-`, truncation to **28 chars**, and a **non-deterministic suffix** (`-artx`) on collision | The alias cannot be predicted |
| Accented branch names | `Élections-Municipales` → `lections-municipales` — **the accent is dropped, not transliterated** | Catastrophic for French newsrooms if slugs are passed through raw |
| Deployments list paging | `?per_page=100` returns an **empty list with `success: true`** — no error | Load-bearing: step 6 reads the alias from this list. Paginating naively resolves *no* alias and the deploy fails for a live visual. Call it without `per_page` |
| Deleting an aliased deployment | Refused unless `?force=true` — loudly, with an actionable message | Makes a retention policy implementable (see Deferred) |

### The load-bearing conclusion

**Never construct the alias URL. Read it back from the API.** A constructed URL was wrong in
three separate measured ways (production branch, underscores, accents, truncation). The
adapter reads `aliases[0]` from the deployments API — and even then verifies the served bytes.

## Naming — identifiable, never generic

Requirement: with several projects on one account, a URL must say *which newsroom* and
*which visual* it is. Two independent name surfaces, with different constraints.

### Project name = the newsroom

`SPLASH_EMBED_PROJECT` becomes **required**, with no fallback default. A generic default is
what produces `splash-embeds.pages.dev` for every newsroom on the planet.

- Derived by default from the newsroom profile name when `NEWSROOM-PROFILE.md` provides one
  (`heidi-news` → `heidi-news-splash`), otherwise the journalist supplies it once.
- Validated `^[a-z0-9][a-z0-9-]{2,54}$` (fits the `<project>.pages.dev` label).
- **Rejected as generic** (fail-fast, actionable message): `splash`, `embed`, `embeds`,
  `splash-embed`, `splash-embeds`, `demo`, `test`, `preview`, `project`. The name has to
  identify a newsroom, not a tool.
- The project's `production_branch` is set to a reserved sentinel (`__splash_production`)
  that Splash never deploys to, so every visual is a non-production branch and always gets
  an alias. Corollary: `<project>.pages.dev` (the root) intentionally 404s.

### Branch = the visual

Cloudflare's own normalisation is lossy and unpredictable, so Splash normalises **first**,
into a form Cloudflare will pass through unchanged:

1. Unicode NFD decompose, strip combining marks — `é`→`e`, `Élections`→`Elections`. This is
   the step that matters: Cloudflare deletes the accented character outright.
2. Lowercase; every non `[a-z0-9]` run → single `-`; trim leading/trailing `-`.
3. Truncate the readable part to **24** characters.
4. Append `-` + a 3-char base36 digest of the **full original id**.

Total ≤ 28 characters — inside the measured truncation budget, so Cloudflare never truncates
and never appends its own unpredictable collision suffix. The digest makes two visuals whose
first 24 characters coincide deterministically distinct on our side rather than randomly
distinct on Cloudflare's.

```
"Élections municipales 2026 — Annemasse, budget communal"
  → elections-municipales-2-k7f
  → https://elections-municipales-2-k7f.heidi-news-splash.pages.dev
```

Readable, identifiable, stable across redeploys of the same visual (same id → same slug), and
collision-proof.

## Architecture — replace the internals, keep the interface

`deploy-embed.mjs` keeps its name, CLI signature, gate and stdout contract. Only its internals
change from sftp-to-fly to fetch-to-Cloudflare.

**Preserved, verified in the tree:**

- `assertShippable(report, id)` (`skills/splash/scripts/deploy-embed.mjs:65`) — unchanged.
- The `EMBED_URL <url>` stdout line, parsed by `export-code.mjs:358-360`, which writes
  `EMBED_URL.txt` at `:368`. Unchanged.
- Fail-fast before any network call when credentials are missing (today `:71-76`).

**Changed — the pre-spike design claimed the interface was untouched; that was wrong:**

- `export-code.mjs:44` imports `flyTokenConfigured` from `deploy-embed.mjs` and gates on it at
  `:439`. It is renamed **`embedTokenConfigured()`**, checking `CLOUDFLARE_API_TOKEN` +
  `CLOUDFLARE_ACCOUNT_ID` + `SPLASH_EMBED_PROJECT`. Both call sites move together.
- `resolveApp` / `embedUrl` (`:30`, `:39`) are deleted — they encode fly's `<app>.fly.dev`
  URL shape, which no longer exists. `slugify` (`:24`) is superseded by the accent-stripping
  normaliser above; the existing one must not be reused, it does not handle diacritics.

## The deploy sequence

```
0. preflight        token + account + project present, project name non-generic  → else fail-fast
1. ensure project   GET  /accounts/:a/pages/projects/:p        (404 → POST create)
2. upload token     GET  /accounts/:a/pages/projects/:p/upload-token       → short-lived JWT
3. check-missing    POST /pages/assets/check-missing   { hashes }      auth: JWT
4. upload           POST /pages/assets/upload  [{ key, value, metadata, base64 }]   auth: JWT
5. deployment       POST /accounts/:a/pages/projects/:p/deployments
                    multipart: manifest (sitePath → hash), branch, commit_dirty
6. resolve url      poll deployments until aliases[0] is populated (it is null right after 5)
7. VERIFY           fetch the alias until it serves the artifact's own marker  (≤ ~200 s)
8. emit             print `EMBED_URL <url>`
```

Steps 2–4 are the undocumented ones. Step 7 is non-negotiable — see below.

The directory, not a single file, is uploaded: the `embed` form covers **interactive *and*
scrolly**, and the pre-spike design's "one self-contained index.html" was too narrow. Proven
on a real 5.5 MB scrolly plus three chart-native artifacts.

## Accepted debt and its mitigation

`upload-token`, `check-missing` and `upload` are **not publicly documented**. Cloudflare may
change them without notice. This was chosen knowingly over the alternatives (wrangler +
Node 22 for every newsroom; staying on fly).

The mitigation is mechanical, not a comment in a file:

- **Delivery is verified against served bytes**, never against an exit code or an HTTP 200
  alone. The adapter fetches the resolved URL and asserts the artifact's own marker is served.
  This is what caught wrangler's silent no-op, and it is what will catch a protocol change.
- **Failure is loud.** No fallback, no placeholder `EMBED_URL.txt`, no partially-delivered
  state — consistent with the Wave 11 embed/fly fix.
- The e2e test asserting the measured protocol behaviour (including *absence* of dedup) turns
  a silent Cloudflare change into a red test rather than a silent cost or a dead URL.

## Configuration

| Removed | Added |
|---|---|
| `FLY_API_TOKEN` | `CLOUDFLARE_API_TOKEN` (secret) |
| `SPLASH_EMBED_APP` | `CLOUDFLARE_ACCOUNT_ID` (not secret) |
| | `SPLASH_EMBED_PROJECT` (not secret, non-generic, required) |

`EMBED_DELIVERY_ENV` (`skills/splash/src/preflight.ts:87-90`) is updated to the new triple,
which also makes `save-key.mjs` accept `CLOUDFLARE_API_TOKEN` — it currently rejects it,
since it only allows names present in that manifest.

**Token guidance, measured:** an **account-owned** token with `Account · Cloudflare Pages ·
Edit` works. Two traps worth a precise preflight message, both hit during the spike: such a
token verifies at `/accounts/{id}/tokens/verify`, **not** `/user/tokens/verify`; and a token
with no Pages permission authenticates fine while failing every Pages call with `10000`.

## Fly removal surface

Verified by grep, wider than the pre-spike design stated:

- `skills/splash/embed-host/` (fly.toml, Dockerfile, server.ts) — deleted
- `skills/splash/scripts/deploy-embed.mjs` — internals rewritten
- `skills/splash/scripts/deploy-embed.test.ts` — rewritten
- `skills/splash/scripts/export-code.mjs` — `:44` import, `:439` gate
- `skills/splash/src/preflight.ts` — `EMBED_DELIVERY_ENV`
- `skills/splash/tests/export-code-proposal-cli.test.ts`, `skills/splash/tests/save-key.test.ts`
- `skills/splash/SKILL.md` — the "One-time fly.io host setup" section becomes a Cloudflare
  token section (create a token, paste it — no app, no volume, no launch)

Historical docs/plans mentioning fly are a journal and stay untouched.

## Tests

Unit (no network): slug normalisation (accents, underscores, length, determinism, collision),
generic-project-name rejection, argument construction, `EMBED_URL` emission, fail-fast paths,
`assertShippable` gate.

E2E against the real API (no mocks, per repo convention) — the spike suite, ported: nested
multi-file directory, binary asset served byte-identical, redeploy serves the new version,
branch isolation, production-branch URL rule, absence of dedup pinned.

**Acceptance:** a real embed deploy of a real Splash artifact, verified by fetching the URL.
Unlike fly, this is executable — it was executed: <https://splash-embed-demo.pages.dev>.

## Deferred / open

- **Cold-start UX**: the first embed of a newsroom takes ~100 s. Needs a message so the wait
  reads as provisioning, not as a hang.
- **Cleanup policy**: nothing deletes old deployments. A newsroom accumulates one per
  redeploy, forever. The mechanism is proven — `DELETE /accounts/:a/pages/projects/:p/
  deployments/:id?force=true` (the `force` flag is required for aliased deployments, and
  omitting it fails loudly rather than silently). What is missing is the *decision*: keep the
  last N per visual, purge after a delay, or never purge. Deleting a visual's only deployment
  removes its alias, so an embed URL a newsroom already published would go dead — which is
  precisely why this is a decision and not an implementation detail.
- **Custom domains**: `*.pages.dev` only. Cloudflare supports custom domains per project.
- **Sovereignty**: swapping one US SaaS for another does not improve sovereignty. What
  mitigates it is unchanged — the artifact is owned locally and the host is a swappable
  mirror. `map-dw`'s hosted-embed path is untouched by this work.
