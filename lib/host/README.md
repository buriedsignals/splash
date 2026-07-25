# The host façade

`lib/host/cli.ts` is a JSON-in/JSON-out CLI over the verb contract in `lib/core/verbs`.
It is the surface a host that is not JavaScript drives: a shell recipe, an agent CLI, a
script around a local model. Every JSON block below is pasted from a real run of the CLI
against this repository, unedited — including the line breaks, which is how the CLI prints
arrays (one element per line, `JSON.stringify(body, null, 2)`).

Three rules hold for every command:

- **One envelope.** Every command answers `{"ok": true, "value": …}` or
  `{"ok": false, "code": …, "message": …}`. A host writes one parser.
- **stdout carries only the JSON document.** Nothing else is printed there, so a host can
  parse it whole. Anything humans need to read (none today) would go to stderr instead.
- **The run directory holds all state.** The façade itself is stateless. `state` and `next`
  are strictly read-only — they never write a byte into the run directory, not even to
  migrate an old manifest (see `stale-schema` below). Only `verb` writes, and only inside
  the paths its own request names. A host keeps nothing between calls; the run's `run.json`
  is the only source of truth.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success. |
| `1` | The verb was refused — a well-formed request the contract declined (`ok: false` in the body). |
| `2` | Usage error, unparseable input, or an unreadable run. |

These three are exhaustive, and they hold for every input: an unreadable stdin, an unknown
flag, a hostile payload, or a residual defect inside the façade all still leave one JSON
document on stdout and one of these three codes behind (`lib/host/cli.test.ts`).

## The five commands

### `verbs`

Declares the contract: every verb in the vocabulary, whether it has a body yet, the payload
shape for the ones that do, and the closed vocabulary (formats, channels, engines, error
codes) it is built from. No arguments, no run directory — this is pure self-description, and
it is enough to construct a valid request without reading any source.

```
$ bun lib/host/cli.ts verbs
```

```json
{
  "ok": true,
  "value": {
    "contract": "splash-verbs/1",
    "verbs": [
      {
        "name": "render",
        "implemented": true,
        "payload": [
          {
            "name": "engine",
            "type": "string",
            "required": true,
            "enum": [
              "chart-native",
              "dw-chart",
              "image-native",
              "map-dw",
              "map-native",
              "scrolly"
            ]
          },
          {
            "name": "spec",
            "type": "unknown",
            "required": true
          },
          {
            "name": "format",
            "type": "string",
            "required": true,
            "enum": [
              "static",
              "interactive",
              "video",
              "scrolly"
            ]
          },
          {
            "name": "channel",
            "type": "string",
            "required": true,
            "enum": [
              "social-vertical",
              "social-feed",
              "article-web"
            ]
          },
          {
            "name": "outDir",
            "type": "string",
            "required": true
          },
          {
            "name": "id",
            "type": "string",
            "required": true
          }
        ]
      },
      {
        "name": "capture",
        "implemented": false
      },
      {
        "name": "review",
        "implemented": false
      },
      {
        "name": "publish",
        "implemented": false
      }
    ],
    "vocabulary": {
      "formats": [
        "static",
        "interactive",
        "video",
        "scrolly"
      ],
      "channels": [
        "social-vertical",
        "social-feed",
        "article-web"
      ],
      "engines": [
        {
          "name": "chart-native",
          "formats": [
            "static",
            "interactive",
            "video"
          ]
        },
        {
          "name": "dw-chart",
          "formats": [
            "static",
            "interactive"
          ]
        },
        {
          "name": "image-native",
          "formats": [
            "scrolly"
          ]
        },
        {
          "name": "map-dw",
          "formats": [
            "static",
            "interactive"
          ]
        },
        {
          "name": "map-native",
          "formats": [
            "static",
            "interactive",
            "video"
          ]
        },
        {
          "name": "scrolly",
          "formats": [
            "scrolly"
          ]
        }
      ]
    },
    "errorCodes": {
      "verb": [
        "invalid-request",
        "unknown-engine",
        "unsupported-format",
        "invalid-spec",
        "engine-declined",
        "engine-failed",
        "not-implemented"
      ],
      "host": [
        "usage",
        "no-run",
        "invalid-run",
        "stale-schema",
        "internal"
      ]
    }
  }
}
```

Exit code `0`. Notes on what a host can read out of that:

- `capture`/`review`/`publish` are declared as part of the closed vocabulary even though
  they are not callable yet — a host sees they exist and are not wired, rather than
  discovering that as an error from `verb`.
