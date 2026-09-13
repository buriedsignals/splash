# Inspiration 01 — infoviz back-end, API only + token sign-in — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the infoviz Hugging Face app down to its API (no SvelteKit front-end, no MCP server) and add an email + magic link + polling sign-in that hands a 90-day Bearer token to clients that cannot hold the session cookie.

**Architecture:** One FastAPI process keeps search, rate limiting and the scraper. A new `token_requests` table holds pending sign-ins; `/auth/token/start` emails a single-use link, `/auth/token/confirm` marks the request confirmed, `/auth/token/poll` hands the token over exactly once. `get_current_user` reads `Authorization: Bearer` (JWT `type: "api"`) before the cookie, and an invalid Bearer is answered with 401, never downgraded to anonymous.

**Tech Stack:** Python 3.11, FastAPI 0.115, PyJWT, asyncpg (Supabase Postgres), pytest + pytest-asyncio (`asyncio_mode = "auto"`), Docker on HF Spaces.

**Spec:** `docs/superpowers/specs/2026-09-13-inspiration-journey-design.md` — Part 1 (in the Splash repo, worktree `splash/feat-inspiration`).

## Global Constraints

- Repo: `~/Sites/Professional/infoviz` (remote `origin` = the HF Space `tomvaillant/infoviz`). All work on branch `feat/api-only-token-sign-in` created from `origin/main` (`cf6b529`). **Never push to `origin`** — pushing deploys the Space. Deployment is Task 7 and requires Rémy's explicit go.
- Run every command from `~/Sites/Professional/infoviz/backend` unless a step says otherwise.
- Code, comments, commit messages in English. No mention of Claude/Anthropic anywhere (commits included, no co-author trailer).
- Token lifetimes: API token **90 days**; pending token request **15 minutes**; suggested poll interval **3 seconds**.
- Quotas unchanged: anonymous 5/day per IP, signed in 10/day per email hash.
- Invalid or expired Bearer → HTTP 401 with body exactly `{"error": "invalid_token"}`.
- Poll responses: pending → `202 {"status": "pending"}`; expired, consumed or unknown → `410 {"error": "expired_or_used"}`; ready → `200 {"token", "email", "expires_at"}`.
- No destructive operation on Supabase. The `oauth_*` tables stay. Migration `003_token_requests.sql` is written here, applied only at Task 7 with Rémy's go.
- Domain and DNS untouched. `GET /` answers 404 after this plan; nothing redirects.
- The gate for "green" is **no new failure against the Task 0 baseline**, plus every new test passing.

---

### Task 0: Branch, environment, baseline

**Files:**
- Create: `backend/.venv/` (untracked — the root `.gitignore` already ignores `.venv`)

- [ ] **Step 1: Create the branch from the deployed commit**

```bash
cd ~/Sites/Professional/infoviz
git status --short            # must print nothing
git fetch origin
git switch -c feat/api-only-token-sign-in origin/main
git log --oneline -1          # expect cf6b529
```

- [ ] **Step 2: Create a Python 3.11 environment without the heavy vector stack**

`sentence-transformers` pulls torch (GBs) and is only used by the dev-only trainer; skip it and `qdrant-client`.

```bash
cd ~/Sites/Professional/infoviz/backend
uv venv --python 3.11 .venv
grep -v -E '^(sentence-transformers|qdrant-client)' requirements.txt > /tmp/infoviz-reqs.txt
uv pip install --python .venv/bin/python -r /tmp/infoviz-reqs.txt -r requirements-test.txt
```

- [ ] **Step 3: Record the baseline**

```bash
.venv/bin/python -m pytest tests/ -q -p no:cacheprovider 2>&1 | tail -30 | tee /tmp/infoviz-baseline.txt
```

Expected: a pass/fail/skip summary. Copy the list of failing or erroring test ids into the ledger (`docs/superpowers/plans/2026-09-13-inspiration-01-infoviz-backend.ledger.md` in the Splash worktree `~/Sites/Professional/splash/feat-inspiration`). These are the pre-existing reds; later tasks must not add to them. Nothing to commit in the infoviz repo.

---

### Task 1: Remove the MCP server

**Files:**
- Delete: `backend/app/mcp/` (whole directory)
- Delete: `backend/tests/test_mcp_auth_routes.py`, `test_mcp_integration.py`, `test_mcp_oauth_provider.py`, `test_mcp_server.py`, `test_mcp_token_store.py`
- Create: `backend/app/auth/cleanup.py`
- Modify: `backend/app/main.py` (lifespan cleanup task, MCP session manager, MCP mount block, `_RedirectResponse` import)
- Modify: `backend/app/config.py` (drop `mcp_enabled`, rename the `# Auth / MCP` comment to `# Auth`)
- Modify: `backend/requirements.txt` (drop `mcp==1.26.0`, rename `# Auth / MCP` to `# Auth`)
- Modify: `backend/tests/conftest.py` (add the `fake_db` fixture)
- Test: `backend/tests/test_api_only.py`, `backend/tests/test_auth_cleanup.py`

**Interfaces:**
- Produces: `app.auth.cleanup.cleanup_expired_auth_data() -> dict[str, int]` (async). Task 4 extends it with a `token_requests` count.
- Produces: pytest fixture `fake_db` with attributes `.pool` (has `.acquire()` async context manager) and `.conn` (records `.calls: list[tuple[str, tuple]]`; `.execute_result: str`; `.fetchrow_result`). Tasks 4 and 5 reuse it.

- [ ] **Step 1: Add the `fake_db` fixture to `backend/tests/conftest.py`** (append at the end of the file)

```python
class FakeConnection:
    """Records every statement; answers with canned results."""

    def __init__(self):
        self.calls = []
        self.execute_result = "DELETE 0"
        self.fetchrow_result = None

    async def execute(self, sql, *args):
        self.calls.append((sql, args))
        return self.execute_result

    async def fetchrow(self, sql, *args):
        self.calls.append((sql, args))
        return self.fetchrow_result


class FakePool:
    def __init__(self, conn):
        self.conn = conn

    def acquire(self):
        conn = self.conn

        class _Acquired:
            async def __aenter__(self):
                return conn

            async def __aexit__(self, *exc):
                return False

        return _Acquired()


class FakeDb:
    def __init__(self):
        self.conn = FakeConnection()
        self.pool = FakePool(self.conn)


@pytest.fixture()
def fake_db():
    return FakeDb()
```

- [ ] **Step 2: Write the failing tests**

`backend/tests/test_api_only.py`:

```python
"""
The deployed app is an API: no MCP server, no front-end.
"""
import os

from fastapi.testclient import TestClient


def _route_paths():
    from app.main import app
    return {getattr(route, "path", "") for route in app.routes}


def test_mcp_package_is_gone():
    assert not os.path.exists("app/mcp")


def test_no_mcp_or_oauth_discovery_route_is_served():
    paths = _route_paths()
    assert not any(p.startswith("/mcp") or p.startswith("/.well-known") for p in paths)


def test_requirements_do_not_install_the_mcp_sdk():
    with open("requirements.txt") as f:
        assert not any(line.strip().startswith("mcp") for line in f)


def test_settings_no_longer_carry_an_mcp_switch():
    from app.config import Settings
    assert "mcp_enabled" not in Settings.model_fields
```

`backend/tests/test_auth_cleanup.py`:

