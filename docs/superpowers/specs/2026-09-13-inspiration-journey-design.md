# Inspiration journey — design

Date: 2026-09-13 · Branch: `feat-inspiration` (off `origin/main` @ `fefca2f7`)
Requested by Tom: move infoviz.design into Splash. Keep the infoviz back-end on Hugging Face, retire its
front-end and its MCP server, and give Splash a third journey — **inspiration** — next to the editorial
exchange and production.

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
| D3 | Anonymous by default; the journalist may connect an infoviz account at setup for the signed-in quota. |
| D4 | Account connection = email + magic link + polling (one flow for agent and web). |
| D5 | Domain untouched. |
| D6 | Web page signs in the same way infoviz.design does, through the D4 flow and a Bearer token. |
| D7 | The token is stored in Engine's credential broker as `INFOVIZ_TOKEN`. |
| D8 | The inspiration journey is independent of the storyboard. |

## Architecture

```
 journalist (agent)                journalist (browser)
        │                                   │
 skills/inspiration                landing/inspiration.html
   search.mjs ── Bearer? ──┐        ┌── Bearer? (localStorage)
   connect.mjs ── start/poll ─┐  ┌─ start/poll
        │                  │  │  │  │
        ▼                  ▼  ▼  ▼  ▼
   Engine broker        infoviz back-end (HF Space, API only)
   INFOVIZ_TOKEN        /api/graphics/examples · /auth/token/* · /auth/status
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
Decided 2026-09-14 (Rémy):
- **D9** — the journalist connects the account from **Indicator Labs** with a **Connect** button (email → press
  Connect in the email), the Navigator way. No token is ever pasted, copied or shown.
- **D10** — self-installs without Engine stay **anonymous** in the agent (no `INFOVIZ_TOKEN` environment variable).
- **D11** — Engine shape: a **generic "email-flow" acquisition** for record credentials, not an infoviz-specific
  auth verb. Infoviz is its first user.

Measured on Engine `origin/main` 52fed4f (why the shape is what it is):
- Navigator's flow (`bsig/internal/auth/devicecode.go`, `bsig auth start|poll`) reads the poll outcome from a
  body `status`; infoviz answers by HTTP code (202 / 200 / 410) with a POST poll — it cannot be reused as is,
  and `docs/packages/auth-standard.md` forbids a shared auth library.
- Credentials reach Splash only through `bsig run splash <op>` with a per-operation allowlist
  (`bsig/internal/run/splash.go`); a credential is mandatory for an operation that declares it.
- The desktop's Splash "Connected services" rows come from `SPLASH_KEY_IDS` and render a paste prompt
  (`renderer-product-controls.tsx` `CredentialControl`); Navigator has its own "Connect account" section.

#### Part 2a — Engine (`buriedsignals/engine`: `bsig` + desktop)

- **Registry** (`bsig/internal/keys/registry.go`): `INFOVIZ_TOKEN` — `StorageRecord`, `SensitivitySecret`,
  `ValidatorPolicy: "authenticated-account-request"`, `ReplacementBehavior: "validate-before-atomic-replacement"`,
  `BaseURL: "https://infoviz.design"`, a new acquisition field set to email-flow (existing entries: paste).
  Metadata: name "Infoviz account", purpose "Raises Splash inspiration searches from 5 to 10 a day.",
  acquisition URL `https://splash.buriedsignals.com/inspiration.html`.
- **Validator** `ValidateInfovizRecord` (`validators.go`): rejects any validation context; `GET {base}/auth/status`
  with the Bearer via `providerGET`; valid only on 200 **and** `authenticated === true`; one verified dimension.
