# Survey — the installer

**Scope.** C2 in `FEEDBACK-2026-08-10.md`: install the twin the way Spotlight is installed, using
Tom's engine, so that the install *configures* the tool and *collects what it needs to work*, and
leaves preflight green on the host the journalist actually uses.

**Owner's ruling, mid-survey, and it reframes this file:** *"oublie open source MIT pour le moment
pour l'installateur, passe outre."* The engine's private, unlicensed state is **deferred, not a
blocker**. This survey therefore treats the engine as available — for the pilot it is. The licence
facts are recorded in §7 so the day the release is prepared does not come as a surprise.

Everything below is marked **measured** (I ran it, or read it at a named file:line) or **inferred**
(a conclusion from measurements, stated as such and worth testing).

---

## 0. The headline, before the detail

**Measured.** There is no installer, and the thing an installer would be judged by — `runPreflight`
returning `ready: true` — currently returns `ready: true` on a root that can render **one** of the
four genres the twin ships.

`splash/SKILL.md:352-355` states the current install in its own words:

> `assets/root-template/` — `package.json` …, `tsconfig.json`, `NEWSROOM.example.md` — copied into
> a fresh Splash root. **This is the whole install: there is no separate installer script**, so what
> lands under this directory is exactly what a newsroom ends up with.

And `JOURNALIST-TEST.md:29-31` is the operator's version of the same thing: *copy the folder,
`bun install`, add a `.env` with the keys, write a real `NEWSROOM.md`, run the preflight, it must be
green before they sit down.*

That is an honest and deliberately small install. The problem is not its size — it is that **what
lands is not what the twin needs**, and preflight is constructed so that it cannot notice. §5 is
the measurement. Fixing that is the smallest first step (§8), it is worth more than any engine
integration, and it depends on nothing that is deferred.

---

## 1. How Spotlight actually installs — the mechanism, measured

Read from `buriedsignals/spotlight` (public, MIT) at `install-spotlight.sh` (1736 lines),
`install/setup_server.py` (849 lines), `install/engine_bridge.py`, `install/configure.html`.

### The shape

```
curl -fsSL https://spotlight.buriedsignals.com/install-spotlight.sh | bash
```

`install-spotlight.sh:1-19` describes its own contract, and the body honours it:

1. **One static, reviewable, key-free script**, served over HTTPS from the product's own domain
   (the repo carries `CNAME`, `index.html`, `setup.html`, `.nojekyll` — GitHub Pages).
2. The script **launches a local configurator on 127.0.0.1** — `install/setup_server.py` serving
   `install/configure.html`. Every choice and every API key is typed **on that local page**.
   Stated rationale, verbatim: *"Keys never appear in the shell command line, in shell history, or
   on any hosted page."*
3. Answers are **staged** to `~/.config/spotlight/setup-config.env` and `~/.config/spotlight/.env`,
   **both `0600`**.
4. The script **sources the staged artifacts** and the install body takes over.
5. A **headless path** exists for CI: `bash -s -- --headless` with the required env vars
   pre-exported, guarded by `${VAR:?...}` (e.g. `install-spotlight.sh:186`). The docstring even
   tells you to load them from a `0600` env file rather than inline `export` — the
   no-keys-in-history guarantee holds on that path too.
6. A **`--dry-run`** flag prints what the body would do without touching the system.
7. A **reuse gate** (`:60-80`): a completed install reconfigures in place without retyping keys.

### Where the files land — the skill placement contract

`install-spotlight.sh:370-403` implements, and cites by name, the engine's
`docs/skill-placement-contract.md`:

```
~/.agents/skills/<product>/<id>   ->  <checkout>/<skill path>     (symlink, canonical, every runtime)
~/.agents/skills/registry.json                                    (generated, never hand-edited)
```

Then **one product-level adapter symlink** per runtime that has its own skills dir:

| Runtime | Skills dir | Placement |
|---|---|---|
| goose | `~/.agents/skills` (scanned **recursively**) | canonical store only — no adapter |
| claude (local) | `~/.claude/skills/` | `<dir>/<product>` → canonical product namespace |
| opencode | `~/.config/opencode/skills/` | same |
| pi | `~/.pi/agent/skills/` | same |
| codex | none | AGENTS.md contract |
| gemini | none | AGENTS.md contract via `GEMINI.md -> AGENTS.md` |

Confirmed in the engine's own Go source, `internal/skills/place.go:19-49` — `runtimeAdapters` maps
opencode/pi/claude only; `CanonicalRoot = ".agents/skills"`; goose "reads the canonical store
natively"; codex/gemini "use the AGENTS.md contract".

Two defensive details worth stealing outright:

- **A symlinked `~/.agents/skills` is treated as user-managed** (`install-spotlight.sh:378-386`) —
  the installer never mkdirs or places links through it, and falls back to a private store at
  `~/.local/share/spotlight-skills/spotlight`. Rationale in the comment: placing through it would
  mutate the target repository.
- **`link_spotlight_adapter` (`:417-435`) never deletes user data.** If the adapter dir holds real
  (non-symlink) files it refuses to collapse it and **falls back to flat per-skill links**
  (`link_spotlight_skills`, `:388-403`). That fallback matters in §4.

### The success condition: a generated `spotlight-doctor`

`install-spotlight.sh:1470-1543` **writes a doctor script into `~/.local/bin/spotlight-doctor`**,
tailored to what was actually configured. It checks paths (`.git`, `AGENTS.md`, config, `.env`,
vault, cases), commands (`qmd`, and a runtime-specific one — `claude`/`codex`/`pi`/`opencode`/
`llama-server`), env-var **names present in `.env`** (never values), and then delegates the last
word to the product's own preflight:

```
(cd "$SPOTLIGHT_DIR" && set -a && . .env && set +a && python3 integrations/preflight.py --text)
  && ok "Integration preflight" || bad "Integration preflight reported issues"
```

**This is the pattern the twin should copy exactly**, because the twin already owns the right-hand
side of it (`runPreflight`). Spotlight's doctor checks what preflight structurally cannot see — the
host wiring, the CLIs, the placement — and then hands over. A sibling `spotlight-update` is written
the same way.