```python
"""
Periodic cleanup of expired auth records.
"""
from unittest.mock import AsyncMock, patch


async def test_cleanup_reports_what_it_deleted(fake_db):
    from app.auth import cleanup
    fake_db.conn.execute_result = "DELETE 2"
    with patch.object(cleanup, "get_db_pool", AsyncMock(return_value=fake_db.pool)):
        counts = await cleanup.cleanup_expired_auth_data()
    assert counts == {"magic_link_limits": 2, "magic_link_tokens": 2}


async def test_cleanup_only_touches_magic_link_tables(fake_db):
    from app.auth import cleanup
    with patch.object(cleanup, "get_db_pool", AsyncMock(return_value=fake_db.pool)):
        await cleanup.cleanup_expired_auth_data()
    statements = " ".join(sql for sql, _ in fake_db.conn.calls)
    assert "oauth_" not in statements
```

- [ ] **Step 3: Run them to verify they fail**

Run: `.venv/bin/python -m pytest tests/test_api_only.py tests/test_auth_cleanup.py -q`
Expected: FAIL — `app/mcp` exists, `/mcp` route present, `mcp==1.26.0` in requirements, `mcp_enabled` field present, `ModuleNotFoundError: app.auth.cleanup`.

- [ ] **Step 4: Create `backend/app/auth/cleanup.py`**

```python
"""
Periodic cleanup of expired auth records.
"""
import logging
from datetime import datetime, timedelta, timezone

from app.services.database import get_db_pool

logger = logging.getLogger(__name__)


def _affected(status: str) -> int:
    # asyncpg returns a status string such as "DELETE 3"
    return int(status.split()[-1])


async def cleanup_expired_auth_data() -> dict:
    """Delete stale magic link rate-limit rows and used magic link tokens."""
    now = datetime.now(timezone.utc)
    counts = {}

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        status = await conn.execute(
            "DELETE FROM magic_link_limits WHERE created_at < $1",
            now - timedelta(hours=2),
        )
        counts["magic_link_limits"] = _affected(status)

        status = await conn.execute(
            "DELETE FROM magic_link_tokens WHERE used_at IS NOT NULL AND used_at < $1",
            now - timedelta(hours=1),
        )
        counts["magic_link_tokens"] = _affected(status)

    logger.info("Auth cleanup: %s", counts)
    return counts
```

- [ ] **Step 5: Remove the MCP from `backend/app/main.py`**

1. Delete the line `from fastapi.responses import RedirectResponse as _RedirectResponse`.
2. In `lifespan`, replace the body of `_periodic_cleanup`'s `try` block:

```python
            try:
                from app.auth.cleanup import cleanup_expired_auth_data
                await cleanup_expired_auth_data()
            except Exception:
                logger.exception("Periodic cleanup failed")
```

and change the comment above it to `# Background cleanup task for expired magic link data (hourly)`.

3. Replace the whole block starting at `# Start MCP session manager if enabled.` down to (and including) the `yield` branches with:

```python
    try:
        yield
    finally:
        cleanup_task.cancel()
        if scheduler is not None:
            scheduler.shutdown(wait=False)
            logger.info("APScheduler shut down")
```

4. Delete everything from `# MCP server (remote, Streamable HTTP at /mcp)` through `logger.info("MCP server mounted at /mcp")` (the `_mcp_session_manager` global, both `if settings.mcp_enabled:` blocks and the two `.well-known` routes).
5. In `SPAStaticFiles.get_response`, change the prefix tuple to `('api/', 'auth/')` and the comment to `# Outer guard already rejects api/auth — serve SPA index` (the class itself goes away in Task 2).

- [ ] **Step 6: Remove the setting, the dependency, the package and its tests**

In `backend/app/config.py` delete the line `mcp_enabled: bool = True` and rename `# Auth / MCP` to `# Auth`.
In `backend/requirements.txt` delete `mcp==1.26.0` and rename `# Auth / MCP` to `# Auth`.

```bash
git rm -r -q app/mcp tests/test_mcp_auth_routes.py tests/test_mcp_integration.py tests/test_mcp_oauth_provider.py tests/test_mcp_server.py tests/test_mcp_token_store.py
grep -rn "app.mcp\|mcp_enabled\|_mcp_session_manager" app tests && echo "LEFTOVER" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 7: Run the new tests, then the whole suite**

Run: `.venv/bin/python -m pytest tests/test_api_only.py tests/test_auth_cleanup.py -q`
Expected: PASS (6 passed).

Run: `.venv/bin/python -m pytest tests/ -q -p no:cacheprovider 2>&1 | tail -15`
Expected: no failure that is not in the Task 0 baseline (the deleted `test_mcp_*` files simply disappear from the count).

- [ ] **Step 8: Mutation check** — temporarily re-add `mcp==1.26.0` to `requirements.txt`, run `tests/test_api_only.py`, confirm `test_requirements_do_not_install_the_mcp_sdk` goes red, then revert the line.

- [ ] **Step 9: Commit**

```bash
git add -A app tests requirements.txt
git commit -m "refactor: retire the MCP server, keep magic link cleanup in auth"
```

---

### Task 2: Remove the front-end, make CORS independent of the proxy

**Files:**
- Delete: `frontend/` (repo root)
- Modify: `Dockerfile` (repo root) — full replacement below
- Modify: `backend/app/main.py` — drop `SPAStaticFiles`, the `FRONTEND_DIST` mount and now-unused imports; add `expose_headers` to CORS
- Modify: `backend/app/config.py` — add the Splash origin to `allowed_origins`
- Modify: `docker-compose.yml` — delete the `frontend` service
- Modify: `.dockerignore` — delete the `# Frontend` block
- Modify: `README.md`, `AGENTS.md` — describe an API-only service (exact text below)
- Test: `backend/tests/test_api_only.py` (append)

**Interfaces:**
- Produces: CORS admits `https://buriedsignals.github.io` with any request header (including `Authorization`) and exposes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. Part 3 (skill) and Part 4 (web page) rely on this.

- [ ] **Step 1: Append the failing tests to `backend/tests/test_api_only.py`**

```python
SPLASH_ORIGIN = "https://buriedsignals.github.io"


def test_frontend_sources_are_gone():
    assert not os.path.exists("../frontend")


def test_image_builds_no_node_stage():
    with open("../Dockerfile") as f:
        dockerfile = f.read()
    assert "node:" not in dockerfile
    assert "frontend" not in dockerfile


def test_root_is_not_an_spa():
    from app.main import app
    assert TestClient(app).get("/").status_code == 404


def test_splash_origin_may_send_a_bearer():
    from app.main import app
    response = TestClient(app).options(
        "/api/graphics/examples",
        headers={
            "Origin": SPLASH_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == SPLASH_ORIGIN
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


def test_rate_limit_headers_are_readable_cross_origin():
    from app.main import app
    response = TestClient(app).get("/api/ready", headers={"Origin": SPLASH_ORIGIN})
    exposed = response.headers.get("access-control-expose-headers", "").lower()
    assert "x-ratelimit-remaining" in exposed
```

- [ ] **Step 2: Run them to verify they fail**

Run: `.venv/bin/python -m pytest tests/test_api_only.py -q`
Expected: the 5 new tests FAIL (frontend exists, Node stage present, preflight for the Splash origin answers 400, no expose header). `test_root_is_not_an_spa` may already pass locally because `app/frontend_client` is not built — it guards the image, keep it.

- [ ] **Step 3: Replace `Dockerfile` (repo root) with**

```dockerfile
# syntax=docker/dockerfile:1.7

FROM python:3.11-slim AS runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /workspace

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential curl git libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend ./backend

RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /workspace
USER 1000

ENV HOST=0.0.0.0 \
    PORT=10000

EXPOSE 10000
WORKDIR /workspace/backend

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
```

- [ ] **Step 4: Edit `backend/app/main.py`**

1. Delete the `SPAStaticFiles` class and the block from `# Serve built frontend if available` through the `else: logger.info("Frontend assets directory not found ...")` lines.
2. Replace the import header lines

