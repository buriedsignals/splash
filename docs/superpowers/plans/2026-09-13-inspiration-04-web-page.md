# Inspiration 04 — the web page signs in with a token, and points to Splash instead of the MCP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `landing/inspiration.html` the gallery's front-end on the Splash site: search and featured row unchanged, the MCP install section replaced by an invitation to Splash's `inspiration` skill, and the cookie sign-in replaced by the email → Connect → poll token flow so a signed-in reader gets 10 searches a day.

**Architecture:** A single static HTML file with inline CSS and two inline scripts. The page keeps an in-memory `account` (`{token, email, expires_at}`), mirrored to `localStorage` inside try/catch. Sign-in posts to `/auth/token/start`, then polls `/auth/token/poll` every `poll_interval` seconds until the API hands the token over once. Searches send `Authorization: Bearer <token>`; a 401 forgets the token and repeats the search anonymously. The back-end gets one CORS addition for the page's real origin.

**Tech Stack:** Plain HTML/CSS/JS (no build, no dependency). Back-end addition in Python/FastAPI (pytest). Verification with browser-use against the branch back-end run locally.

**Spec:** `docs/superpowers/specs/2026-09-13-inspiration-journey-design.md` — Part 4 (and Part 1 for the HTTP contract).

## Global Constraints

- Splash worktree: `/Users/rmdms/Sites/Professional/splash/feat-inspiration`, branch `feat-inspiration`. infoviz repo: `~/Sites/Professional/infoviz`, branch `feat/api-only-token-sign-in`. **Never push, never merge** either (merging `feat-inspiration` to `main` publishes the page through Pages, which must wait for the back-end deploy — spec Delivery order).
- Code, comments, copy, commit messages in English. No mention of Claude/Anthropic; commits carry no trailer.
- HTTP contract (back-end branch, spec Part 1):
  - `POST /auth/token/start {email}` → `200 {request_id, poll_interval, expires_at}` | `429 {error}` | `500 {error}` | `422 {detail}`
  - `POST /auth/token/poll {request_id}` → `202 {status:"pending"}` | `200 {token, email, expires_at}` (once) | `410 {error:"expired_or_used"}`
  - `GET /auth/status` with `Authorization: Bearer` → `200 {authenticated, email, queries_used, queries_remaining, daily_limit, resets_at}` | `401 {error:"invalid_token"}`
  - `POST /api/graphics/examples {query}` with optional Bearer → `200 {query, items}` + `X-RateLimit-*` | `429 {error, limit, resets_at, authenticated}` | `401 {error:"invalid_token"}`
- Quotas: 5 a day anonymous, 10 a day signed in.
- The reader's token is sent only to `https://infoviz.design`; never to Supabase (the featured row's `Authorization` header is the Supabase anon key and stays so).
- `localStorage` key: `infoviz.token`. Every read and write inside try/catch; the page works without storage.
- No request carries cookies (`credentials` is never `include`).
- The landing has no automated test lane (`scripts/test-lanes.mjs` skips `landing`); verification is Task 4's browser run. Desktop first; mobile width is checked only after desktop passes.

---

### Task 1: The back-end admits the page's real origin

**Files (infoviz repo):**
- Modify: `backend/app/config.py` (`allowed_origins`)
- Test: `backend/tests/test_api_only.py` (append)

**Interfaces:**
- Produces: CORS preflight from `https://splash.buriedsignals.com` allowed with `authorization` and `content-type` headers.

- [ ] **Step 1: Append the failing test** to `backend/tests/test_api_only.py`

```python
SPLASH_SITE_ORIGIN = "https://splash.buriedsignals.com"


def test_splash_site_origin_may_send_a_bearer():
    from app.main import app
    response = TestClient(app).options(
        "/auth/token/start",
        headers={
            "Origin": SPLASH_SITE_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == SPLASH_SITE_ORIGIN
    assert "authorization" in response.headers["access-control-allow-headers"].lower()
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd ~/Sites/Professional/infoviz/backend && .venv/bin/python -m pytest tests/test_api_only.py::test_splash_site_origin_may_send_a_bearer -q -p no:cacheprovider`
Expected: FAIL (preflight answers 400: origin not allowed).

