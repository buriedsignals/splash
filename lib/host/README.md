# The host façade

`lib/host/cli.ts` is a JSON-in/JSON-out CLI over the verb contract in `lib/core/verbs`.
It is the surface a host that is not JavaScript drives: a shell recipe, an agent CLI, a
script around a local model. Every example below is copied verbatim from a real run of
the CLI against this repository — none of it is composed by hand.

Two rules hold for every command:

- **stdout carries only the JSON document.** Nothing else is printed there, so a host can
  parse it whole. Anything humans need to read (none today) would go to stderr instead.
- **The run directory holds all state.** The façade itself is stateless — every invocation
  reads and, for `verb`, only ever writes inside the paths its own request names. A host
  keeps nothing between calls; the run's `run.json` is the only source of truth.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success. |
| `1` | The verb was refused — a well-formed request the contract declined (`ok: false` in the body). |
| `2` | Usage error, unparseable input, or an unreadable run. |

## The four commands

### `verbs`

Declares the contract: every verb in the vocabulary, whether it has a body yet, the
payload shape for the ones that do, and the closed vocabulary (formats, channels, error
codes) it is built from. No arguments, no run directory — this is pure self-description.

```
$ bun lib/host/cli.ts verbs
```

```json
{
  "contract": "splash-verbs/1",
  "verbs": [
    {
      "name": "render",
      "implemented": true,
      "payload": [
        { "name": "engine", "type": "string", "required": true },
        { "name": "spec", "type": "unknown", "required": true },
        {
          "name": "format",
          "type": "string",
          "required": true,
          "enum": ["static", "interactive", "video", "scrolly"]
        },
        {
          "name": "channel",
          "type": "string",
          "required": true,
          "enum": ["social-vertical", "social-feed", "article-web"]
        },
        { "name": "outDir", "type": "string", "required": true },
        { "name": "id", "type": "string", "required": true }
      ]
    },
    { "name": "capture", "implemented": false },
    { "name": "review", "implemented": false },
    { "name": "publish", "implemented": false }
  ],
  "vocabulary": {
    "formats": ["static", "interactive", "video", "scrolly"],
    "channels": ["social-vertical", "social-feed", "article-web"]
  },
  "errorCodes": [
    "invalid-request",
    "unknown-engine",
    "unsupported-format",
    "invalid-spec",
    "engine-declined",
    "engine-failed",
    "not-implemented"
  ]
}
```

Exit code `0`. `capture`/`review`/`publish` are declared as part of the closed vocabulary
even though they are not callable yet — a host sees they exist and are not wired, rather
than discovering that as an error from `verb`.

### `state --run <dir>`

Reports where a run stands: input validation, and per-element gate state, next actions,
and artifact validation. Before anything has been produced, `validation.artifact` reads
`"none"`.

```
$ bun lib/host/cli.ts state --run /tmp/host-readme-demo
```

```json
{
  "ok": true,
  "value": {
    "runId": "readme-demo",
    "inputValidation": [{ "ref": "data", "status": "ok" }],
    "elements": [
      {
        "id": "el1",
        "gateState": "empty",
        "nextActions": ["orient"],
        "validation": { "artifact": "none" }
      }
    ]
  }
}
```

Exit code `0` on a readable run; `2` if `--run` is missing or the directory holds no
readable `run.json`.

### `next --run <dir>`

The narrow half of `state`: just the run-level `nextActions`, for a host that only needs
to know "can I act yet" without parsing a full report.

```
$ bun lib/host/cli.ts next --run /tmp/host-readme-demo
```

```json
{
  "ok": true,
  "value": { "nextActions": ["orient"] }
}
```

Same exit codes as `state`.

### `verb <name>`

Executes one verb. The request is read as JSON on **stdin** — this command takes no other
flags:

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

produced (a real `static.png`, ~5-15s render time for chart-native on this project):

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

Exit code `0`. A refusal — an unknown engine, for instance — is still a well-formed JSON
body, exit `1`:

```json
{
  "ok": false,
  "code": "unknown-engine",
  "message": "unknown producer \"nope-engine\""
}
```

A usage problem (unparseable stdin, empty stdin, missing verb name) is exit `2`:

```json
{
  "ok": false,
  "code": "usage",
  "message": "state needs --run <dir>"
}
```

(that particular message is from `state` with no `--run`; `verb` reports its own usage
errors the same shape.)

**`verb` deliberately takes no `--run` flag.** The contract's payload is self-sufficient —
it carries its own `outDir` — so nothing about executing a verb needs a run directory.
Handing `verb` a run directory would couple the neutral contract back to the editorial
loop it is meant to be independent of; `state`/`next` are the loop-aware commands, `verb`
is not. Calling `verb render` a second time against the same run does not touch
`run.json` — `state` before and after are identical — because the contract writes
artifacts and the loop writes state, and the CLI keeps that boundary.

## Why a CLI and not MCP

Checked directly against `buriedsignals/mycroft`: Goose consumes markdown skills,
recipes, and MCP extensions, but the *dominant* pattern in that extension pack is
CLI/REST (`ft-cli`, `firecrawl-cli`, tools documented as "No CLI — recipes call REST API
via curl"). A CLI façade works today in Goose, and in any other agentic host that can
spawn a process and read stdout — no protocol dependency, no server lifecycle to manage.

The choice does not close the door on MCP: `verbs` is exactly the declaration an MCP
wrapper would need to generate its tool definitions mechanically later (one JSON object
enumerating verbs, their implementation status, and payload shapes), rather than hooking
each tool up by hand. Today that declaration has no schema for `spec` (it is
deliberately opaque, per the contract's own design — only the engine's validator
understands it) and no human-readable description strings, so it is a start for an MCP
wrapper, not a finished tool manifest.
