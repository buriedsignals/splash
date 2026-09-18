# Inspiration journey — design

Date: 2026-09-13 · Branch: `feat-inspiration` (off `origin/main` @ `fefca2f7`)
Requested by Tom: move infoviz.design into Splash. Keep the infoviz back-end on Hugging Face, retire its
front-end and its MCP server, and give Splash a third journey — **inspiration** — next to the editorial
exchange and production.

> **Revised 2026-09-18 (Tom).** The gallery's own sign-in is gone. Identity is the **Navigator personal
> access token** (`OSINT_NAV_API_KEY`), which Engine already keeps and the Navigator CLI already uses;
> the API checks it against Navigator and counts ten searches a day per token. The web page is
> anonymous (five a day per address), has no sign-in and no token to copy. What this changes below:
> D3, D4, D6, D7 and D9-D12 are superseded in part — Part 1's token sign-in, Part 2a's `INFOVIZ_TOKEN`
> credential and validator, Part 2b's copy button and `INDICATOR_LABS_ACCEPTS_INFOVIZ`, and Part 4's
> sign-in are retired. What Engine does instead (PR prepared 2026-09-18, ships with the next Indicator
> Labs release): `PrepareSplashMCP` hands the Splash MCP server — the one Splash process Engine
> launches itself — the stored `OSINT_NAV_API_KEY` in its environment, read from the store and
> read without a prompt (the launch is unattended, at every agent start) and registered for
> redaction; no sealed operation, no new credential. The key is not passed to the agent; it is
> readable only by same-user processes, like every sealed operation's environment. The MCP tool
> searches with it, retries once anonymously and flagged when the gallery refuses it, then stays
> anonymous for that server; connecting or disconnecting takes effect at the next agent start. The
> bridge and the setup session strip credential-shaped variables, the Navigator key by name, from
> every child they spawn, so the key stops at the server. On an Engine from before that release the variable is absent and the search is
> anonymous. `sealed-search.mjs` and the `inspiration-search` operation are removed.
> The API itself lives in `buriedsignals/splash-inspiration` (the former infoviz repo).

## Goal

A journalist names a subject and sees what newsrooms have already published on it. No story directory,
no gate, no obligation to produce a visual. Two surfaces, one back-end:

- **the agent** — a new `inspiration` skill;
- **the web** — `landing/inspiration.html`, which becomes infoviz.design's front-end.

## Out of scope

- The storyboard's reference loop (movement ⑧, `skills/doctrine/references/reference-set.md`) does **not**
  call the back-end. The journey stays separate for now.
- No curated synthesis: one query per subject, the raw list. The quota (5/day anonymous, 10/day signed in)
  cannot pay for query reformulation.
- No change to the `infoviz.design` domain or DNS. `/` on the Space stops serving the SPA; nothing redirects.
- No destructive operation on Supabase: the `oauth_*` tables left behind by the MCP stay in place.
- No change to search itself (Postgres full-text cascade, `query` as the only parameter).

## Current state (measured 2026-09-13)

- Space `tomvaillant/infoviz`: one Docker image, one FastAPI process on port 10000 serving the SvelteKit SPA,
  the API and the MCP (`backend/app/main.py`). Deployed sha `cf6b529`; the local clone
  `~/Sites/Professional/infoviz` is 4 commits behind it (docs + `002_security_hardening.sql` only).
- Search: `GET|POST /api/graphics/examples` → `{query, items:[{title, source, date, url, image}]}`, headers
  `X-RateLimit-Limit/Remaining/Reset`, 429 `{error, limit, resets_at, authenticated}`
  (`backend/app/routers/graphics.py`).
- Auth: magic link → HS256 session JWT in the `infoviz_session` cookie, SameSite=Lax, 7 days
  (`auth/session.py`, `config.py:34`). The cookie never travels cross-site, so signing in from the Splash
  page on GitHub Pages does not work today (`landing/inspiration.html:1328-1352`).
- CORS: the live API already answers `Access-Control-Allow-Origin: https://buriedsignals.github.io`;
  `allow_headers=["*"]` (`main.py:162`).