- [ ] **Step 3: Add the origin** — in `backend/app/config.py`, in `allowed_origins`, after the line `"https://buriedsignals.github.io",  # Splash web page (inspiration)` add:

```python
        "https://splash.buriedsignals.com",  # Splash site, where the inspiration page is served
```

- [ ] **Step 4: Run the tests**

Run: `.venv/bin/python -m pytest tests/test_api_only.py -q -p no:cacheprovider` then the full suite `.venv/bin/python -m pytest tests/ -q -p no:cacheprovider`
Expected: PASS; full suite 225 passed, 0 failed.

- [ ] **Step 5: Commit (infoviz repo)**

```bash
cd ~/Sites/Professional/infoviz
git add backend/app/config.py backend/tests/test_api_only.py
git commit -m "fix(cors): admit the Splash site, where the inspiration page is served"
```

---

### Task 2: Splash replaces the MCP section

**Files:**
- Modify: `landing/inspiration.html`

**Interfaces:**
- Produces: `section#agent` (ink) in place of `section#mcp`; the hero pill `a.mcplink` points to `#agent`; no element or script references `#mcp`, `#mcmd`, `#mhint`, `#mcopy`, `#msign`, `.mtabs`, `CMDS` or the `MCP` constant.

- [ ] **Step 1: The hero pill** — replace

```html
    <a class="mcplink" href="#mcp">
```

with

```html
    <a class="mcplink" href="#agent">
```

and in the same element replace the text line `      Use as MCP` with `      Use in Splash`.

- [ ] **Step 2: The section** — replace the whole block from `<!-- ===================== THE AGENT ===================== -->` through the closing `</section>` of `section.mcp#mcp` (currently lines 1168-1198) with:

```html
<!-- ===================== THE AGENT ===================== -->
<section class="mcp on-ink arm" id="agent">
  <div class="mstage">
    <div class="up">
      <div class="eye"><i></i>In Splash</div>
      <h2>Ask your agent what newsrooms already made</h2>
      <p class="mlede">Splash's inspiration skill runs this same search from inside
      your agent. Name a subject and it brings back what newsrooms have published on
      it — no story to open, nothing to produce.</p>
    </div>
    <div class="up">
      <p class="mhint">Install Splash, then ask your agent for inspiration on a subject.
      Each search counts against the same daily allowance as this page.</p>
      <a class="btn" href="docs/">How Splash works</a>
    </div>
  </div>
</section>
```

- [ ] **Step 3: The section's CSS** — replace the block from the comment line `/* ===================================================================` that opens `THE AGENT — ink.` (currently line 701) through `@media (max-width:900px){ .mstage{grid-template-columns:1fr} }` (currently line 740) with:

```css
  /* ===================================================================
     THE AGENT — ink.

     The page's second argument: the same search, run from inside the
     journalist's own agent by Splash's inspiration skill.
     =================================================================== */
  .mcp{padding:var(--vs) var(--gut)}
  .mstage{max-width:var(--max);margin:0 auto;
          display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);
          gap:clamp(30px,5vw,90px);align-items:start}
  .mcp h2{margin:clamp(18px,2.6vh,30px) 0 0;font-size:clamp(28px,4.2vw,62px);max-width:15ch}
  .mcp p.mlede{margin:clamp(16px,2.4vh,26px) 0 0;max-width:46ch;
               font-size:clamp(13.5px,1.2vw,16px);line-height:1.6;opacity:.58}
  .mhint{margin:14px 0 0;font-size:12px;line-height:1.6;opacity:.5}
  .mcp .btn{margin-top:clamp(17px,2.4vh,25px)}
  @media (max-width:900px){ .mstage{grid-template-columns:1fr} }
```

