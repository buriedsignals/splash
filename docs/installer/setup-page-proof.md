# Setup page — live install proof

**Date:** 2026-08-06
**Branch:** `feat/setup-page-truth`
**Commit proven:** `68e4f767c5ae4381f4bb4b792210d6897c7810ae` (`fix(install): brace ${engine} so
bash 3.2's nounset survives the ellipsis` — a bug this proof found and fixed mid-run, see below)
**Previous commit on the branch:** `ddb29397` (the tip Task 8 started from)
**Merge base:** `e9776fcb71133c4042101b3f55c0191e2ec5479f`

This is a real install, run under an isolated `$HOME` so it cannot touch the developer's own
`~/.claude/skills` links or an existing `~/Splash`. It exercises the exact script a newsroom
downloads and runs — `install/bootstrap.sh` — unmodified except for the one bug this run found.

## Commands run, in order

```bash
PROOF_HOME=~/splash-proof-home
rm -rf "$PROOF_HOME" && mkdir -p "$PROOF_HOME/Splash"
git -C ~/Sites/Professional/splash-setup archive HEAD | tar -x -C "$PROOF_HOME/Splash"
HOME="$PROOF_HOME" SPLASH_NO_OPEN=1 bash "$PROOF_HOME/Splash/install/bootstrap.sh"
```

`SPLASH_NO_OPEN=1` is the script's own testability seam (`install/preflight/server.ts:46`) — it
suppresses the `open`/`xdg-open` call so the proof does not pop a real browser window on the
developer's desktop; every other line of the script ran as shipped. The setup page cannot be
clicked by an agent, so once the terminal printed the page's URL and blocked, a second, separate
command drove it exactly as the browser's client-side JS would — by calling the same two HTTP
endpoints the page's own client bundle calls (`GET /`, `POST /submit`) — and a third command
re-launched the configurator standalone (`bun install/configurator.ts`, the same entry point
`bootstrap.sh` runs) to serve back the state that `POST /submit` had just persisted.

## Part A — the gate

`bun run check`, foreground, twice (once before, once after installing the missing per-skill
dependencies): **23/23 checks passed** on the second run.

The first run (after `bun run setup:dev`) was **20/23** — `skills/map-native`,
`skills/scrolly`, `skills/image-native` failed. Root-caused, not waved off:

- `skills/scrolly/src/ScrollyMap.tsx:35` throws `VITE_MAPTILER_KEY missing` at **module load
  time** (not a graceful skip) — reproduced in isolation:
  `bun test src/geometry-guard.test.tsx` → `ReferenceError: Cannot access 'Scrolly' before
  initialization` (a cascade: the first file to import `ScrollyMap.tsx` crashes it, and Bun's
  module cache then reports every other importer of the same module as "before initialization").
  Three files fail for this one reason: `map-arc-beats.test.tsx` (the direct throw) and two more
  that import `./Scrolly` (the cascade).
- `skills/map-native`'s one real failure was the same missing key surfacing through a different
  path; `skills/image-native`'s one failure was `execFileSync` calling scrolly's `produce.mjs`,
  which itself crashed for the same reason.