- `vocabulary.engines` is derived from the producer registry each engine self-registers into,
  paired with the formats that engine's own manifest declares. `payload.engine.enum` is the
  same list. Asking an engine for a format it does not declare is refused as
  `unsupported-format`, from registry data alone, before any process is spawned.
- `errorCodes` is split because a host meets two families and they arrive differently.
  `verb` codes travel in a verb result body; `host` codes come from the façade's own
  commands. Neither list is hand-written here — they are `VERB_ERROR_CODES`
  (`lib/core/verbs/types.ts`) and `HOST_ERROR_CODES` (`lib/host/errors.ts`).
- `spec` has no schema on purpose: it is opaque by contract, only the engine's own validator
  understands it.

### `state --run <dir>`

Reports where a run stands: input validation, and per-element gate state, next actions, and
artifact validation. Before anything has been produced, `validation.artifact` reads `"none"`.
`--run <dir>` and `--run=<dir>` are both accepted.

```
$ bun lib/host/cli.ts state --run /tmp/host-readme-demo
```

```json
{
  "ok": true,
  "value": {
    "runId": "readme-demo",
    "inputValidation": [
      {
        "ref": "data",
        "status": "ok"
      }
    ],
    "elements": [
      {
        "id": "el1",
        "gateState": "empty",
        "nextActions": [
          "orient"
        ],
        "validation": {
          "artifact": "none"
        }
      }
    ]
  }
}
```

Exit code `0` on a readable run; `2` if `--run` is missing, an argument is not recognised,
or the directory holds no readable `run.json`.

A run written against an older manifest schema is **refused rather than migrated**, because
migrating writes (it freezes the v1 inline CSV into a file inside the run directory) and
these two commands do not write:

```
$ bun lib/host/cli.ts state --run /tmp/host-readme-v1
```

```json
{
  "ok": false,
  "code": "stale-schema",
  "message": "/tmp/host-readme-v1/run.json declares schemaVersion 1, not 2 — state and next are read-only and will not migrate it, because migrating writes a frozen input file into the run directory. Run the migration explicitly, then read the run again"
}
```

Exit code `2`.

### `next --run <dir>`

The narrow half of `state`: just the run-level `nextActions`, for a host that only needs to
know "can I act yet" without parsing a full report.

```
$ bun lib/host/cli.ts next --run /tmp/host-readme-demo
```

```json
{
  "ok": true,
  "value": {
    "nextActions": [
      "orient"
    ]
  }
}
```

Same exit codes as `state`.

### `verb <name>`

Executes one verb. The request is read as JSON on **stdin** — this command takes no flags at
all:

```
$ bun lib/host/cli.ts verb render < request.json
```

where `request.json` was:

```json
{
  "engine": "chart-native",
  "spec": {
    "nativeType": "bar",
    "title": "Rents rose fastest in Geneva",
    "altInsight": "Geneva leads the three cantons on rent growth.",
    "unit": "%",
    "source": { "name": "Provided by the newsroom" },
    "format": "static",
    "data": "canton,growth\nGeneva,4.1\nVaud,2.8\nBern,1.9\n"
  },
  "format": "static",
  "channel": "article-web",
  "outDir": "/tmp/host-readme-demo/elements/el1",
  "id": "el1"
}
```

produced (a real `static.png`; ~6.5s wall clock for chart-native on this project):

```json
{
  "ok": true,
  "value": {
    "format": "static",
    "form": "file",
    "files": [
      "/tmp/host-readme-demo/elements/el1/config.json",
      "/tmp/host-readme-demo/elements/el1/native-source.json",
      "/tmp/host-readme-demo/elements/el1/static.png"
    ],
    "report": {}
  }
}
```

Exit code `0`. A refusal is still a well-formed JSON body, exit `1`:

```json
{
  "ok": false,
  "code": "unknown-engine",
  "message": "unknown producer \"nope-engine\""
}
```

```json
{
  "ok": false,
  "code": "unsupported-format",
  "message": "dw-chart cannot build format \"video\" — it supports \"static\" or \"interactive\" only (video/scrolly require chart-native)"
}
```

A usage problem (unparseable stdin, empty stdin, an unreadable stdin, a missing verb name,
an unknown flag) is exit `2`:

```json
{
  "ok": false,
  "code": "usage",
  "message": "state needs --run <dir>"
}
```

```json
{
  "ok": false,
  "code": "usage",
  "message": "unknown flag \"--bogus\" — this command accepts --run"
}
```