- [ ] **Step 4: The MCP rules inside shared media queries** — delete exactly these lines (each is a single rule inside a larger block; keep the blocks):
  - in `@media (max-width:560px)`: the comment `/* The command is the one place a long unbroken token exists. */` and `.mbox pre{font-size:11.5px;padding:16px 48px 16px 16px}`
  - in `@media (hover:none)`: `.mtabs button{min-height:44px;padding:8px 18px}` and `.mcopy{width:40px;height:40px}`
  - in `@media (max-width:640px)`: replace `.mhint,.masauth{font-size:12.5px}` with `.mhint{font-size:12.5px}`

Keep `.mcp h2{font-size:clamp(28px,8.4vw,44px)}` in `@media (max-width:860px)` (the section keeps its class).

- [ ] **Step 5: The MCP script** — delete:
  - the line `  const MCP   = API + '/mcp/';`
  - the whole block from `  /* -------------------------------------------------------------- the MCP */` through the end of the `$('mcopy').addEventListener('click', async () => { … });` handler (currently lines 1762-1800)
  - the handler

```js
  $('msign').addEventListener('click', () => openModal(
    'Sign in to use MCP',
    'Enter your email to authenticate with Claude Code or Codex.'));
```

- [ ] **Step 6: Check nothing still points at the MCP**

```bash
cd /Users/rmdms/Sites/Professional/splash/feat-inspiration
grep -n -E "#mcp|id=\"mcp\"|mcmd|mhint\"|mcopy|msign|mtabs|masauth|mbox|CMDS|'/mcp/'|Use as MCP|Claude Code|Codex" landing/inspiration.html
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add landing/inspiration.html
git commit -m "feat(landing): the inspiration page points to Splash's skill instead of the MCP server"
```

---

### Task 3: Sign in with a token

**Files:**
- Modify: `landing/inspiration.html`

**Interfaces:**
- Consumes: the HTTP contract in Global Constraints.
- Produces (script scope): `account` (in-memory `{token, email, expires_at}` or `null`), `loadAccount()`, `saveAccount(next)`, `authHeaders()`, `drawAccount()`, `refreshAccount()`; DOM `#acct`, `#aemail`, `#aout`.

- [ ] **Step 1: The wiring comment and constants** — replace the whole comment block from `  /* ===================================================================== *` / `   * THE WIRING.` through its closing `   * ===================================================================== */` with:

```js
  /* ===================================================================== *
   * THE WIRING.
   *
   * Every request goes to the live infoviz backend, cross-origin, and none
   * of them carries a cookie. Three things follow:
   *
   * 1. THE QUOTA IS READABLE. Requests go without credentials, so the
   *    `X-RateLimit-*` headers the API exposes stay visible to this page.
   *
   * 2. THE ACCOUNT IS A BEARER TOKEN. Signing in emails a link; the reader
   *    presses Connect there while this page polls `/auth/token/poll` until
   *    the API hands the token over, once. It is kept in localStorage and
   *    sent as `Authorization: Bearer`. A 401 means it expired or was
   *    refused: the page forgets it and carries on anonymously.
   *
   * 3. THE FEATURED ROW COMES STRAIGHT FROM POSTGREST. One `fetch` with the
   *    public anon key calls `get_random_posts`. Its `Authorization` header
   *    is that anon key, never the reader's token.
   * ===================================================================== */
```

Then replace the two lines

```js
  const SAME = location.origin === API;
  const CRED = SAME ? 'include' : 'omit';
```

with

```js
  const TOKEN_KEY = 'infoviz.token';
```

- [ ] **Step 2: The account state and helpers** — replace the state line

```js
  let limit = 5, left = null;
```

with