- Splash has no notion of journeys: `whereIs` is one linear, story-bound state machine
  (`skills/splash/scripts/where.mjs`). Precedent for a story-less skill: `newsroom-charter`.
- Splash credentials live in Engine's broker; the list is closed on both sides
  (`apps/goose/contract.mjs:2-6`, `installer/setup/engine-bridge.mjs:11-15`).

## Decisions

| # | Decision |
|---|---|
| D1 | Both surfaces: an agent skill and the web page. |
| D2 | Agent returns the raw list from a single query. |
| D3 | Anonymous by default; a signed-in account (10/day) on the web page, and in the agent under Indicator Labs only (see D9-D12). |
| D4 | Account sign-in = email + magic link + Connect + polling, on the web page; the agent receives the token through Indicator Labs (D9 revised). |
| D5 | Domain untouched. |
| D6 | Web page signs in the same way infoviz.design does, through the D4 flow and a Bearer token. |
| D7 | For the agent, the token is stored in Engine's credential broker as `INFOVIZ_TOKEN` (pasted in Indicator Labs). |
| D8 | The inspiration journey is independent of the storyboard. |

## Architecture

```
 journalist (agent, Goose under Indicator Labs)      journalist (browser)
        │                                                  │
 Splash MCP  search_inspiration                     landing/inspiration.html
   ├─ bsig keys status INFOVIZ_TOKEN                  ├─ start → Connect → poll → Bearer (localStorage)
   ├─ stored → bsig run splash inspiration-search     └─ "Copy token for Indicator Labs"
   │            (Engine injects INFOVIZ_TOKEN)                     │ paste
   └─ else → direct anonymous search                               ▼
        │                                           Indicator Labs → Connected services
        ▼                                           → Infoviz account → Enter token (Engine broker)
 infoviz back-end (HF Space, API only)
 /api/graphics/examples · /auth/token/* · /auth/status
```

### Part 1 — infoviz back-end (repo `~/Sites/Professional/infoviz`, dedicated branch)

Pull the Space first (local clone is behind). Work on a branch; **deploying to the Space requires Rémy's
explicit go.**

Remove:
- the Node build stage, the SPA copy and the `env.js` injection from `Dockerfile`;
- the SPA mount and `SPAStaticFiles` from `main.py`; the `frontend/` directory;
- `app/mcp/`, the `mcp` dependency, the MCP mount and `MCP_ENABLED` setting, the OAuth token cleanup task
  in the lifespan, and `tests/test_mcp_*`.

Keep: search, rate limiting, the weekly scraper and its admin routes, `/api/ready`, `/api/scraper/status`.

Add — **token flow (D4)**:
- `POST /auth/token/start {email}` → sends the existing magic-link email and returns
  `{request_id, poll_interval, expires_at}`. The link carries the request id. Same send-rate protections as
  `/auth/send-link`.