```python
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.types import Scope
from starlette.responses import Response
```

with

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
```

(keep `import asyncio`, `import logging`, `import sys`; delete `import os` if nothing else uses it — check with `grep -n "os\." app/main.py`).
3. Replace the CORS middleware call with:

```python
# CORS middleware — use regex for wildcard subdomain matching
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"https://.*\.hf\.space|https://.*\.huggingface\.co",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)
```

- [ ] **Step 5: Edit `backend/app/config.py`** — replace the `allowed_origins` default with

```python
    allowed_origins: list[str] = [
        "http://localhost:5173",  # Local static page during development
        "http://localhost:10000",  # Backend local
        "https://buriedsignals.github.io",  # Splash web page (inspiration)
    ]
```

- [ ] **Step 6: Delete the front-end and its wiring**

```bash
cd ~/Sites/Professional/infoviz
git rm -r -q frontend
```

In `docker-compose.yml` delete the whole `frontend:` service (from `  frontend:` through its `networks:` list). In `.dockerignore` delete the `# Frontend` comment and its five `frontend/...` lines.

In `README.md` keep the HF front-matter unchanged; replace everything from `# Infoviz.design` down to (not including) the next `##` heading after "Tech Stack" with:

```markdown
# Infoviz.design API

Search API over visual stories published by newsrooms around the world. The browsing interface lives in
Splash (`landing/inspiration.html` in `buriedsignals/splash`); this Space serves the API only.

## Endpoints

- `GET|POST /api/graphics/examples` — search (`query`), rate limited: 5/day anonymous, 10/day signed in
- `POST /auth/token/start`, `GET /auth/token/confirm`, `GET /auth/token/poll` — email sign-in for API clients
- `GET /auth/status` — quota and identity for a cookie session or a Bearer token
- `GET /api/ready` — readiness

## Tech Stack

- FastAPI (Python 3.11), deterministic SQL search (FTS + tags + ILIKE fallback)
- PostgreSQL via Supabase (asyncpg connection pool)
- Weekly scraper: Firecrawl + OpenRouter
```

In `AGENTS.md`: under `## Tech Stack` delete the `- **Frontend**: ...` line; under `## Key Directories` delete the two `frontend/...` lines; under `## Development` delete the `# Frontend only` two-line block; in the env table delete the `PUBLIC_SUPABASE_ANON_KEY` row and change the `PUBLIC_SUPABASE_URL` purpose to `Supabase URL for Storage uploads (scraper)`.

- [ ] **Step 7: Run the tests**

Run: `cd backend && .venv/bin/python -m pytest tests/test_api_only.py -q`
Expected: PASS (all 9).

Run: `.venv/bin/python -m pytest tests/ -q -p no:cacheprovider 2>&1 | tail -15`
Expected: no failure outside the Task 0 baseline.

- [ ] **Step 8: Mutation check** — remove `"https://buriedsignals.github.io"` from `allowed_origins`, confirm `test_splash_origin_may_send_a_bearer` goes red, restore it.

- [ ] **Step 9: Commit**

```bash
cd ~/Sites/Professional/infoviz
git add -A Dockerfile docker-compose.yml .dockerignore README.md AGENTS.md backend/app backend/tests
git commit -m "refactor: serve the API only, and admit the Splash origin without relying on the proxy"
```

---

### Task 3: API token and Bearer identity

**Files:**
- Modify: `backend/app/config.py` — add `api_token_expiry_days: int = 90`
- Modify: `backend/app/auth/session.py` — `API_TOKEN_TYPE`, `create_api_token`, `decode_api_token`, `bearer_token`, `get_current_user`
- Modify: `backend/app/routers/graphics.py` — 401 on a rejected Bearer
- Modify: `backend/app/auth/routes.py` — `/auth/status` 401 on a rejected Bearer
- Test: `backend/tests/test_api_token.py`

**Interfaces:**
- Produces: `app.auth.session.create_api_token(email: str, now: float | None = None) -> str`
- Produces: `app.auth.session.decode_api_token(token: str) -> dict | None` → `{"email": str}`
- Produces: `app.auth.session.bearer_token(request: Request) -> str | None`
- Produces: `app.auth.session.API_TOKEN_TYPE = "api"`
- Behaviour: `get_current_user(request)` returns the Bearer identity when an `Authorization: Bearer` header is present (and `None` if that token is invalid, whatever the cookie or dev bypass says); otherwise it behaves as before.

- [ ] **Step 1: Write the failing tests** — `backend/tests/test_api_token.py`

```python
"""
API tokens: a Bearer identity for clients that cannot hold the session cookie.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import jwt
import pytest
from fastapi.testclient import TestClient
from starlette.requests import Request

from app.auth import session
from app.auth.rate_limit import hash_email
from app.config import settings

SECRET = "test-secret-that-is-at-least-32-characters-long"


@pytest.fixture(autouse=True)
def production_settings(monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret", SECRET)
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "base_url", "https://infoviz.design")


def make_request(headers=None, cookies=None):
    raw = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    if cookies:
        raw.append((b"cookie", "; ".join(f"{k}={v}" for k, v in cookies.items()).encode()))
    return Request({"type": "http", "method": "GET", "path": "/", "headers": raw})


def signed_in_status(limit):
    return {"allowed": True, "queries_used": 0, "queries_remaining": limit,
            "limit": limit, "resets_at": "2026-09-14T00:00:00+00:00"}


def test_api_token_decodes_to_its_normalised_email():
    token = session.create_api_token("Reporter@Example.org ")
    assert session.decode_api_token(token) == {"email": "reporter@example.org"}


def test_api_token_lives_ninety_days():
    payload = jwt.decode(session.create_api_token("a@b.org"), SECRET, algorithms=["HS256"])
    assert payload["exp"] - payload["iat"] == 90 * 86400


def test_session_token_is_not_accepted_as_an_api_token():
    assert session.decode_api_token(session.create_session("a@b.org")) is None


def test_api_token_is_not_accepted_as_a_session_token():
    assert session.decode_session(session.create_api_token("a@b.org")) is None


def test_expired_api_token_is_refused(monkeypatch):
    monkeypatch.setattr(settings, "api_token_expiry_days", -1)
    assert session.decode_api_token(session.create_api_token("a@b.org")) is None


def test_bearer_token_is_read_from_the_authorization_header():
    assert session.bearer_token(make_request({"Authorization": "Bearer abc"})) == "abc"


def test_non_bearer_authorization_is_ignored():
    assert session.bearer_token(make_request({"Authorization": "Basic abc"})) is None


def test_valid_bearer_identifies_the_user():
    token = session.create_api_token("a@b.org")
    request = make_request({"Authorization": f"Bearer {token}"})
    assert session.get_current_user(request) == {"email": "a@b.org"}


def test_invalid_bearer_is_not_rescued_by_a_valid_cookie():
    cookie = session.create_session("a@b.org")
    request = make_request({"Authorization": "Bearer nope"}, {session.COOKIE_NAME: cookie})
    assert session.get_current_user(request) is None


def test_invalid_bearer_is_not_rescued_by_the_dev_bypass(monkeypatch):
    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(settings, "base_url", "http://localhost:5173")
    assert session.get_current_user(make_request({"Authorization": "Bearer nope"})) is None


def test_search_with_an_invalid_bearer_answers_401_without_spending_quota():
    from app.main import app
    with patch("app.routers.graphics.get_rate_limit_status", new_callable=AsyncMock) as status:
        response = TestClient(app).post(
            "/api/graphics/examples", json={"query": "floods"},
            headers={"Authorization": "Bearer nope"},
        )
    assert response.status_code == 401
    assert response.json() == {"error": "invalid_token"}
    status.assert_not_called()


def test_search_with_an_api_token_uses_the_signed_in_quota():
    from app.main import app
    token = session.create_api_token("a@b.org")
    service = MagicMock()
    service.fetch_graphics_inspiration = AsyncMock(return_value={"items": []})
    with patch("app.routers.graphics.get_rate_limit_status", new_callable=AsyncMock,
               return_value=signed_in_status(10)) as status, \
         patch("app.routers.graphics.record_query", new_callable=AsyncMock), \
         patch("app.routers.graphics.graphics_search_service", service):
        response = TestClient(app).post(
            "/api/graphics/examples", json={"query": "floods"},
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 200
    status.assert_awaited_once_with(hash_email("a@b.org"), 10)


def test_status_with_an_invalid_bearer_answers_401():
    from app.main import app
    response = TestClient(app).get("/auth/status", headers={"Authorization": "Bearer nope"})
    assert response.status_code == 401
    assert response.json() == {"error": "invalid_token"}


def test_status_with_an_api_token_reports_the_account():
    from app.main import app
    token = session.create_api_token("a@b.org")
    with patch("app.auth.routes.get_rate_limit_status", new_callable=AsyncMock,
               return_value=signed_in_status(10)):
        response = TestClient(app).get("/auth/status", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert (body["authenticated"], body["email"], body["daily_limit"]) == (True, "a@b.org", 10)
```