```js
  let limit = 5, left = null;
  let account = null;    // {token, email, expires_at} once signed in
  let polling = 0;       // bumps on every sign-in, so a stale poll loop stops itself

  /* ---------------------------------------------------------- the account */
  /* The account lives in this browser only. Storage can be refused (private
     windows, blocked site data); then the sign-in lasts as long as the page. */
  const loadAccount = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
      const live = saved && typeof saved.token === 'string' && saved.token
        && !(saved.expires_at && Date.parse(saved.expires_at) <= Date.now());
      account = live ? saved : null;
    } catch { account = null; }
  };
  const saveAccount = (next) => {
    account = next;
    try {
      if (next) localStorage.setItem(TOKEN_KEY, JSON.stringify(next));
      else localStorage.removeItem(TOKEN_KEY);
    } catch { /* storage refused: nothing to do, `account` still holds it */ }
    drawAccount();
  };
  const authHeaders = () => (account ? { 'Authorization': 'Bearer ' + account.token } : {});
  const drawAccount = () => {
    $('acct').hidden = !account;
    $('aemail').textContent = account ? 'Signed in as ' + account.email : '';
  };
```

- [ ] **Step 3: The account line in the hero bar** — in `div.hbar`, immediately after the closing `</div>` of `div.quota#quota`, add:

```html
    <div class="quota" id="acct" hidden>
      <span id="aemail"></span>
      <button type="button" id="aout">Sign out</button>
    </div>
```

- [ ] **Step 4: No sign-in offer to a reader who is signed in** — in `drawQuota`, inside the `if (left <= 0) {` branch, replace

```js
      $('qsign').hidden = false;
```

with

```js
      $('qsign').hidden = Boolean(account);
```

- [ ] **Step 5: The search sends the token** — replace the whole `async function search(q) { … }` (from `  async function search(q) {` through its closing `  }`, currently lines 1588-1642) with:

```js
  const ask = (q) => fetch(API + '/api/graphics/examples', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ query: q }),
  });

  async function search(q) {
    if (busy) return;
    busy = true;
    $('sbtn').disabled = true;
    searched = true;
    page = 1;
    seen = 0;
    $('rkicker').textContent = 'Search';
    $('rtitle').textContent = '“' + q + '”';
    loading('Searching the gallery');

    try {
      let res = await ask(q);
      /* A refused token is forgotten, and the search happens anyway. */
      if (res.status === 401 && account) {
        saveAccount(null);
        limit = 5;
        res = await ask(q);
      }
      readLimits(res);

      if (res.status === 429) {
        const d = await res.json().catch(() => ({}));
        limit = d.limit || limit; left = 0; drawQuota();
        all = [];
        if (account) {
          box('ink', 'Limit reached',
              limit + ' searches a day, and that was the last.',
              'The count resets at midnight UTC.');
          return;
        }
        box('ink', 'Limit reached',
            limit + ' searches a day, and that was the ' + (limit === 5 ? 'fifth' : 'last') + '.',
            'The count resets at midnight UTC. A free account raises it to '
            + (limit === 5 ? 10 : limit) + ' a day.',
            '<button class="btn" type="button" id="signin">Sign in for more</button>');
        const s = $('signin');
        if (s) s.addEventListener('click', () => openModal(
          'Sign in for more searches',
          'Get ' + (limit === 5 ? 10 : limit) + ' daily searches with a free account.'));
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || d.detail || 'The gallery did not answer.');
      }

      const data = await res.json();
      all = Array.isArray(data.items) ? data.items : [];
      render();
    } catch (err) {
      all = [];
      box('ink', 'No answer', 'The gallery did not come back.',
          esc(err.message || 'The request failed before it reached infoviz.design.'),
          '<button class="btn" type="button" id="retry">Try again</button>');
      const r = $('retry');
      if (r) r.addEventListener('click', () => search(q));
    } finally {
      busy = false;
      $('sbtn').disabled = false;
    }
  }
```

- [ ] **Step 6: The modal markup** — in `div.veil#veil`:
  - replace `<p id="vsub">Enter your email to receive a sign-in link.</p>` with
    `<p id="vsub">Enter your email. Press Connect in the email we send, and this page signs in.</p>`
  - delete the two-line paragraph `<p class="mwarn" id="vwarn" hidden>The link signs you in on infoviz.design. The` … `session cookie is issued SameSite=Lax, so it does not follow you back to this page yet.</p>`

In the CSS, delete the `.mwarn` rule and the three-line comment above it (`/* The one honest line on this panel: today the session lands on` … `travel to another origin. */`).