- The emailed link (`GET /auth/token/confirm?token=…`, a single-use magic-link JWT of type
  `token_request` carrying only the request id's hash) only renders a "Connect this app?" page with a
  **Connect** button; it confirms nothing, because mail scanners prefetch links and a GET that confirms
  would hand the token to whoever started the request. `POST /auth/token/confirm` (the button) consumes
  the link and marks the request confirmed, then shows "You're connected — you can close this tab".
  The email has its own wording ("an app asked to connect… ignore if this wasn't you"). The cookie
  `/auth/verify` is untouched.
- Pending requests are stored in a new `token_requests` table (migration `003_token_requests.sql`, RLS on,
  no grant to `anon`/`authenticated` — it holds emails). Applying it to Supabase requires Rémy's go.
- `POST /auth/token/poll {request_id}` → `202 {status:"pending"}` until confirmed, then
  `200 {token, email, expires_at}` **exactly once** (the request is consumed), `410 {error:"expired_or_used"}`
  when expired or consumed, `422` for an id outside 16–128 characters. POST, not GET: the request id is a
  credential and must not appear in access logs. Pending requests expire after 15 minutes.
- Query strings of `/auth/` paths are redacted from the access log (the confirm link carries a JWT with the email).
- No revocation: signing out only forgets the token client-side; it stays valid until it expires (90 days).
  Rotating `JWT_SECRET` is the only revocation and also ends every cookie session. Accepted for a credential
  that only lifts the quota from 5 to 10 searches a day.
- Other bodies clients must handle: `/auth/token/start` answers `429 {error:"<sentence>"}` (send limits),
  `500 {error}` (email not sent), `422 {detail:[…]}` (invalid email).
- The token is a JWT signed with `JWT_SECRET`, `type: "api"`, 90-day expiry, carrying only the email.
- `get_current_user` accepts `Authorization: Bearer <token>` (type `api`) in addition to the cookie; the
  signed-in quota keys on the email hash as today.
- `GET /auth/status` answers for a Bearer token too (used as the credential probe, see Part 2).
- A request carrying an invalid or expired Bearer gets `401 {"error":"invalid_token"}` from search and
  `/auth/status` — never a silent anonymous downgrade, so the client knows to reconnect.
- CORS: the live preflight already admits `authorization` from `https://buriedsignals.github.io`
  (measured 2026-09-13, answered by the HF proxy). The app adds that origin to `allowed_origins` and exposes
  the `X-RateLimit-*` headers itself, so the behaviour no longer depends on the proxy.

Now-orphaned but left in place (no scope creep): cookie login routes, `/api/newsletter/subscribe`.

Known downstream effect: `vizualisation-skill/agents/viz-curator.md` calls the MCP `search` tool first and
already falls back to the HTTP API.

### Part 2 — Engine credential (repo `buriedsignals/engine`)

- New credential ID `INFOVIZ_TOKEN`, policy `authenticated-account-request` + `validate-before-atomic-replacement`,
  validated by `GET https://infoviz.design/auth/status` with the Bearer (the Datawrapper `/v3/me` pattern).
  The validator must require `200` **and** `authenticated === true`: `/auth/status` without a Bearer also
  answers 200 (anonymous), and an invalid Bearer answers `401 {error:"invalid_token"}`.
Decided 2026-09-14/15 (Rémy):
- **D9 (revised 2026-09-15)** — the journalist gets the token from the **Splash inspiration page**, already signed in
  there by email + Connect, with a **"Copy token for Indicator Labs"** button, and pastes it into **Indicator Labs →
  Connected services → Infoviz → Enter token…** — the paste prompt Indicator Labs already has for Datawrapper.
  Replaces the earlier "Connect button inside Indicator Labs": that needed a new Go email flow and a new desktop UI in
  Engine for a step done once every 90 days.
- **D10** — self-installs without Engine stay **anonymous** in the agent (no `INFOVIZ_TOKEN` environment variable).
- **D11 (superseded)** — no generic "email-flow" acquisition in Engine; `INFOVIZ_TOKEN` is an ordinary paste record.
- **D12 (2026-09-15)** — the agent reaches the account through a **`search_inspiration` tool on the existing Splash MCP
  server** (`apps/goose/server.mjs`), which already runs with the Engine path and the journalist's real home and
  talks to Engine through `installer/setup/engine-bridge.mjs`. The skill's command stays anonymous.

Measured on Engine `origin/main` 52fed4f and Splash (why):
- Credentials reach Splash only through `bsig run splash <op>` with a per-operation allowlist
  (`bsig/internal/run/splash.go`); a credential is mandatory for an operation that declares it.
- Engine gives `SPLASH_BSIG_PATH` and `SPLASH_ENGINE_HOME` **only** to the Splash MCP server (`PrepareSplashMCP`,
  `splash.go:305-313`); `bsig run splash --agent` and a host's shell tool get neither, so a skill command run by the
  agent cannot reach Engine or the keychain.
- `engineEnvironment` in `engine-bridge.mjs` drops loader hooks and credential-shaped variables and restores `HOME`
  from `SPLASH_ENGINE_HOME`; `invokeEngine(bsigPath, args, stdin)` returns `{events, exitCode}`.
- The desktop's Splash "Connected services" rows come from `SPLASH_KEY_IDS` and already render the paste prompt
  (`renderer-product-controls.tsx` `CredentialControl`).

#### Part 2a — Engine (`buriedsignals/engine`) — the small change

- **Registry** (`bsig/internal/keys/registry.go`): `INFOVIZ_TOKEN` — `StorageRecord`, `SensitivitySecret`,
  `ValidatorPolicy: "authenticated-account-request"`, `ReplacementBehavior: "validate-before-atomic-replacement"`,
  `BaseURL: "https://infoviz.design"`, `ValidateRecord: ValidateInfovizRecord`; name "Infoviz account", purpose
  "Raises Splash inspiration searches from 5 to 10 a day.", capability "Splash inspiration search", required
  permissions ["A signed-in Infoviz account"], acquisition URL `https://splash.buriedsignals.com/inspiration.html`.
- **Validator** `ValidateInfovizRecord` (`validators.go`): rejects any validation context; `GET {base}/auth/status`
  with the Bearer via `providerGET`; valid only on 200 **and** `authenticated === true`; one verified dimension.
- **Operation** `inspiration-search`: credentials `[INFOVIZ_TOKEN]`, provider timeout, request `{parameters:{query}}`
  with a non-empty query ≤ 1000 characters and no story fields; `validateSplashOperationRequest` case;
  `execpolicy/policy.go` allowlist.
- **Desktop**: `INFOVIZ_TOKEN` in `RECORD_KEY_IDS` and `SPLASH_KEY_IDS` (+ pinned test); the contracts test's allowlist
  of registry acquisition URLs gains the inspiration page. No new UI.
- **Tests**: validator, pinned ID lists (`keys_test.go`, `keys_verb_test.go`), Splash operation tables
  (`splash_test.go`), desktop list tests. Precedent change set: commit `28e2c3e`.
- **Catalog**: `bsig/catalog/catalog.json` pins a Splash commit that contains Part 2b-1 (re-signed minisig, Tom).
- **Delivery**: a branch of the local Engine clone → a PR to `buriedsignals/engine` reviewed by Tom → a signed
  Indicator Labs release triggered by Tom. **Nothing is pushed to `buriedsignals/engine` without Rémy's explicit go.**

#### Part 2b — Splash

**2b-1 — safe before the Engine release**:
- Already built and kept (2026-09-15): `search.mjs` optional `token` (Bearer, a blank token is no token) and reason
  `invalid-token`; `format.mjs` reconnect sentence ("Your Infoviz account needs reconnecting: Indicator Labs →
  Connected services → Infoviz → Reconnect." — reworded 2026-09-15 to "Your Infoviz account needs a new token: sign in on
  https://splash.buriedsignals.com/inspiration.html, copy the token, then Indicator Labs → Connected services → Infoviz
  account → Replace token…"), `engine-failed` sentence (closed detail: "it took too long" / "Indicator Labs reported an
  error") and `accountNeedsReconnect` prefix;
  `sealed-search.mjs` (bounded `{query}`, `INFOVIZ_TOKEN`, one anonymous retry on `invalid-token` flagged
  `accountNeedsReconnect`); `run-operation.mjs` `inspiration-search` (query 1-1000 after trim → sealed entry).
- Removed: `skills/inspiration/scripts/managed.mjs`, `engine.mjs` and their tests (they duplicated the bridge
  without its environment rules). `cli.mjs` calls `searchInspiration` directly (anonymous).
- **MCP tool** `search_inspiration({ query })` on the Splash MCP server:
  - Engine installation (`SPLASH_BSIG_PATH` set): `invokeEngine(bsigPath, ["keys","status","INFOVIZ_TOKEN"])`; if the
    terminal result says `stored: true` → `invokeEngine(bsigPath, ["run","splash","inspiration-search"],
    {"parameters":{"query"}})` and the result parsed from the run's `data.stdout`; otherwise (not stored, unknown
    ID on an older Engine, any failure before the run) → the direct anonymous search. Once the run has started, a
    failure is `engine-failed` and nothing searches again.
  - Self-install (no `SPLASH_BSIG_PATH`): the direct anonymous search.
  - Returns `formatInspiration(result)` as text plus the structured result; the tool description says to pass only
    the journalist's subject, never a credential, and not to retry or run the search another way if it fails.
  - Engine redacts every emitted line with `(?:cj_|on_|sk-|fw_)[A-Za-z0-9_-]{8,}`, which ordinary URLs and titles
    match (`flood-risk-map…`). The sealed entry therefore prints `{"b64": base64(JSON result)}` (standard base64 has
    no `_` or `-`) and the MCP service decodes it before the shape check.
  - Timeouts: key status 10 s, run 40 s (together ≤ 50 s, under an MCP client's 60 s); an `engine-failed` detail is one of "it took too long" / "Indicator Labs
    reported an error", never Engine's raw text.
  - The decision lives in `apps/goose/inspiration.mjs` with `invokeEngineFn` and `searchFn` injected; tests never
    spawn a process. The bridge's `status()` is not used: it refuses IDs outside `CREDENTIAL_IDS` until 2b-2.
- `skills/inspiration/SKILL.md`: when the host exposes the Splash tool `search_inspiration`, call it with the
  subject (it uses a connected Indicator Labs account); otherwise run `cli.mjs` (anonymous). Nothing about the
  account is done or said in chat.
- **Web page** (`landing/inspiration.html`): when signed in, a **"Copy token for Indicator Labs"** button next to Sign
  out; it copies `account.token` to the clipboard (never shows it) and confirms "Copied. Paste it in Indicator Labs →
  Connected services → Infoviz account → Enter token…". The token is never rendered in the page. The button stays
  hidden behind `INDICATOR_LABS_ACCEPTS_INFOVIZ = false` until an Indicator Labs release stores `INFOVIZ_TOKEN`.

**2b-2 — only once the Engine release is live**:
- `INFOVIZ_TOKEN` in `apps/goose/contract.mjs` `CREDENTIAL_IDS`, `installer/setup/engine-bridge.mjs`
  `CREDENTIAL_POLICIES`, `apps/goose/self-managed.mjs` `PROVIDERS` (self-install row: "Available with Indicator
  Labs only"), `installer/setup/legacy-env.mjs`, and the tests that pin those lists. Not in `.env.example`
  (self-installs stay anonymous). No preflight capability (the studio's Connected services row covers status).
- `landing/inspiration.html`: `INDICATOR_LABS_ACCEPTS_INFOVIZ = true` (shows the copy button).

### Part 3 — `inspiration` skill (Splash), anonymous

Measured during planning (2026-09-13), and binding on the split between Part 3 and Part 2:
- Engine hands credentials only to `bsig run splash <op>` operations, each with its own allowlist
  (`bsig/internal/run/splash.go`); agent and MCP modes receive none. A skill script run by the agent
  cannot read `INFOVIZ_TOKEN` from its environment.
- Adding `INFOVIZ_TOKEN` to Splash's `CREDENTIAL_IDS` before Engine registers it makes the bridge report
  `engine-outdated` for **every** credential (`engine-bridge.mjs` `normalizedListContract`).
- `no-cross-skill-imports.test.ts` forbids a skill script from importing `installer/` or another skill, so a
  `connect.mjs` inside the skill cannot reach the Engine bridge.

So Part 3 ships the **anonymous** journey only; everything account-related in the agent moves to Part 2.

`skills/inspiration/`
- `SKILL.md` — when to use (the journalist wants to see what has been done on a subject, with or without
  intent to produce), what it returns, what it never does (no story dir, no reformulation loop, no gate).
- `scripts/search.mjs` — one `POST /api/graphics/examples {query}`; injectable `fetchFn`, one deadline over
  request and body, explicit User-Agent. Returns a never-throwing result:
  `{ok:true, query, items:[{title, source, date, url, image}], quota:{limit, remaining, resetsAt}}` or
  `{ok:false, reason, …}` with `reason` in `empty-query | query-too-long | limit-reached | unexpected-response | unreachable`.
  - 429 → `limit-reached` with the reset time.
  - Empty list → said honestly; no automatic retry with other words.
- `scripts/format.mjs` — the words the journalist reads: a numbered list (title linked, newsroom, date), the
  quota left, or the plain reason it could not search.
- Routing: one line in `## When to use` of `skills/splash/SKILL.md` sends "what has already been done on X"
  to `inspiration` without creating a story.
- Hand-kept lists and counts: `.agents/skills/inspiration` symlink, `README.md` (table and the two "16 skills"
  counts), `llms.txt`, `llms_full.txt` (inventory and count), `tests/journalist-install-cta-check.sh` (the
  pinned count), `landing/docs/index.html` (the skills grid and "sixteen skills").

### Part 4 — web page (`landing/inspiration.html`)

- Served in production from `https://splash.buriedsignals.com/inspiration.html` (Pages `CNAME`); that origin
  is added to the back-end's `allowed_origins` next to `https://buriedsignals.github.io`.
- The featured row's request already sends `Authorization: Bearer <Supabase anon key>`; the reader's token
  must never be sent there.

- Remove the MCP section (`#mcp`, lines 1169-1198), the header `.mcplink`, the `MCP` constant and the
  install snippets (`:1765` onward); replace them with an invitation to use the inspiration journey in the
  Splash agent.
- Replace cookie sign-in (`/auth/send-link`, `/auth/status` with `credentials:'include'`) by the D4 flow:
  email → "press Connect in the email" → tab polls (`POST /auth/token/poll`) → token kept in `localStorage` (read and written inside try/catch) → sent as Bearer;
  sign-out clears it. No credentialed cross-origin request remains, so the quota gauge stays readable.
- Rewrite the "THE WIRING" comment to describe the new wiring.
- Search call and the Supabase `get_random_posts` featured row are unchanged.

## Error handling

| Case | Agent | Web |
|---|---|---|
| Network / timeout | "infoviz is unreachable", no retry loop | inline error, search stays usable |
| 429 | reset time (no account talk in chat) | gauge at 0 + reset time + sign-in hint |
| 401 on Bearer (agent, Indicator Labs) | one anonymous call + "needs a new token" sentence | token cleared, back to anonymous |
| Poll `410` (web sign-in) | — | "link expired, send a new one" |
| Empty result | "nothing found for that subject" | empty state |

## Testing

- **infoviz back-end** (pytest, the repo's own runner): token flow — start, pending poll, confirm, single
  delivery, expiry, reuse refused; Bearer accepted by search and `/auth/status`; cookie path unchanged;
  app boots without `frontend/` and without `app/mcp/`.
- **Splash fast lane** (`bun test`): `search.mjs`, `format.mjs`, `sealed-search.mjs` with stubbed `fetchFn`/`searchFn`;
  `apps/goose/inspiration.mjs` with a faked `invokeEngineFn` that applies Engine's key-shape redaction to its output;
  the `search_inspiration` tool through an in-memory MCP client; the runner's `inspiration-search` case; routing line
  present. Each guard verified by mutation (break the code, watch the test go red).
- **Splash live lane** (`*.live.test.ts`): one real anonymous search, skipped explicitly without network.
- **Web**: browser-use against the page served locally, pointed at the branch back-end (local uvicorn or a
  preview Space): anonymous search, 429, sign-in, signed-in search, sign-out.
- Release baseline per `AGENTS.md`: `bun --no-env-file run test:all`, `matrix:check`, `survey:check`,
  `catalog:check`.

## Delivery order

One plan per part:

1. infoviz back-end — unblocks 3 and 4. (Executed; deploy gated.)
2. Agent account — 2b-1 (Splash, safe first) → 2a (Engine PR, Tom) → signed Indicator Labs release → 2b-2 (Splash).
3. `inspiration` skill, anonymous — works against the live API today.
4. Web page — its sign-in needs the deployed back-end; merge `feat-inspiration` to `main` (which publishes
   Pages) only after Part 1 is deployed.

## Risks

- Engine is Tom's repo and a signed release channel: part 2 may be slower than the rest.
- The anonymous quota is per IP behind Cloudflare/HF; header spoofing is unverified and out of scope.
- `JWT_SECRET` now signs two token types; the `type` claim is what separates them and must be checked on
  every decode.