- [ ] **Step 2: Run them to verify they fail**

Run: `.venv/bin/python -m pytest tests/test_api_token.py -q`
Expected: FAIL — `AttributeError: module 'app.auth.session' has no attribute 'create_api_token'` (and the endpoint tests fail on 200/anonymous instead of 401).

- [ ] **Step 3: Add the setting** — in `backend/app/config.py`, right after `session_expiry_days: int = 7`:

```python
    api_token_expiry_days: int = 90
```

- [ ] **Step 4: Edit `backend/app/auth/session.py`**

Update the module docstring's second paragraph to: `Creates and verifies JWT session tokens stored in httpOnly cookies, and API tokens sent as Bearer headers.` Then add after `COOKIE_NAME = "infoviz_session"`:

```python
API_TOKEN_TYPE = "api"


def create_api_token(email: str, now: Optional[float] = None) -> str:
    """
    Create a JWT API token, sent by clients as `Authorization: Bearer <token>`.

    Args:
        email: The user's email address.
        now: Issue time as a UNIX timestamp; defaults to the current time.

    Returns:
        Encoded JWT API token string.
    """
    issued_at = time.time() if now is None else now
    payload = {
        "email": email.lower().strip(),
        "type": API_TOKEN_TYPE,
        "iat": issued_at,
        "exp": issued_at + (settings.api_token_expiry_days * 86400),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_api_token(token: str) -> Optional[Dict]:
    """
    Decode and validate an API token.

    Returns:
        Dict with "email" key, or None if invalid, expired, or not an API token.
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return None
    if payload.get("type") != API_TOKEN_TYPE:
        return None
    return {"email": payload["email"]}


def bearer_token(request: Request) -> Optional[str]:
    """Return the Bearer credential from the Authorization header, if any."""
    scheme, _, value = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not value.strip():
        return None
    return value.strip()
```

Replace the body of `get_current_user` (keep its docstring, add one line to it: `A Bearer header, when present, is the only identity considered.`) with:

```python
    # A Bearer is decided on its own: an invalid one must never fall back to the
    # cookie or the dev bypass, so the caller can be told to reconnect.
    bearer = bearer_token(request)
    if bearer is not None:
        return decode_api_token(bearer)

    # Dev bypass for local development
    if settings.base_url.startswith("http://localhost") and settings.environment == "development":
        return {"email": "dev@localhost"}

    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    return decode_session(token)
```

- [ ] **Step 5: Edit `backend/app/routers/graphics.py`**

Change the import to `from app.auth.session import get_current_user, bearer_token`, and at the top of `_search_graphics`, right after `user = get_current_user(request)`:

```python
    if user is None and bearer_token(request) is not None:
        return JSONResponse(status_code=401, content={"error": "invalid_token"})
```

- [ ] **Step 6: Edit `backend/app/auth/routes.py`**

Change the session import to `from app.auth.session import create_session, get_current_user, decode_session, bearer_token, COOKIE_NAME`, and in `auth_status`, right after `user = get_current_user(request)`:

```python
    if user is None and bearer_token(request) is not None:
        return JSONResponse(status_code=401, content={"error": "invalid_token"})
```

- [ ] **Step 7: Run the tests**

Run: `.venv/bin/python -m pytest tests/test_api_token.py tests/test_web_auth.py -q`
Expected: PASS.

Run: `.venv/bin/python -m pytest tests/ -q -p no:cacheprovider 2>&1 | tail -15`
Expected: no failure outside the Task 0 baseline.

- [ ] **Step 8: Mutation checks** (each: break, run `tests/test_api_token.py`, see red, revert)
  - In `get_current_user`, move the dev bypass above the Bearer block → `test_invalid_bearer_is_not_rescued_by_the_dev_bypass` red.
  - In `decode_api_token`, delete the `type` check → `test_session_token_is_not_accepted_as_an_api_token` red.
  - In `_search_graphics`, delete the 401 guard → `test_search_with_an_invalid_bearer_answers_401_without_spending_quota` red.

- [ ] **Step 9: Commit**

```bash
git add app/config.py app/auth/session.py app/routers/graphics.py app/auth/routes.py tests/test_api_token.py
git commit -m "feat(auth): a 90-day API token read from the Bearer header, refused loudly when invalid"
```

---

### Task 4: Token request store and migration

**Files:**
- Create: `backend/app/db/migrations/003_token_requests.sql`
- Create: `backend/app/auth/token_requests.py`
- Modify: `backend/app/config.py` — add `token_request_expiry_minutes: int = 15`, `token_poll_interval_seconds: int = 3`
- Modify: `backend/app/auth/cleanup.py` — also delete expired token requests
- Modify: `backend/tests/test_auth_cleanup.py` — expected counts
- Test: `backend/tests/test_token_requests.py`

**Interfaces:**
- Consumes: `fake_db` fixture (Task 1).
- Produces (module `app.auth.token_requests`):
  - constants `PENDING = "pending"`, `READY = "ready"`, `GONE = "gone"`
  - `new_request_id() -> str` (43-char urlsafe secret)
  - `hash_request_id(request_id: str) -> str` (sha256 hex)
  - `request_expiry(now: datetime | None = None) -> datetime` (UTC, now + 15 min)
  - `async create_token_request(request_id_hash: str, email: str, expires_at: datetime) -> None`
  - `async confirm_token_request(request_id_hash: str) -> bool`
  - `async claim_token_request(request_id: str) -> dict` → `{"status": PENDING}` | `{"status": GONE}` | `{"status": READY, "email": str}`
  - `claim_outcome(row, now: datetime) -> dict` (pure)

- [ ] **Step 1: Write the migration** — `backend/app/db/migrations/003_token_requests.sql`

```sql
-- Pending email sign-ins for API clients (Splash agent and Splash web page).
--
-- A row lives from POST /auth/token/start until the poller claims it or it
-- expires (15 minutes). It holds an email, so it is closed to PostgREST roles.
-- Review and apply in the Supabase SQL editor before deploying the API that uses it.

BEGIN;

CREATE TABLE IF NOT EXISTS public.token_requests (
    request_id_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_token_requests_expires_at
    ON public.token_requests (expires_at);

ALTER TABLE public.token_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.token_requests FROM anon, authenticated;

COMMIT;
```