- [ ] **Step 7: The modal, sign-in and account script** — replace everything from `  /* ------------------------------------------------------------ the modal */` through the end of `async function status() { … }` (the block that ends with `    } catch { /* the gauge simply stays on what the headers said */ }` and its closing `  }`) with:

```js
  /* ------------------------------------------------------------ the modal */
  const veil = $('veil');
  const openModal = (heading, subtitle) => {
    if (heading) $('vh').textContent = heading;
    if (subtitle) $('vsub').textContent = subtitle;
    veil.setAttribute('data-open', '');
    $('vmail').focus();
  };

  $('qsign').addEventListener('click', () => openModal(
    'Sign in for more searches',
    'Get ' + (limit === 5 ? 10 : limit) + ' daily searches with a free account.'));

  /* Closing the panel does not stop a sign-in in progress: the reader may
     close it, open the email, press Connect, and this page still signs in. */
  const closeModal = () => {
    veil.removeAttribute('data-open');
    $('vmsg').hidden = true;
    $('vform').hidden = false;
  };
  $('vx').addEventListener('click', closeModal);
  veil.addEventListener('click', (e) => { if (e.target === veil) closeModal(); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && veil.hasAttribute('data-open')) closeModal();
  });

  const say = (kind, text) => {
    const msg = $('vmsg');
    msg.hidden = false;
    msg.className = 'mmsg ' + kind;
    msg.textContent = text;
  };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function waitForConnect(requestId, intervalSeconds, expiresAt, run) {
    const deadline = Date.parse(expiresAt) || (Date.now() + 15 * 60 * 1000);
    while (run === polling && Date.now() < deadline) {
      await wait(Math.max(1, Number(intervalSeconds) || 3) * 1000);
      if (run !== polling) return;
      let res;
      try {
        res = await fetch(API + '/auth/token/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_id: requestId }),
        });
      } catch { continue; }   // a dropped connection mid-wait is not an answer; ask again
      if (res.status === 202) continue;
      if (res.ok) {
        const d = await res.json();
        saveAccount({ token: d.token, email: d.email, expires_at: d.expires_at });
        say('ok', 'Connected as ' + d.email + '.');
        await refreshAccount();
        setTimeout(closeModal, 1500);
        return;
      }
      break;   // 410 or anything else: this sign-in is over
    }
    if (run !== polling) return;
    say('ko', 'The sign-in link expired. Send a new one.');
    $('vform').hidden = false;
  }

  $('vform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('vbtn');
    const run = ++polling;
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const res = await fetch(API + '/auth/token/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: $('vmail').value }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        say('ko', res.status === 422
          ? 'That email address does not look right.'
          : (d.error || 'Something went wrong.'));
        return;
      }
      $('vform').hidden = true;
      say('ok', 'Check your email and press Connect. This page signs in on its own.');
      waitForConnect(d.request_id, d.poll_interval, d.expires_at, run);
    } catch {
      say('ko', 'Network error. Please try again.');
    } finally {
      btn.disabled = false; btn.textContent = 'Send sign-in link';
    }
  });

  $('aout').addEventListener('click', () => {
    polling++;
    saveAccount(null);
    limit = 5; left = null; drawQuota();
  });

  /* ------------------------------------------------------- the auth probe */
  /* With a token, ask what it is worth today; a refused one is forgotten. */
  async function refreshAccount() {
    if (!account) return;
    try {
      const res = await fetch(API + '/auth/status', { headers: authHeaders() });
      if (res.status === 401) { saveAccount(null); limit = 5; left = null; drawQuota(); return; }
      if (!res.ok) return;
      const d = await res.json();
      if (d.daily_limit) limit = d.daily_limit;
      if (typeof d.queries_remaining === 'number') left = d.queries_remaining;
      drawQuota();
    } catch { /* the gauge stays on what the last search said */ }
  }
```

- [ ] **Step 8: Boot** — replace the boot line

```js
  featured(); status();
```

with

```js
  loadAccount(); drawAccount(); featured(); refreshAccount();
```

- [ ] **Step 9: Check what must be gone and what must be there**

