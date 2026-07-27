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
  migrate an old manifest (see `stale-schema` below). A host keeps nothing between calls; the
  run's `run.json` is the only source of truth.
- **Eight commands write, and each writes one thing.** `verb` writes inside the paths its own
  request names. `init` creates the `run.json` of a directory that held none (plus the frozen
  copies of the inputs it declared). `advance`, `confirm-angle`, `phrase`, `choose-form`,
  `approve` and `request-delivery` write the `run.json` of the run they were pointed at (and,
  for `advance`, whatever the loop's own step produces beneath it — a render, a review still, a
  published package; `approve` also writes the sign-off document it points at). Nothing else on
  disk is touched, and a REFUSED command writes nothing at all — a refusal always leaves the run
  byte-identical, which is what makes it safe to retry.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success. |
| `1` | Refused — a well-formed request the contract or the loop declined (`ok: false` in the body): a verb, a loop step, or a decision. |
| `2` | Usage error, unparseable input, or an unreadable run. |

These three are exhaustive, and they hold for every input: an unreadable stdin, an unknown
flag, a hostile payload, or a residual defect inside the façade all still leave one JSON
document on stdout and one of these three codes behind (`lib/host/cli.test.ts`).

## The thirteen commands

Read-only: `verbs`, `state`, `next`, `newsroom`, `suggest-intent`. Acting: `init`, `advance`,
`confirm-angle`, `phrase`, `choose-form`, `approve`, `request-delivery`, `verb`.

The whole journey, in the order a host walks it — every step is one of these commands, and none
of them needs a run.json written by hand:

```
init → advance (orient) → suggest-intent → confirm-angle → advance (propose)
     → state (read the offer)
     → phrase → choose-form → advance (produce) → request-delivery
     → advance (capture) → advance (review) → advance (preview) → state (read the findings)
     → approve → advance (deliver)
```

`advance` performs whatever deterministic step is valid; the others are the turns only a
journalist or a desk can take. `state`/`next` say which one is owed at any moment, and every
acting command answers with the new `nextActions`, so a host never has to guess.