- [ ] **Step 2: Write the failing tests** — `backend/tests/test_token_requests.py`

```python
"""
Pending sign-in requests: created by start, confirmed by the emailed link, claimed once by the poller.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

from app.auth import token_requests as tr

NOW = datetime(2026, 9, 13, 12, 0, tzinfo=timezone.utc)


def row(found=True, confirmed=False, expired=False, claimed_email=None):
    return {
        "found": found,
        "confirmed_at": NOW if confirmed else None,
        "expires_at": NOW - timedelta(minutes=1) if expired else NOW + timedelta(minutes=10),
        "claimed_email": claimed_email,
    }


def test_claim_of_an_unknown_request_is_gone():
    assert tr.claim_outcome(row(found=False), NOW) == {"status": tr.GONE}


def test_claim_of_an_unconfirmed_request_is_pending():
    assert tr.claim_outcome(row(), NOW) == {"status": tr.PENDING}


def test_claim_of_an_expired_request_is_gone_even_if_confirmed():
    assert tr.claim_outcome(row(confirmed=True, expired=True), NOW) == {"status": tr.GONE}


def test_claim_that_deleted_the_row_is_ready_with_its_email():
    outcome = tr.claim_outcome(row(confirmed=True, claimed_email="a@b.org"), NOW)
    assert outcome == {"status": tr.READY, "email": "a@b.org"}


def test_confirmed_request_claimed_by_a_concurrent_poll_is_gone():
    assert tr.claim_outcome(row(confirmed=True, claimed_email=None), NOW) == {"status": tr.GONE}


def test_request_ids_are_long_and_unique():
    ids = {tr.new_request_id() for _ in range(50)}
    assert len(ids) == 50 and all(len(i) >= 40 for i in ids)


def test_request_expiry_is_fifteen_minutes():
    assert tr.request_expiry(NOW) == NOW + timedelta(minutes=15)


async def test_create_stores_the_hash_never_the_raw_id(fake_db):
    raw = tr.new_request_id()
    with patch.object(tr, "get_db_pool", AsyncMock(return_value=fake_db.pool)):
        await tr.create_token_request(tr.hash_request_id(raw), "a@b.org", NOW)
    sql, args = fake_db.conn.calls[0]
    assert "INSERT INTO token_requests" in sql
    assert raw not in args and tr.hash_request_id(raw) in args


async def test_confirm_reports_false_when_nothing_was_updated(fake_db):
    fake_db.conn.execute_result = "UPDATE 0"
    with patch.object(tr, "get_db_pool", AsyncMock(return_value=fake_db.pool)):
        assert await tr.confirm_token_request("hash") is False


async def test_confirm_reports_true_when_the_request_was_updated(fake_db):
    fake_db.conn.execute_result = "UPDATE 1"
    with patch.object(tr, "get_db_pool", AsyncMock(return_value=fake_db.pool)):
        assert await tr.confirm_token_request("hash") is True


async def test_claim_queries_by_hash(fake_db):
    fake_db.conn.fetchrow_result = row(found=False)
    with patch.object(tr, "get_db_pool", AsyncMock(return_value=fake_db.pool)):
        outcome = await tr.claim_token_request("raw-id")
    _, args = fake_db.conn.calls[0]
    assert args[0] == tr.hash_request_id("raw-id")
    assert outcome == {"status": tr.GONE}
```

And update `backend/tests/test_auth_cleanup.py` — replace the expected dict in `test_cleanup_reports_what_it_deleted` with:

```python
    assert counts == {"magic_link_limits": 2, "magic_link_tokens": 2, "token_requests": 2}
```

- [ ] **Step 3: Run them to verify they fail**

Run: `.venv/bin/python -m pytest tests/test_token_requests.py tests/test_auth_cleanup.py -q`
Expected: FAIL — `ImportError: cannot import name 'token_requests'` and the cleanup count mismatch.

- [ ] **Step 4: Add the settings** — in `backend/app/config.py`, after `api_token_expiry_days: int = 90`:

```python
    token_request_expiry_minutes: int = 15
    token_poll_interval_seconds: int = 3
```

- [ ] **Step 5: Create `backend/app/auth/token_requests.py`**

```python
"""
Pending sign-in requests for the email + magic link + polling flow.

The poller holds the raw request id. The database and the emailed link only
carry its SHA-256 hash, so neither can be replayed into a poll.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.config import settings
from app.services.database import get_db_pool

PENDING = "pending"
READY = "ready"
GONE = "gone"

# One statement so two concurrent polls cannot both receive the token: the
# DELETE only succeeds for the first; the second sees the row confirmed but
# claims nothing, which claim_outcome reports as gone.
_CLAIM_SQL = """
WITH target AS (
    SELECT request_id_hash, email, confirmed_at, expires_at
    FROM token_requests
    WHERE request_id_hash = $1
),
claimed AS (
    DELETE FROM token_requests t
    USING target
    WHERE t.request_id_hash = target.request_id_hash
      AND target.confirmed_at IS NOT NULL
      AND target.expires_at > $2
    RETURNING t.email
)
SELECT
    EXISTS(SELECT 1 FROM target) AS found,
    (SELECT confirmed_at FROM target) AS confirmed_at,
    (SELECT expires_at FROM target) AS expires_at,
    (SELECT email FROM claimed) AS claimed_email
"""


def new_request_id() -> str:
    return secrets.token_urlsafe(32)


def hash_request_id(request_id: str) -> str:
    return hashlib.sha256(request_id.encode()).hexdigest()


def request_expiry(now: Optional[datetime] = None) -> datetime:
    start = now or datetime.now(timezone.utc)
    return start + timedelta(minutes=settings.token_request_expiry_minutes)


async def create_token_request(request_id_hash: str, email: str, expires_at: datetime) -> None:
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO token_requests (request_id_hash, email, expires_at) VALUES ($1, $2, $3)",
            request_id_hash,
            email,
            expires_at,
        )


async def confirm_token_request(request_id_hash: str) -> bool:
    now = datetime.now(timezone.utc)
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        status = await conn.execute(
            """
            UPDATE token_requests SET confirmed_at = $1
            WHERE request_id_hash = $2 AND confirmed_at IS NULL AND expires_at > $1
            """,
            now,
            request_id_hash,
        )
    return int(status.split()[-1]) > 0


def claim_outcome(row, now: datetime) -> dict:
    if row is not None and row["claimed_email"] is not None:
        return {"status": READY, "email": row["claimed_email"]}
    if row is None or not row["found"] or row["expires_at"] <= now:
        return {"status": GONE}
    if row["confirmed_at"] is None:
        return {"status": PENDING}
    return {"status": GONE}


async def claim_token_request(request_id: str) -> dict:
    now = datetime.now(timezone.utc)
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(_CLAIM_SQL, hash_request_id(request_id), now)
    return claim_outcome(row, now)
```

- [ ] **Step 6: Extend `backend/app/auth/cleanup.py`** — inside the `async with` block, after the `magic_link_tokens` delete:

```python
        status = await conn.execute(
            "DELETE FROM token_requests WHERE expires_at < $1",
            now,
        )
        counts["token_requests"] = _affected(status)
```

and change the function docstring to `"""Delete stale magic link records and expired token requests."""`.

- [ ] **Step 7: Run the tests**

Run: `.venv/bin/python -m pytest tests/test_token_requests.py tests/test_auth_cleanup.py -q`
Expected: PASS.

