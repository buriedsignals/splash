---
name: twin-deliver
description: Use to run the DELIVERY phase of the doctrine twin — offer the journalist the forms their beat's genre allows, wait for the choice, and materialise only that one. Never builds a form nobody asked for.
---

# twin-deliver — offer, wait, build the one that was chosen

## Overview

Runs the DELIVERY phase: the last step of a beat's life, after a still has already been
rendered into `<beatDir>/renders/`. `offerForms({medium, genre})` names the delivery forms a
beat's genre allows, each with a plain-language `gives` so the choice is informed. Nothing is
built at this point — `offerForms` only lists what could be built. `materialise({form, genre,
beatDir, exportDir})` is the only function that writes anything, and it writes exactly one form:
the one named in `form`, for the `genre` actually given, nothing else, into `exportDir`.

**The forms are offered, then WAITED on. Silence is not a choice.** A conversation running this
phase presents the list `offerForms` returns and stops — it does not default to a form, does not
guess from context, does not materialise anything until the journalist names one. That reversal
is the whole point of this skill: `main`'s habit was to build every form up front, so the choice
(if it ever came) was a formality over files that already existed. Here the files do not exist
until the choice does.

## When to use

- At the end of a beat's production, once `<beatDir>/renders/` holds a still — call
  `offerForms` with the beat's medium and genre, present the list, and wait.
- Once the journalist has named a form (its `id`, exactly), call `materialise` with that id, the
  *same* genre, the beat's directory, and the export directory. Nothing before that call.
- **Not** for production. This skill never renders a chart or a map — it only decides which
  already-rendered (or already-written) files leave the beat directory, and in what shape.

## The one gotcha that will waste your day (read first)

**A second choice is not additive.** If a journalist materialises `owned-file` and then changes
their mind and materialises `source-bundle` into the same `exportDir`, the first form's files do
not linger. `materialise` clears `exportDir` before writing, every call, so the directory always
holds exactly the most recently chosen form — never a mix of two. That clearing happens *after*
`{form, genre}` is validated as a pair, in that order deliberately: a refused, unoffered
`form` (see `materialise` refusing `"embed"`, or `"owned-file"` under a genre that never offered
it) must not destroy a form that was already delivered by a previous, valid call. Swap that
order and a bad second choice silently wipes out a good first one.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Menu | `scripts/deliver.mjs` — `FORMS_BY_GENRE`, `offerForms` | The forms one genre allows, and what each honestly gives |
| Materialiser | `scripts/deliver.mjs` — `materialise`, `copyTree` | Writes exactly the chosen form's files into `exportDir`, walking any subdirectory a beat carries |

## How it works (the shape)

1. **`offerForms({medium, genre})`** looks `genre` up in `FORMS_BY_GENRE`. Three genres are known
   today — `"static"`, `"web"`, `"video"` — any other genre throws rather than returning an empty
   or partial list, so a caller can never mistake "no forms for this genre yet" for "this beat has
   nothing to deliver". For a known genre it returns both forms in that genre's table, in the same
   order every time, each carrying an `id`, a `label`, and a `gives` long enough to inform a real
   choice.
2. **The conversation presents the list and waits.** This skill's code stops here; the doctrine
   of waiting is enforced by the calling conversation, the same way `twin-storyboard` enforces
   its exchange in prose, not in code that could be skipped.
3. **`materialise({form, genre, beatDir, exportDir})`** validates the **`{form, genre}` pair**
   against `FORMS_BY_GENRE[genre][form]` — the same table `offerForms` reads, so "not an offered
   form" can never drift from what was actually offered, and a form id that happens to exist
   under one genre is never accepted for a different genre just because the id matches. It then
   clears and recreates `exportDir` (the gotcha above), and:
   - `"owned-file"` copies every entry of `<beatDir>/renders/` into `exportDir`, walking any
     subdirectory with `copyTree` rather than handing a directory straight to `copyFile` (which
     throws on it).
   - `"source-bundle"` copies every entry of `beatDir` *except* `renders/` (the raster output
     belongs to the other form, not this one) into `exportDir`, then writes a real `build.ts`
     — a script that finds the copied `.tsx` files and bundles them with `Bun.build`, the
     bundler built into the Bun runtime itself, no added dependency — and a `package.json`
     naming it as the `build` script. `bun install && bun run build` in the delivered folder
     genuinely executes; it bundles the component source it was actually given, not a
     rebuild of the raster pipeline that made the owned PNG/SVG (that pipeline lives in the
     chart-beat skill, and copying it here would be exactly the shared-utility coupling this
     codebase's skills avoid).
4. **`materialise` returns every path it wrote.** A caller that wants to confirm the delivery
   can list `written` without re-reading the directory.

## Quick start

```js
import { offerForms, materialise } from "./scripts/deliver.mjs";

const forms = offerForms({ medium: "chart", genre: "static" });
// present `forms` (id, label, gives) to the journalist here, and wait for a choice —
// do not call materialise until one comes back.

const written = await materialise({
  form: chosenId, // must be one of forms[*].id
  genre: "static", // the same genre offerForms was called with
  beatDir: "stories/water-wars/beats/1-rainfall",
  exportDir: "stories/water-wars/export",
});
// `written` names exactly what left the beat directory — nothing more.
```

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| How many genres this skill knows how to deliver | `3` (`"static"`, `"web"`, `"video"` — everything else throws, in both `offerForms` and `materialise`) | `FORMS_BY_GENRE` |
| How many forms each known genre offers | `2` (`owned-file`, `source-bundle`) per genre | `FORMS_BY_GENRE` |
| Shortest a `gives` description may read before the choice counts as uninformed | `5` words (`split(/\s+/).length > 4`, tested) | `FORMS_BY_GENRE` entries |
| Which subdirectory of a beat never travels into the source-bundle form | `1` (`"renders"` — the other form's output) | `materialise` |

## Files

- `scripts/deliver.mjs` — `offerForms`, `materialise`, `copyTree` (its recursive helper), and
  the `BUILD_SCRIPT` template written into every `source-bundle` delivery.
- `test/deliver.test.ts` — `bun:test` coverage: what each form offers and describes, that
  `offerForms` itself refuses an unknown genre, that only the chosen form's files land in
  `exportDir`, that a nested subdirectory (two levels deep for `source-bundle`, one level for
  `owned-file`) is walked rather than crashing `copyFile`, that a second choice clears the
  first's files, that an unoffered form — including a form id that is real for a *different*
  genre — is refused without touching a delivery already made, and that the shipped `build.ts`
  is run for real (`bun run build`, via the bundle's own `package.json`) and produces a bundled
  file, not just a promise.