**Publishing has a gate, and it is a human one.** Between a produced artifact and a published
one sit four states: the deliverable is *captured* at the container it publishes into, the
measurements are turned into severity-bearing *findings*, the real file is *presented*, and only
then can a journalist *approve* it. `deliver` refuses an artifact nobody approved — the router
is not the only thing holding the gate.

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
        ],
        "sourcePolicy": {
          "checked": false,
          "why": "this artifact was rendered outside a run: spec.source is whatever this request supplied, and no source policy (lib/source) validated it. A run's produce takes the credit from its DECLARED source ledger and refuses a run that declared none. This artifact also carries no provenance, so Splash cannot publish it — verb publish is refused at this façade, and deliver only publishes an artifact a run produced. To render under the source policy, create a run (init --run <dir>) and drive it with advance."
        }
      },
      {
        "name": "capture",
        "implemented": true
      },
      {
        "name": "review",
        "implemented": true
      },
      {
        "name": "publish",
        "implemented": true,
        "hostCommand": "advance"
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
        "step-refused",
        "internal"
      ]
    }
  }
}
```

Exit code `0`. Notes on what a host can read out of that:

- Every verb in the closed vocabulary now has a body. `capture` and `review` used to report
  `implemented: false` — a host could see they existed and were not wired. They are wired: the
  loop calls them on the road from a produced artifact to a published one (`advance`), and they
  are callable directly through `verb` for a host that wants to measure something itself.
- **`hostCommand` means the verb is not callable through `verb`.** `publish` carries it: the
  façade refuses `verb publish` and the named command performs it through the editorial loop
  (see below for why). A host reads the detour from the declaration instead of discovering it
  as a refusal to a request it had every reason to believe was valid. No other verb carries the
  field. Because `verb publish` is refused, `publish`'s payload shape is deliberately not
  self-described here.
- `vocabulary.engines` is derived from the producer registry each engine self-registers into,
  paired with the formats that engine's own manifest declares. `payload.engine.enum` is the
  same list. Asking an engine for a format it does not declare is refused as
  `unsupported-format`, from registry data alone, before any process is spawned.
- `errorCodes` is split because a host meets two families and they arrive differently.
  `verb` codes travel in a verb result body — and in the answer of a command that ran a loop
  step or recorded a decision, which is a verb result too; `host` codes come from the façade's
  own commands. Neither list is hand-written here — they are `VERB_ERROR_CODES`
  (`lib/core/verbs/types.ts`) and `HOST_ERROR_CODES` (`lib/host/errors.ts`).
- `spec` has no schema on purpose: it is opaque by contract, only the engine's own validator
  understands it.
- **`sourcePolicy` on `render` is a declared limitation, not a payload field.** Because `spec` is
  opaque, the credit inside it is whatever the request supplied — nothing validates it, and
  `render()` cannot, since what the loop applies (`validateSourcePolicy` over a run's declared
  ledger) is a fact about a RUN and this payload has no way to name one. A host reads that here
  rather than assuming its artifact was checked, and the answer to a successful `verb render`
  carries the same object. What keeps the hole harmless: an artifact rendered outside a run has
  no provenance, so `deliver` will not publish it and `verb publish` is refused — the
  mis-credited file stays local and cannot leave through Splash.

### `init --run <dir>`

Creates a run. This is the beginning of every journey and, until this command existed, the one
step no host could take: `freezeInput` had a single production caller (an *old*-manifest
migration), so a host outside JavaScript could read and drive a run it had no way to start.

The declaration is read as JSON on **stdin**, because it is a document rather than a handful of
scalars — two input slots, each with its own source declaration, plus the elements:

```
$ bun lib/host/cli.ts init --run /tmp/host-readme-journey < declaration.json
```

```json
{
  "runId": "primes-maladie",
  "input": { "data": "/tmp/host-readme-journey/premiums.csv" },
  "sources": {
    "mode": "real",
    "data": { "kind": "local", "label": "Relevés cantonaux 2024" }
  },
  "elements": [{ "id": "el1", "requestedFormat": "static" }]
}
```

```json
{
  "ok": true,
  "value": {
    "runId": "primes-maladie",
    "nextActions": [
      "orient"
    ]
  }
}
```

Exit `0`. The declared inputs are **copied into the run** (content-addressed under `input/`), so
the run is self-contained and the manifest references them by path + hash only.

**What the declaration may NOT carry, and that is the point.** The schema is strict and admits
exactly `runId` · `route` · `channel` · `input` · `sources` · `elements[{id, requestedFormat,
deliverable, deliverableOf}]`. An `angle`, a `proposal`, an `artifact`, a `delivery`, an
`orient` or an `events` list is refused **by name**, exit `1`:

```json
{
  "ok": false,
  "code": "invalid-request",
  "message": "init: the run declaration is not valid — elements.0: Unrecognized key: \"angle\""
}
```

A run this command creates is at gate state `empty`, and every field after that is *earned* by a
command with its own refusals. That is what makes the rule in `skills/splash/SKILL.md` — never
hand-edit `run.json` — a rule with a path behind it rather than a contradiction.

Two more refusals, both exit `1`, and both leave the directory untouched: a declared input that
does not exist, and a source ledger the policy rejects (checked **before** anything is frozen, so
an illegal declaration cannot orphan a copied file in a directory with no `run.json`). A
directory that already holds a `run.json` is refused outright — the manifest is the ledger of
everything the run produced and delivered, and a command called "init" does not get to erase it.

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

Once a review exists, each element also carries **`verification`** — the terms of the approval
gate, so a host told `nextActions: ["approve"]` can see what it is being asked to decide:
`findings` (id, criterion, severity, status, summary, evidence), `tasteRisk` (the lane no
machine grades), `preview` (which bytes were shown and how), `independentSemanticReview`, and
`approval` — `approvable` plus every reason the gate would refuse for, drawn from the same
function the gate itself runs, so the report cannot promise something `approve` then declines.

Once an offer exists, each element also carries `proposal` — **the offer, whole**: the options
with their `whySource` grounding, the discarded forms with their reasons, the chosen id, and the
brain's own refusal when it declined a requested format. Without it a host was told
`nextActions: ["choose-form"]` and shown no forms — asked to make a decision it could not see the
terms of, and unable to write the phrasing (below), which must come from `whySource` alone:

```json
{
  "id": "el1",
  "gateState": "proposed",
  "nextActions": [
    "phrase"
  ],
  "validation": {
    "artifact": "none"
  },
  "destination": "article-web",
  "aspect": "landscape",
  "channel": "article-web",
  "proposal": {
    "options": [
      {
        "id": "slope",
        "nativeType": "slope",
        "engine": "chart-native",
        "format": "static",
        "intent": [
          "change-over-time",
          "ranking"
        ],
        "why": "",
        "whySource": {
          "sheet": "knowledge/references/chart/types/slope.md",
          "fragments": [
            "a before/after across a handful of categories",
            "a rank change between two periods"
          ],
          "facts": {
            "rows": "3",
            "series": "3",
            "points": "2",
            "measures": "2015, 2024"
          }
        },
        "requires": [
          "chart-native"
        ]
      }
    ],
    "excluded": []
  }
}
```

(one option and two fragments shown; a real offer carries three options and their full sheets.)

While any element still owes `confirm-angle`, the report also carries **`intentChoices`** at the
top level — the intent question and its nine answers, phrased for a journalist in the newsroom's
own language. It is the same omission the missing offer once was, one gate earlier: a host told
`nextActions: ["confirm-angle"]` had no way to put the question without inventing the wording, and
the wording is exactly what the socle constrains. It disappears once every element has answered.
There is no suggestion here — that is read from the *draft* takeaway, which is not in the run yet
(`suggest-intent`).

And once an element has an angle, it carries **`intent`** — what ordered its offer, and where that
came from:

```json
{ "basis": "declared", "declared": "distribution" }
{ "basis": "guessed",  "guessed": ["spatial"] }
{ "basis": "none",     "guessed": [] }
```

`declared` is the only basis a run opened after the intent became a declared part of the angle can
have. The other two can only come from an angle recorded before that — those runs are not refused
(that would strand legitimate work over a field that did not exist when they were written), but
they are not silent either: `guessed` means the order rests on a keyword reading of the takeaway's
prose, and `none` means it rests on nothing and the forms are ranked by fit and readiness alone.

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
  "message": "/tmp/host-readme-v1/run.json declares schemaVersion 1, not 4 — state and next are read-only and will not migrate it, because migrating writes a frozen input file into the run directory. Run the migration explicitly, then read the run again"
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

### `advance --run <dir>`

Performs the ONE deterministic step `next` says is valid — `orient`, `propose`, `produce` or
`deliver` — and persists it. One step per call: a host reads the run between two of them, which
is the point of a loop the journalist can turn back in.

```
$ bun lib/host/cli.ts advance --run /tmp/host-readme-drive
```

```json
{
  "ok": true,
  "value": {
    "ran": "orient",
    "nextActions": [
      "propose"
    ]
  }
}
```

Exit `0`. Every answer carries `nextActions`, so a host that acts learns the new state in the
same breath and never has to follow up with `next`.

A **human turn** is not something the façade can perform, and it says so rather than doing
nothing quietly — naming the command that does perform it:

```json
{
  "ok": false,
  "code": "step-refused",
  "message": "advance: the next act is the journalist's — choose a form with \"choose-form --run <dir> --option <id>\""
}
```

Exit `1`. The same code answers a step the loop attempted and **refused** (a produce whose spec
the engine will not build, a delivery whose destination has no credentials). In that case the
bounded failure event is written to the run's ledger first — a host's run is never quieter about
its own failures than an in-process one — and the message is the one recorded there.

When a run is finished, `advance` says that too, and does not invite a delivery that already
happened:

```json
{
  "ok": false,
  "code": "step-refused",
  "message": "advance: the visual is fresh and every destination it asked for has been published — there is nothing left to run"
}
```

Every human turn now has a command behind it, and `advance` names the one that is owed:

```json
{
  "ok": false,
  "code": "step-refused",
  "message": "advance: the next act is the journalist's — confirm the angle with \"confirm-angle --run <dir> --takeaway <s> --alt-insight <s> --unit <s>\""
}
```

### `suggest-intent --takeaway <s> [--language <tag>]`

Puts the intent question — *what do you want this to show?* — and offers a reading of the draft
takeaway. Read-only, and deliberately **without `--run`**: the question comes before the angle
exists, so requiring a run would make it unaskable at the only moment it is useful.

```
$ bun lib/host/cli.ts suggest-intent \
    --takeaway "Les primes ont augmenté dans les trois cantons" --language fr
