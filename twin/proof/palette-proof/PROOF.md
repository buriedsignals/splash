# The newsroom's colours reach the render — proven, not asserted

The gap this closes, in the owner's own words: *"`NEWSROOM.md` carries `brandColor`, `ground` and
`typefaces`, preflight validates them, and nothing threads them into a render."* Every beat named
its colours as hex literals with a `// from NEWSROOM.md` comment beside them — an instruction to
copy by eye. An identity collected and then never used.

## What was run

```
bun proof/palette-proof/render.mjs              → renders/house.png
bun proof/palette-proof/render.mjs --alt         → renders/alt-answer.png
bun proof/palette-proof/render.mjs --no-palette  → the refusal
```

`render.mjs` **names no hex value anywhere.** Both colours arrive through
`readPalette(dir, {stopAt})`, vendored into `render-still.mjs` beside `deriveFurniture`.

## The three results

**1. The house answer** — `PALETTE.md`, `origin: newsroom`, ground `#FFFFFF`, accent `#0B7A75`
(the value `NEWSROOM.example.md` documents). `renders/house.png`: teal line, teal end-label dot,
black title, grey source line, faint grid.

**2. A different answer, same render script** — `alt-answer/PALETTE.md`, `origin: journalist`,
ground `#12161C`, accent `#E4B23C`, given directly as two hex codes through the proposal's
"something else" branch. `renders/alt-answer.png`: near-black ground, amber line and dot, **white
title, light-grey source line, dark grid**. The furniture inverted with the ground because
`deriveFurniture` derives ink/muted/grid from whatever ground it is handed — nothing in the beat
knows or names any of those three colours either.

The two PNGs were **opened and looked at**, not inferred from the exit code.

**3. The refusal.** With `PALETTE.md` moved aside, `readPalette` throws:

```
No PALETTE.md found for …/proof/palette-proof. Run twin-palette's proposal, let the journalist
choose, and record the answer. Looked in:
  …/proof/palette-proof/PALETTE.md
  …/proof/PALETTE.md
  …/twin/PALETTE.md
```

Not a chart in a default colour. That is the whole anti-fallback rule made mechanical: a render
that quietly fell back to black-on-white would publish in a colour nobody chose, and it would look
deliberate.

## What this does NOT prove

- **Only the static chart genre has been re-rendered through a recorded answer end to end.** That
  is the honest boundary of this proof, and it did not move.

  What the parity guard actually proves, stated precisely because the earlier wording overstated
  it: `render-still-parity.test.ts` walks the tree, finds every `render-still.mjs`, and compares
  each copy against the canonical one FUNCTION BY FUNCTION. A copy carrying no `readPalette` at all
  is explicitly permitted (`:20-25`) — so "guarded for parity" never meant "carries it". As of
  2026-08-10 the web, video, map, map-web, scrolly and image genres all DO carry it, and each of
  their seed runners reads a recorded answer from the skill's own `PALETTE.md`; the previews come
  out byte-identical, which is what proves no value drifted. None of those genres has a
  palette-proof of its own.
- **Not `typefaces`.** `NEWSROOM.md`'s third identity field still reaches nothing. The one font
  stack is `FONT_FAMILY` in `render-still.mjs`, and threading a newsroom's own faces means shipping
  or resolving those faces — a different problem, now MEASURED (`survey/typeface-feasibility.md`)
  and not yet built. The measurement's own headline: resvg accepts a custom face but **never errors
  on one it cannot resolve**, so a typeface answer's refusal has to happen before the render, not
  during it.
- **Not the proposal itself.** That `twin-palette` proposes sensibly is covered by its own tests;
  this proves only that an answer, once recorded, arrives intact in pixels.