### Windows

`install-spotlight.sh:444-447`: macOS or Linux only, **Windows told to use WSL**, hard exit. Not a
gap they closed; a scope they declared.

---

## 2. What the engine actually offers, and how hard the dependency is

> **CORRECTION, 2026-08-10, after reading MYCROFT as well as Spotlight.** The conclusion below —
> "the engine is a build-time tool" — is right about the `bsig` BINARY and wrong about the engine's
> OUTPUT, and the difference matters. This survey grepped the shipped installer for
> `bsig|engine|Engine` and found only comments. But the engine's output ships under other names:
> `bootstrap.sh`, `applicator.py`, `bundle.json`, `bundle.sig`. **The first thing both installers do
> is download and execute engine-built code**, SHA-256-pinned:
>
> ```sh
> PUBLIC_BOOTSTRAP_SHA256="ebe0a8b707f4b891e2b9c87fe6b65da5e31f6a4140361faf0d99400c4f9a47a7"
> curl -fL "$PUBLIC_RELEASE_BASE/bootstrap.sh" -o "$PUBLIC_BOOTSTRAP_TMP"
> [ "$PUBLIC_BOOTSTRAP_ACTUAL" = "$PUBLIC_BOOTSTRAP_SHA256" ] || exit 1
> bash "$PUBLIC_BOOTSTRAP_TMP" --product mycroft --release-base "$PUBLIC_RELEASE_BASE" --runtime goose
> ```
>
> — `mycroft/install.sh:18-33` and `spotlight-install.sh:318-335`, **the same hash in both repos**:
> one engine-built artifact, two products. The long script body only runs on re-entry via
> `--provision-from-public-bundle`.
>
> So the owner is right that Spotlight AND Mycroft use the engine, and this survey is right that
> `bsig` never runs on a journalist's machine. Both, exactly as `FEEDBACK` Part C anticipated.
>
> **Where the engine acts:** release time, on Tom's CI runner —
> `engine/.github/workflows/public-installer-release.yml:44` runs
> `bsig export public-installer --product "$PRODUCT" …`, `product` being a `workflow_dispatch`
> choice of `[mycroft, spotlight]` (`:10-13`), signing with an org secret (`:52-58`).
>
> **A dormant local path exists in both** — `install/engine_bridge.py` really does
> `shutil.which("bsig")` (`:24-26`) and `subprocess.run` it (`:30`) — but both installers hard-code
> `--legacy-only` (`spotlight/install-spotlight.sh:147`, `mycroft/install.sh:1158`) and both servers
> gate on it (`setup_server.py:675` / `:584`). Mycroft additionally has an `--engine-required` mode
> that ERRORS without the engine (`setup_server.py:589-591`) — nothing shipped passes it; inferred
> to be the Indicator Labs desktop path, where `bsig` is already present.
>
> **What this changes for the twin: nothing about the ordering, and it hardens the reason.** §8's
> "build the legacy path first" is still right, and now for a measured rather than a prudential
> reason — the engine could not run a Splash install today even if Tom added the catalog entry:
>
> - `internal/execpolicy/policy.go:34-180` `DefaultTable()` allowlists `brew, npm, git, python3,
>   python, uv, crawl4ai-setup, crwl, docker, goose, ollama, xattr, codesign, qmd, ok, obsidian,
>   scout, navigator, dev-browser, claude, gemini, codex, flue, llama-server, installer,
>   xcode-select, osascript, open`. **No `bun`, no `bunx`, no `npx`, no `playwright`, no `remotion`.**
>   And `npm` is pinned to `ci --include=dev --ignore-scripts …` (`:48-55`) — `--ignore-scripts`
>   alone defeats a Puppeteer/Remotion install.
> - the public-installer vocabulary is 12 operation types (`internal/publicinstall/validate.go:22-35`)
>   with **no general command runner** at all; `package_install` accepts only
>   `{"brew","npm","python"}` (`applicator.py:768`).
> - `cmd/bsig/configure_verb.go:23,31` and `export_verb.go:12` hard-code `<mycroft|spotlight>`;
>   `catalog/catalog.json` has zero occurrences of `splash`.
>
> Adopting the engine therefore costs: a signed `catalog.json` entry, a new `internal/products/splash`
> Go package, two widened verb guards, and a widened execpolicy — all of them Tom's, in a private
> repository. What the twin forgoes meanwhile is real and worth naming: a signed immutable update
> channel, transactional install with rollback, and receipt-scoped uninstall.

### It is a BUILD-time tool, not a runtime dependency — measured

`engine/public-installer/README.md`, first paragraph, verbatim:

> Engine is the build-time source for public Mycroft and Spotlight installation contracts.
> **Website users never download or execute Engine.** Release automation exports `bundle.json`,
> `bundle.sig`, `applicator.py`, `bootstrap.sh`, and the dedicated public-installer verification
> key.

Corroborated by grepping the shipped installer: **`install-spotlight.sh` never invokes `bsig`.**
The only three hits for `bsig|engine|Engine` in 1736 lines are comments — `:371` citing the
placement contract doc, `:375` noting `skills.manifest` is *generated by* the engine release export
(**with an on-disk fallback if absent**, `:395-402`), and `:1098` a note about Flue's cwd.

And where the engine *is* reachable, it is **optional and degrades**:

- `setup_server.py:37-45` — the `engine_bridge` import is wrapped in `try/except ModuleNotFoundError`
  installing a stub that raises `EngineUnavailable("Engine bridge is unavailable in the public
  installer")`.
- `setup_server.py:673-680` — construction is wrapped in `except (EngineUnavailable, RuntimeError,
  KeyError): pass`, leaving `engine_bridge = None`.
- `setup_server.py:771-773` — `/engine-submit` returns 404 *"Engine configuration is unavailable in
  this public install."*