```bash
cd /Users/rmdms/Sites/Professional/splash/feat-inspiration
grep -n -E "CRED|SAME|send-link|credentials|vwarn|mwarn|status\(\)" landing/inspiration.html
grep -c -E "auth/token/start|auth/token/poll|infoviz.token|refreshAccount\(\)" landing/inspiration.html
```

Expected: first command prints nothing; second prints a count ≥ 4.

- [ ] **Step 10: Commit**

```bash
git add landing/inspiration.html
git commit -m "feat(landing): sign in with an emailed Connect link and a Bearer token, forgotten when refused"
```

---

### Task 4: Verification in a real browser against the branch back-end

**Files:** none committed. Everything below lives in the session scratchpad (`$S`).

- [ ] **Step 1: Throwaway database with the migrations and a small corpus**

```bash
S="$TMPDIR/inspiration-web-e2e"; mkdir -p "$S"; rm -rf "$S/pg"
initdb -D "$S/pg" -U postgres --auth=trust >/dev/null
pg_ctl -D "$S/pg" -o "-p 55433 -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" -l "$S/pg.log" start && sleep 2
p() { psql -h 127.0.0.1 -p 55433 -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
p -c "CREATE ROLE anon; CREATE ROLE authenticated;"
p -f ~/Sites/Professional/infoviz/backend/app/db/migrations/001_auth_oauth_tables.sql
p -f ~/Sites/Professional/infoviz/backend/app/db/migrations/003_token_requests.sql
p <<'SQL'
CREATE TABLE posts (id SERIAL PRIMARY KEY, title TEXT, source_url TEXT, author TEXT, published_date TIMESTAMPTZ, image_url TEXT, type TEXT,
  fts tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(author,''))) STORED);
CREATE TABLE tags (id SERIAL PRIMARY KEY, name TEXT, type TEXT);
CREATE TABLE post_tags (post_id INT, tag_id INT, weight REAL);
INSERT INTO posts (title, source_url, author, published_date, image_url, type) VALUES
 ('Mapping the floods that swallowed Pakistan', 'https://example.org/floods-pakistan', 'Reuters Graphics', '2022-09-01', 'https://picsum.photos/seed/a/400/300', 'interactive'),
 ('How floods are getting worse in Europe', 'https://example.org/floods-europe', 'Financial Times', '2024-06-12', 'https://picsum.photos/seed/b/400/300', 'chart'),
 ('The rise of heatwaves, year by year', 'https://example.org/heat', 'The Guardian', '2023-07-20', 'https://picsum.photos/seed/c/400/300', 'chart');
SQL
```

- [ ] **Step 2: The branch back-end, with outbound email written to a file** (the only simulated part: no Resend key locally)

```bash
cat > "$S/run_local.py" <<'PY'
"""Local end-to-end runner: the real app, with outbound email captured to a file instead of Resend."""
import json
import os

import uvicorn

import app.auth.token_routes as token_routes
from app.main import app

OUTBOX = os.environ["E2E_OUTBOX"]


async def capture_email(to, subject, html, text=""):
    with open(OUTBOX, "a") as f:
        f.write(json.dumps({"to": to, "subject": subject, "html": html}) + "\n")
    return True


token_routes.send_email = capture_email
uvicorn.run(app, host="127.0.0.1", port=int(os.environ["E2E_PORT"]))
PY
cd ~/Sites/Professional/infoviz/backend
(env JWT_SECRET=local-e2e-secret-that-is-at-least-32-characters ENVIRONMENT=production \
  BASE_URL=http://127.0.0.1:10091 SUPABASE_CONNECTION=postgresql://postgres@127.0.0.1:55433/postgres \
  E2E_OUTBOX="$S/outbox.jsonl" E2E_PORT=10091 PYTHONPATH=. .venv/bin/python "$S/run_local.py" > "$S/server.log" 2>&1 &)
for i in $(seq 1 40); do curl -sf http://127.0.0.1:10091/api/ready && break; sleep 1; done
```

Expected: `{"status":"ready"}`.

