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
- `GET /auth/verify` for a token request marks the request as confirmed and renders a minimal HTML page
  ("You're connected — you can close this tab") instead of redirecting to `/`, which no longer exists.
- `GET /auth/token/poll?request_id=…` → `202 {status:"pending"}` until confirmed, then
  `200 {token, email, expires_at}` **exactly once** (the request is consumed), `410` when expired or consumed.
  Pending requests expire after 15 minutes.
- The token is a JWT signed with `JWT_SECRET`, `type: "api"`, 90-day expiry, carrying only the email.
- `get_current_user` accepts `Authorization: Bearer <token>` (type `api`) in addition to the cookie; the
  signed-in quota keys on the email hash as today.
- `GET /auth/status` answers for a Bearer token too (used as the credential probe, see Part 2).
- CORS: confirm `Authorization` is admitted by the preflight from the Splash origin; list it explicitly if
  the wildcard does not cover it.

Now-orphaned but left in place (no scope creep): cookie login routes, `/api/newsletter/subscribe`.

Known downstream effect: `vizualisation-skill/agents/viz-curator.md` calls the MCP `search` tool first and
already falls back to the HTTP API.

### Part 2 — Engine credential (repo `buriedsignals/engine`)

- New credential ID `INFOVIZ_TOKEN`, policy `authenticated-account-request` + `validate-before-atomic-replacement`,
  validated by `GET https://infoviz.design/auth/status` with the Bearer (the Datawrapper `/v3/me` pattern).
- Bump the Splash contract version as Engine requires.
- The actual file layout is read on `origin` during planning — the local clone (`rd-dev`, 0.1.3) is far
  behind `origin` (0.1.34).
- **Nothing is pushed to `buriedsignals/engine` without Rémy's explicit go** (and likely Tom's).

### Part 3 — `inspiration` skill (Splash)

`skills/inspiration/`
- `SKILL.md` — when to use (the journalist wants to see what has been done on a subject, with or without
  intent to produce), what it returns, what it never does (no story dir, no reformulation loop, no gate).
- `scripts/search.mjs` — one `POST /api/graphics/examples {query}`; injectable `fetchFn`, timeout, explicit
  User-Agent (Cloudflare refuses default UAs); adds `Authorization: Bearer` when `INFOVIZ_TOKEN` resolves.
  Returns `{items, quota:{limit, remaining, resetsAt, authenticated}}`.
  - 429 → a plain message with the reset time, and "connect your infoviz account for 10/day" when anonymous.
  - Empty list → said honestly; no automatic retry with other words.
  - 401 on a Bearer (expired or revoked) → falls back to one anonymous call and says the account needs
    reconnecting.
- `scripts/connect.mjs` — runs the D4 flow in its own process (asks for the email, calls `start`, polls),
  then hands the token to the Engine bridge's `replace` (`installer/setup/engine-bridge.mjs:553`). The token
  never enters the chat. Without Engine, it says so and the skill stays anonymous.

Splash wiring:
- `INFOVIZ_TOKEN` added to `CREDENTIAL_IDS` (`apps/goose/contract.mjs`), `CREDENTIAL_POLICIES`
  (`installer/setup/engine-bridge.mjs`) and `KEY_ALIASES` (`skills/splash/scripts/keys.mjs`), plus a
  `probeInfoviz` next to `probeDatawrapper`.
- Preflight: an `inspiration` capability, always open, reporting `anonymous · 5/day` or `account · 10/day`.
  A missing token never blocks.
- Routing: one line in `## When to use` of `skills/splash/SKILL.md` sends "what has already been done on X"
  to `inspiration` without creating a story.
- Hand-kept lists: `.agents/skills/inspiration` symlink, `README.md` skill table, `llms.txt`.

### Part 4 — web page (`landing/inspiration.html`)

- Remove the MCP section (`#mcp`, lines 1169-1198), the header `.mcplink`, the `MCP` constant and the
  install snippets (`:1765` onward); replace them with an invitation to use the inspiration journey in the
  Splash agent.
- Replace cookie sign-in (`/auth/send-link`, `/auth/status` with `credentials:'include'`) by the D4 flow:
  email → tab polls → token kept in `localStorage` (read and written inside try/catch) → sent as Bearer;
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

1. infoviz back-end — unblocks 3 and 4.
2. Engine credential — unblocks the account half of 3.
3. `inspiration` skill — its anonymous half can land before 2.
4. Web page.

## Risks

- Engine is Tom's repo and a signed release channel: part 2 may be slower than the rest.
- The anonymous quota is per IP behind Cloudflare/HF; header spoofing is unverified and out of scope.
- `JWT_SECRET` now signs two token types; the `type` claim is what separates them and must be checked on
  every decode.
