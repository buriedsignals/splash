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
- Engine side (measured on `origin/main` 52fed4f): registry entry in `bsig/internal/keys/registry.go`, a
  `ValidateInfovizRecord` in `validators.go` (pattern: `ValidateNavigator` / `providerGET`), the pinned ID lists
  in `keys_test.go` and `keys_verb_test.go`, the desktop lists (`desktop/src/shared/contracts.ts`
  `RECORD_KEY_IDS`, `renderer-journalist.ts` `SPLASH_KEY_IDS`), and a Splash operation that receives the
  token (`run/splash.go` `splashOperations`, `validateSplashOperationRequest`, `execpolicy/policy.go`).
  Precedent for the change set: commit `28e2c3e`. Reaching journalists needs a signed Indicator Labs release.
- Splash side, landing only once Engine knows the ID: `INFOVIZ_TOKEN` in `CREDENTIAL_IDS`, `CREDENTIAL_POLICIES`,
  `self-managed.mjs` `PROVIDERS`, `legacy-env.mjs`, their tests; an `inspiration-search` operation in
  `run-operation.mjs` so the agent's search runs through `bsig run splash` with the token; the account
  connection flow (email → Connect → poll → `replace`) living in `installer/` or `apps/goose/`, not in the skill;
  the preflight `inspiration` capability; the 401 → "reconnect" path in the skill.
- Engine already runs an email-confirmation flow for Navigator (`bsig auth login`, `internal/auth/devicecode.go`):
  Part 2's plan decides whether the infoviz connection reuses that shape inside Engine instead.
- **Nothing is pushed to `buriedsignals/engine` without Rémy's explicit go** (and likely Tom's).

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
2. Engine credential + agent account — Engine repo and the Splash account wiring described in Part 2.
3. `inspiration` skill, anonymous — works against the live API today.
4. Web page — its sign-in needs the deployed back-end; merge `feat-inspiration` to `main` (which publishes
   Pages) only after Part 1 is deployed.

## Risks

- Engine is Tom's repo and a signed release channel: part 2 may be slower than the rest.
- The anonymous quota is per IP behind Cloudflare/HF; header spoofing is unverified and out of scope.
- `JWT_SECRET` now signs two token types; the `type` claim is what separates them and must be checked on
  every decode.