- [ ] **Step 3: A copy of the landing pointed at that back-end, with an error trap**

```bash
rm -rf "$S/site" && cp -R /Users/rmdms/Sites/Professional/splash/feat-inspiration/landing "$S/site"
python3 - "$S/site/inspiration.html" <<'PY'
import sys
path = sys.argv[1]
page = open(path, encoding="utf-8").read()
old = "const API   = 'https://infoviz.design';"
assert page.count(old) == 1, "API constant not found exactly once"
page = page.replace(old, "const API   = 'http://127.0.0.1:10091';")
trap = "<script>window.__errors=[];addEventListener('error',e=>window.__errors.push(String(e.message)));addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));</script>"
page = page.replace("<head>", "<head>" + trap, 1)
open(path, "w", encoding="utf-8").write(page)
PY
(cd "$S/site" && python3 -m http.server 5173 --bind 127.0.0.1 > "$S/http.log" 2>&1 &)
```

The page is opened as `http://localhost:5173/inspiration.html` (the back-end admits `http://localhost:5173`).

- [ ] **Step 4: The browser run** (desktop viewport). Use `browser-use state` to find element indexes before each `click`/`input`. Record each observation in the ledger; take the three screenshots.

| # | Action | Must observe |
|---|---|---|
| 1 | `browser-use open http://localhost:5173/inspiration.html` | `browser-use eval "document.getElementById('mcp') === null && !!document.getElementById('agent')"` → `true`; the pill reads "Use in Splash" |
| 2 | wait 3 s | featured rows rendered (`document.querySelectorAll('#rlist li').length > 0`) — they come from the live Supabase RPC; if Supabase is unreachable record it and continue |
| 3 | search `floods` | 2 result rows; gauge text `4 queries left today` |
| 4 | search `heat` 4 more times | the last shows the "Limit reached" box with a "Sign in for more" button |
| 5 | click "Sign in for more", type `reporter@example.org`, submit | modal shows "Check your email and press Connect. This page signs in on its own."; no SameSite warning anywhere (`!document.getElementById('vwarn')`) |
| 6 | read the confirm link from `$S/outbox.jsonl`; `browser-use --session mail open <link>`; click **Connect** in that session | that tab shows "You're connected" |
| 7 | back in the default session, wait up to 8 s | modal said "Connected as reporter@example.org." then closed; `#acct` visible with "Signed in as reporter@example.org"; `JSON.parse(localStorage.getItem('infoviz.token')).email` → `reporter@example.org` |
| 8 | search `floods` | results render; gauge `9 queries left today` |
| 9 | reload the page | `#acct` still visible; gauge shows 9 after load |
| 10 | `browser-use eval "localStorage.setItem('infoviz.token', JSON.stringify({token:'nope',email:'x@example.org',expires_at:'2099-01-01T00:00:00Z'})); location.reload()"` then wait | `#acct` hidden; `localStorage.getItem('infoviz.token')` → `null` |
| 11 | sign in again (steps 5-7), then click **Sign out** | `#acct` hidden; storage `null`; gauge hidden |
| 12 | `browser-use eval "window.__errors"` | `[]` |
| 13 | screenshots | `$S/hero-signed-in.png` (after step 8), `$S/modal-waiting.png` (step 5), `$S/agent-section.png` (scroll to `#agent`) |

Then close both sessions: `browser-use close` and `browser-use --session mail close`.

- [ ] **Step 5: Mobile width, only after the desktop run passes** — reopen at a 390×844 viewport (e.g. `browser-use eval "window.resizeTo(390, 844)"` if supported, otherwise a new session with a mobile viewport option from `browser-use open --help`), and check: hero bar wraps without overlap between the gauge, the account line and the pill; the agent section stacks to one column; the modal fits. Screenshot `$S/mobile.png`.

- [ ] **Step 6: Clean up**

```bash
pkill -f "$S/run_local.py"; pkill -f "http.server 5173"
pg_ctl -D "$S/pg" stop -m fast
```

Report the observations table, the screenshots' paths, and any deviation.