- [ ] **Step 8: Mutation checks** (break, run `tests/test_token_requests.py`, see red, revert)
  - In `claim_outcome`, delete the `or row["expires_at"] <= now` condition → `test_claim_of_an_expired_request_is_gone_even_if_confirmed` red.
  - In `claim_outcome`, change the last `return {"status": GONE}` to `return {"status": PENDING}` → `test_confirmed_request_claimed_by_a_concurrent_poll_is_gone` red.
  - In `claim_token_request`, pass `request_id` instead of `hash_request_id(request_id)` → `test_claim_queries_by_hash` red.

- [ ] **Step 9: Commit**

```bash
git add app/db/migrations/003_token_requests.sql app/auth/token_requests.py app/auth/cleanup.py app/config.py tests/test_token_requests.py tests/test_auth_cleanup.py
git commit -m "feat(auth): pending token requests, claimed exactly once, cleaned when expired"
```

---

### Task 5: Token sign-in routes

**Files:**
- Modify: `backend/app/auth/magic_link.py` — `generate_magic_link(..., path="/auth/verify")`
- Modify: `backend/app/auth/html_responses.py` — `message_html_response`
- Modify: `backend/app/auth/routes.py` — extract `magic_link_limit_response`, use it in `send_link`
- Create: `backend/app/auth/token_routes.py`
- Modify: `backend/app/main.py` — include the token router
- Test: `backend/tests/test_token_routes.py`

**Interfaces:**
- Consumes: `create_api_token(email, now)`, `API_TOKEN_TYPE` (Task 3); everything in `app.auth.token_requests` (Task 4).
- Produces: `app.auth.routes.magic_link_limit_response(email_hash: str, client_ip: str) -> JSONResponse | None` (async)
- Produces: `app.auth.html_responses.message_html_response(title: str, message: str, status_code: int = 200) -> HTMLResponse`
- Produces HTTP contract (Parts 3 and 4 rely on it exactly):
  - `POST /auth/token/start` body `{"email": str}` → `200 {"request_id": str, "poll_interval": 3, "expires_at": ISO-8601}`; `429 {"error": ...}`; `500 {"error": ...}`; `422` on an invalid email.
  - `GET /auth/token/confirm?token=` → `200` HTML "You're connected"; `400` HTML otherwise.
  - `GET /auth/token/poll?request_id=` (16–128 chars) → `202 {"status": "pending"}` | `410 {"error": "expired_or_used"}` | `200 {"token": str, "email": str, "expires_at": ISO-8601}`; `422` when the id length is out of bounds.

- [ ] **Step 1: Write the failing tests** — `backend/tests/test_token_routes.py`

```python
"""
Token sign-in over HTTP: start → confirm (emailed link) → poll.
"""
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse
from unittest.mock import AsyncMock, patch

import jwt
import pytest
from fastapi.testclient import TestClient

from app.auth import session, token_requests as tr
from app.auth.magic_link import generate_magic_link
from app.config import settings

SECRET = "test-secret-that-is-at-least-32-characters-long"


@pytest.fixture(autouse=True)
def production_settings(monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret", SECRET)
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "base_url", "https://infoviz.design")


@pytest.fixture()
def client():
    from app.main import app
    return TestClient(app)


class MemoryStore:
    """In-memory stand-in for app.auth.token_requests' database calls."""

    def __init__(self):
        self.rows = {}

    async def create(self, request_id_hash, email, expires_at):
        self.rows[request_id_hash] = {"email": email, "expires_at": expires_at, "confirmed": False}

    async def confirm(self, request_id_hash):
        row = self.rows.get(request_id_hash)
        if row is None or row["confirmed"] or row["expires_at"] <= datetime.now(timezone.utc):
            return False
        row["confirmed"] = True
        return True

    async def claim(self, request_id):
        row = self.rows.get(tr.hash_request_id(request_id))
        if row is None or row["expires_at"] <= datetime.now(timezone.utc):
            return {"status": tr.GONE}
        if not row["confirmed"]:
            return {"status": tr.PENDING}
        del self.rows[tr.hash_request_id(request_id)]
        return {"status": tr.READY, "email": row["email"]}


@pytest.fixture()
def wired(monkeypatch):
    """Store in memory, email captured, rate limits open, single-use tokens in memory."""
    store = MemoryStore()
    sent = []
    used = set()

    async def send_email(to, subject, html, text=""):
        sent.append({"to": to, "html": html})
        return True

    async def consume(token):
        if token in used:
            return False
        used.add(token)
        return True

    monkeypatch.setattr(tr, "create_token_request", store.create)
    monkeypatch.setattr(tr, "confirm_token_request", store.confirm)
    monkeypatch.setattr(tr, "claim_token_request", store.claim)
    monkeypatch.setattr("app.auth.token_routes.send_email", send_email)
    monkeypatch.setattr("app.auth.token_routes.store_magic_link_token", AsyncMock())
    monkeypatch.setattr("app.auth.token_routes.consume_magic_link_token", consume)
    monkeypatch.setattr("app.auth.token_routes.magic_link_limit_response", AsyncMock(return_value=None))
    return {"store": store, "sent": sent}


def emailed_link(sent):
    return re.search(r'href="([^"]+/auth/token/confirm\?[^"]+)"', sent[-1]["html"]).group(1).replace("&amp;", "&")


def test_start_returns_a_request_id_and_polling_terms(client, wired):
    response = client.post("/auth/token/start", json={"email": "Reporter@Example.org"})
    assert response.status_code == 200
    body = response.json()
    assert len(body["request_id"]) >= 40
    assert body["poll_interval"] == 3
    assert datetime.fromisoformat(body["expires_at"]) > datetime.now(timezone.utc) + timedelta(minutes=14)


def test_start_stores_only_the_hash_of_the_request_id(client, wired):
    request_id = client.post("/auth/token/start", json={"email": "a@b.org"}).json()["request_id"]
    assert list(wired["store"].rows) == [tr.hash_request_id(request_id)]


def test_start_emails_a_confirm_link_that_does_not_reveal_the_request_id(client, wired):
    request_id = client.post("/auth/token/start", json={"email": "a@b.org"}).json()["request_id"]
    link = emailed_link(wired["sent"])
    assert urlparse(link).path == "/auth/token/confirm"
    assert request_id not in link


def test_start_is_refused_when_the_magic_link_limit_is_reached(client, wired, monkeypatch):
    from fastapi.responses import JSONResponse
    limited = JSONResponse(status_code=429, content={"error": "Too many requests. Please wait before trying again."})
    monkeypatch.setattr("app.auth.token_routes.magic_link_limit_response", AsyncMock(return_value=limited))
    response = client.post("/auth/token/start", json={"email": "a@b.org"})
    assert response.status_code == 429
    assert wired["sent"] == [] and wired["store"].rows == {}


def test_start_answers_500_when_the_email_cannot_be_sent(client, wired, monkeypatch):
    monkeypatch.setattr("app.auth.token_routes.send_email", AsyncMock(return_value=False))
    assert client.post("/auth/token/start", json={"email": "a@b.org"}).status_code == 500


def test_start_rejects_an_invalid_email(client, wired):
    assert client.post("/auth/token/start", json={"email": "not-an-email"}).status_code == 422


def test_poll_is_pending_until_the_link_is_clicked(client, wired):
    request_id = client.post("/auth/token/start", json={"email": "a@b.org"}).json()["request_id"]
    response = client.get("/auth/token/poll", params={"request_id": request_id})
    assert (response.status_code, response.json()) == (202, {"status": "pending"})


def test_full_flow_hands_over_an_api_token_exactly_once(client, wired):
    request_id = client.post("/auth/token/start", json={"email": "Reporter@Example.org"}).json()["request_id"]

    confirm = client.get(emailed_link(wired["sent"]))
    assert confirm.status_code == 200 and "connected" in confirm.text

    ready = client.get("/auth/token/poll", params={"request_id": request_id})
    assert ready.status_code == 200
    body = ready.json()
    assert body["email"] == "reporter@example.org"
    assert session.decode_api_token(body["token"]) == {"email": "reporter@example.org"}
    exp = jwt.decode(body["token"], SECRET, algorithms=["HS256"])["exp"]
    assert datetime.fromisoformat(body["expires_at"]) == datetime.fromtimestamp(exp, tz=timezone.utc)

    again = client.get("/auth/token/poll", params={"request_id": request_id})
    assert (again.status_code, again.json()) == (410, {"error": "expired_or_used"})


def test_confirm_link_works_only_once(client, wired):
    client.post("/auth/token/start", json={"email": "a@b.org"})
    link = emailed_link(wired["sent"])
    assert client.get(link).status_code == 200
    assert client.get(link).status_code == 400


def test_a_regular_sign_in_link_cannot_confirm_a_token_request(client, wired):
    client.post("/auth/token/start", json={"email": "a@b.org"})
    rid = next(iter(wired["store"].rows))
    _, cookie_link_token = generate_magic_link("a@b.org", extra_claims={"rid": rid})
    response = client.get("/auth/token/confirm", params={"token": cookie_link_token})
    assert response.status_code == 400
    assert wired["store"].rows[rid]["confirmed"] is False


def test_poll_of_an_unknown_request_is_gone(client, wired):
    response = client.get("/auth/token/poll", params={"request_id": "x" * 43})
    assert response.status_code == 410


def test_poll_rejects_an_implausible_request_id(client, wired):
    assert client.get("/auth/token/poll", params={"request_id": "short"}).status_code == 422
    assert client.get("/auth/token/poll", params={"request_id": "x" * 129}).status_code == 422


def test_magic_link_path_defaults_to_the_cookie_verify_route():
    url, _ = generate_magic_link("a@b.org")
    assert urlparse(url).path == "/auth/verify"


async def test_cookie_send_link_still_answers_429_when_limited():
    from app.auth import routes
    with patch.object(routes, "check_magic_link_rate_limit", AsyncMock(return_value=False)):
        response = await routes.magic_link_limit_response("hash", "1.2.3.4")
    assert response.status_code == 429
```