```json
{
  "ok": false,
  "code": "usage",
  "message": "stdin could not be read: EISDIR: illegal operation on a directory, fstat — verb reads its request as JSON on stdin (verb <name> < request.json)"
}
```

(the last is `verb render < some-directory`, the one-character mistake of redirecting from
`$DIR` instead of `$DIR/request.json`.)

#### `outDir` is a destructive field, and the façade guards it

The contract wipes and recreates `outDir` before rendering, so a render can only ever deliver
a whole fresh directory. That makes `outDir` the most powerful field in the request, and the
façade refuses an unsafe one as `invalid-request` — exit `1`, no engine ever runs, nothing is
deleted (`lib/host/path-safety.ts`):

```json
{
  "ok": false,
  "code": "invalid-request",
  "message": "outDir \".\" is not an absolute path — the contract wipes and recreates this directory, and a relative path resolves against the host's working directory rather than a location the request named"
}
```

```json
{
  "ok": false,
  "code": "invalid-request",
  "message": "outDir \"/tmp/notes\" resolves to \"/private/tmp/notes\", which already holds 2 entries no produce writes (keep.txt, sub/) — the contract wipes outDir before rendering, so it refuses rather than delete content it did not create; point outDir at a new or previously produced directory"
}
```

```json
{
  "ok": false,
  "code": "invalid-request",
  "message": "outDir \"/tmp/host-run-demo\" resolves to \"/private/tmp/host-run-demo\", which already holds 1 entry no produce writes (run.json) — the contract wipes outDir before rendering, so it refuses rather than delete content it did not create; point outDir at a new or previously produced directory"
}
```