- **Email-flow acquisition** — a small infoviz package (its own wire contract) behind a generic verb:
  - `bsig keys connect <ID> start <email>` → result `{flowId (opaque), expiresInSeconds, pollIntervalSeconds}`;
  - `bsig keys connect <ID> poll <flowId>` → `pending` | `connected` (the token was received and written through
    the record broker's `Replace`, which validates it) | `expired`; 429 / 5xx / network → still `pending`;
  - the token never appears on stdout, in events or logs (registered with the redactor on arrival);
  - bounded cadence (interval 1-60 s, lifetime ≤ 30 min, 30 s per request); no server-side cancel exists, so
    cancel only forgets the flow;
  - only IDs whose registry entry declares email-flow accept `connect`; `set`/`replace` stay refused paths for
    them from the desktop (Engine still accepts `replace` on stdin for tests and recovery).
- **Operation** `inspiration-search`: credentials `[INFOVIZ_TOKEN]`, provider timeout, request
  `{parameters:{query}}` with a non-empty query ≤ 1000 characters and no story fields; added to
  `execpolicy/policy.go`.
- **Desktop**: `INFOVIZ_TOKEN` in `RECORD_KEY_IDS` and `SPLASH_KEY_IDS`; the Splash "Connected services" row for an
  email-flow credential shows an email field and **Connect** / **Reconnect** instead of "Enter token…"; the main
  process holds the flow id (renderer gets only an opaque flow token, as for Navigator); the renderer schedules
  polls and also polls on window focus; copy: "Check your email and press Connect.", "Connected as {email hint}",
  "The link expired. Connect again."; "Check saved token" validates as for other records.
- **Tests**: the infoviz package (start, 202/200/410, 429/5xx retry, lifetime, redaction), the validator, pinned ID
  lists (`keys_test.go`, `keys_verb_test.go`), Splash operation tables (`splash_test.go`), desktop contracts and
  workflow tests; a release-runbook manual check "Infoviz Connect".
- **Catalog**: `bsig/catalog/catalog.json` pins a Splash commit that contains Part 2b-1 (re-signed minisig).
- **Delivery**: a branch of the local Engine clone → a PR to `buriedsignals/engine` reviewed by Tom → a signed
  Indicator Labs release triggered by Tom. **Nothing is pushed to `buriedsignals/engine` without Rémy's explicit go.**

#### Part 2b — Splash

**2b-1 — safe before the Engine release** (an Engine that does not know the ID simply leaves the agent anonymous):
- `skills/splash/scripts/run-operation.mjs`: `inspiration-search` in `OPERATION_IDS`; requires parameter `query`;
  runs `skills/inspiration/scripts/sealed-search.mjs` as a child (as `datawrapper-produce` does).
- `skills/inspiration/scripts/sealed-search.mjs`: bounded JSON on stdin `{query}`; reads `INFOVIZ_TOKEN`; searches
  with the Bearer; on `invalid-token` runs exactly one anonymous search and returns it with
  `accountNeedsReconnect: true`; prints the result JSON.
- `search.mjs`: optional `token` (Bearer), new reason `invalid-token` (401 with a token).
- `format.mjs`: when `accountNeedsReconnect`, first line "Your Infoviz account needs reconnecting: Indicator Labs →
  Connected services → Infoviz → Reconnect." then the anonymous list.
- Path choice inside the CLI (the agent still runs one command, `search.mjs --stdin`): if `SPLASH_BSIG_PATH` is set
  and `bsig --json keys status INFOVIZ_TOKEN` reports it stored → `bsig run splash inspiration-search` with the
  request JSON-encoded on stdin, and the result parsed from the run's `stdout`; otherwise (unset, not stored,
  unknown ID, any bsig failure) → the direct anonymous search. The spawning lives in its own module, injected in
  tests; no test spawns a process.
- `SKILL.md`: one line — with an Infoviz account connected in Indicator Labs, the same command uses it; nothing is
  done in chat.

**2b-2 — only once the Engine release is live**:
- `INFOVIZ_TOKEN` in `apps/goose/contract.mjs` `CREDENTIAL_IDS`, `installer/setup/engine-bridge.mjs`
  `CREDENTIAL_POLICIES`, `apps/goose/self-managed.mjs` `PROVIDERS` (self-install row: "Available with Indicator
  Labs only"), `installer/setup/legacy-env.mjs`, and the tests that pin those lists. Not in `.env.example`
  (self-installs stay anonymous). No preflight capability (the studio's Connected services row covers status).

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
| 429 | reset time + connect hint if anonymous | gauge at 0 + reset time + sign-in hint |
| 401 on Bearer | one anonymous call + "reconnect your account" | token cleared, back to anonymous |
| Poll `410` | "link expired, run connect again" | "link expired, try again" |
| Empty result | "nothing found for that subject" | empty state |

## Testing

- **infoviz back-end** (pytest, the repo's own runner): token flow — start, pending poll, confirm, single
  delivery, expiry, reuse refused; Bearer accepted by search and `/auth/status`; cookie path unchanged;
  app boots without `frontend/` and without `app/mcp/`.
- **Splash fast lane** (`bun test`): `search.mjs` and `connect.mjs` with stubbed `fetchFn` for every row of
  the error table; `probeInfoviz`; preflight capability; routing line present. Each guard verified by
  mutation (break the code, watch the test go red).
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