- [ ] **Step 2: Run them to verify they fail**

Run: `.venv/bin/python -m pytest tests/test_token_routes.py -q`
Expected: FAIL — `/auth/token/start` answers 404, `magic_link_limit_response` does not exist.

- [ ] **Step 3: `backend/app/auth/magic_link.py`** — add the `path` parameter

Change the signature to:

```python
def generate_magic_link(
    email: str,
    extra_claims: Optional[Dict] = None,
    token_type: str = "magic_link",
    path: str = "/auth/verify",
) -> Tuple[str, str]:
```

add to its docstring `path: Route the emailed link points to (default the cookie sign-in).`, and change the URL line to:

```python
    url = f"{settings.base_url}{path}?{urlencode({'token': token})}"
```

- [ ] **Step 4: `backend/app/auth/html_responses.py`** — add after `secure_html_response`:

```python
def message_html_response(title: str, message: str, status_code: int = 200) -> HTMLResponse:
    """Return a branded confirmation page with security headers."""
    content = _error_html(title, message, footer_html='<div class="footer">by Buried Signals</div>')
    return HTMLResponse(content=content, status_code=status_code, headers=_SECURITY_HEADERS)
```

- [ ] **Step 5: `backend/app/auth/routes.py`** — extract the shared limit check

Add `from typing import Optional` to the imports, and add above `@router.get("/login")`:

```python
async def magic_link_limit_response(email_hash: str, client_ip: str) -> Optional[JSONResponse]:
    """
    Enforce the magic link send limits: 3 per 15 min per email, 10 per 15 min per IP.

    Returns:
        A 429 response when a limit is reached, otherwise None (and the attempt is recorded).
    """
    email_allowed = await check_magic_link_rate_limit(
        key=f"email:{email_hash}",
        max_count=3,
        window_minutes=15,
    )
    if not email_allowed:
        return JSONResponse(
            status_code=429,
            content={"error": "Too many requests. Please wait before trying again."},
        )

    ip_allowed = await check_magic_link_rate_limit(
        key=f"ip:{client_ip}",
        max_count=10,
        window_minutes=15,
    )
    if not ip_allowed:
        return JSONResponse(
            status_code=429,
            content={"error": "Too many requests from this address. Please wait."},
        )

    return None
```

