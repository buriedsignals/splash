---
title: Splash interactive preflight and visual selection verification
status: active
opened: 2026-08-14
initiative_prd: docs/splash/2026-08-14-interactive-preflight-and-visual-selection-prd.md
---

# Splash interactive preflight and visual selection verification

**Current surface (2026-08-26):** Splash no longer ships an in-chat MCP App
(`ui://` / `text/html;profile=mcp-app`). Readiness and visual selection run as
a loopback HTTP studio opened in the local browser. Goose stdio MCP exposes
`open_splash`; other runtimes run `apps/goose/studio/open.mjs`. Historical rows
below remain measured evidence for the retired MCP App host contract.

## Compatibility and documentation baseline

Context7 CLI 0.3.5 was available at
`/Users/tomvaillant/.nvm/versions/node/v22.22.0/bin/ctx7`. Queries run on 2026-08-14 grounded the
fixture in these official sources:

- [Goose MCP Apps tutorial](https://github.com/aaif-goose/goose/blob/main/documentation/docs/tutorials/building-mcp-apps.md): resources capability, `ui://` resource, and `text/html;profile=mcp-app`.
- [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx): app-only visibility and UI resource metadata.
- [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps): historical host-contract
  evidence for the retired in-chat MCP App. Splash no longer depends on
  `@modelcontextprotocol/ext-apps`; the current development lockfile does not
  include it.
- [Goose MCP App renderer](https://github.com/aaif-goose/goose/blob/main/ui/desktop/src/components/McpApps/McpAppRenderer.tsx): current Desktop declares `openLinks` and connects `ui/open-link` to its confirmation handler.
- [Goose extension configuration](https://github.com/aaif-goose/goose/blob/main/documentation/docs/getting-started/using-extensions.md): stdio extension YAML shape.
- [Bun environment documentation](https://github.com/oven-sh/bun/blob/main/docs/runtime/environment-variables.mdx) and [Bun CLI parser](https://github.com/oven-sh/bun/blob/main/src/runtime/cli/Arguments.rs): `--no-env-file` and its position before the script argument.
- [Bun install documentation](https://github.com/oven-sh/bun/blob/main/docs/pm/cli/install.mdx),
  [lifecycle documentation](https://github.com/oven-sh/bun/blob/main/docs/pm/lifecycle.mdx), and
  [runtime environment documentation](https://github.com/oven-sh/bun/blob/main/docs/runtime/environment-variables.mdx): frozen and
  production-only installs, disabled lifecycle scripts, and `env = false` in Engine-owned
  `bunfig.toml` files so install and launch do not trust a checkout `.env`. The
  [bundler documentation](https://github.com/oven-sh/bun/blob/main/docs/bundler/index.mdx) grounded
  the retained closure feasibility spike; bundling is not the approved production install design.
- [Puppeteer `computeExecutablePath`](https://github.com/puppeteer/puppeteer/blob/main/docs/browsers-api/browsers.computeexecutablepath.md): explicit exact-browser resolution from an Engine-owned install root rather than ambient cache or host discovery.
- [MCP TypeScript SDK schema normalization](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/packages/core-internal/src/util/zodCompat.ts): raw Zod shapes are wrapped in stripping `z.object`; the fixture therefore uses an explicit `z.strictObject({})` so unknown or credential-like fields are rejected instead of silently discarded.
- [JSON Schema validation](https://github.com/json-schema-org/json-schema-spec/blob/main/specs/jsonschema-validation.md) and [core](https://github.com/json-schema-org/json-schema-spec/blob/main/specs/jsonschema-core.md): `required` asserts property presence, while omitted `additionalProperties` permits unknown properties. The visual catalogue therefore publishes a strict Draft 2020-12 schema with explicit required fields and closed objects.
- [Zod 4 API](https://github.com/colinhacks/zod/blob/v4.0.1/packages/docs/content/api.mdx): `z.strictObject` rejects unknown keys. The generator uses strict runtime schemas in addition to the published machine schema.

During the managed map-bake continuation, `ctx7 library resolve puppeteer` and
`ctx7 library resolve maplibre-gl` both returned `fetch failed`. No behavior was filled in from
memory: the adopted checkout's locked `puppeteer-core` 24.43.1 source/types established the explicit
`executablePath` requirement, while its locked MapLibre GL JS 4.7.1 source/types established the
`fitBounds`, projection, `style.load`, and `idle` contracts used by the renderer. This is local
dependency evidence, not a successful Context7 lookup.

The tutorial's Goose Desktop 1.19.1 prerequisite is documentation context, not Splash's supported
minimum. Splash has not exercised that version.

### Real host matrix

| Host                        | Exact version | Observation date | Observed result                                                                                                                                                                                                                                                                         | Shipping claim                                                                 |
| --------------------------- | ------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Goose CLI                   | 1.37.0        | 2026-08-14       | Passed stdio extension discovery and called `open_splash_compatibility`. A second real model turn reported only `open_splash_compatibility` in its available tools and `refresh_splash_compatibility` unavailable, demonstrating Goose's app-only filtering. CLI cannot render the app. | Protocol/tool-list evidence only.                                              |
| Goose Desktop               | 1.43.0        | 2026-08-14       | Loaded the temporary stdio extension, rendered the `text/html;profile=mcp-app` resource, displayed the initial tool result, and relayed the app-only manual Refresh call.                                                                                                               | Current installed macOS Desktop is compatible with these observed behaviors.   |
| Goose Desktop               | 1.43.0        | 2026-08-14       | After process restart, the saved session showed the tool result but did not recreate the embedded view in the observed run.                                                                                                                                                             | Resume behavior is unresolved; do not claim app persistence from this fixture. |
| Goose Desktop               | 1.43.0        | 2026-08-14       | The source declares `openLinks`, but success and user-denial responses were not completed in the manual run.                                                                                                                                                                            | Blocked U1 evidence; no shipping claim yet.                                    |
| Goose Desktop               | 1.19.1        | not run          | Tutorial prerequisite only.                                                                                                                                                                                                                                                             | No claim.                                                                      |
| Linux / Windows / WSL Goose | not run       | not run          | No complete Goose–Splash–Engine–browser topology exercised.                                                                                                                                                                                                                             | Unsupported for the first release unless U10 adds live evidence.               |

The temporary Desktop extension file and test process were removed after the run. No Goose config
file was edited.

## Minimum Engine Splash contract

The minimum production contract is `1`. An absent, unreachable, or lower contract must produce a
non-secret response in this shape and must not be presented as "not saved":

```json
{
  "contractVersion": 1,
  "broker": {
    "status": "unavailable",
    "reasonCode": "engine-missing|engine-outdated|secure-store-unavailable|topology-unsupported|engine-unreachable",
    "message": "Actionable credential-independent explanation"
  },
  "credentialIndependentPathsAvailable": true
}
```

Provider acquisition links and credential-independent newsroom/selection paths remain available.
Save, Replace, Remove, migration commit, and key-dependent operations remain disabled. U2 owns the
record-backed implementation; the U1 fixture deliberately reports `broker: "not-tested"` rather
than simulating a working broker.

## U2 Engine credential broker

Engine now registers exactly `MAPTILER_KEY`, `MAPTILER_DELIVERY_KEY`, `DATAWRAPPER_TOKEN`, and
`CLOUDFLARE_API_TOKEN` as record-backed Splash credentials. `CLOUDFLARE_ACCOUNT_ID` remains
non-secret newsroom context and `CMS_TOKEN` remains unregistered. Public metadata includes provider
acquisition links, permissions, migration aliases, validator policy, replacement behavior, the
numeric contract version, and a 1,024-byte candidate bound without exposing values or provider
request URLs.

Record replacement validates before acquiring a cross-process per-ID lock, rereads the observed
generation inside the lock, and writes the secret plus validation receipt as one bounded native-store
record. Removal first advances a separate non-secret generation marker and then deletes the secret
record. The secret record remains authoritative if deletion fails; once deletion succeeds, the
marker prevents generation reuse and stale absent/save/remove sessions from passing an ABA check.
Raw set, raw validate, and no-generation removal reject these four IDs before store access. An
Engine-internal `AcquireForOperation` call resolves only canonical registry IDs and returns one
detached snapshot containing the secret, generation, and validation receipt from the same decoded
record; no CLI getter exists.

Broker availability now uses U1's exact numeric/structured envelope. Catalogue discovery returns
all public metadata even when the native store is unavailable, with stored state, generation, and
validation reported as unknown. Store and lock causes remain reachable through typed Go errors but
raw causes are not copied into stdout or `audit.log`. Strict JSON decoding emits stable errors that
do not reflect unknown field names; an end-to-end malformed-request regression verifies that a
candidate used as an unknown field name occurs in neither output nor the durable audit.

Provider behavior was grounded through Context7 CLI 0.3.5 in these current official sources:

- [MapTiler SDK README](https://github.com/maptiler/maptiler-sdk-js/blob/main/README.md) identifies
  the key-acquisition page and API-key requirement; its
  [request transform](https://github.com/maptiler/maptiler-sdk-js/blob/main/src/tools.ts) confirms
  Cloud API keys are query parameters. Context7 did not cover production-origin restriction
  behavior, so the separate [official MapTiler key guide](https://docs.maptiler.com/cloud/api/authentication-key/)
  remains the source for the delivery-key attestation boundary.
- [Datawrapper `GET /me`](https://developer.datawrapper.de/reference/getme) requires `user:read`;
  [chart creation](https://developer.datawrapper.de/reference/postcharts) requires `chart:write`;
  [publishing](https://developer.datawrapper.de/reference/postchartsidpublish) requires
  `chart:read`, `chart:write`, `theme:read`, and `visualization:read`; and
  [export](https://developer.datawrapper.de/reference/chartsidexportformat) requires `chart:read`.
- [Cloudflare token verification](https://developers.cloudflare.com/api/python/resources/user/subresources/tokens/methods/verify)
  documents the active-token probe. [Pages project listing](https://developers.cloudflare.com/api/python/resources/pages/subresources/projects/methods/list)
  documents the selected-account endpoint and states that Pages Read or Pages Write is required.
  This proves access to Pages in the selected account, not Pages Edit specifically, so the saved
  receipt keeps `pages-scope` attested while binding its evidence to the normalized account ID.

The final Compound Engineering re-review reported no remaining material U2 code or contract
finding. Findings fixed during review were: deletion-generation ABA reuse; divergence from U1's
broker envelope; broker-dependent metadata discovery; missing Cloudflare account evidence; a
status/secret time-of-check-time-of-use split; same-process-only lock evidence; incomplete native
runner selection; missing Linux session-bus failure coverage; and malformed-JSON audit disclosure.

Verification was run against Engine Jujutsu working-copy commit
`d4638def97b058ba0900b62c51a0157e73317bb0` (change
`tsnynqzmtptomqmmykrrummwzlwxzkut`) on 2026-08-14. This mixed working-copy commit also contains the
unrelated pre-existing changes listed at the end of this record; it is an evidence coordinate, not a
claim that those changes belong to this initiative.

```text
go test -race -count=1 ./internal/keys ./internal/ipc
PASS: internal/keys 4.622s; internal/ipc 1.418s

go test -race -count=1 ./cmd/bsig -run 'Keys'
PASS: cmd/bsig 1.523s

go vet ./internal/keys ./internal/ipc ./cmd/bsig
PASS (no findings)

GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go test -c -o /tmp/engine-keys-linux-amd64.test ./internal/keys
PASS (compile only; not native Linux execution)

GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go test -c -o /tmp/engine-keys-windows-amd64.test.exe ./internal/keys
PASS (compile only; not native Windows execution)

node --test desktop/tools/run-native-engine-tests.test.mjs
2 pass, 0 fail

BSIG_LIVE_OS_TESTS=1 go test -tags=live_os ./internal/keys \
  -run '^TestDarwinKeychainSplashRecordLiveRoundTrip$' -count=1 -v
PASS: TestDarwinKeychainSplashRecordLiveRoundTrip (0.06s; package 0.690s)
```

The macOS test performed a fresh save, valid replacement, generation-checked removal, and cleanup of
both synthetic Keychain items. No provider credential was used. A native Linux Secret Service run
and native Windows lock/store topology run have not occurred, so Linux, Windows, and WSL remain
unclaimed. Cross-compilation is not substituted for those gates.

The PRD's broad command is not green because of unrelated dirty catalogue state that predated this
initiative:

```text
go test ./internal/keys ./internal/ipc ./cmd/bsig
internal/keys PASS; internal/ipc PASS; cmd/bsig FAIL
TestSkillsVendor_MatchesVendoredManifests:
catalog sync (real): catalog signature rejected: Invalid signature
```

The focused U2 suites above pass, but this broad failure and the missing native Linux evidence keep
U2 below `release-pass`.

## Runtime closure spike

The spike uses Bun 1.3.11 and Google Chrome 151.0.7922.138. The exact executable digests observed on
2026-08-14 were:

- Bun: `sha256:1d77af7bfd811aebb7d37bec496a5eed14fe227ded3ab7866d2f39786e8107b6`
- Chrome launcher: `sha256:ee37661755341e9fc1babf9c20ec09d6a36e50aa8713ceb08082f8bbe2d8217d`
- Chrome application runtime: `sha256:1b0ad63e8449e87c7f6721305011f8726fca667966b2d6e1fc80e931607784b9`
- U1 closure runner: `sha256:062426829e00242285659f3b3a7a0184130726692857591db5c72c04a59289c8`

Before the first child process starts, Engine independently verifies retained digests for Bun and
the closure runner. It then APFS-clones the declared Splash inputs, complete `node_modules` tree,
Bun executable, and complete Chrome application into an Engine-owned private snapshot. Operations
consume only that snapshot. `apps/goose/compatibility/runtime-closure.mjs` requires a digest binding
for the generated manifest, enforces a code-owned exact asset/operation contract, and rehashes every
operation asset before writing its output directory. The retained Engine contracts are
`internal/run/testdata/splash-closure/bootstrap-darwin-arm64.json` and
`internal/run/testdata/splash-closure/expected.json`.
Each operation also requires a new output directory under a real, canonical parent outside the
immutable Splash root; existing outputs and symlinked parents are refused.

Both operations ran through `execpolicy.Policy.RunPinned` with `--no-env-file` before the script
path, an empty ambient `PATH`, bogus ambient Chrome/cache/module selectors, and no credential IDs:

| Operation                | Production entrypoint                                             | Immutable/stub inputs                                                                                                  | Mutable outputs                                                                                                          | Result                             |
| ------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Map bake                 | `skills/map-web/scripts/bake-plate.mjs`                           | Complete module tree, MapLibre JS/CSS, `geo-symbol.ts`, sample regions, local style provider stub, complete Chrome app | `.sealed-scratch/`, provider-stub attempt/success canaries, `plate.png`, `geometry.json`                                 | Passed; 13 points, none off-frame. |
| Generated delivery build | `skills/deliver/scripts/deliver.mjs` and its generated `build.ts` | Complete module and delivery-script trees plus a checked-in React/JSON/HTML story fixture                              | `.sealed-scratch/` and the bounded `stories/fixture/` tree, including generated review/build files and `dist/Fixture.js` | Passed.                            |

The generated manifest classified and verified these 16 assets: `bun`, `browser`,
`browser-runtime`, `runtime-closure`, `package-manifest`, `lockfile`, `map-entrypoint`,
`map-root-helper`, `map-geometry-helper`, `map-data`, `map-style-stub`, `maplibre-js`,
`maplibre-css`, `runtime-modules`, `delivery-code`, and `delivery-fixture`. The broad
`runtime-modules` tree is intentionally conservative for U1; U3 must not replace it with another
hand-maintained partial import list.
The code-owned module descriptor excludes only `node_modules/.cache`, which the existing render
suite mutates and the sealed operations neither import nor execute. Every traversed symlink must
resolve inside its declared asset tree; external or broken tree symlinks are refused.

Negative checks refuse a changed manifest body, a recomputed manifest with a removed descriptor,
and an atomically replaced loaded transitive module. Independent bootstrap checks reject altered
Bun or runner bytes. Each operation verifies before creating its output directory; the map refusal
checks assert that the provider-read wrapper's attempt canary remains absent; a separate success
canary is required on the passing path. These checks prove ordering
against the deterministic provider stub, not a credential or broker read; U2/U3 still own that
production boundary. The private snapshot removes dependence on subsequent changes to the source
checkout. A malicious same-user process that discovers and mutates the private snapshot between
verification and consumption remains outside this U1 fixture's claim.

### Runtime packaging decision after the spike

The private snapshot above is retained as U1 closure evidence, not as the U3 production mechanism.
Architecture review on 2026-08-14 found that the current root `node_modules` alone is approximately
650 MiB before Bun or the browser. Copying or cloning that development closure for every operation
would create a Splash-only lifecycle and an unbounded launch/cancellation cost that Spotlight and
Mycroft do not impose. No retained production-size copy-latency measurement exists yet; that missing
measurement is disconfirming evidence, not permission to assume the cost is acceptable.

A read-only Bun feasibility build in temporary storage produced these unminified Bun-targeted
artifacts from the current entrypoints:

| Entrypoint                       | Observed bundle | Qualification                                                                                                                                     |
| -------------------------------- | --------------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Goose compatibility MCP server   |        1.12 MiB | 226 modules; its HTML/client remain companion assets until U3 prebuilds or embeds them.                                                           |
| Datawrapper sealed producer      |        33.4 KiB | Seven modules; not live-provider tested.                                                                                                          |
| Delivery sealed operation        |        92.6 KiB | Twelve modules; not end-to-end delivery tested as a relocated bundle.                                                                             |
| Each current map bake entrypoint |  about 3.71 MiB | 550 modules; build required `typescript` to be external because full Puppeteer configuration discovers an optional Cosmiconfig TypeScript loader. |

These are feasibility results, not production verification. They do not justify a second bundled
runtime. The revised U3 target is one Engine-adopted development checkout, one root production
dependency install containing every supported capability, and one separately installed compatible
browser. Engine verifies and launches fixed entrypoints directly from that checkout and never
copies the checkout, dependency tree, Bun, or browser during an operation. Installed byte counts are
support evidence, not an arbitrary release gate. Stories and newsroom configuration remain
separately classified data-bearing paths. A failed or cancelled reapply must leave the prior
dependency preimage, browser, Goose configuration, and manifest authoritative.

The current partial U3 implementation follows that decision:

- Engine composes install and adoption plans around the current checkout, a transactional root
  `bun install --frozen-lockfile --production --ignore-scripts`, a compatible browser install, a no-value
  preflight smoke, direct live-checkout skill projections, optional Goose registration, and normal
  manifest/doctor/uninstall ownership. A missing external stories root is created by the adoption
  step and rolled back with the rest of the plan; the shell wrapper no longer creates it first.
- Dependency and browser receipts retain package/lock identities and installed byte counts. The
  dependency step and generic Git-update step restore their prior preimages on later transaction
  failure. Runtime manifests bind the checkout source trees, root `node_modules`, receipt, fixed MCP
  and operation entrypoints, Bun, and browser.
- `bsig run splash` and `bsig mcp splash` launch the installed checkout directly with package
  installation disabled, Engine-owned `bunfig.toml` files containing `env = false`, scrubbed ambient
  loader/browser/credential variables, and no per-run application or dependency copy.
- Managed plans record an external data-bearing `newsroom_path` (default
  `~/.config/splash/NEWSROOM.md`). Preflight reads that path rather than the tracked maintainer
  profile in the source checkout; focused tests prove the external profile wins and doctor verifies
  the safe parent even while the file is still absent before setup.
- The legacy root-template dependency inventory now equals the canonical root production inventory.
  This closes a caught false-red activation path where Engine correctly omitted development-only
  `puppeteer` but preflight would still have demanded it after install.
- Splash now ignores Engine's generated `.splash-bun-install.json` receipt when inventorying runtime
  files. The revised development contract no longer requires a clean Git worktree or immutable ref;
  an explicit reapply refreshes the recorded closure after intentional source changes.
- Installed production verification and rendering scripts now import `puppeteer-core` and keep
  their explicit browser path. Full `puppeteer` remains development-only for proof/test files. A
  clean frozen production fixture installed 432 packages (343 MiB), included `puppeteer-core`, and
  contained no `node_modules/puppeteer`; lifecycle scripts were disabled and the browser remained a
  separate explicit Engine install.
- `installer/enrol-engine.mjs` proves an existing checkout can enter the same Engine transaction.
  Its provisional standalone Engine bootstrap is now superseded and must not run in the development
  path. Signed public acquisition is a separate later release-hardening concern.
- The first closed `map-bake` draft was withdrawn from both Engine's operation table and Splash's
  runner after review. It routed arbitrary-looking requests into fixed Europe metro, Europe CO2, and
  Potomac gauge seed renderers; closure and credential isolation did not make those cameras or data
  semantics valid for another story. The sealed seed entrypoints remain fixture coverage only. That
  withdrawn design is now superseded by a separate fixed renderer which accepts only the reviewed
  story-local `MAP-BAKE.json` contract described below; no seed entrypoint is registered.

The largest direct trees in that clean production fixture were `@remotion` 52.0 MiB, `@rspack`
41.8 MiB, `maplibre-gl` 40.3 MiB, `@babel` 35.9 MiB, `chromium-bidi` 19.1 MiB, and
`puppeteer-core` 12.6 MiB. Within `@remotion`, the platform compositor was 16.9 MiB and Studio was
15.9 MiB. These measurements locate the remaining weight in the requested video, map, and browser
automation capabilities; they do not show an installed Chromium or `dev-browser` payload inside
`node_modules`. The clean production tree loaded the chart, map, and video module set successfully
with package installation disabled.

The focused development path now records `source_mode: development`, adopts the explicit current
checkout without requiring a signed catalogue row, immutable ref, or clean worktree, and exposes one
thin Splash command over Engine plan/apply. It retains nullable release-provenance fields and keeps
stories and newsroom state outside the checkout so later release hardening changes provenance
enforcement rather than user paths or data. Chart/map/video dependency-load smokes are wired. The
declarative map bake, Datawrapper producer, MapTiler delivery, and Cloudflare delivery now have
closed managed operations, but their real provider/render smokes have not all run. Live
adoption/reapply/uninstall evidence now exists on macOS; Linux, Windows, and WSL remain outstanding.

Local product evidence for this decision is:

- Engine Spotlight captures and verifies three exact installed integration files and launches its
  recorded interpreter in place; it does not snapshot the checkout per invocation.
- Engine Mycroft verifies its recorded Goose command and injects only required credentials at launch;
  it does not snapshot a Mycroft product tree per invocation.
- The current Splash plan installs root production dependencies, a recorded browser, and a
  no-value smoke before activation. The preflight MCP application does not own installation.

The same-user verify/use race remains a documented residual risk shared with Spotlight and Mycroft.
If hostile same-user mutation becomes a release threat, the remediation is one Engine-wide signed or
OS-isolated runtime project, not reinstating a Splash-only development-tree copy.

Verification commands and observed results:

```text
bun test apps/goose/test/app-client.test.ts apps/goose/test/compatibility.test.ts
12 pass, 0 fail, 45 assertions

BSIG_SPLASH_CHECKOUT=/Users/tomvaillant/buried_signals/tools/splash \
  go test -tags live_splash ./internal/run -run SplashClosureSpike -count=1 -v
PASS (TestSplashClosureSpike, 23.36s; package 23.696s)

bun install --frozen-lockfile
PASS (457 installs across 499 packages; no changes)

bun test
3033 pass, 0 fail, 8487 assertions across 144 files (223.85s)

bun run matrix:check
PASS (MATRIX.md matches the tree)

bun run survey:check
PASS (type-survey.md matches the tree)
```

The live spike is opt-in (`darwin && live_splash`) and requires an explicit absolute Splash
checkout, so Engine's normal standalone suite does not silently depend on a sibling repository,
Chrome, or this Mac's pinned bootstrap bytes. These results prove the spike on the named macOS
machine and assets. They are not Linux, Windows, WSL, release-signing, or credential-hydration
evidence.

Focused verification of the direct-checkout U3 pivot on 2026-08-14 used Engine working-copy commit
`ed315a2a59a9b07fb51f0b8d231e1ec09658422b` (change
`tsnynqzmtptomqmmykrrummwzlwxzkut`) and Splash working-copy commit
`fba5df4db34cbb8ce43337f3a434d3ad88e185ed` (change
`kqxmlukosmooxlpkvknlmpuryvyrnsxn`). Both are mixed dirty working copies; these are evidence
coordinates, not release commits or ownership claims.

Commands and results:

```text
go test ./internal/plan -run 'GitUpdate|Splash|BunProject'
PASS

go test ./internal/products/splash ./internal/run ./internal/doctor \
  -run 'Splash|TestModule|TestBuild'
PASS

go test ./internal/execpolicy -run 'Default|Splash|Allow'
PASS

bun --config=skills/splash/scripts/engine-bunfig.toml --no-env-file \
  install --frozen-lockfile --ignore-scripts
PASS: 461 installs across 499 packages; no lockfile changes

bun --config=engine-bunfig.toml --no-env-file \
  install --frozen-lockfile --production --ignore-scripts
PASS in a clean fixture: 432 packages, 343 MiB; puppeteer-core present, puppeteer absent

bun --no-env-file test skills/splash/test/run-operation.test.ts \
  skills/splash/test/preflight.test.ts installer/test/install-browser.test.ts
PASS: 40 tests, 0 failures

bun --config=skills/splash/scripts/engine-bunfig.toml --no-env-file test \
  installer/test/enrol-engine.test.ts installer/test/install-browser.test.ts apps/goose/test \
  skills/splash/test/run-operation.test.ts skills/splash/test/preflight.test.ts \
  skills/splash/test/root-template-tells-the-truth.test.ts
PASS: 72 tests, 0 failures, 231 expectations

bun --no-env-file test installer/test
PASS with loopback binding permitted: 50 tests, 0 failures, 221 expectations. The restricted sandbox
run failed only because it denied ephemeral loopback listeners; the same suite passed on the host.

bun --config=skills/splash/scripts/engine-bunfig.toml --no-env-file test
PASS with host browser/localhost access: 3043 tests, 5 explicit live-provider skips, 0 failures,
8545 assertions across 149 files (213.78s)

bun run matrix:check
PASS: MATRIX.md matches the tree

bun run survey:check
PASS: type-survey.md matches the tree

go test -race -count=1 ./internal/products/splash ./internal/plan ./internal/run \
  ./internal/doctor ./internal/execpolicy ./cmd/bsig \
  -run 'Splash|BunProject|GitUpdate|UpdatePlan|Default|Allow'
PASS: all six focused Engine packages

go test -race -count=1 ./internal/run -run 'Splash'
PASS after the seed-specific generic map operation was withdrawn

go vet ./...
PASS: no findings

GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go test -c -o /tmp/bsig-splash-linux-amd64.test ./cmd/bsig
PASS: compile only; not native Linux execution

GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go test -c -o /tmp/bsig-splash-windows-amd64.test.exe ./cmd/bsig
PASS: compile only; not native Windows execution
```

The same complete Splash command run inside the restricted agent sandbox produced 18 browser or
loopback failures plus two setup-server errors because localhost binding and browser control were
denied. Every affected test passed with host access, followed by the complete zero-failure host run
above. This is an execution-environment distinction, not a waived test.

The broad Engine command is not green in the current mixed working copy:

```text
go test ./...
FAIL: cmd/bsig TestSkillsVendor_MatchesVendoredManifests — the pre-existing dirty authored catalogue
has an invalid signature.
FAIL: internal/catalog TestPublishedCatalogMatchesAuthored — that authored catalogue diverges from
the published Mycroft copy.
All other Engine packages passed with host localhost access.
```

Those two catalogue failures predate the Splash U3 changes. They remain honest broad-suite failures,
but signed Splash catalogue publication is now out of scope and is not a development-install blocker.

The Bun lock check still announced the checkout `.env`; it did not print a value. A controlled
canary run confirmed that `env = false` kept the file's value absent from the Bun child, but the
announcement is disconfirming evidence against relying on the CLI flag alone. Engine's generated
Bun configurations set the documented `env = false`, and focused shims assert that exact
configuration reaches dependency install, browser install, smoke, operation, and MCP launch. A real
clean install must confirm the same boundary before release.

## U4 local setup and migration boundary

The default `installer/configure.mjs` path starts an Engine-backed loopback controller. The
controller binds an ephemeral `127.0.0.1` port, exchanges a one-use URL-fragment capability for an
HttpOnly same-site cookie, enforces exact Host and Origin, bounded JSON bodies,
no-store/CSP/referrer headers, and idle/overall expiry.

After the 2026-08-26 credential-input cutover, this page calls only Engine credential list/status
operations. It shows every exact ID, provider link, stored generation, and validation state but has no
secret field. `/api/credential/replace`, `/api/credential/remove`, and
`/api/legacy/migrate-credential` return `410 credential-input-disabled` after consuming the bounded
request body and never call the Engine mutation boundary. Indicator Labs remains the managed input
path. Open-source users configure the same IDs through Engine's protected `bsig` stdin/keychain flow
outside Splash, entering values through a private prompt rather than chat or command arguments.

The key-status and newsroom destinations are semantic keyboard-operable tabs. The newsroom writer
uses a revision digest plus an adjacent cross-process lock held across final reread, fsynced temp
write, and atomic rename; it preserves unowned front matter and prose. Declining a profile and
replacing that decision each require a separate confirmation. Optional non-secret Cloudflare/CMS
configuration is canonical `NEWSROOM.md` state, not broker state.

Legacy `.env` discovery returns identities and assignment handles but no values. Unsafe ownership,
permissions, symlinks, shell syntax, duplicates, and alias ambiguity fail closed. The page may import
named non-secret service settings through the same compare-and-swap rule. It never reads, migrates,
or removes credential values: the user first configures the ID through the managed or open-source
Engine path, confirms broker status, and then removes the legacy assignment by hand.

Newsroom derivation uses one outbound boundary that rejects local/private/reserved names and
addresses, credentials in URLs, non-default ports, mixed DNS answers, unsafe redirects, content
types, and byte-limit violations. The checked address is pinned into the actual HTTP connection, so
the request does not perform a second unverified resolution. Relative stylesheets resolve against
the final checked redirect URL. A real request through that policy to `https://example.com` returned
the public HTML successfully; private/intranet derivation remains manual by design.

The controller runs as a separate child with a closed newline-delimited lifecycle protocol. Its
parent receives readiness/closure or a stable startup error only; HTTP bodies never enter that
channel.

Focused verification on 2026-09-01:

```text
bun --no-env-file test installer/test apps/goose/test skills/splash/test
PASS: 1,621 tests, 3 skipped, 0 failures, 2,880 expectations
```

These tests cover the loopback refusal boundary, exact open-source/managed copy, visible credential
IDs, status-only studio bundle, and preflight remedies. Credential mutation through the Splash page
is intentionally absent.

`dev-browser` then opened the real `installer/configure.mjs` surface against a locally built Engine
binary, completed the protected session, and switched to **Key status**. The rendered page showed
all four canonical IDs, both managed/open-source routes, and zero password inputs. Visual inspection
confirmed the setup page contains status and provider links only, with the shared guidance rendered
once above the credential cards.

A visual-language pass then matched the local setup and full Readiness/Choose visual studio to the
landing page's bright editorial system: `#F5F0E6` paper, `#FCFAF3` plates, serif display headings,
spaced utility labels, cyan/amber rules, and the Splash mark. A fixture-backed Engine status session
avoided live-keychain access while exercising the real controller. Browser verification rendered all
four credential rows with zero password fields, bound a story, rendered three visual-choice cards,
and confirmed both surfaces fit a 320 CSS-pixel viewport without horizontal overflow.

## U5 production Goose application shell

The Engine-launched MCP entrypoint now targets `apps/goose/server.mjs`, not the U1 compatibility
fixture. Its manifest closure binds the production app tree, setup-controller tree, Splash skill
tree, dependency tree, and exact server entrypoint before launch. Engine passes the canonical path
of its own running executable to the MCP child; no PATH-resolved `bsig`, credential, browser selector,
or checkout `.env` reaches the server.

The bundled resource has an empty network allowlist and two destinations: Readiness and Choose
visual. Readiness separates hard blockers, runtime state, broker state, and each optional credential
status/acquisition link. It has no credential input. Explicit setup action starts U4 as a separate
child; the one-time loopback capability is returned only by an app-only tool, never the model-visible
open/status result or parent lifecycle state. The client tries the documented host open-link channel,
then a fixed local-opener tool, while distinguishing host denial, host error, missing capability,
expired session, and opener failure.

A model-visible nomination asks Engine's closed `story-inspect` operation to canonicalize one story
beneath the adopted stories root and does not bind it. The confirmation challenge exists only in an
app-visible tool result; confirmation binds the displayed descriptor in memory for that MCP process.
A new process starts unbound, and the binding module re-inspects the canonical descriptor before a
future write.

Engine continues to own `extensions.splash` through the same revision-checked config transaction as
its other products. Doctor now distinguishes missing registration, disabled registration, a foreign
changed value, and the exact runnable app. Uninstall refuses to remove a disabled or modified entry;
an already-missing owned entry does not block cleanup of unrelated Engine-owned state.

Canonical Splash guidance and pre-flight remedies now route new credentials to the protected
Readiness action. The root `.env` writer remains explicitly legacy code and is no longer presented as
the production answer.

Focused verification with host loopback access on 2026-08-14:

```text
bun test skills/splash/test/preflight.test.ts apps/goose/test \
  installer/test/setup-security.test.ts installer/test/legacy-env.test.ts
PASS: 82 tests, 0 failures, 298 expectations

go test -race -count=1 ./internal/products/splash ./internal/doctor ./internal/plan \
  ./internal/run ./cmd/bsig -run 'Splash|MCP|BunProject|GitUpdate'
PASS: all five focused Engine packages
```

The production server's raw stdio initialization test emits exactly the JSON-RPC response on stdout
and diagnostics on stderr. The setup-session fixture proves its platform fallback without retaining
the capability or an ambient credential canary in public manager state. This remains fixture evidence:
the production app has not yet been exercised in a real Goose Desktop session, and host open-link
success/denial plus visual/accessibility behavior remain unclaimed.

## Retained publication-format gate evidence

The completed 2026-08-13 publication-format planning document was retired on 2026-08-15 after its
operational guidance had landed in `README.md` and the Splash/Storyboard skills. Its acceptance
evidence remains executable in
`skills/storyboard/test/fixtures/publication-format-host-acceptance.mjs` and
`skills/storyboard/test/publication-format-gate.test.ts`.

That fixture records a fresh Codex-host run from 2026-08-14. Before the journalist replied,
`whereIs` returned exactly these six fields:

```js
{
  phase: "storyboard",
  status: "ready",
  owner: { kind: "skill", id: "storyboard" },
  missing: [
    "the reference loop's answer",
    "slot 1: no format was ever chosen",
    "slot 1: this medium and format were never confirmed reachable",
    "slot 1: nothing chosen",
  ],
  attempts: 0,
  resume: "Stop at G2b for slot 1; the journalist must provide format.",
}
```

The complete assistant turn recommended Interactive web, presented all four publication formats,
asked which to make first, and stopped. The journalist replied `Interactive web.` The only
Storyboard additions were `format: web` and `reachable: yes`; `whereIs` then returned exactly:

```js
{
  phase: "storyboard",
  status: "ready",
  owner: { kind: "skill", id: "storyboard" },
  missing: [
    "the reference loop's answer",
    "slot 1: nothing chosen",
  ],
  attempts: 0,
  resume: "Stop at G2-reference; the journalist must provide reference.",
}
```

The fixture pins the complete assistant turn, both Storyboard states, their exact diff, and pre/post
file digests. The current full Splash suite continues to exercise that record.

The cleanup audit did not classify production or proof assets as stale. In particular,
`apps/goose/compatibility/` remains referenced by Splash's host-contract tests and Engine's runtime
closure test; `installer/install-browser.mjs` is invoked by Engine's managed browser step; generated
catalogues are runtime inputs; and the root template and legacy environment example retain direct
tests. They remain intentionally.

## U6 canonical visual catalogue

`catalog/visual-catalog.json` is now the single authored structural source. It normalizes ten
medium/format producer pairs and 41 treatments rather than copying the resulting 162 stable option
rows by hand. It covers all 40 chart/map type sheets plus the photograph-sequence contract. The
generator publishes a strict Draft 2020-12 schema, rejects unknown fields through strict Zod 4
objects, computes a content revision, and emits the Storyboard-local derivative. Storyboard's
existing `FORMAT_CATALOG` now reads that generated local copy, preserving the no-cross-skill-import
boundary.

Generation verifies exact producer skill/front-matter identity, every implemented delivery form in
both directions, canonical size rules, every type-sheet label and reference, credential and setting
IDs, and the maintained Datawrapper treatment/type mapping. Each expanded row carries interaction,
runtime/browser prerequisites, data-shape constraints, delivery compatibility, required and
optional capabilities, and proof coverage. Proof artifacts annotate coverage only: an unproven
beeswarm remains selectable because the bespoke chart producer contract supports it. Conversely,
the contour/isoline reference explicitly says no implementation ships, so all four of its rows are
non-selectable with a structural reason and no setup remedy. Unsupported image/web and image/video
pairs remain absent.

Capability evaluation is local to the affected row. A closed MapTiler production capability closes
selectable map rows with the reported reason and Readiness action while chart and photograph rows
remain open. Missing Cloudflare state closes only the hosted delivery form, not the underlying web
visual. Missing Datawrapper state closes only the delegated alternative; it never selects Custom or
Datawrapper and never disables the custom producer.

Context7 CLI 0.3.5 grounded the strict schema behavior in the official JSON Schema core/validation
specifications and Zod 4 API linked above. Focused verification on 2026-08-14:

```text
bun run matrix:check
bun run survey:check
bun run catalog:check
bun test skills/storyboard/test skills/splash/test/format-shippability.test.ts \
  skills/splash/test/no-cross-skill-imports.test.ts
PASS: 195 tests, 0 failures, 882 expectations
```

This closes U6's structural catalogue and drift contract. It does not claim that the U8/U9 graphical
views or real-browser chooser behavior exists yet.

## U7 revision-safe selection domain

The host-neutral selection service now reads the active canonical Storyboard gate, evaluates the
generated catalogue against a capability generation, and returns one serializable view model for
graphical consumers. Reads, focus, details, and cancellation do not write. Confirmation requires the
observed story, catalogue, and capability revisions and mutates only fields owned by the active gate.
Format and treatment rewinds are separate explicit commands, and the custom/Datawrapper producer
choice remains a later independent confirmation.

An MCP-session story binding remains non-authorizing until the user confirms its displayed
challenge. Every selection read and mutation revalidates the opaque binding through Engine. The
canonical writer holds an adjacent cross-process lock from its final stable reread and revision check
through fsynced atomic replacement; live locks are not stolen and only proved abandoned same-host
owners are reclaimed. Two independently started Bun processes confirming from one observed revision
produce one winner and one no-write conflict.

Focused verification on 2026-08-14:

```text
bun --no-env-file test apps/goose/test/selection.test.ts \
  apps/goose/test/story-binding.test.ts \
  skills/storyboard/test/storyboard-writer.test.ts \
  skills/storyboard/test/publication-format-gate.test.ts \
  skills/splash/test/where.test.ts skills/splash/test/phases.test.ts
PASS: 135 tests, 0 failures, 430 expectations

bun --no-env-file run scripts/visual-catalog.mjs --check
PASS: visual catalogue schema, parity checks, and Storyboard derivative
```

This closes U7's selection and mutation boundary. The production app-only tool wiring, visual
interaction, setup return, recommendation layer, and real-host QA remain U8-U10 work.

## U8 À-la-carte chooser

The production MCP app now exposes app-only read, confirm, format-rewind, and treatment-rewind
tools over U7's selection service. The opaque story-binding capability remains inside the server and
is revalidated through Engine on every call. Tool schemas reject unknown fields with a stable error
that does not echo an attacker-controlled field name. The server requires current pre-flight state,
and confirmation still checks the story, authored catalogue, and public capability generation before
the canonical writer runs.

The chooser presents only the active visual gate in canonical order. It uses native radio, select,
checkbox, and button controls; hides unavailable rows by default; exposes them with structural or
capability reasons; and distinguishes base-format reachability from optional delivery setup. Filter,
focus, detail, Configure, Cancel, and reload paths do not write. Configure opens the existing
protected Readiness setup path. Format and treatment rewinds name the fields they clear before the
app-only action. The confirmed story ID and canonical location remain visible throughout the view.
CSS provides 44-pixel controls and a single-column 320-pixel layout. Real rendered layout, focus,
contrast, and Goose-host behavior remain U10 evidence rather than being inferred from source tests.

Focused verification on 2026-08-14:

```text
bun --no-env-file test apps/goose/test/a-la-carte.test.ts \
  apps/goose/test/selection.test.ts apps/goose/test/story-binding.test.ts \
  apps/goose/test/server.test.ts apps/goose/test/protocol-boundary.test.ts \
  skills/storyboard/test/storyboard-writer.test.ts \
  skills/storyboard/test/publication-format-gate.test.ts \
  skills/splash/test/where.test.ts skills/splash/test/phases.test.ts
PASS: 151 tests, 0 failures, 520 expectations

bun --no-env-file run scripts/visual-catalog.mjs --check
PASS: visual catalogue schema, parity checks, and Storyboard derivative

GOCACHE=/tmp/bsig-go-cache go test ./internal/plan ./internal/run \
  ./internal/products/splash ./cmd/bsig -run 'Splash|RuntimeAsset|BunProject|MCP'
PASS: all four packages
```

The Engine MCP launch inventory now includes the authored visual catalogue imported by the app. This
extends the existing runtime-file integrity receipt for the development checkout; it does not add a
release pin, signed catalogue, downloader, or separate install operation.

## U9 shared Storyboard recommendation

Storyboard mode now wraps the same U8 chooser and U7 confirmation path instead of maintaining a
second option list or writer. Its deterministic advisory layer ranks only currently enabled choices
from confirmed Storyboard fields and a bounded, stable read of the frozen `source/profile.json`.
Each row separates matched evidence, unresolved requirements, and runtime trade-offs. Proof coverage
is not a fit signal, equal scores disclose the canonical-order tie-break, and the recommendation
itself never writes.

The recommendation is bound to the story, catalogue, capability, and profile revisions. Confirmation
re-reads that evidence, rejects stale advice and unreachable alternatives, and then passes the exact
option ID and U7 revision tuple to the shared writer. A successful confirmation returns a fresh
recommendation envelope for the next graphical gate. Producer choice remains its own later explicit
gate, while format and treatment changes continue to use U7's explicit rewind actions. Real Goose
rendering, accessibility, close/reopen, and setup-return behavior remain U10 evidence.

Focused verification on 2026-08-14:

```text
bun --no-env-file test apps/goose/test/storyboard-choice.test.ts \
  skills/storyboard/test/propose.test.ts \
  skills/storyboard/test/publication-format-gate.test.ts
PASS: 47 tests, 0 failures, 242 expectations

bun --no-env-file test apps/goose/test/server.test.ts
PASS: 9 tests, 0 failures, 62 expectations

bun --no-env-file test apps/goose/test/a-la-carte.test.ts \
  apps/goose/test/storyboard-choice.test.ts apps/goose/test/selection.test.ts \
  apps/goose/test/story-binding.test.ts apps/goose/test/server.test.ts \
  apps/goose/test/protocol-boundary.test.ts \
  skills/storyboard/test/storyboard-writer.test.ts \
  skills/storyboard/test/publication-format-gate.test.ts \
  skills/storyboard/test/propose.test.ts \
  skills/splash/test/where.test.ts skills/splash/test/phases.test.ts
PASS: 186 tests, 0 failures, 696 expectations
```

## U10 development integration — technical evidence, release checkpoint open

The development setup remains deliberately simple: one Splash command adopts the current checkout
through Engine, installs the checkout's complete current lockfile and compatible browser, records the
manifest, runs a no-value smoke, and uses the same doctor/uninstall control plane as the other Engine
products. No signed Splash release, immutable source ref, automatic Engine download, updater, or
release pin was added. Stories default to `~/.local/share/splash-stories/` and newsroom state to
`~/.config/splash/NEWSROOM.md`; those stable external paths and the broker record IDs can survive
later release hardening without moving journalist data.

Canonical setup documentation now calls `bsig doctor --product splash`; `installer/doctor.mjs` is a
tested compatibility handoff to that same doctor rather than a second implementation. `.env.example`
is labelled legacy migration input and explicitly tells new managed installations not to copy it.
The Datawrapper and delivery skills now route new key-bearing work through Engine while retaining
their direct JavaScript APIs only as labelled implementation/test or legacy surfaces. CMS insertion
remains a local payload only: Engine registers no CMS credential or live CMS operation.

Integrated review found and closed two defects that isolated unit tests had hidden:

- the sealed Datawrapper operation looked for `DATAWRAPPER_SPEC.json`, while the canonical beat
  contract reads and persists `spec.json`; both the outer and sealed operation now use `spec.json`;
- Engine modelled `parameters` as `map[string]string` even though confirmed delivery carries a
  finding list and handover object. Engine now validates an operation-specific strict JSON object
  before reading any broker record. Hosted delivery dispatches the complete confirmed
  `materialise(embed)` action and derives Cloudflare project/file/deployment identity inside the
  delivery skill; the retired caller-selected low-level shape is rejected.

A final install-transaction review closed two more lifecycle inconsistencies:

- `installer/install.sh` projected skills after Engine had committed, so a late collision could
  leave an apparently successful but partial install. Engine now creates direct links to every
  shipped skill inside apply, records them in a strict ownership ledger, reconciles additions and
  removals, verifies them in doctor, and removes only unchanged owned links on uninstall. The
  compatibility placement module is no longer invoked after commit.
- Reapply now refuses a previously owned link that was independently retargeted, rather than
  adopting it and risking an old-ledger/new-link split if a later step rolls back. The prior ledger
  is restored atomically. A missing stories root is likewise created and rollback-owned by the
  Engine adoption step instead of by the shell wrapper.
- Planning rejects custom story or newsroom paths inside the adopted source checkout, and doctor
  rechecks that separation. Doctor now also distinguishes a valid host-neutral install with no Goose
  present from the actionable case where Goose is installed but its Splash registration is missing.

A later integration pass also closed the map capability mismatch. A saved `MAPTILER_KEY` could make
the chooser report maps available even though the only closed bakes were fixed proof cameras. Engine
now registers one browser-bound `map-bake` operation whose only dynamic selector is the digest of
`beats/<outputId>/MAP-BAKE.json`. The strict contract records the confirmed treatment/format, camera,
basemap policy, geography/data paths and digests, declared study features, anchors, and fixed output
names. Engine validates the contract and both story inputs before reading the broker record; Splash
revalidates them, rejects symlinks and unsupported GeoJSON, and writes an immutable digest-addressed
plate/geometry/receipt directory. The Europe and Potomac seed scripts remain unregistered.

Verification recorded on 2026-08-14; the full suite, generated checks, and focused Engine suite were
refreshed on 2026-08-15:

```text
bun --no-env-file test --reporter=junit --reporter-outfile=<temporary path> --only-failures
PASS: 3165 tests, 6 explicit live/provider skips, 0 failures, 8958 assertions (217.45s)

bun --no-env-file test skills/splash/test/map-bake.test.ts \
  skills/splash/test/run-operation.test.ts \
  skills/dw-beat/test/sealed-produce.test.ts \
  skills/deliver/test/sealed-operation.test.ts
PASS: 17 tests, 1 explicit real-browser skip, 0 failures, 54 expectations

SPLASH_LIVE_BROWSER='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  bun --no-env-file test skills/splash/test/map-bake.test.ts
PASS: 5 tests, 0 failures, 19 expectations; real Chrome plus the installed local MapLibre fixture

bun --no-env-file test skills/splash/test/skill-md-matches-code.test.ts \
  skills/splash/test/root-template-tells-the-truth.test.ts \
  skills/splash/test/env-example.test.ts installer/test/doctor.test.ts \
  skills/dw-beat/test/sealed-produce.test.ts \
  skills/deliver/test/sealed-operation.test.ts
PASS: 18 tests, 0 failures, 40 expectations

bun --no-env-file run matrix:check
bun --no-env-file run survey:check
bun --no-env-file run catalog:check
PASS: matrix, type survey, visual catalogue schema/parity, and Storyboard derivative match

GOCACHE=/tmp/bsig-go-cache go test -race -count=1 ./internal/run \
  ./internal/products/splash ./internal/plan ./internal/doctor ./internal/keys ./cmd/bsig \
  -run 'Splash|MCP|BunProject|CredentialLock|Record|Malformed|SecretService'
PASS: all six focused Engine packages

bun --no-env-file test installer/test/enrol-engine.test.ts
PASS: 7 tests, 0 failures, 27 expectations; no post-commit skill installer or pre-apply stories-root mutation

GOCACHE=/tmp/bsig-go-cache go test -count=1 ./cmd/bsig ./internal/keys \
  -run 'MalformedRecordJSON|CredentialLockExcludesAnotherProcess|RecordBrokerConcurrent|SecretServiceMissingSessionBus'
PASS: malformed candidate redaction, subprocess locking, concurrent record mutation, and Linux
missing-session-bus fail-closed regressions

BSIG_LIVE_OS_TESTS=1 GOCACHE=/tmp/bsig-go-cache go test -tags=live_os -count=1 \
  -run '^TestDarwinKeychainSplashRecordLiveRoundTrip$' ./internal/keys
PASS: native macOS Keychain create, replace, and remove round trip

node --test desktop/tools/run-native-engine-tests.test.mjs
PASS: 2 tests; the native gate includes the Splash Linux record round trip
```

An isolated real macOS development lifecycle passed on 2026-08-15. It used the current Splash
checkout, a freshly rebuilt current Engine binary, an isolated XDG Engine/Goose state root, a
temporary namespaced projection under the shared agent skill root, and the normal one-command
`installer/install.sh` entrypoint. The first install and an immediate reapply both passed the
chart/map/video/preflight smoke and `bsig doctor --product splash` with six passes and no failures.
Goose CLI 1.37.0 read the isolated configuration as the exact enabled stdio extension
`bsig mcp splash`. A direct MCP 2025-11-25 handshake then listed `ui://splash/app`, all 14 production
tools, and loaded a 380,575-byte `text/html;profile=mcp-app` resource containing Readiness,
À-la-carte, and Storyboard-recommendation interfaces. `open_splash` reported the native broker
available, all four credential records not saved at generation 0 with their provider acquisition
URLs, installed dependencies passing, and only the deliberately absent external `NEWSROOM.md` as a
readiness blocker. No credential value was used.

The matching default keep-data uninstall planned seven steps, executed skill unprojection, surgical
Goose registration removal, and one receipt-bound runtime removal, and skipped the four
data-bearing paths. Post-apply checks found the dependency tree, dependency receipt, managed Chrome
for Testing 148.0.7778.97, and temporary skill namespace absent; no transaction preimage remained.
The source checkout, isolated stories root, external newsroom parent, and isolated Goose config root
remained, and the manifest was retired to exactly those data-bearing artifacts. This closes the
macOS development adoption/reapply/doctor/MCP-load/uninstall evidence gap; it is not a signed-release,
Goose Desktop rendering, provider, Linux, Windows, or WSL claim.

The lifecycle exposed and closed install-path defects that focused tests had not represented:

- inherited empty Bun preload variables were treated as a real preload path;
- the macOS probe omitted standard Homebrew Goose paths, and a fresh Goose profile lacked its
  parent directory;
- the installer discarded Engine's final structured diagnostic, and the Splash-scoped doctor ran
  unrelated global catalogue/auth/bootstrap gates;
- generic uninstall safely refused the non-empty dependency/browser trees, so Splash now uses one
  transactionally moved, manifest/receipt/digest-bound removal step and rolls it back if manifest
  retirement fails;
- removing the last Goose extension produced the valid canonical `extensions: {}` form, which the
  reinstall editor could not previously expand; and
- namespaced skill unprojection left an empty Engine-owned namespace directory.

Focused regressions cover each repaired boundary, including tampered/partial runtime refusal,
rollback/finalization, manifest-retirement failure, canonical empty-map reinstall, and namespace
rollback.

Clean feature verification used Splash implementation commit `f2bd0ff1` and Engine feature commit
`edc15444`. The Engine commit was exported without the initiative-unowned local catalogue/Mycroft
edits before running `go test -race -count=1 ./...`; every package passed. `go vet ./...`, Linux and
Windows amd64 cross-compilation of both `internal/keys` and `cmd/bsig`, the native-gate wrapper
tests, and a fresh synthetic macOS Keychain create/replace/remove round trip also passed.
Cross-compilation is still not native Linux or Windows evidence.

The final pushed Engine tip is `7d77c4f9`. Two test-only follow-ups resolved portability failures
found by the first clean Linux CI runs: the redaction regression now resolves `/bin/sh` to the
pinned regular file required by the execution policy, and the abort-lifecycle desktop test fixes
its platform independently of the runner's installed prompt programs. The final
[`install-contract` run](https://github.com/buriedsignals/engine/actions/runs/31871603864) passed the
Linux compile, portable contract/vet, Windows and Linux ARM64 cross-build, and desktop
contract/type gates.

The six Splash skips are still skips, not live passes: they require a real MapTiler/Datawrapper or
sealed provider credential, including the generic map bake's real-provider path. The broad Engine
suite in the unrelated mixed local working copy passes every package except two catalogue checks:
`TestSkillsVendor_MatchesVendoredManifests` rejects the now-stale signature and
`TestPublishedCatalogMatchesAuthored` sees the published Mycroft copy diverge. Inspection attributes
both to the pre-existing, initiative-unowned removal of the Mycroft `qmd` row from
`engine/catalog/catalog.json`; Splash did not alter, sign, publish, or repair that catalogue.

U10 remains open. The retained release blockers are:

- production Goose Desktop rendering, successful and denied open-link behavior, setup return, and
  close/reopen recovery have not been observed;
- the native Linux Secret Service live round trip and a complete Linux Goose topology have not run;
  Windows and WSL remain unclaimed;
- real MapTiler, Datawrapper, and two-revision Cloudflare provider operations have not run with the
  managed broker path;
- development adoption, reapply/repair, doctor, raw MCP load, and uninstall pass as a complete real
  macOS lifecycle; no equivalent native Linux, Windows, or WSL lifecycle has run;
- no preregistered representative-participant checkpoint has run. The required five non-contributor
  journalist tasks and any mandated retests therefore have no usability evidence.

These blockers prevent U11. The PRD and the empty Jujutsu cleanup allowlist remain in place.

## Requirements checklist

Status vocabulary: `fixture-pass`, `partial`, `pending`, `blocked`, `release-pass`.

| Requirement | Units        | Status       | Evidence or missing evidence                                                                                                                                                                                                                                                                                                                                                            |
| ----------- | ------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1          | U1/U5        | partial      | Production Readiness/Choose resource and tool contract pass; U1 compatibility rendered on current Desktop, but production Desktop navigation is not yet observed.                                                                                                                                                                                                                       |
| R2          | U1/U5        | fixture-pass | Production app has no credential inputs or credential-bearing MCP fields; strict schemas and canary scans pass. Release-host observation remains U10.                                                                                                                                                                                                                                   |
| R3          | U1/U4/U5     | blocked      | `ui/open-link` code and host capability grounded; real success/denial outcomes not yet observed.                                                                                                                                                                                                                                                                                        |
| R4          | U4           | partial      | Token exchange, exact Host/Origin, session reuse refusal, shutdown, content type/body bounds, and security headers pass focused loopback tests; timed expiry and release-host observation remain.                                                                                                                                                                                       |
| R5          | U2/U4        | partial      | U2 atomic validate-and-commit plus U4 revision-safe interface boundary, conflict, preservation, and migration tests pass; real provider/native-store UI use remains.                                                                                                                                                                                                                    |
| R6          | U2/U3/U4/U10 | partial      | Value, URL, malformed-JSON, stdout, audit, receipt, setup-control, sealed-operation, and final-artifact canary scans pass; live provider output inspection remains.                                                                                                                                                                                                                       |
| R7          | U1/U2/U5     | fixture-pass | Contract 1, exact unavailable envelope, four-entry Engine registry, broker-independent discovery, and production app normalization pass.                                                                                                                                                                                                                                                |
| R8          | U2/U4        | partial      | Bounded JSON stdin, no-argv/no-output regressions, protected loopback channel, immediate field clearing, and child lifecycle-only protocol pass; release UI observation remains.                                                                                                                                                                                                        |
| R9          | U2/U10       | partial      | Native macOS Keychain record round trip passed. Linux/Windows/WSL are unclaimed; native Linux evidence is missing.                                                                                                                                                                                                                                                                      |
| R10         | U2/U4        | partial      | U2 native-store and missing-session-bus fail-closed code/tests plus explicit U4 legacy discovery/migration exist; native Linux execution remains pending.                                                                                                                                                                                                                               |
| R11         | U1/U3        | partial      | Direct installed-checkout verification, dependency/browser binding, raw MCP transport, strict declarative map bake, canonical Datawrapper `spec.json`, MapTiler final delivery, and complete hosted materialisation have focused tests. Map contracts and inputs fail before broker access and fixed seed cameras remain unregistered; live install/provider evidence remains.              |
| R12         | U2/U3/U5     | partial      | One atomic credential record hydrates only the exact provider check/map bake/Datawrapper/MapTiler-delivery/Cloudflare-delivery operation; structured requests and story-bound map inputs are validated before the store read. Real installed activation and next-operation provider runs remain.                                                                                         |
| R13         | U2/U4        | partial      | Monotonic generations, Engine and newsroom cross-process locks, concurrent winner/conflict tests, stale-view refusal, and raw-verb rejection pass; live multi-process native-store evidence remains.                                                                                                                                                                                    |
| R14         | U2/U5        | partial      | Provider receipts, saved-unverified delivery state, Cloudflare attestation/account binding, and Readiness presentation pass fixture tests; real-host presentation remains.                                                                                                                                                                                                              |
| R15         | U4/U5        | partial      | Setup tabs and MCP Readiness/Choose navigation, labels/help, live status, keyboard behavior, 44px controls, and 320px CSS exist and are source-tested; real visual/accessibility QA remains.                                                                                                                                                                                            |
| R16         | U4           | fixture-pass | Canonical external NEWSROOM.md update preserves unowned content and proves revision CAS with same-process and barrier-driven cross-process writers.                                                                                                                                                                                                                                     |
| R17         | U4           | partial      | Proposal-only derivation, public-address pinning, redirect/content/byte bounds, and a real public HTTPS request pass; broader platform DNS/live-site QA remains.                                                                                                                                                                                                                        |
| R18         | U4           | fixture-pass | Non-secret Cloudflare/CMS fields validate in canonical newsroom state; revision-safe legacy import precedes dependent token validation.                                                                                                                                                                                                                                                 |
| R19         | U6           | fixture-pass | Strict canonical source and generated Storyboard derivative cover 10 producer pairs, 41 treatments, 162 stable treatment/format IDs, size/interaction/runtime/credential/delivery facts, and one explicitly non-selectable treatment.                                                                                                                                                   |
| R20         | U6           | fixture-pass | Generator checks every type sheet, producer identity, exact delivery forms, canonical sizes, Datawrapper mapping, and proof inventory without treating proof as production authority.                                                                                                                                                                                                   |
| R21         | U6/U7/U8/U9  | partial      | The authored catalogue, Storyboard derivative, selection service, À-la-carte view, and Storyboard recommender share the same revisions, stable IDs, labels, chooser, and writer; real Goose-host observation remains U10.                                                                                                                                                                 |
| R22         | U5/U6/U7     | partial      | The production adapter derives a non-secret capability generation from current Engine readiness, disables only dependent choices or delivery implications, and rejects stale confirmation; real setup-return observation remains U10.                                                                                                                                                    |
| R23         | U5/U6/U8/U9  | partial      | Both modes use the shared chooser for structural/proof-only, repairable capability, optional-capability, and delivery-form reasons, with setup only for repairable causes; rendered QA remains U10.                                                                                                                                                                                       |
| R24         | U7/U8        | partial      | The service and chooser enforce one ordered active G2 sub-gate, stable reachable ordering, applicable facets, zero-result recovery, and explicit confirmation; rendered host QA remains U10.                                                                                                                                                                                            |
| R25         | U7/U9        | fixture-pass | The advisory recommender presents one ranked enabled candidate plus reachable alternatives, discloses its evidence and trade-offs, and preserves explicit format/treatment rewinds and the separate producer gate.                                                                                                                                                                       |
| R26         | U7/U8/U9     | partial      | Both modes call the shared writer only from a separate app-only Confirm action; recommendation, Configure, filter, details, cancel, and proof state do not confirm. Real-host observation remains U10.                                                                                                                                                                                     |
| R27         | U7/U8/U9     | partial      | Cancellation is call-free, canonical state drives reload, no UI database exists, and fresh recommendation state is derived after a write; real app close/reopen evidence remains U10.                                                                                                                                                                                                   |
| R28         | U7/U8/U9     | partial      | Both modes summarize but do not merge medium, format, size, treatment, and producer; format/treatment rewinds state their downstream consequences. Real-host observation remains U10.                                                                                                                                                                                                   |
| R29         | U7/U8/U9     | partial      | Both app modes integrate confirmed opaque binding, Engine revalidation, selection and recommendation revision checks, cross-process locking, one canonical writer, and non-reflective schema errors; real Goose-host evidence remains U10.                                                                                                                                               |
| R30         | U1/U3/U5/U10 | partial      | Production app is additive, Engine owns Goose registration/removal, one simplified current-checkout install/adopt action passes a real macOS install/reapply/doctor/MCP-load/uninstall lifecycle, and the full 3165-test Splash regression passes. Production Desktop rendering and non-macOS lifecycle evidence remain; signed public distribution is out of scope.                                                                                               |
| R31         | U3/U4/U5     | partial      | Default setup, README, doctor, `.env.example`, declarative map bake, Datawrapper, MapTiler delivery, and hosted delivery use or document the broker-backed Engine path; direct APIs/root `.env` are labelled implementation/test or legacy. Live migration evidence remains.                                                                                                                |
| R32         | U4           | fixture-pass | Opt-in per-ID migration commits through Engine first; exact revision/assignment removal preserves unrelated content and retains legacy authority on refusal or failure.                                                                                                                                                                                                                 |
| R33         | U1/U10       | partial      | Current macOS host evidence only; other topology claims absent.                                                                                                                                                                                                                                                                                                                         |
| R34         | U10          | partial      | Engine now invokes the complete high-level embed materialisation without caller-selected provider internals; deterministic tests prove automatic Cloudflare selection, stable namespaced URL, receipt, and two-revision reuse. The live two-revision provider smoke remains.                                                                                                             |
| R35         | U10          | partial      | Durable feedback/review/render recovery, stable custom embed revision, and same-chart Datawrapper revision pass the full suite; fresh-session live provider verification remains.                                                                                                                                                                                                         |
| R36         | U1/U10/U11   | partial      | This record and exact empty cleanup allowlist exist; all closure rows must pass before deletion.                                                                                                                                                                                                                                                                                        |
| R37         | U3/U5/U10    | partial      | Explicit development source mode, one thin current-checkout Engine install/adopt action, transaction-owned stories-root creation, dependency/browser install and direct skill projections, strict projection ownership/rollback, byte receipts, no-copy launch, manifest capture, canonical doctor, and stable external story/newsroom defaults pass focused tests and a real macOS lifecycle. Native Linux/Windows/WSL lifecycles remain; release pinning is out of scope. |

## User-flow checklist

| Flow                                   | Status       | Evidence or next owner                                                                                                  |
| -------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| F1 Open preflight in Goose             | partial      | Production app protocol and raw stdio pass; only the U1 compatibility view has rendered in a real Desktop session.      |
| F2 Configure and verify credentials    | partial      | U2 broker plus U4 protected controller/Engine bridge pass focused tests; Goose launch and real providers remain U5/U10. |
| F3 Configure the newsroom              | partial      | U4 canonical writer/controller passes focused tests; Goose entry and visual QA remain U5/U10.                           |
| F4 Choose à la carte                   | partial      | U6 catalogue, U7 domain, and U8 graphical chooser pass focused tests; real Goose-host interaction remains U10.          |
| F5 Confirm a storyboard recommendation | partial      | U9 shared ranking/chooser/confirmation passes focused tests; real Goose-host interaction remains U10.                   |
| F6 Resume without losing state         | blocked      | Canonical-file reload/revision tests pass, but real production Desktop close/reopen and setup-return are unobserved; the compatibility view did not recreate after the observed restart. |
| F7 Migrate a legacy `.env`             | fixture-pass | U4 safe discovery, Engine-first commit, declined removal, exact removal, and conflict retention pass.                   |

## Acceptance-example checklist

| Example | Status       | Evidence or next owner                                                                                                                                                                           |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AE1     | partial      | Production Readiness/Choose resource, non-secret status, and raw MCP traffic pass; real Desktop render remains.                                                                                  |
| AE2     | blocked      | Real host denial and platform-local fallback not yet observed.                                                                                                                                   |
| AE3     | partial      | U4 loopback capability/session/origin/Host/control-channel suite passes; timed expiry and release-host path remain.                                                                              |
| AE4     | fixture-pass | U2 invalid/stale/outage/rate/lock failures preserve the prior record; valid replacement advances generation.                                                                                     |
| AE5     | partial      | U2 MapTiler record plus U3 strict story-contract, input-digest, exact-key, managed-browser, immutable-output, and seed-refusal tests pass. A real provider-backed map bake remains U10 evidence.   |
| AE6     | partial      | U2 delivery key persists only as saved-unverified after origin attestation; U5 presentation remains.                                                                                             |
| AE7     | fixture-pass | Stale newsroom revision and concurrent writers preserve one-winner/no-write-conflict behavior.                                                                                                   |
| AE8     | partial      | Missing MapTiler closes map rows only; unavailable rows name Readiness, while optional hosting remains a non-blocking implication. Real setup refresh remains U10.                                |
| AE9     | fixture-pass | U8 selects through native controls and invokes U7's gate-specific writer only from the separate app-only Confirm; stale revisions write nothing.                                                  |
| AE10    | fixture-pass | U9 proves an alternative overrides rejected advice through the shared writer, stale advice cannot write, explicit rewind remains separate, and producer confirmation remains a later gate.       |
| AE11    | partial      | Both modes keep Cancel call-free and derive fresh state from canonical files; real close/reload observation remains U10.                                                                         |
| AE12    | fixture-pass | Legacy refusal, unsafe input, Engine-first migration, exact removal, and stale-preimage retention pass.                                                                                          |
| AE13    | pending      | Linux/Windows/WSL native topology has not run; compile evidence only.                                                                                                                            |
| AE14    | partial      | Complete Engine-to-sealed high-level hosted materialisation and deterministic stable/two-revision URL tests pass; live Cloudflare remains.                                                       |
| AE15    | partial      | Durable feedback recovery, custom stable-URL revision, and same-chart Datawrapper revision pass; fresh-session live provider verification remains.                                               |
| AE16    | partial      | Cleanup record exists; final closure and target checks pending U11.                                                                                                                              |
| AE17    | partial      | Raw production MCP initialization, strict app schemas, U2 raw-verb rejection, and Engine verified transport pass through the real installed macOS development topology; signed release-host and production Desktop rendering remain.                                      |
| AE18    | partial      | Focused tests plus a complete real macOS adoption/reapply/doctor/MCP-load/uninstall lifecycle cover adoption-owned stories-root creation/rollback, dependency rollback, current-lock apply, direct skill projection reconciliation/rollback, no-install/no-env direct launch, runtime byte receipts, managed-runtime cleanup, and stable external data roots. Native Linux/Windows/WSL lifecycle evidence remains pending. |

## Jujutsu ownership and cleanup inventory

No Jujutsu workspace or bookmark was created for this initiative. The U11 cleanup allowlist is
therefore empty:

```yaml
initiative_owned_workspaces: []
initiative_owned_bookmarks: []
```

The implementation uses the existing `default` workspaces in Splash and Engine. Those workspaces
are not cleanup targets. At U1 start, the pre-existing dirty state was:

- Splash: only `A docs/splash/2026-08-14-interactive-preflight-and-visual-selection-prd.md` (the
  reviewed PRD restored from Jujutsu snapshot `3ae9ac49`).
- Engine: `M AGENTS.md`, `M catalog/catalog.json`, `M internal/catalog/schema.go`,
  `M internal/products/mycroft/content.go`, `M internal/products/mycroft/module.go`,
  `M internal/products/mycroft/module_test.go`, and
  `M internal/products/mycroft/skill_registry.go`.

Those Engine paths are unrelated pre-existing changes and must not be committed, reverted, moved,
or described as initiative-owned. U11 may delete only the exact PRD path after every row above is
accounted for and may remove only targets in the explicit initiative-owned allowlist.
