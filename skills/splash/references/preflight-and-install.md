# Preflight, the newsroom profile, and the Engine-managed install

Owned by `scripts/preflight.mjs`, `scripts/newsroom.mjs`, `scripts/keys.mjs`, and
`installer/configure.mjs`. Splash's operating contract carries the one-paragraph rule; this
reference keeps the detailed preflight and installation behavior beside its owning scripts.

## Preflight establishes what is possible — it does not validate an environment

`runPreflight` answers two different questions separately: "can this session run at all"
(`ready`) and "what can this session honestly offer" (`capabilities`). It used to conflate them —
a chart-only story was told its environment had failed because `MAPTILER_KEY` was absent, a key it
would never touch.

**A key gates a capability, never the session.**

| key                 | opens                          | when required                                                              |
| ------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| `MAPTILER_KEY`      | map beats                      | only if the story has a map                                                |
| `DATAWRAPPER_TOKEN` | Datawrapper beats              | only if the story uses one                                                 |
| Cloudflare Pages    | the hosted embed delivery form | never blocks the session — probed like the other two, opens a real form    |

`runPreflight({root, env, fetchFn})` returns `{ready, blockers, checks, capabilities}`:

- `checks` holds only the two facts that can block the session outright: `dependencies` and
  `newsroom-profile`. `ready` is true exactly when neither is a blocker.
- `capabilities.map` / `capabilities.datawrapper` / `capabilities.hostedEmbed` each carry
  `{available, reason}` (plus `opens`, the label from the table above). A missing or rejected key
  narrows `capabilities` and never appears in `blockers`.
- An available `hostedEmbed` also carries `companionScriptUrl` and `whitelistOptional: true`: the
  script loads automatically; the exact URL is disclosed for newsrooms whose CSP or script blocker
  requires an explicit allow-list.
- `assertPreflightReady(report)` throws, naming every blocker, when `ready` is false, and does
  nothing otherwise. Call it once, right after `runPreflight` — it is the mechanical stop, not a
  line of prose a caller must remember to honour. It never inspects `capabilities`.
- `capabilityGap(capabilities, medium)` is the seam a later phase reads before offering a medium:
  `null` when open, otherwise the exact line to surface, phrased as an unavailable **capability**
  ("map beats are unavailable: …"), never as an environment failure. A chart-only story never calls
  it with `"map"`, so a missing map key never reaches it.

**Never silent.** The run states three things and asks one thing, in one turn:

1. **The newsroom's identity, read back.** `checkNewsroom` carries the parsed `profile` on its
   check; state the values and which are present. On `missing`, offer the three branches by name:
   derive it with **newsroom-charter** (it measures the newsroom's own website) · supply your own
   (`assets/root-template/NEWSROOM.example.md` documents every field) · decline, recorded. On
   `pass`, still say what it holds.
2. **Credits.** The optional seventh field `credit` is the newsroom's standing convention. When
   absent, say so plainly — credit is then asked per story (it is hand field 5) rather than
   discovered later.
3. **The capabilities, with what would open each.** Every row names its provider and acquisition
   page; it never asks for or carries the value.

When any capability row is closed, use one of two paths or continue without that optional capability:
Indicator Labs users save the missing key in the desktop app; open-source users have a trusted local
agent prepare Engine's protected `bsig` stdin/keychain flow for the exact ID and enter the value only
through a private operating-system or terminal prompt. Never put a credential in chat, command
arguments, shell history, a repository `.env`, or the Splash studio/setup page. Studio Readiness
reports status only. Newsroom identity stays on the setup page; refresh status after configuring keys.

## The newsroom's identity has four honest outcomes

`newsroom-profile` in `checks` is exactly one of:

- `pass` — `NEWSROOM.md` present and complete.
- `missing` — nobody has answered yet. This is where newsroom-charter plugs in: offer to derive a
  profile by measuring the newsroom's own website, and offer to skip. Whichever it does, it must
  leave `NEWSROOM.md` resolved — a complete valid profile or the declined shape below. Nothing else
  counts as resolved.
- `declined` — the journalist was asked and said no, recorded in `NEWSROOM.md`'s own front matter as
  `decision: declined` (`isDeclinedProfile` in `scripts/newsroom.mjs`, checked BEFORE
  `validateNewsroom` runs, so a declined stub is never scored against fields it was never meant to
  carry). **A declined theme is a recorded choice, not a silent default**: it behaves like `pass`
  for `ready`, but a later reader must tell it apart from `missing` — `missing` means "ask";
  `declined` means "already asked, the answer was no". Reading a declined profile and "fixing" it by
  inventing a default colour would publish a visual in a colour nobody chose; an explicit refusal
  is not that.
- `fail` — a file exists, was meant to answer, and does not (unparsable front matter, or short of a
  required field). The only outcome besides `missing` that blocks the session.

**A newsroom is not monilingual, and its palette is not one colour.** `NEWSROOM.md` records
`languages` (comma-separated, most-used first) and, beside the primary `brandColor`, an optional
`accents` list; both read back via `newsroomLanguages` / `newsroomAccents`. The older singular shape
(`language: fr`, no accents) stays exactly as valid. Two rules make the plural safe:

- A singular naming a language the plural does not hold is REFUSED as a contradiction, not silently
  resolved — one of the two lines is stale. The language of a visual follows the ARTICLE and is
  confirmed with the journalist; the recorded list is what that confirmation chooses among.
- Every recorded accent is measured against the ground by palette, exactly like the primary, and
  `recommended` only ever names a measured pass. A longer palette is not a way past the 3:1 non-text
  contrast floor; a failing accent is shown failing, with the nearest passing variant offered beside
  it and never applied.

A fresh managed install leaves the newsroom at `missing` until the journalist answers it; the
tracked template is an example, never the active profile. The Splash studio starts
`installer/configure.mjs` through Engine; its protected setup page writes the manifest-owned
external `NEWSROOM.md` after validating it with this same reader, and OFFERS derivation
(`POST /derive` runs newsroom-charter and shows every proposed value beside the declaration it was
read from). It proposes; only the form's own submit writes. Leaving it blank there is also an
answer — preflight then reports `missing`, which is the prompt to invoke newsroom-charter. Either
path lands `NEWSROOM.md` resolved; the example file left un-renamed is the one shape that never
resolves.

## Managed map production is declarative

After a map treatment and format are confirmed, write `beats/<outputId>/MAP-BAKE.json` using
`references/managed-map-bake.md`. The closed `map-bake` operation accepts only the story/output
identity and that contract's SHA-256 digest. Engine verifies the contract and its story-local
geography/data digests before it releases `MAPTILER_KEY`, then uses only its recorded browser and
the installed local MapLibre files. Outputs are immutable and digest-addressed beneath the beat.
Never dispatch the fixed Europe or Potomac proof cameras for an unrelated story.

**Engine owns the production credential names and values.** `MAPTILER_KEY`,
`MAPTILER_DELIVERY_KEY`, `DATAWRAPPER_TOKEN`, and `CLOUDFLARE_API_TOKEN` are the canonical IDs shown
by Indicator Labs and reported as status in the Splash studio. Indicator Labs collects them for
managed installations. In an open-source installation, a trusted local agent may prepare Engine's
protected `bsig` stdin/keychain flow, but the journalist enters each value only through a private
prompt outside agent chat and Splash. Engine validates and stores values through the operating-system
credential broker, then hydrates only the closed operation that requires one. Studio Readiness never
accepts a pasted value. `resolveEnvKey` still accepts historical aliases when an explicit legacy root
is inspected or run during migration — read-only compatibility input, not the setup path and not a
reason to ask for a credential in chat.

## The Engine-managed development install and its data boundaries

One command backed by an Engine plan/apply transaction, with distinct owned locations:

| State                                                                             | Authority                                                 |
| --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| explicitly adopted current checkout and complete current lockfile dependency tree | Engine removable install state                            |
| browser compatible with the current Puppeteer dependency                          | Engine runtime state                                      |
| direct skill projections from the adopted checkout                                 | Engine transaction + projection ledger                    |
| story directories                                                                 | Engine-created, manifest-owned external data-bearing root |
| `NEWSROOM.md`                                                                     | manifest-owned external data-bearing configuration        |
| provider credentials and validation receipts                                      | Engine's operating-system credential broker               |
| `extensions.splash`                                                               | Engine's revision-checked Goose configuration transaction |

Operations run the installed checkout in place with package installation and automatic `.env`
loading disabled; they receive only their declared credential IDs and canonical external paths. No
per-run copy of checkout, dependency tree, Bun runtime, or browser is made. Flat skill links are
reconciled inside the same Engine apply/uninstall transaction; legacy `place-skills.mjs` is not a
second managed installer. The shell wrapper does not create the stories root ahead of Engine; a
missing root is created by adoption and removed if that transaction rolls back while empty.
`scripts/splash-root.mjs` and the root template remain bounded read-only compatibility for an
explicitly operated copied root. The setup server has no plaintext branch: new setup uses the Splash
studio and status-only broker-backed controller.

## The localhost studio is a view of the same gates

After the journalist confirms the exact Engine-inspected story path in the studio session,
À-la-carte reads only the current canonical gate and presents its reachable catalogue choices in
stable order. Focus, filtering, details, setup links, and cancellation write nothing. Confirm must
carry the observed story, catalogue, and capability revisions through the shared selection service;
conflicts refresh instead of guessing. Changing publication format or treatment is a separate
explicit rewind. If the studio page is unavailable, keep the textual human gate rather than treating
a model call as confirmation.