```

```json
{
  "ok": true,
  "value": {
    "language": "fr",
    "question": "Que voulez-vous faire voir ?",
    "choices": [
      { "id": "deviation", "label": "L'écart à une référence : qui est au-dessus, qui est en dessous", "example": "Trois cantons dépassent la moyenne suisse." },
      { "id": "ranking", "label": "Qui est en tête, qui est en queue", "example": "Genève paie la prime la plus lourde des cantons romands." }
    ],
    "suggested": ["change-over-time"],
    "note": "Votre formulation ressemble à « Ce qui a changé, et dans quel sens ». Confirmez, ou choisissez autre chose — c'est vous qui tranchez."
  }
}
```

**Present the `label` and the `example` — never the `id`.** The ids are the machine vocabulary a
host names on `confirm-angle --intent`, exactly like `choose-form --option`. A journalist is never
asked "is your intent part-to-whole?": that is the technical question the socle forbids, and
`lib/host/intent-copy.test.ts` enforces it — no label or example may contain the vocabulary of the
drawing, nor its own id.

`suggested` is a **suggestion and nothing more**. It comes from a keyword pass over the wording
(`lib/brain/rank-intent.ts`) which is deliberately crude: measured on real editorial phrasings it
reads nothing at all in most French claims, and mis-reads others. It used to *decide* the offer's
order on its own, silently; it now pre-fills an answer a human confirms or overrules. An empty
`suggested` is an ordinary outcome, and `note` says so rather than filling the blank.

Languages shipped: `en` and `fr` (parity with the rest of the interface copy). An unshipped
language falls back to English rather than half-translating, and `language` in the answer says
which one you actually got. Without `--language`, the newsroom's own `language.ui` is used.

### `confirm-angle --run <dir> --takeaway <s> --alt-insight <s> --unit <s> --intent <id> [--emphasis <s>] [--element <id>]`

Records the confirmed angle — the editorial decision everything downstream reads: the takeaway
becomes the visual's **title**, the alt text its **accessibility description**, the unit its
**subtitle**, the intent **orders the offer**, and all of them enter the provenance hash.

```
$ bun lib/host/cli.ts confirm-angle --run /tmp/host-readme-journey \
    --takeaway "Les primes ont augmenté dans les trois cantons" \
    --alt-insight "La prime adulte moyenne passe de 449 à 583 francs à Genève entre 2015 et 2024." \
    --unit CHF --intent change-over-time