- A `--legacy-only` flag forces the engine-free path (`:675`, `:787`).
- `engine_bridge.py:24-27` — the bridge finds `bsig` via `$BSIG_BIN` or `shutil.which`, and raises
  `EngineUnavailable("bsig is not installed")` otherwise.

**So there are two configurators in one product**: engine-managed when `bsig` is on the machine
(and then the legacy POST is 410'd, `:787-789`), legacy/public otherwise. This is precisely why the
licence question can be deferred without stalling the work — **the public path was designed to run
without the engine from the start**.

### What `bsig` provides, concretely

Verb surface (`cmd/bsig/main.go:262`):

```
auth, keys, catalog, configure, export, plan, adopt, apply, doctor, run,
welcome, spotlight, compute-probe, bootstrap
```

The four an installer touches, as exercised by `engine_bridge.py:50-73`:

| Call | What it gives |
|---|---|
| `bsig configure describe <product>` | the signed **descriptor** — the form the configurator renders |
| `bsig configure validate <product>` (request on stdin) | normalisation + `required_secret_ids` |
| `bsig keys list` / `bsig keys set <id>` (value on **stdin**) | a **credential store**, keyed by id, with a `stored` flag |
| `bsig configure plan <product>` (request on stdin) | a **sealed plan** the bootstrap applies |

Output is **JSON-lines events on stdout**; the bridge takes the last event and reads `data`. Errors
surface as an `event: "error"` line.

The product registry is `catalog/catalog.json` (44 KB), **minisigned** (`catalog.json.minisig`,
`bsig-release.pub`). Measured shape:

- `products` — **`["mycroft", "spotlight"]`**. Each carries `version`, `repo`, `ref`,
  `entitlement`, and an `install_contract` (`schema_version`, `source_commit`, `digest`,
  `writer_mode: "engine_v2"`, `choice_schema`, `config_schema`, `template.document`).
- `skills` — **33 entries**, each with `id`, `name`, `audience`, `entitlement`, `path`,
  **`requires_keys`**, `version`, `products`, `essential`, `runtimes` (`any`/`goose`/`spotlight`),
  `content_repo`, `kind` (`portable` | `coupled`), and for portable ones a `package` block with a
  `sha256`.
- Also `artifacts`, `dependencies`, `providers`, `cloud_models`, `models`, `integrations`.

The release channel is signed end to end (`public-installer/README.md`): `bsig export
public-installer --product <p> --release <v> --source-ref <tag>` produces the bundle; the bootstrap
is **pinned by SHA-256** in the HTTPS-served installer, verifies `bundle.sig` with a dedicated P-256
key, reads the applicator digest from the verified bundle, and only then runs the applicator, which
repeats both checks before any mutation. `applicator.py --action install|update|finalize|verify|
uninstall` owns only the paths in its receipt, rolls back git heads and filesystem preimages on
failure, and refuses to delete changed or foreign files.

### What the twin would gain, and what it would owe

**Gain (measured capability, real):** a signed release channel with rollback and a receipt-scoped
uninstall; a credential store so keys need not sit in a plaintext `.env`; the placement contract
already implemented and tested across six runtimes; `bsig doctor`.

**Owe:** a `products.splash` entry with an install contract, plus 15 `skills[]` entries — **and
`catalog.json` lives in the private repo and is minisigned**, so the twin cannot add itself. Every
catalog change is a change Tom makes. Note `requires_keys` is exactly where `MAPTILER_KEY` would be
declared per-skill; only one of 33 current skills uses it (`scoutpost`).

### The blocker that decides the ordering — measured on the original

The original Splash asked this exact question and read the answer out of the engine's source. From
its design spec (`splash-provision/docs/superpowers/specs/2026-08-06-provisioning-core-and-skill-placement-design.md:29-33`),
presented there as read-not-assumed:

> **Aucune étape de commande générique.** … `internal/execpolicy` … `npm` y est, limité à
> `ci --include=dev --ignore-scripts --no-audit --no-fund` … **`bun` n'y est pas.** `playwright` et
> `remotion` non plus.

**So the engine, as of its 2026-07-21 state, cannot execute a single one of the phases a Splash
install needs** — the toolchain is Bun, and the browsers come from Playwright and Remotion. Adopting
it requires Tom to add a `bun` execpolicy entry. That request was identified and, per the original's
own record, **never made**.

**Practical read (inferred, and the original reached it independently):** build the **legacy path
first** — a static installer plus a local configurator, engine-free, the way Spotlight's public path
already works and the way the original's provisioning core already does (§6). The engine becomes an
*upgrade* (signed channel, key store), not a prerequisite. That ordering is also what keeps the
deferred licence question cheap to revisit in either direction.

---

## 3. What the twin needs collected at install time — measured inventory

### The keys

`scripts/keys.mjs:15-20` defines the canonical set and its aliases (aliases exist so a `.env` that
already works for the *original* Splash is not retyped — canonical always wins, `:25-31`):

| Canonical | Aliases read as fallback | Gates |
|---|---|---|
| `MAPTILER_KEY` | `MAPTILER_API_KEY`, `REMOTION_MAPTILER_KEY`, `VITE_MAPTILER_KEY` | every map beat |
| `DATAWRAPPER_TOKEN` | `DATAWRAPPER_API_TOKEN` | Datawrapper beats |
| `CLOUDFLARE_ACCOUNT_ID` | — | hosted embed delivery |
| `CLOUDFLARE_API_TOKEN` | — | hosted embed delivery |

Each is **probed for real**, never merely checked for presence (`keys.mjs:99-114`): a live
`api.maptiler.com/maps/dataviz/style.json`, `api.datawrapper.de/v3/me` with a bearer token, and
`api.cloudflare.com/client/v4/accounts/<id>`. A key that answers 403 fails. That discipline is
right and the installer should not weaken it.

**Two more the install must handle and `recordKey` currently cannot — measured:**

- **`MAPTILER_DELIVERY_KEY`.** Ruling R1b requires a *second, domain-restricted* MapTiler key for
  delivered files, and `deliver/scripts/deliver.mjs:217` already reads it **before**
  `MAPTILER_KEY`. It is **absent from `KEY_ALIASES`**, and `recordKey` throws on any name not in
  that map (`keys.mjs:50-54`). So the one code path that accepts a key from a journalist **refuses
  the key the owner's own ruling requires**. Small, sharp, and squarely an installer concern.
- **A browser.** `bake.mjs` / `bake-plate.mjs` across the map beats need Chrome and say so
  themselves: *"no Chrome to capture with … Set `CHROME_PATH`, or run `bunx puppeteer browsers
  install chrome`"* (e.g. `proof/mapmore-flow-danube/bake.mjs:64,77`). **Nothing installs it and
  preflight does not check for it.**

### `NEWSROOM.md` — and the twin already owns half of this

Six required fields (`assets/root-template/NEWSROOM.example.md`): `name`, `url`, `language`,
`brandColor`, `ground`, `typefaces`, plus optional `credit` (the house credit convention, so a
journalist is not asked to invent a credit line per story).

**`newsroom-charter` derives four of the six by measuring the newsroom's own website** — the
owner ran it against heidi.news and got name, language, brandColor and typefaces, each beside the
declaration it was read from, with `ground` correctly refused rather than invented. The skill's own
rules (`SKILL.md:20-40`) are exactly what an installer wants: every value ships with its evidence;
it **proposes and never writes** (`deriveCharter` has no write path); an unevidenced field is
`null`, listed in `unresolved`, and turned into a question.

**So the "collect the newsroom's identity" half of the install is a skill that exists.** What is
missing is the last inch: *nothing turns a confirmed proposal into `NEWSROOM.md`*. `SKILL.md:29-31`
says so — *"Turning a confirmed proposal into an actual `NEWSROOM.md` happens outside this skill, by
hand."* An installer is precisely the right owner for that write, after the journalist confirms.

Preflight already models the three honest outcomes (`preflight.mjs:94-135`): `pass`, `missing`
(nobody has answered — invoke the charter), `declined` (recorded decision, front matter
`decision: declined`, counts as answered), `fail` (a file that exists and does not answer).
`SKILL.md:181-187` names the trap this closed: the template ships `NEWSROOM.example.md`, never
`NEWSROOM.md`, so **a freshly installed root reliably failed preflight on a file nobody was told to
create.** An installer removes that step entirely.

---

## 4. Where the install must run — the host intersection

**Measured (carried from the original, per `FEEDBACK` C1 — facts about hosts, not about either
codebase):** Claude Code does **not** discover a nested skill; **Goose does**; Claude Desktop's door
is `~/.claude/skills`; on Goose, `load_skill` overflows and `SKILL.md` never enters the context.

**Measured (this survey):** the twin's skills sit at `twin/skills/<id>` — 15 of them — one level
deeper than the original's `skills/<id>`. A `.claude-plugin/plugin.json` exists at `twin/` so
`--plugin-dir twin/` registers the twin alone.

**The placement contract dissolves the depth problem — inferred, but soundly.** Placement is by
**symlink**, so the *source* depth is irrelevant:
`~/.agents/skills/splash/<id> -> <checkout>/twin/skills/<id>`. What the host sees is the depth
**inside its own skills dir**, not inside the repo. Goose scans `~/.agents/skills` recursively
(`place.go:38-41`), so the product namespace is fine there — and Goose is the pilot's host.

**The sharp edge — and it is MEASURED, not inferred.** For Claude the contract prescribes a
*product-level* adapter: `~/.claude/skills/splash -> ~/.agents/skills/splash`, presenting skills as
`~/.claude/skills/splash/<id>/SKILL.md`. The original ran a real probe
(`splash-provision/docs/installer/claude-desktop-findings.md:178-202`,
`docs/installer/goose-proof.md:84-102`): four throwaway skills created at the same instant —
`~/.claude/skills/zzflat/SKILL.md` and `~/.claude/skills/zznest/zzdeep/SKILL.md`, mirrored under
`~/.agents/skills`. Results:

- **Claude Code** listed `zzflat`, **never** `zzdeep` — it reads `~/.claude/skills/<name>/SKILL.md`
  exactly **one level** deep.
- **Goose CLI** listed **all four** — it descends nested fine, and scans **both** `~/.agents/skills`
  **and** `~/.claude/skills`.

The original's own conclusion, verbatim in its record: **the engine's `claude` adapter shape
(`~/.claude/skills/<produit>` → namespace) would discover nothing, silently.** So this is a real
defect in the contract as applied to that runtime, not an ambiguity — and Spotlight ships it.

The mitigation is already in Spotlight's own code and costs nothing: `link_spotlight_skills`
(`install-spotlight.sh:388-403`) places **flat per-skill links**, and `link_spotlight_adapter` falls
back to it when the adapter dir cannot be collapsed (`:429-433`). The original absorbed the same fix
as a second adapter **shape**: `lib/provision/placement.ts:26,59-64` gives both `claude` and
`claude-desktop` `shape: "flat"` — one symlink per skill straight into the packaged skills dir.
**Recommendation, now evidence-backed:** for the Claude family place flat —
`~/.claude/skills/<id> -> <checkout>/twin/skills/<id>` — and keep the product namespace for the
canonical store. The twin's 15 ids are already verified disjoint from the original's 17
(`FEEDBACK` C1), which is what makes flat placement safe here.

**Two scope limits on that probe, stated in its own record and carried here honestly:**

- **Goose Desktop — the app, and the pilot's host — was NOT probed. Only the Goose CLI was.** The
  original deliberately left Goose Desktop out of its adapter table for that reason
  (`placement.ts:56-57`). Since C1.1/C2.3 turn on the pilot's own host, **this is the one
  measurement this chantier most needs and does not have.**
- **Claude Desktop was not itself re-probed** either; it is *assumed* to share the CLI's behaviour
  because it embeds the same loader (`findings:191-193`). An inference, flagged as one there and
  here.

**A related silent-drop trap, measured on the original and worth a guard here.** An unquoted `: ` in
a `SKILL.md` frontmatter `description` makes the host drop the skill **without a word** — the
original measured **12 linked / 11 discovered** with every file present, and notes that a regex like
`/^description:\s*\S/` sails straight past it; you must actually parse
(`memory/resume-2026-08-04-desktop.md:56-60`, guard at `docs/installer/skills-discoverable.test.ts`).
**Measured here, this survey:** all 15 twin `SKILL.md` frontmatters parse cleanly under
`Bun.YAML.parse` and carry both `name` and `description`. Not live today — but it is one description
edit away, and it fails silently, so it earns a guard.

**What no installer can fix, and it must be said in the same breath.** On Goose, `load_skill`
overflows and `SKILL.md` never enters the context. An install can land every file in exactly the
right place and the pilot's host still will not read the skill. That is a **distribution** decision
(the size and shape of `SKILL.md`), recorded on the original as awaiting the owner. It is adjacent
to this chantier, not inside it, but C2.3 — *"leave preflight green on the host the journalist
actually uses"* — is not truly satisfied until it is answered.

Codex and Gemini need no placement at all: the AGENTS.md contract, no skills dir
(`place.go:23`, placement table). That is a cheap two rows.

---

## 5. Is `runPreflight` a sufficient definition of "installed correctly"?

**The shape is right. The content is not, and the gap is structural.**

`runPreflight({root, env, fetchFn})` → `{ready, blockers, checks, capabilities}`
(`preflight.mjs:155-208`). Its central distinction is correct and hard-won: `ready` depends on
**only two** hard stops — `dependencies` and `newsroom-profile` — while a missing key **narrows a
capability and never blocks** (`:196-205`, and the comment explains the failure it exists to
prevent: a chart-only story being told its environment had failed over a map key it would never
touch). `assertPreflightReady` is the mechanical stop; `capabilityGap` is the seam a later phase
reads before offering a medium. Every capability row carries a `fill` string naming the exact
variable, where the key comes from, and the file it goes in — **an installer's prompt list is
already written, in the code, as data.**

**Where it falls short — measured, and this is the survey's sharpest finding.**

`checkDependencies` (`:48-83`) resolves the packages returned by `declaredDependencyNames()`, which
reads **`ROOT_TEMPLATE_PACKAGE_JSON`** (`:10`, `:21-24`). `declaredSharedFiles()` (`:29-39`) walks
**`root-template/shared/`**. So preflight validates a root **against the template's own
declaration**. Anything the template omits is invisible to preflight **by construction**.

And the template omits most of the twin:

| | `root-template/package.json` | `twin/package.json` (the dev root) |
|---|---|---|
| deps | `@resvg/resvg-js`, `d3-array`, `d3-scale`, `d3-shape`, `react`, `react-dom` | those **plus** `remotion@4.0.507`, `@remotion/cli@4.0.507`, `maplibre-gl@4.7.1`, `puppeteer@^24.10.0` |

Import counts under `twin/skills` + `twin/proof`: **81 files import `remotion`, 43 import
`puppeteer`, 22 reference `maplibre`.**

`root-template/shared/` vendors **one** craft skill — `chart-beat`
(`render-still.mjs`, `inspect-render.mjs`). Fourteen other skills carry `scripts/`; the map, web,
video, scrolly and deliver mechanisms are **not vendored, so nothing installs them and nothing
checks for them.**

**Consequence:** a freshly installed root reports `dependencies: pass`, `ready: true`, and can
render exactly **one** genre — the static chart. Video, web, scrolly and every map fail at module
load. This is the same class of defect `PROOF.md:37-49` recorded when `@resvg/resvg-js` was missing
from the template (*"A journalist would hit this on their first chart, after being told the
environment was fine"*) — that instance was closed, the class reopened at four times the radius.

**A second shortfall, and this one is a live defect the original already measured.**
`checkDependencies` resolves with **`Bun.resolveSync(name, root)`** (`preflight.mjs:56`). The
original hit exactly this and recorded the root cause
(`splash-provision/.superpowers/sdd/2026-08-06-provisioning-core-and-skill-placement/progress.md:23-26`):
**`Bun.resolveSync` falls back to Bun's GLOBAL install cache regardless of the root it is asked
about, so an empty, never-provisioned tree reported its dependencies satisfied.** Their fix is
`resolveDepInTree` (`lib/provision/phases.ts:52-54`), carrying a six-line comment that ends *"Do not
simplify this back to `Bun.resolveSync`."*

Two consequences for the twin, both concrete:

1. **The twin's preflight has the same false-green.** On a developer machine with a warm Bun cache —
   which is every machine this branch has ever been tested on — `dependencies: pass` may be reporting
   the cache, not the root. That compounds §5's template gap rather than merely sitting beside it.
2. **The regression test must spawn its own process.** Same record (`progress.md:33-35`): in-process,
   the global-cache fallback does not manifest, so an in-process test **passed against the
   uncorrected code and proved nothing.** This is precisely invariant 4 of `PLAN-2026-08-10.md` — a
   guard that cannot go red — caught in the wild.

**A third, smaller shortfall.** Preflight runs **inside the root**. It never inspects
`~/.agents/skills` or `~/.claude/skills`, so it cannot answer C2.3 — *is this green on the host the
journalist uses?* That is exactly the division of labour Spotlight already solved: the generated
doctor checks the host wiring, then delegates to preflight (§1).

**Answer to the question.** `ready: true` is **necessary and nearly sufficient**, and the shape
needs no redesign. It becomes sufficient when two things are true:

1. the root template **declares everything the twin imports and vendors every mechanism it runs**,
   so that `checkDependencies` is testing the tool rather than testing the template against itself;
2. a **host-discovery check** sits outside preflight and delegates to it — a `splash-doctor`.

Add a browser probe (§3) and `ready: true` genuinely means *this newsroom can produce any beat the
twin ships*.

---

## 6. What the original Splash already built — measured

The twin may not import from the original (the branch's isolation rule), but the original's design is
evidence and its measured traps carry, because they are facts about hosts, toolchains and Bun, not
about either codebase.

**Where it lives.** The worktree exists: `/Users/rmdms/Sites/Professional/splash-provision`, branch
`feat/provisioning-core` @ `b68b5a36`, 11 commits ahead of `main`, +3679/−720 over 39 files. **It is
NOT merged** — `main` still inlines the phases in `install/bootstrap.sh`. Everything below is
branch-only, unmerged work, and it is clean and tested (final gate 24/25, the single red passing
139/139 in isolation).

### What tasks 1-8 built

| Task | File | What it is |
|---|---|---|
| 1 | `lib/provision/receipt.ts` | install receipt `.splash-provision.json`, schema `splash-provision/v1`; ordered `PHASE_IDS`; **atomic** write (temp + rename, rethrows on rename failure); `readReceipt` returns `null` rather than throwing |
| 2 | `lib/newsroom/probe.ts` | `probePlaywrightChromium`, `probeRemotionBrowser` — reproduces Remotion's private `node_modules/.remotion/chrome-headless-shell/<platform>/…` convention rather than importing a non-public export |
| 3 | `lib/provision/phases.ts` | five **non-mutating** probes: `root-deps`, `pack`, `dist-deps`, `browser-static`, `browser-video`. Header invariant: *"no directory is created, no package installed, no byte downloaded here"* |
| 4 | `lib/provision/run.ts` | `applyAll` in order, **stops at first failure**, marks the rest `skipped after <phase> failed`. Deps 15 min / browser 30 min timeouts |
| 5 | `scripts/provision.mjs` | `bun run provision [--check] [--json] [--root <dir>]`, exit **0 / 10 needs-apply / 20 failed** |
| 6 | `lib/provision/placement.ts` | canonical store + per-runtime adapters, **two shapes** (namespace, flat); prune bounded to links whose target resolves inside this install |
| 7 | (measurement) | the flat-vs-nested host probe — §4 |
| 8 | `install/bootstrap.{sh,ps1}`, `scripts/place-skills.mjs` | the bootstraps now **call** instead of implementing |

**Does any of it call `bsig`? No — measured.** An exhaustive grep over `*.ts *.mjs *.sh *.ps1 *.json`
for `\bbsig\b|buriedsignals/engine` returns **comments only** (`install/bootstrap.sh:102`,
`lib/provision/placement.ts:1`, `placement.test.ts:76`). No spawn, no exec, no `command -v bsig`, no
import. The engine coupling exists **only in prose**: `--check` was built so a *future* engine step
could consume it, and that step (sub-project #2) was never written.

**The spec did decide to make `bsig` the sole install path** (`…-design.md:54-60`) — *"`bsig` devient
le seul chemin d'installation, et l'engine devient un prérequis assumé"* — flagging in the same
sentence that this bites the FJM promise. It was blocked three ways: no `bun` in the engine's
execpolicy (§2), Go not installed on the machine, and the catalog entry signed by Tom.

### The `claude-desktop` module

`install/runtimes/claude-desktop.sh` (47 lines): checks `/Applications/Claude.app`
(`$CLAUDE_APP`-overridable for hermetic tests), `brew install --cask claude` if absent, **no
direct-download fallback deliberately** (*"the only direct Claude artefact is an opaque
storage-bucket URL carrying no version"*). It **places no files itself** — placement is
`bootstrap.sh:104`. Launch is a plain `open -a Claude`.

**The door — `~/.claude/skills/`, FLAT — is measured** on shipped bundle 1.12603.1, from three
independent strings in `Contents/Resources/app.asar`
(`docs/installer/claude-desktop-findings.md:13-32`), including
`l[Es(".claude/skills")] = {path: join(<dir>, "skills"), mode: "ro"}`. Explicit negative results:
**`~/.agents/skills` is NOT scanned by that app** (`:41-45`) — a module reusing the shared helper
bare *"would have installed a runtime that discovers nothing, silently"* — and
`~/Library/Application Support/Claude/…/skills-plugin/` is Anthropic-managed, not the door.

### The clean-room install from zero

Run on `main` (the old inline bootstrap), with a fake `HOME`, virgin Playwright/Remotion/Bun caches,
and the source served over `file://` via `git archive`. **All 7 steps pass, exit 0, and the install
produces: a static chart PNG and a 948-frame map-native video with MapTiler tiles loading.** Re-run
is idempotent. Two defects only a packaged tree shows:

- **`zod` conflict from manifest merging.** The root declares `zod 4.4.3`; `pack-skills` folds the
  root manifest **last** (`scripts/pack-skills.mjs:171`), so it wins, and Remotion — which pins
  `4.3.6` — resolves the wrong version. In the repo the nested `node_modules` hides it entirely.
  Visible consequence: a *"Version mismatch… Failed renders and unclear errors"* block printed
  **twice during the install, in front of the journalist**, and twice per video produce. Renders
  still pass — latent, not proven broken. **The merge rule that caused it was added to close a
  missing-`vite` hole**, which is the shape of the trap: closing a gap by letting the root win
  overrides an engine that pinned deliberately.
- **`buriedsignals/splash` is private → `curl .../archive/main.zip` = 404.** The public install path
  the docs advertise is dead; no newsroom can install today.
  `install/bootstrap.sh:7` still reads `REPO="${SPLASH_REPO:-…/buriedsignals/splash}" # confirm
  before public release`.

**Method worth inheriting outright:** `git archive --prefix=splash-main/` + `SPLASH_REPO=file://…`
reproduces the GitHub archive exactly, and `SPLASH_NO_OPEN=1` + POSTing `/verify` then `/submit`
drives the setup page with no browser (the port is ephemeral — read it from the bootstrap log). Lab
cost ~2.7 GB.

### How the original collects keys — it already built the Spotlight pattern

**A local web page on the loopback**, not a prompt and not a hand-edited file. `install/bootstrap.sh`
runs `install/configurator.ts` only when `$DEST/.env` is absent (or `SPLASH_RECONFIGURE=1`);
`install/preflight/server.ts:321-322` binds `127.0.0.1` on **port 0** (ephemeral), prints the URL,
idles out at 30 min so a closed tab never hangs the install. The bootstrap's own header:
*"Contains NO keys and receives none … they are written straight to ~/Splash/.env, never passed on
the command line."*

`persist()` (`server.ts:240-261`) writes `<ROOT>/.env` **merged, never rewritten**, then
`chmod 0600`; plus `newsroom.json` (runtime, UI language, verification stamps) and
`NEWSROOM-PROFILE.md`. **Which value goes to which file is derived from the capability registry, not
hand-maintained** (`install/preflight/serialize.ts:3-9`), so *"a name the registry never declared is
written nowhere"* — the payload arrives over a socket and is not trusted to name arbitrary
environment variables. **Keys are live-verified before being written** (`POST /verify`).

Collected: `DATAWRAPPER_API_TOKEN`; `VITE_MAPTILER_KEY`/`REMOTION_MAPTILER_KEY` as an
**alternatives group**; Cloudflare token + account + project; We.Publish; S3; and an optional
per-runtime login key. **This is a working, shipped implementation of exactly what §1 recommends** —
and it is strong evidence the shape is right, not licence to import it.

*(The spec's sub-project #3 — move keys to the OS keychain and strip key entry from the setup page —
was decided and **not built**. Shipped code writes `.env`.)*

### Traps to inherit

1. **`Bun.resolveSync` lies** — folded into §5, where it is a live defect in the twin.
2. **`bunx` EEXIST race.** Concurrent gates make `bunx mapshaper` fail `Failed to link <dep>:
   EEXIST`; 22/25 under five concurrent gates → 0 failures on isolated re-run. **The failing test
   name moves between runs — that wandering is the tell.** And `bun scripts/check.mjs | tail -80`
   reports **tail's** exit code, so it exits 0 on a failing gate.
3. **E17, one key two homes.** Preflight read the key **by path**; the producer read `process.env`,
   which **Bun fills only from the CWD's `.env` and does not walk up** — preflight green, production
   dead. Compounding: **`open -a` does not pass the environment**, so a launcher's `set -a && . ./.env`
   is decorative on the desktop path. Goose Desktop survives because `open -a Goose .` forces the
   working root; **Claude Desktop does not.** The twin's `resolveEnvKey` alias table is the same
   hazard surface: worth an explicit test that the probe and the producer resolve a key identically.
4. **`.dist/` is a new root.** A dozen shipped scripts resolved the install root by walking up from
   their own position; each task was correct and their *composition* broke. *"After any directory
   move, look for who resolves a path relative to itself."*
5. **The 1 MB browser floor** would have condemned every real Playwright install — its macOS launcher
   is 52 KB. Two separate constants were needed.
6. **Windows.** `bootstrap.ps1` originally had no packaging step at all, and `bunx remotion browser
   ensure` under Bun **hangs with no timeout and no message** (Bun #15679), right before the only
   interactive screen. Fixed on the branch by routing browser downloads through `npx` on win32 — but
   the record is explicit that **Windows remains the least-proven system; the fix must be verified on
   a clean VM, not deduced.** Spotlight simply declares WSL (§1); that is also an available answer.
7. **The `claude` runtime default sits outside the packaged path** — `claude.sh:15` launches
   `--plugin-dir .` from the repo root and never calls the placement helper, so a machine set up both
   ways offers the same skills twice by two routes, and no install cleans the other's links.
   Spotlight has the identical default (`: "${SPOTLIGHT_RUNTIME:=claude}"`,
   `install-spotlight.sh:215`). **For the twin the pilot's host is Goose, so defaulting to `claude`
   would be wrong here.**
8. **A control worktree proves nothing if it is incomplete** — without its `.env` symlink a worktree
   reddens on `VITE_MAPTILER_KEY missing` and it *looks* like a regression. *"Two identically broken
   environments agree with each other."* That is how a false "pre-existing" defect was born once
   already.

---

## 7. The licence facts — recorded as deferred, per the owner's ruling

Not a gate. Written down so it does not surprise anyone on release day.

**Measured, 2026-08-10, via `gh` as `rmdms`:**

| Repo | Visibility | Licence |
|---|---|---|
| `buriedsignals/engine` | **PRIVATE** | **`licenseInfo: null` — none.** No `LICENSE` file at root (root listing: `.github`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `SPEC.md`, `TODO.md`, `TODOS.md`, `VERIFICATION.md`, `app`, `catalog`, `cmd`, `docs`, `go.mod`, `go.sum`, `internal`, `public-installer`, `tests`, `tools`) |
| `buriedsignals/spotlight` | PUBLIC | GitHub reports "Other"; the file itself is **MIT** — `LICENSE:1` "MIT License / Copyright (c) 2026 Buried Signals". The "Other" classification comes from a third-party attribution appendix after the MIT text (jamditis/claude-skills-journalism, Bellingcat, GIJN, …). **Worth copying**: a MIT licence with an explicit attribution section is exactly the shape an FJM deliverable that credits FT/data-to-viz needs. |

Created 2026-06-10, last push 2026-08-08. Both facts current as of this survey.

**What a third party could and could not do, measured rather than assumed:**

- **Could install.** The public installer path never downloads or executes the engine
  (`public-installer/README.md`), and `install-spotlight.sh` never invokes `bsig` (§2). A stranger
  cloning an MIT Splash and running its installer would not touch the private repo.
- **Could not rebuild the release.** `bsig export public-installer` produces the signed bundle, and
  the catalog is minisigned inside the private repo. An outside contributor could not cut a release,
  add a product, or add a skill entry — those are Tom's, permanently.
- **Would depend on a signature they cannot verify the provenance of** — the release key lives with
  the engine.

**Independently confirmed on the original.** Its provisioning spec verified the same two facts —
*"`buriedsignals/engine` est privé et sans licence (vérifié)"* — and, unlike this survey, drew the
blocking conclusion, because the design it was writing made `bsig` **the sole install path**:
*"Une rédaction hors stack Buried Signals ne pourra donc plus installer Splash seule, ce qui mord sur
la promesse du livrable FJM."* Two independent readings, same facts, and the difference in verdict
comes entirely from **whether the installer executes `bsig` on the newsroom's machine.**

**The residual question, for the day it is picked up:** does an MIT Splash whose *release process*
is a private unlicensed tool satisfy the FJM open-source deliverable? Spotlight is the precedent that
says yes in practice — MIT and public today, release automation private, public install path
engine-free. The twin can stand exactly where Spotlight stands. **What would turn this back into a
genuine blocker is building the installer so that it *runs* `bsig` on the newsroom's machine**, which
Spotlight deliberately does not do and which the engine cannot do anyway today (no `bun` in its
execpolicy, §2). §8 keeps that door shut by default — not to dodge the decision, but so the decision
stays reversible in both directions when someone finally takes it.

---

## 8. The smallest honest first step

It depends on no licence decision, no engine access, and no host measurement — and it is the
precondition for every other step, because **an installer's job is to make preflight green, and
preflight is currently green on a root that cannot render three of four genres** (§5).

### Step 1 — make the root template tell the truth

1. **Declare what the twin imports.** Add `remotion`, `@remotion/cli`, `maplibre-gl`, `puppeteer` to
   `root-template/package.json` at the versions the dev root pins (`4.0.507`, `4.7.1`, `^24.10.0`).
   **Pin them to the engine's versions, not the root's** — the original's `zod` defect (§6) is
   exactly this step done in the other direction, where a root manifest folded last overrode an
   engine that had pinned deliberately.
2. **Vendor every mechanism a beat runs**, into `root-template/shared/<skill>/`, the way
   `chart-beat` already is — map, web, video, scrolly, deliver. Physical checked-in copies, so
   `cp -r root-template/` still carries them with no extra step, and the doctrine's
   duplicate-don't-import rule holds.
3. **Stop trusting `Bun.resolveSync`** (`preflight.mjs:56`). Resolve **in the tree** the way the
   original had to (`resolveDepInTree`), or the whole of steps 1-2 remains unverifiable: on a warm
   Bun cache the check answers about the cache, not the root.
4. **The walking guard, and the mutation that reddens it** (invariant 4 of `PLAN-2026-08-10.md`):
   walk `twin/skills/*` and `twin/proof/*`, collect every bare top-level package specifier and every
   `#shared/...` specifier, and assert the template declares/vendors each. It must **walk**, not
   take a hand list — `helper-parity.test.ts` is the project's own counter-example. *Mutation:*
   delete `remotion` from `root-template/package.json`. **Today that mutation changes nothing, which
   is the proof the guard is missing.** And per the original's measurement, **the dependency half of
   this guard must spawn its own process** — in-process, the global-cache fallback does not manifest
   and the test passes against uncorrected code.
5. **Three one-line fixes that fall out of the same pass**: add `MAPTILER_DELIVERY_KEY` to
   `KEY_ALIASES` (`keys.mjs:15-20`) so `recordKey` stops refusing the key ruling R1b requires; add a
   browser check to preflight's `checks` (Chrome resolvable, or `CHROME_PATH` set) so the `bake.mjs`
   failure is reported at phase 0 rather than mid-beat; and add a frontmatter guard that **parses**
   each `SKILL.md` with `Bun.YAML.parse` (§4 — all 15 pass today, and it fails silently when one
   stops).

**Proof it worked, in the project's own currency:** a clean-room root — `cp -r root-template/`,
`bun install`, `.env`, `NEWSROOM.md` — renders **one beat per genre** (static chart, web chart, chart
video, one map). Not "tests pass": four opened artifacts. Run it with a **fake `HOME` and virgin
Bun/Playwright/Remotion caches**, which is the only configuration that can see this class of defect
— that is precisely how the original found its `zod` conflict, and a warm-cache run would have found
neither it nor the `resolveSync` false-green.

### Step 2 — the two writes that finish the collection (also engine-free)

- **Let `newsroom-charter` land its confirmed proposal.** The derivation exists and the skill
  correctly refuses to write; the installer is the right owner for `NEWSROOM.md` after confirmation.
  This deletes the "nobody was told to rename `NEWSROOM.example.md`" trap (`SKILL.md:181-187`).
- **A `splash-doctor`, modelled on `spotlight-doctor`** (`install-spotlight.sh:1470-1543`): check
  the host wiring preflight structurally cannot see (placement links resolve; the host's skills dir
  contains the 15 ids; the runtime CLI exists), then `exec` `runPreflight` and take its verdict.
  This is what makes C2.3 testable.

### Step 3 — placement, and only then the engine

Implement the placement contract directly (it is a documented table and ~40 lines of shell in
Spotlight): canonical `~/.agents/skills/splash/<id>` symlinks, **flat** per-skill links for
Claude-family hosts pending the measurement in §4, nothing for codex/gemini. Default the runtime to
**goose**, not `claude` — the pilot's host.

Then, and only then, consider the engine as an *upgrade*: signed release channel, `bsig keys` as an
alternative to a plaintext `.env`, `bsig doctor`. Keeping it an upgrade rather than a prerequisite
is what keeps the deferred licence question cheap in both directions — and it is the shape Spotlight
itself already ships.

**What this first step does NOT close** (named, per `PLAN-2026-08-10.md`'s rule that every spec
names its residue):

- **The Goose Desktop probe** — the pilot's own host has never been measured for skill discovery,
  only the Goose CLI (§4). This is the single most valuable missing measurement in the chantier and
  it costs one throwaway-skills probe.
- **The Goose `load_skill` overflow** — no installer can fix it; it is a decision about the size and
  shape of `SKILL.md`, and it is what stands between "files correctly placed" and "the pilot's host
  can read them".
- **Windows** — least-proven on the original, needing a clean-VM verification rather than a
  deduction; WSL-only is the available alternative answer.
- **The catalog entry**, which only Tom can make, and the `bun` execpolicy entry, which was never
  requested.
- **The private repo / dead public install URL** — the original's second clean-room defect is still
  open, and it belongs to the same deferred decision as §7.