What is refused: a relative path (it would resolve against the host's own working directory),
a filesystem root or anything immediately below one, a home / temp / working directory or any
ancestor of one, a path that exists and is not a directory, and a directory already holding
entries no produce writes. Symlinks and `..` segments are resolved *before* the decision, and
the "already holds" check is a read-only probe — nothing is deleted on the way to a refusal.
Re-rendering into a directory a previous produce wrote is allowed, which is the point of
wiping it.

"Entries no produce writes" is decided by **artifact name, not by file extension**. The
producible set is the closed list of basenames the five engines actually write — `static.png`,
`interactive.html`, `interactive.png`, `scrolly.html`, `config.json`, `native-source.json`,
`source-manifest.json`, `a11y.png`, `theme.png`, `prep-report.json`, `brand-concerns.json`,
`video-verify.json`, `contrast-static.png`, `contrast-interactive.png`,
`responsive-<digits>.png`, `{landscape,square,portrait}.mp4`,
`video-{landscape,square,portrait}-{still,final}.png`, plus `<id>.png` for the id **this
request** carries (the Datawrapper engines' one output) — with `frames/` as the single
producible subdirectory, itself probed for the `<frame-id>.jpg` files image-native writes
there. Matching on extension instead would accept a photo library, a budget spreadsheet, a
wedding video, or a run directory whose only entry is `run.json`, and wipe them while
reporting success; the third example above is exactly that case, refused.

#### `verb` deliberately takes no `--run` flag

The contract's payload is self-sufficient — it carries its own `outDir` — so nothing about
executing a verb needs a run directory. Handing `verb` a run directory would couple the
neutral contract back to the editorial loop it is meant to be independent of; `state`/`next`
are the loop-aware commands, `verb` is not. Passing one is a `usage` refusal rather than a
silently ignored argument. Calling `verb render` a second time against the same run does not
touch `run.json` — `state` before and after are identical — because the contract writes
artifacts and the loop writes state, and the CLI keeps that boundary.

### `newsroom [--dir <dir>]`

Reports the newsroom's decor: the runtime it installed under, the interface/content
languages it resolves to, the delivery capability it publishes through (`null` until one is
chosen), every capability's readiness, and — the field a host actually needs to act on —
`blockers`, the subset of those that are enabled but not currently usable. `--dir` is
optional; without it the decor resolves from the install root, the same default `loadDecor`
uses everywhere else in this repo.

`language.ui` is the **saved** interface preference, read from `newsroom.json` — a fresh
install resolves to English, and an install migrated from a pre-decor layout inherits the
language its `NEWSROOM-PROFILE.md` declares. `language.content` — the deliverables' own
language — is `NEWSROOM-PROFILE.md`'s `lang:`, never an environment variable.

**`SPLASH_UI_LANG` overrides the interface language for ONE run**, without rewriting the
saved preference: `SPLASH_UI_LANG=fr` makes the delivery proposal
(`skills/splash/scripts/export-code.mjs`) speak French this time and nothing else changes on
disk. It takes a BCP-47 tag; an unknown one is accepted as given and reads as English
wherever no copy exists for it. It is a per-run override of the emitted copy, so this command
deliberately keeps reporting the **saved** preference rather than the override.

```
$ bun lib/host/cli.ts newsroom
```

```json
{
  "ok": true,
  "value": {
    "root": "/Users/rmdms/Sites/Professional/splash-preflight",
    "runtime": "claude",
    "language": {
      "ui": "en",
      "content": "en"
    },
    "publisher": null,
    "capabilities": [
      {
        "id": "dw-chart",
        "label": "Datawrapper charts",
        "help": [],
        "status": "disabled",
        "reason": ""
      },
      {
        "id": "chart-native",
        "label": "Charts built in-house (no account needed)",
        "help": [],
        "status": "ready",
        "reason": ""
      }
    ],
    "blockers": []
  }
}
```

(`capabilities` above is truncated to two entries for the example; a real run lists all ten.)

Those two entries are the whole enablement model in miniature, on an install that has no
Datawrapper token: what needs no key is `ready`, what needs one nobody supplied is
`disabled` — the newsroom never asked for it, so it is not a failure and not a blocker.
Supply the key (in `.env`) and the same capability reads `ready` on the next call, with no
setup step in between: **a key that is already there IS the choice** (`defaultCapabilities`,
`lib/newsroom/state.ts`). `blockers` stays empty here because nothing enabled is unusable —
it fills when a capability the newsroom DID enable has lost its key or its dependencies.

Exit code `0` on a readable install; `2` on a usage error (an unknown flag, or a value-less
`--dir`) — `newsroom` never fails any other way, because `loadDecor` is written not to throw
and an absent or unreadable `newsroom.json` yields the default decor rather than an error.
There is no `1`: `newsroom` reads, it refuses no verb, so there is nothing for that code to
mean here.

**`newsroom --dir <dir>` writes nothing at all.** `--dir` comes from the host, and a host
payload is untrusted here exactly as `outDir` is in `verb`: the decor is read and derived
from that directory, but no directory is created, no migration is persisted and no legacy
file is touched. A host cannot make a directory appear by pointing this command at it.

Without `--dir`, one write is possible, once: the first read of an install that still carries
a pre-decor `.splash-runtime` or `.splash-preflight.json` performs the legacy migration
(`lib/newsroom/migrate-decor.ts`), writing `newsroom.json` at the install root so every read
after it is a pure read. The legacy files themselves are left in place — the installer still
reads `.splash-runtime` on every run. That write is not something a host requests: it is a
consequence of decor's own `loadDecor`, shared by every caller, not a `newsroom`-only
behaviour. (A `NEWSROOM-PROFILE.md`, if one is present in the directory read, refreshes its
own `brand.json` cache beside it — `loadNewsroomProfile`'s long-standing best-effort
behaviour, and the one write `--dir` can still reach, into a directory that already exists
and already holds the profile it caches.)

#### What a failure message may contain

The façade's own refusals (`usage`, `invalid-request`, `no-run`, `stale-schema`,
`unsupported-format`, …) are one-line messages and never carry a stack trace. An
`engine-failed`, by contrast, carries the **tail of the engine's own stderr**, which for the
subprocess engines is a Bun stack trace naming files by absolute path in this repository.
That is deliberate: this is a local-first tool, the paths are the operator's own machine, and
stripping them would leave a host with an opaque failure and nothing to act on. It is
asserted as a contract in `lib/host/cli.test.ts` rather than left as an accident. A host that
relays messages to a third party should treat `message` as diagnostic output, not as
user-facing copy.

## Why a CLI and not MCP

Checked directly against `buriedsignals/mycroft`: Goose consumes markdown skills,
recipes, and MCP extensions, but the *dominant* pattern in that extension pack is
CLI/REST (`ft-cli`, `firecrawl-cli`, tools documented as "No CLI — recipes call REST API
via curl"). A CLI façade works today in Goose, and in any other agentic host that can
spawn a process and read stdout — no protocol dependency, no server lifecycle to manage.

The choice does not close the door on MCP: `verbs` is exactly the declaration an MCP
wrapper would need to generate its tool definitions mechanically later (one JSON object
enumerating verbs, their implementation status, payload shapes with enums, and the engines
available), rather than hooking each tool up by hand. Today that declaration has no schema
for `spec` (it is deliberately opaque, per the contract's own design — only the engine's
validator understands it) and no human-readable description strings, so it is a start for an
MCP wrapper, not a finished tool manifest.