```

```json
{
  "ok": true,
  "value": {
    "confirmed": "el1",
    "nextActions": [
      "propose"
    ]
  }
}
```

**Flags, not a JSON body — and that is the whole design.** The angle is free editorial text, and
a command that let a host write arbitrary prose *anywhere in the manifest* would be the disease
this surface cures, not the cure. What makes this one safe is that the host never names a KEY: it
answers a handful of known questions — and `--intent` is not prose at all, but one of nine closed
values. There is no field to designate, no path into the manifest to choose. A JSON body would
invite "here is an object"; flags enumerate.

Four of them are **refused blank**, with the reasons this codebase already gives at
hand-over time (`lib/delivery/metadata.ts`) — made here instead, so the run cannot carry the blank
at all. Exit `1`, and the run stays byte-identical:

```json
{
  "ok": false,
  "code": "invalid-request",
  "message": "confirm-angle: element el1 was given a blank alt text — WCAG 1.1.1: the alt text must state the insight, not the chart's structure — the producers refuse to render without one"
}
```

A missing FLAG is a different thing from a blank VALUE: the first is a malformed command line
(`usage`, exit `2`), the second a well-formed request the loop declined (exit `1`).

`--intent` also has a **closed vocabulary**, and a value outside it is refused with the whole list
(exit `1`) rather than dropped — a silently ignored intent would put the run straight back in the
state this command exists to leave: an offer ordered by nothing, reporting that an intent was
recorded. The intent is what the journalist wants the figure to SHOW, and it used to be *guessed*
from `--takeaway`'s wording; ask it with `suggest-intent`, never in machine ids.

Re-confirming is allowed — it is how a journalist changes the angle after seeing the visual — and
the answer says what that **invalidated**. The angle is in the provenance hash, so a fresh
artifact goes stale and the loop routes back to `produce`:

```json
{
  "ok": true,
  "value": {
    "confirmed": "el1",
    "staled": true,
    "nextActions": [
      "produce"
    ]
  }
}
```

`staled` is absent, never `false`, when there was nothing to stale.

### `phrase --run <dir> [--element <id>]`

Writes the offer's prose. The brain hands over each form as **data** — ids, order, the reference
sheet's own fragments, the computed facts — and leaves every `why` empty on purpose, because the
fragments are the knowledge base's ENGLISH sentences and the journalist reads French, German or
Italian. This command is where those sentences get written, and until it existed nothing in
production ever wrote one: every option on every real run carried a filled `whySource` and
`why: ""`.

Read the offer from `state` (above), then send one phrasing per form, **in the offer's order**:

```
$ bun lib/host/cli.ts phrase --run /tmp/host-readme-journey < phrasing.json
```

```json
[
  { "id": "slope", "why": "Deux dates, trois cantons : la pente montre d'un coup qui monte le plus vite." },
  { "id": "bump", "why": "Le bump suit le classement, mais ici l'écart compte plus que le rang." },
  { "id": "fan", "why": "L'éventail sert quand il y a une projection ; il n'y en a pas dans ces 3 lignes." }
]
```

```json
{
  "ok": true,
  "value": {
    "phrased": "el1",
    "nextActions": [
      "choose-form"
    ]
  }
}
```

**Why free prose gets a document here, when the angle needed named flags.** This prose is
VERIFIED. The guard beneath (`verifyOffer`) checks the ids, the count, the **exact order**, a
discarded form presented as offered, the structural acknowledgement of every marked option
(`"markAcknowledged": true`, required on a marked form and refused on an unmarked one) — and that
every NUMBER in the sentence comes from that option's own grounding. Then a blank `why` is refused:
an option nobody wrote is never shown. So the host is not writing wherever it likes; it is filling
one sentence per offered form, against a list it did not choose.

Every violation is exit `1`, in the guard's own words, and the run is left untouched:

```json
{
  "ok": false,
  "code": "invalid-request",
  "message": "verifyOffer: the order changed — offered slope, bump, fan, phrased fan, bump, slope"
}
```

An invented figure is refused the same way (`verifyOffer: "slope" claims the number 87, which is
in neither the facts nor the sheet`), and so is a dropped option — dropping one is a silent
removal, and it fails exactly like reordering.

### `choose-form --run <dir> --option <id>`

The journalist's first decision, written by code: which of the offered forms gets built. It is
the counterpart of `request-delivery` below, and together they are the reason this façade exists
— before them, the only carrier of a decision was prose telling a model to hand-edit `run.json`.

```
$ bun lib/host/cli.ts choose-form --run /tmp/host-readme-drive --option bar
```

```json
{
  "ok": true,
  "value": {
    "chosen": "bar",
    "nextActions": [
      "produce"
    ]
  }
}
```

The ids come from the run itself (`state`, or `run.json`'s `proposal.options`) — never invented.
An id that is not in the offer is refused with the ids that ARE, exit `1`:

```json
{
  "ok": false,
  "code": "invalid-request",
  "message": "choose-form: \"not-offered\" is not in the offer — it holds \"bar\", \"dumbbell\", \"lollipop\""
}
```

Note the code family: `invalid-request` is a **verb** code, not a host one. The loop refused, and
the answer says which layer did — that is why `verbs` publishes the two lists separately.

A form the offer **marked** is still choosable: a mark warns, it does not forbid, and the
journalist read it before choosing (the tool offers, the journalist decides). The single
exception is a form nothing in the loop can build — choosing it would strand the run on its own
dead end, so it is refused **in the words the offer displayed**.

### `approve --run <dir> [--element <id>]`

The gate between a produced visual and a published one — and a **human** decision, which is why
it is a command rather than something `advance` performs. It is also the only writer of the
run's `approved` record.

Before it can be reached, `advance` carries three deterministic steps that `next` names in turn:

- **`capture`** puts the real deliverable in front of the container it publishes into and
  measures it: the component's own box, the document scroll, the marks and colours actually
  painted, and whether the title, unit, source and alt text are present, visible and *inside the
  frame*. A responsive deliverable is measured at the article container plus the narrow (360) and
  wide (1600) edges of the contract. Nothing is judged here — these are facts.
- **`review`** turns those facts into structured findings with a severity read from one central
  table, records who produced them, and routes the axes no mechanism can settle (density,
  whitespace, palette adjacency, title/takeaway divergence) into a separate `tasteRisk` lane that
  carries no verdict field at all.
- **`preview`** resolves the deliverable *from the manifest*, re-hashes it, refuses a file that is
  not the pinned format's own (a png cannot preview an interactive), presents it, and records
  which bytes were shown and how.

Then read the gate's own terms from `state` (`elements[].verification`) and approve:

```
$ bun lib/host/cli.ts approve --run /tmp/host-readme-journey
```

```json
{
  "ok": true,
  "value": {
    "approved": "el1",
    "nextActions": [
      "deliver"
    ]
  }
}
```

The ceremony is an **optional** JSON document on stdin — the only document on this surface a
command may be given none of, because approving a visual with nothing open to acknowledge must
not require one:

```json
{
  "actorLabel": "Yvan Pandelé",
  "acknowledged": ["unit-missing"],
  "overrides": [{ "findingId": "no-capture", "reason": "reviewed frame by frame in the edit" }],
  "signoff": { "signerId": "yvan", "signature": "<base64>" }
}
```

What the host may **not** supply is which bytes an override covers: the finding id and the
reason come from the journalist, and the timestamp, the actor, the artifact hash and the
provenance hash are written by Splash from the run. An override therefore cannot claim to be
about a different artifact than the one in front of them — and a re-production moves both
hashes, so it lapses on its own, with nobody having to remember to revoke it.

Every refusal lists **all** of its reasons at once (a gate that reports one blocker at a time
teaches people to re-run it rather than read it), exit `1`, run untouched:

```json
{
  "ok": false,
  "code": "invalid-request",
  "message": "approve: this visual cannot be approved yet — preview-not-presented: no preview of the deliverable was recorded — approval cannot be asked for a visual nobody has been shown"
}
```

A **blocking** finding must be resolved or explicitly overridden; a **warning** asks only to be
acknowledged; an **informational** finding asks nothing. The severity is never chosen by whoever
found the defect — it is read from one table, so the same defect cannot block in one producer
and merely advise in another.

**The Ed25519 sign-off and this command are one concept, not two.** `approved` says *what* was
approved; the signature says *who* approved it. When `NEWSROOM-PROFILE.md` declares
`requiredSigners`, no approval can be written at all without a verified signature from one of
them over the exact artifact bytes — the editor signs with
`skills/splash/scripts/sign-artifact.mjs <artifact> --proposal <element id> --key <pem>` exactly
as before, and the signature is carried inside the sign-off document `approved.signoffPath`
names. That document is written beside the run (`signoffs/<element>.json`) and records what was
acknowledged, what was overridden and why, the taste risks routed to a human, and whether an
independent semantic review was available.

**No independent semantic review runs, and the record says so.** Splash does not send
unpublished reporting to a third-party service — the retention risk for a newsroom is real and it
contradicts a local-first tool — so `independentSemanticReview` reads `"unavailable"`. It is
never dressed up as a pass.

#### Presenting the deliverable: two settings

`preview` launches the platform's viewer on the real file. Two environment variables change
that, and both are ordinary operating conditions rather than test hooks:

| Variable | Effect |
|---|---|
| `SPLASH_PREVIEW_OPENER=<command>` | Use this command instead of the platform's own. It receives the deliverable's absolute path as its single argument. |
| `SPLASH_NO_VIEWER=1` | Do not launch anything: **the host presents the deliverable itself** (an agent embedding the image in its transcript), or the machine has no display. |

Whatever happens, the record says what actually happened: `presentedAs` is `"opened"` only when
a viewer really ran and exited 0. Otherwise it is `"path-printed"` **with the reason**, written
by Splash from the signal that caused it — a printed path counts as a preview only when it
records why no viewer could be opened, which is what stops the fallback from becoming a free
square. On Linux with neither `DISPLAY` nor `WAYLAND_DISPLAY`, the fallback is deduced rather
than configured.

### `request-delivery --run <dir> [--to <id,id>]`

The second decision: where the produced element goes. It does **not** publish — it records the
choice that makes a `deliver` step valid, so a missing credential at publish time never erases
what the journalist decided.

```
$ bun lib/host/cli.ts request-delivery --run /tmp/host-readme-drive
```

```json
{
  "ok": true,
  "value": {
    "requested": [
      "zip"
    ],
    "nextActions": [
      "capture"
    ]
  }
}
```

Note what became valid: **`capture`, not `deliver`**. The decision is what opens the road to
publication, and that road runs through the verification chain above.

Without `--to`, the destination is derived from the format's **genre**: a static image or a video
is handed over as a portable package, an interactive or a scrolly goes to a ready host, and there
is always an answer — `zip` needs no key. With `--to`, the journalist's own list wins, and a
destination this install does not know is refused at the decision rather than at publish time.
`--to` is a comma list validated rather than cleaned: `--to zip,` is a `usage` refusal, because a
typo must not get to decide where a newsroom's work is published.

Then `advance` carries it out. That two-call shape is deliberate: deciding and sending are two
acts, and the manifest keeps the first even when the second fails.

### `verb <name>`

Executes one verb. The request is read as JSON on **stdin** — this command takes no flags at
all:

```
$ bun lib/host/cli.ts verb render < request.json
```

where `request.json` was — note `spec.source.name`: it is the credit the run's own **declared
source** publishes (`lib/source`), not a stand-in. A host composes it the way the loop does, from
the ledger it already holds; `lib/loop/produce.ts` refuses a run that declared no source rather
than crediting a placeholder, and a host that invents one here credits the reader's figures to
nobody:

```json
{
  "engine": "chart-native",
  "spec": {
    "nativeType": "bar",
    "title": "Rents rose fastest in Geneva",
    "altInsight": "Geneva leads the three cantons on rent growth.",
    "unit": "%",
    "source": { "name": "Relevés cantonaux 2024" },
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
    "report": {},
    "sourcePolicy": {
      "checked": false,
      "why": "this artifact was rendered outside a run: spec.source is whatever this request supplied, and no source policy (lib/source) validated it. A run's produce takes the credit from its DECLARED source ledger and refuses a run that declared none. This artifact also carries no provenance, so Splash cannot publish it — verb publish is refused at this façade, and deliver only publishes an artifact a run produced. To render under the source policy, create a run (init --run <dir>) and drive it with advance."
    }
  }
}
```

`sourcePolicy` sits beside the artifact rather than inside `report`, because `report` is the
ENGINE's bag and the engine said nothing about the source policy. It appears only on a SUCCESS —
a refusal rendered nothing — and only for `render`, which is the one verb reachable here that
writes an artifact. To render **under** the policy, create a run (`init`) and drive it: the
loop's produce takes the credit from the declared ledger and refuses a run that declared none.

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

#### `verb publish` is refused — publishing goes through the loop

```
$ bun lib/host/cli.ts verb publish < request.json
```

```json
{
  "ok": false,
  "code": "usage",
  "message": "verb publish is not callable through the façade — publishing goes through the editorial loop, which applies the sign-off, provenance and readiness gates the neutral contract cannot see. Use request-delivery --run <dir>, then advance --run <dir> instead"
}
```

Exit `2`, and the refusal lands **before stdin is read**: nothing can be published on the way to
it. The verb itself is untouched and still has a body — `lib/loop/deliver.ts` calls it in-process,
and that is now the only path to it.

Everything `deliver()` applies before that call is a fact about a **run**, and a publish payload
has no way to name one: the editorial sign-off (`approved` must match the exact artifact being
published), the provenance-freshness check, the metadata derived from the newsroom's profile
(title, alt text, source, credit, language), the capability readiness, and the genre legality
that stops a hosted destination from being handed a PNG. A host calling `verb publish` skipped
all six — silently, with a well-formed request.

The alternative was to carry those gates into the verb. That would mean handing the neutral
contract a manifest, a decor and a run directory — the exact coupling the "no `--run` flag" rule
above exists to prevent. One or the other, not both: the detour is the answer, and `verbs`
declares it (`hostCommand`) so a host meets it in the declaration rather than in a refusal.

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

(`capabilities` above is truncated to two entries for the example; a real run lists all eleven.)

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