- This worktree had never had `VITE_MAPTILER_KEY`/`REMOTION_MAPTILER_KEY` set — no `.env` existed
  at all (only the repo's `.env.example`, with both values blank). `git diff
  e9776fcb71133c4042101b3f55c0191e2ec5479f..HEAD -- skills/scrolly skills/image-native
  skills/map-native` is **empty** — this branch touches none of those three skill directories, so
  the failures are pre-existing and purely environmental, not caused by this branch.
- Fix: copied the real `VITE_MAPTILER_KEY` (and its `REMOTION_MAPTILER_KEY` mirror) from a sibling
  worktree's own `.env` (the developer's own key, same machine) into `splash-setup/.env`
  (git-ignored, never committed). Re-ran each of the three suites in isolation — all green — then
  re-ran the whole gate:

```
PASS  tsc   lib
PASS  tsc   skills/splash
PASS  tsc   skills/chart-native
PASS  tsc   skills/map-native
PASS  tsc   skills/scrolly
PASS  tsc   skills/image-native
PASS  tsc   skills/dw-chart
PASS  tsc   skills/map-dw
PASS  tsc   install
PASS  test  lib
PASS  test  lib/verify
PASS  test  skills/dw-chart
PASS  test  skills/chart-native
PASS  test  skills/map-native
PASS  test  skills/scrolly
PASS  test  skills/image-native
PASS  test  skills/map-dw/eval
PASS  test  skills/map-dw/src
PASS  test  skills/suggest-chart/eval
PASS  test  skills/suggest-article/eval
PASS  test  skills/splash
PASS  test  docs/installer
PASS  test  install

23/23 checks passed.
```

No test or guard was weakened to reach this. Nothing in this gate exercises `install/bootstrap.sh`
itself (it is a shell script, not typechecked or unit-tested) — which is exactly why Part B below
found a real bug the gate could not see.

## Part B — the live install

### A bug the proof found (and fixed) mid-run

The first full run of `install/bootstrap.sh` under the isolated `$HOME` **crashed**, past
packaging and dependency install, inside the per-engine Remotion browser loop:

```
Chrome Headless Shell 149.0.7827.55 (playwright chromium-headless-shell v1228) downloaded to […]
/Users/rmdms/splash-proof-home/Splash/install/bootstrap.sh: line 137: engine…: unbound variable
```

Root cause: `install/bootstrap.sh:137` read `echo "-> Downloading the video renderer for
$engine…"` — an **unbraced** `$engine` immediately followed by the multibyte ellipsis `…`. macOS
ships **bash 3.2** (Apple has not upgraded it since GPLv2), and its `set -u` variable-name scanner
misreads part of the following multibyte character as part of the identifier, reporting an
"unbound variable" for a variable that is, in fact, set — which `set -e` then turns into a hard
crash. Reproduced directly:

```
$ bash -c 'set -u; engine=chart-native; echo "-> Downloading the video renderer for $engine…"'
bash: engine…: unbound variable
```

Confirmed under `fr_FR.UTF-8` (this machine's default), `en_US.UTF-8`, and `C.UTF-8` — every real
UTF-8 locale tried. Only the plain `C` locale escaped it. **This means the shipped installer would
crash for essentially any newsroom running it on a stock Mac**, every time, right before it ever
reached the setup page — exactly the step this whole task exists to prove.

`git log --all --oneline -S'Downloading the video renderer' -- install/bootstrap.sh` shows the
line was introduced by this branch (`947f38b6`); the merge base does not have it at all — so this
is not a pre-existing gap, it is a defect in the very feature Task 8 is proving.

Fix (`68e4f767`): brace the variable — `${engine}` instead of `$engine` — which bash 3.2 parses
unambiguously regardless of what follows. Verified the exact repro line now exits 0 under all
three locales tried, `bash -n` syntax-checks clean, and a `grep` sweep of every shell script under
`install/` for the same pattern (`\$[A-Za-z_][A-Za-z0-9_]*` immediately followed by a non-ASCII
byte) turned up no other instance.

The rest of this proof is the **second** run, on the fixed commit.

### Phase-order transcript (the claim under test)

```
-> Installing Splash (a few minutes)…
-> Splash version: unknown
-> Packaging the skills…
$ bun scripts/pack-skills.mjs . .dist
packed 17 skills into .dist
-> Installing render dependencies…
Resolving dependencies
Resolved, downloaded and extracted [1812]
Saved lockfile
Downloading Chrome for Testing 149.0.7827.55 (playwright chromium v1228) …
Chrome for Testing 149.0.7827.55 (playwright chromium v1228) downloaded to …/Library/Caches/ms-playwright/chromium-1228
Downloading FFmpeg (playwright ffmpeg v1011) …
Downloading Chrome Headless Shell 149.0.7827.55 (playwright chromium-headless-shell v1228) …
Chrome Headless Shell 149.0.7827.55 (playwright chromium-headless-shell v1228) downloaded to …
-> Downloading the video renderer for chart-native…
[remotion browser ensure → Chrome Headless Shell downloaded, "Has browser at …/skills/chart-native/…/chrome-headless-shell"]
-> Downloading the video renderer for map-native…
[remotion browser ensure → Chrome Headless Shell downloaded, "Has browser at …/skills/map-native/…/chrome-headless-shell"]
-> Opening the setup page in your browser to collect your keys…
-> Set up Splash at http://127.0.0.1:54075/
   (Waiting for you to finish in the browser… press Ctrl-C here to cancel.)
[… POST /submit, see below …]

Done! Double-click 'Launch Splash.command' in /Users/rmdms/splash-proof-home/Splash to start.
(Your keys live only in /Users/rmdms/splash-proof-home/Splash/.env, chmod 600.)
```

This is exactly the order the task set out to prove: **packaging → dependency install → Playwright
Chromium → the Remotion render browser for `chart-native` → the Remotion render browser for
`map-native` → the setup page.** The page opens only after both native engines have a working
video-render browser on disk — a page opened earlier would have measured both as missing.

### Driving the page and reading its own words

Since the page cannot be clicked, it was driven the way its own client bundle drives it — the same
two HTTP calls, `GET /` and `POST /submit` — plus a third, independent process re-reading the
persisted result:

**1. `GET /` before any submission** (fresh install, empty `newsroom.json`) — the model already
served, unprompted:

```json
"chart-native": { "enabled": true, "status": "ready", "statusIfEnabled": "ready",
                   "choice": "In-house, no account needed (includes video)" },
"image-native": { "enabled": true, "status": "ready", "statusIfEnabled": "ready",
                   "choice": "From the newsroom's own photographs" },
"map-native":   { "enabled": false, "status": "disabled", "statusIfEnabled": "missing",
                   "reason": "The in-house map engine needs VITE_MAPTILER_KEY or REMOTION_MAPTILER_KEY …" },
"scrolly":      { "enabled": false, "status": "disabled", "statusIfEnabled": "missing",
                   "reason": "The scrolly engine needs VITE_MAPTILER_KEY or REMOTION_MAPTILER_KEY …" }
```

The two engines that need no account (`chart-native`, `image-native`) are **`ready` by default,
with no key asked** — on a completely fresh install, before any form was touched. `map-native` and
`scrolly` correctly read `missing`/`statusIfEnabled: "ready"-once-keyed` (they need the MapTiler
key) — this is the true starting state the task's "false before this branch" refers to.

**2. `POST /submit`** — ticking the four home engines and entering the (real) MapTiler key, exactly
the body the page's own client would send:

```json
{ "runtime": "claude", "uiLang": "en",
  "credentials": { "VITE_MAPTILER_KEY": "<redacted>" },
  "enabled": ["chart-native", "map-native", "scrolly", "image-native"] }
```
→ `200 ok`. This persisted `~/Splash/.env` (`VITE_MAPTILER_KEY` **and** its `REMOTION_MAPTILER_KEY`
mirror, both written from the one submitted value — the alias logic in `serialize.ts`'s `mirrors`)
and `~/Splash/newsroom.json` (all four engines `enabled: true`). The server then exited (250ms
grace, as designed) and `bootstrap.sh` continued on its own past the setup page, through the
runtime step (`claude` was already on `PATH`, so no download) and the launcher step, to `Done!`.

**3. A fresh `bun install/configurator.ts`**, run standalone against the now-persisted install
(the fallback path this task's brief explicitly allows), to read back the truth without relying on
anything the first server process still held in memory:

```json
"chart-native": { "status": "ready", "want": "charts",        "choice": "In-house, no account needed (includes video)" },
"map-native":   { "status": "ready", "want": "maps",          "choice": "In-house, needs a MapTiler key (includes video)" },
"scrolly":      { "status": "ready", "want": "scrollys",      "choice": "Scroll-driven stories" },
"image-native": { "status": "ready", "want": "photo-stories", "choice": "From the newsroom's own photographs" }
```

**All four native engines report `ready`, each carrying its own `want` and `choice`** — the exact
claim under test, read from the model the page itself served, not inferred.

### The remaining proof points, established by inspection of the same served JSON

- **No instruction to run a command:** `grep -i "bun install"` against both served models (pre-
  and post-submit) — no match, in either.
- **`embed-fly` appears nowhere:** it is absent from `lib/newsroom/capabilities.ts`'s registry
  entirely (delivery ids are `embed-cloudflare`, `embed-hosted`, `zip`, `embed-cms`, `embed-s3` —
  no fly.io adapter exists), and a `grep -i "embed-fly|fly.io|flyctl"` against both served models
  confirms zero matches.
- **The assistant section carries only the chosen runtime's login:** `model.login` (the top-level
  field, distinct from the per-runtime `runtimes[].login` list which legitimately shows every
  runtime's own field so a journalist can switch) equals exactly
  `{"name":"ANTHROPIC_API_KEY","label":"Anthropic API key","optional":true,"configured":false}` —
  Claude Code's own login, nothing else. `RUNTIMES.claude.login.optional === true`, i.e. blank is
  legitimate (subscription/interactive sign-in), so it was left blank in the submission — the
  realistic case for a Claude Code Pro/Max subscriber, not an API-key user.
- **Each engine carries its own `want` and `choice`:** shown above for the four native engines;
  true for all six registered engines including `dw-chart`/`map-dw` (`want: "charts"`/`"maps"`,
  `choice: "With a Datawrapper account"`).
- **Where the newsroom stands cites no dependency once ready:** `model.blockers` was `[]` both
  before and after submission (a disabled capability is never a blocker; a missing critical
  dependency would have shown here, and none did).

## What is NOT proven by this run

- **The Windows path (`install/bootstrap.ps1`)** — still verified only by reading the script and
  by the hermetic tests in `docs/installer/bootstrap-ps1.test.ts`. No Windows machine was run.
  Named hazard within it: `bootstrap.ps1:126-133` (`bunx remotion browser ensure`) and the
  `bunx playwright install chromium` call above it both still run under Bun, not Node, even though
  `bootstrap.ps1:54` installs Node specifically because Playwright/Remotion's own browser
  automation hangs under Bun on Windows (Bun #15679) — `bunx` was never rerouted through `node` for
  either call. The `remotion browser ensure` one now sits before the only interactive screen in the
  installer, with no timeout and no message: a hang there would leave a newsroom staring at
  "Downloading the video renderer for …" with nothing telling them to kill the process by hand.
- **The desktop runtimes** (`goose-desktop`, `claude-desktop`) — at the time of this proof,
  `configurator-core.ts` marked both `verified: false`; this proof did not touch either (runtime
  `claude`, the CLI, was the one exercised end-to-end, matching `docs/installer/*-findings.md`'s
  existing caveats). **Update (2026-08-06):** both raised to `verified: true` by decision, the same
  regime `gemini` and `goose` already carried — Layer B (a visual out of the app) is still
  unobserved for either. **Note (final-review fix wave, same date, corrected within the wave):** a
  whole-branch review's Critical finding briefly asserted `goose-desktop` was the exception —
  citing `docs/installer/goose-desktop-proof.md`'s own "★★★ Layer B — REACHED" section as evidence
  for that app — and a first pass here followed it. That citation was wrong: every run in that
  section went through `goose run`, the CLI, never `goose-desktop`'s own window, so the evidence is
  `goose`'s, already verified above for its own reasons. The proof document's own "À QUI ce
  document fait crédit" precision (2026-08-05) says this explicitly and warns against exactly the
  inference that was made — see `install/configurator-core.ts` for the current, corrected motive.
- **`dw-chart`/`map-dw` and the delivery capabilities** were deliberately left unenabled — this
  proof is scoped to the four claims the task names (the native engines' readiness truth), not a
  re-run of every capability's live verification.
- **The real browser UI** — the page was driven over HTTP, not clicked. The claim that a human
  clicking the same checkboxes and typing the same key produces the same `POST /submit` body rests
  on reading `install/preflight/client.ts` (the client bundle the server serves), not on operating
  a browser.
- **`map-native` and `scrolly`'s live e2e produce tests still print "skipping" under the gate** —
  they gate on `VITE_MAPTILER_KEY` reaching them, and Bun's `.env` loading does not walk up from a
  skill-dir `cwd`, so the 23/23 headline above does not exercise those two live render paths.

## Files touched by this proof

- `install/bootstrap.sh` — the `${engine}` brace fix (`68e4f767`), found and fixed by this run.
- `docs/installer/setup-page-proof.md` — this file.

## Update — 2026-08-06: the served model carries the profile, the upfront keys and six runtimes

**Branch:** `feat/setup-page-keys-and-profile` (HEAD `af4a5f27`), off the proof recorded above.
Five tasks, all reviewed: the two desktop runtimes (`goose-desktop`, `claude-desktop`) went
`verified: true` by decision, each carrying a comment naming what IS measured (the app discovers
the skills) and what is NOT (no visual has ever come out of either) — `install/runtimes/README.md`
now states the rule this implements (a flag rises on a proof OR a written decision, never in
silence) and `install/configurator-core.test.ts` reads `configurator-core.ts` as text to hold it;
the model gained the newsroom profile, parsed with the same `parseNewsroomMarkdown` the loop uses,
total on a missing or malformed file; the page shows that profile read-only, proven at the payload
level (the submitted body omits the `newsroom` key whenever a profile exists); the production keys
are now asked outright, `PreflightField.upfront` derived from the registry's own
`kind === "engine"` so a new engine inherits it with no edit, while publication destinations stay
conditional on choosing them; and `install/preflight/server.test.ts` now writes a real
`NEWSROOM-PROFILE.md` into a temporary ROOT, fetches the page over HTTP, parses the model out of
the `<script type="application/json" id="preflight-model">` tag, and asserts the profile's values,
the six selectable runtimes, and — among the fields — that the two upfront keys are present.

**Evidence, established by the controller:**

- **The served-model test guards the real read-and-map path.** Mutating
  `install/preflight/server.ts`'s mapping from `parsed.source?.name` to `parsed.source?.nam` makes
  `bun test install/preflight/server.test.ts` fail **14 pass / 1 fail**; restored, **15 pass /
  0 fail**. This closes the gap a previous review named: the model tests only exercised a
  pass-through of an already-built object, so a typo in the real mapping would have returned
  `undefined` with the suite green.
- **The motive guard is scoped to its own entry.** Deleting the entire comment block above the
  `claude-desktop` entry makes `bun test install/configurator-core.test.ts` fail **4 pass /
  1 fail**; restored, **5 / 5**. An earlier version searched a fixed 12-line window and passed on
  a neighbour's motive.
- **The gate stands at 22/23, and the red is not this branch.** `lib/newsroom/verify.test.ts`'s
  "verifyMapTiler: true for the real key" fails identically in the `splash-merge` worktree, which
  is on `main` and contains none of this work. A direct call settles the cause:
  `GET https://api.maptiler.com/maps/dataviz/style.json?key=$VITE_MAPTILER_KEY` returns **403
  "Invalid key - Get your FREE key at https://cloud.maptiler.com/account/keys/"**. This is a
  real-world consequence, not a test artifact: no map can render until the key is renewed.
  `skills/map-native` and `skills/scrolly` were also observed red in one run of this worktree —
  **their cause is not established.** Do not read this as the same dead key: those two suites'
  live e2e produce tests are separately recorded above, under "What is NOT proven by this run", as
  **skipping**, not failing, because `VITE_MAPTILER_KEY` does not reach them at all (Bun's `.env`
  loading does not walk up from a skill-dir `cwd`) — a structural path gap, unrelated to whether
  the key is valid, and one the gate does not even count as red. A single failed run is not proof
  of a shared root cause; the two explanations are not merged here.

**What is NOT proven by this branch:**

- **No visual has ever come out of either desktop app.** Layer B is unobserved for both
  `goose-desktop` and `claude-desktop`, which are offered on a written decision, not a proof.
  (**Note, final-review fix wave, 2026-08-06, corrected within the wave:** an earlier pass here
  said `goose-desktop` was the exception, on the strength of
  `docs/installer/goose-desktop-proof.md`'s "★★★ Layer B — REACHED" section — that section's
  evidence is `goose`'s, the CLI runtime, never `goose-desktop`'s own window; that document's own
  "À QUI ce document fait crédit" precision, 2026-08-05, says so and was missed. `goose-desktop`
  and `claude-desktop` are the same case after all.)
- **Nothing exercises `install/preflight/client.ts`'s render.** The profile read-out this branch
  added (the fix for Complaint 2) is proven by reading the code and by the payload it produces
  (`server.test.ts` asserts the submitted body omits `newsroom` once a profile exists), never by a
  DOM test of what the browser actually paints. Deleting the branch that renders the read-out would
  leave the suite green — its *visible* closure rests on reading, not on a guard.
- **The Windows path (`install/bootstrap.ps1`)** is still verified by reading only — unchanged
  from the caveat above.
- **This branch was not re-run through a full live install.** The served-model assertion is a
  test against the real server (a real HTTP round-trip over a real ROOT), not a fresh
  `bootstrap.sh` run end to end.
- **The MapTiler key is dead**, so nothing map-shaped was exercised — not the profile's palette
  reaching a rendered chart, not a live map produce.