In `send_link`, replace the two rate-limit blocks (from `# Rate limit by email` through the IP block's `return JSONResponse(...)`) with:

```python
    limited = await magic_link_limit_response(email_hash, client_ip)
    if limited is not None:
        return limited
```

- [ ] **Step 6: Create `backend/app/auth/token_routes.py`**

```python
"""
Token sign-in for clients that cannot hold the session cookie (the Splash agent and web page).

POST /auth/token/start    email → a single-use link is emailed, the caller keeps the request id
GET  /auth/token/confirm  the emailed link; marks the request confirmed
GET  /auth/token/poll     the caller waits here; the API token is handed over exactly once
"""
import logging
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr

from app.auth import token_requests
from app.auth.email_templates import magic_link_email
from app.auth.html_responses import error_html_response, message_html_response
from app.auth.magic_link import InvalidTokenError, generate_magic_link, verify_magic_link
from app.auth.rate_limit import consume_magic_link_token, hash_email, store_magic_link_token
from app.auth.routes import magic_link_limit_response
from app.auth.session import create_api_token
from app.auth.utils import get_client_ip
from app.config import settings
from app.email import send_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/token", tags=["Auth"])

TOKEN_REQUEST_LINK_TYPE = "token_request"
_RESTART = "Start the sign-in again from where you asked for it."


class StartRequest(BaseModel):
    """Request body for the token start endpoint."""
    email: EmailStr


@router.post("/start")
async def start(body: StartRequest, request: Request):
    email = body.email.lower().strip()
    limited = await magic_link_limit_response(hash_email(email), get_client_ip(request))
    if limited is not None:
        return limited

    request_id = token_requests.new_request_id()
    request_id_hash = token_requests.hash_request_id(request_id)
    expires_at = token_requests.request_expiry()
    await token_requests.create_token_request(request_id_hash, email, expires_at)

    url, link_token = generate_magic_link(
        email,
        extra_claims={"rid": request_id_hash},
        token_type=TOKEN_REQUEST_LINK_TYPE,
        path="/auth/token/confirm",
    )
    await store_magic_link_token(link_token)

    content = magic_link_email(link=url, expiry_minutes=settings.magic_link_expiry_minutes)
    sent = await send_email(to=email, subject=content["subject"], html=content["html"])
    if not sent:
        logger.error("Failed to send token sign-in email to %s...", hash_email(email)[:12])
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to send email. Please try again later."},
        )

    return {
        "request_id": request_id,
        "poll_interval": settings.token_poll_interval_seconds,
        "expires_at": expires_at.isoformat(),
    }


@router.get("/confirm")
async def confirm(token: str):
    try:
        payload = verify_magic_link(token, expected_type=TOKEN_REQUEST_LINK_TYPE)
    except InvalidTokenError as e:
        logger.warning("Token sign-in link refused: %s", e)
        return error_html_response("Invalid or expired link", _RESTART, footer_html="")

    if not await consume_magic_link_token(token):
        return error_html_response("Link already used", _RESTART, footer_html="")

    if not await token_requests.confirm_token_request(payload.get("rid", "")):
        return error_html_response("Sign-in expired", _RESTART, footer_html="")

    return message_html_response("You're connected", "You can close this tab and go back to Splash.")


@router.get("/poll")
async def poll(request_id: str = Query(..., min_length=16, max_length=128)):
    outcome = await token_requests.claim_token_request(request_id)

    if outcome["status"] == token_requests.PENDING:
        return JSONResponse(status_code=202, content={"status": "pending"})
    if outcome["status"] != token_requests.READY:
        return JSONResponse(status_code=410, content={"error": "expired_or_used"})

    issued_at = time.time()
    token = create_api_token(outcome["email"], now=issued_at)
    expires_at = datetime.fromtimestamp(
        issued_at + settings.api_token_expiry_days * 86400, tz=timezone.utc
    )
    return {"token": token, "email": outcome["email"], "expires_at": expires_at.isoformat()}
```

Note for the implementer: `token_requests.create_token_request` etc. are looked up on the module at call time, which is what lets the tests' `monkeypatch.setattr(tr, ...)` take effect. Do not change these to `from app.auth.token_requests import ...`.

- [ ] **Step 7: `backend/app/main.py`** — register the router

Add `from app.auth.token_routes import router as token_router` next to the `auth_router` import, and `app.include_router(token_router)` right after `app.include_router(auth_router)`.

- [ ] **Step 8: Run the tests**

Run: `.venv/bin/python -m pytest tests/test_token_routes.py tests/test_web_auth.py tests/test_auth_utils.py -q`
Expected: PASS.

Run: `.venv/bin/python -m pytest tests/ -q -p no:cacheprovider 2>&1 | tail -15`
Expected: no failure outside the Task 0 baseline.

- [ ] **Step 9: Mutation checks** (break, run `tests/test_token_routes.py`, see red, revert)
  - In `confirm`, pass `expected_type="magic_link"` → `test_full_flow_hands_over_an_api_token_exactly_once` red.
  - In `start`, put `request_id` instead of `request_id_hash` in `extra_claims` → `test_start_emails_a_confirm_link_that_does_not_reveal_the_request_id` red.
  - In `poll`, return the token on `PENDING` too → `test_poll_is_pending_until_the_link_is_clicked` red.

- [ ] **Step 10: Commit**

```bash
git add app/auth/magic_link.py app/auth/html_responses.py app/auth/routes.py app/auth/token_routes.py app/main.py tests/test_token_routes.py
git commit -m "feat(auth): email sign-in for API clients — start, confirm, poll once"
```

---

### Task 6: Local boot check

**Files:** none changed (fixes only if a step fails, committed as `fix: ...`).

- [ ] **Step 1: Build the image**

```bash
cd ~/Sites/Professional/infoviz
colima status >/dev/null 2>&1 || colima start
docker build -t infoviz-api:local .
```

Expected: build succeeds with no Node stage in the log.

- [ ] **Step 2: Boot without a database and probe the routes that need none**

```bash
docker run --rm -d --name infoviz-api-check -p 10000:10000 \
  -e JWT_SECRET=local-check-secret-that-is-at-least-32-chars \
  -e ENVIRONMENT=production -e BASE_URL=http://localhost:10000 \
  infoviz-api:local
for i in $(seq 1 20); do curl -sf http://localhost:10000/api/ready && break; sleep 1; done; echo
curl -s -o /dev/null -w "root %{http_code}\n" http://localhost:10000/
curl -s -o /dev/null -w "mcp %{http_code}\n" http://localhost:10000/mcp/
curl -s -o /dev/null -w "poll-bad-id %{http_code}\n" "http://localhost:10000/auth/token/poll?request_id=short"
curl -s -o /dev/null -w "search-bad-bearer %{http_code}\n" -X POST http://localhost:10000/api/graphics/examples \
  -H "Authorization: Bearer nope" -H "Content-Type: application/json" -d '{"query":"floods"}'
docker stop infoviz-api-check
```

Expected: `{"status":"ready"}`, `root 404`, `mcp 404`, `poll-bad-id 422`, `search-bad-bearer 401`.

- [ ] **Step 3: Record in the ledger** the outputs above and the final `pytest` summary versus the Task 0 baseline.

---

### Task 7: GATE — migration and deployment (STOP: requires Rémy's explicit go)

Nothing in this task runs without Rémy saying so in the conversation. Present the branch (`git log --oneline origin/main..HEAD`), the ledger, and these three questions, then stop:

1. **When to deploy.** Deploying removes the infoviz.design front-end immediately. The Splash page (Part 4) still signs in with the cookie until Part 4 lands, and `vizualisation-skill`'s curator loses its MCP path (it falls back to HTTP). Recommendation: deploy after Part 4 is ready, or with Tom's agreement.
2. **Migration 003.** Apply `backend/app/db/migrations/003_token_requests.sql` in the Supabase SQL editor of the project behind `SUPABASE_CONNECTION` (Tom's project). It is additive only.
3. **Push target.** `git push origin feat/api-only-token-sign-in:main` deploys the Space `tomvaillant/infoviz` (Tom's). Confirm Tom has agreed.
4. **Space settings.** The emailed link is built from `BASE_URL` (default `http://localhost:5173`) and the dev bypass keys on `ENVIRONMENT`. Confirm on the Space (names only, `hf` or the settings page): `BASE_URL=https://infoviz.design`, `ENVIRONMENT=production`, `RESEND_API_KEY` set, `JWT_SECRET` set (≥ 32 chars). `MCP_ENABLED` and `PUBLIC_SUPABASE_ANON_KEY` become unused and can be removed later.
5. **First image build.** The local `docker build` could not complete (OS killed it for memory while installing torch); the first build of the new Dockerfile happens on HF. Watch the Space build log after the push.

After the go, and only then:

- [ ] **Step 1:** Apply migration 003 (by whoever holds Supabase access), confirm `select count(*) from token_requests;` returns 0.
- [ ] **Step 2:** Push as agreed, wait for the Space to report RUNNING (`hf` or the Space page).
- [ ] **Step 3: Live smoke**

```bash
UA="Mozilla/5.0"
read -r -p "Email to sign in with: " EMAIL     # Rémy types it; never commit it
curl -s -A "$UA" https://infoviz.design/api/ready; echo
curl -s -o /dev/null -w "root %{http_code}\n" -A "$UA" https://infoviz.design/
START=$(EMAIL="$EMAIL" python3 -c 'import json,os; print(json.dumps({"email": os.environ["EMAIL"]}))' \
  | curl -s -A "$UA" -X POST https://infoviz.design/auth/token/start -H "Content-Type: application/json" --data-binary @-)
POLL_BODY=$(printf '%s' "$START" | python3 -c 'import json,sys; print(json.dumps({"request_id": json.load(sys.stdin)["request_id"]}))')
printf '%s' "$POLL_BODY" | curl -s -A "$UA" -X POST https://infoviz.design/auth/token/poll -H "Content-Type: application/json" --data-binary @-; echo   # expect {"status":"pending"}
```

Rémy opens the emailed link (a "Connect this app?" page must appear and nothing is confirmed yet), presses **Connect**, then:

```bash
TOKEN=$(printf '%s' "$POLL_BODY" | curl -s -A "$UA" -X POST https://infoviz.design/auth/token/poll -H "Content-Type: application/json" --data-binary @- \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')
curl -s -A "$UA" -D - -o /dev/null -X POST https://infoviz.design/api/graphics/examples \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"query":"floods"}' | grep -i x-ratelimit-limit
curl -s -A "$UA" https://infoviz.design/auth/status -H "Authorization: Bearer $TOKEN"; echo
```

Expected: `x-ratelimit-limit: 10`; status `"authenticated": true`. Do not print or store `$TOKEN` anywhere else.

- [ ] **Step 4:** Record the smoke results in the ledger and update the Splash memory file `resume-2026-09-13-inspiration.md`.
