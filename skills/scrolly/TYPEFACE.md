---
family: "Open Sans, Helvetica, Arial, sans-serif"
origin: default
---

# The typeface this skill draws in

This is the skill's own recorded answer, the file `readTypeface` finds when nothing above it
answers first. A journalist's story root overrides it by carrying its own `TYPEFACE.md`.

`origin: default` is the honest word. Nobody chose this stack — it is the substrate's own, and
recording that as a value rather than leaving it as a literal in the renderer is the whole point:
before this file existed, `FONT_FAMILY = "Helvetica, Arial, sans-serif"` was a hard literal in
all 22 copies of `render-still.mjs`, while `newsroom-charter` measured a newsroom's real
typefaces off its own site, `NEWSROOM.md` recorded them, and preflight read them back. Measured
and then dropped before the render — the same failure `PALETTE.md` exists to have stopped for
colour.

**A newsroom's face is PROPOSED, never imposed.** The charter measures what the newsroom
publishes in; the journalist decides whether the graphic uses it. That decision is what `origin`
records: `newsroom` or `journalist` means somebody chose, `default` means nobody did.

**A face that cannot be resolved is REFUSED, never substituted.** The render hands resvg font
FILES and turns `loadSystemFonts` off, so a face nobody supplied draws nothing at all rather than
quietly becoming whatever this machine happens to have. `useTypeface` asks `typefaceFile` for the
recorded family first and refuses with its name when there is no file — not a Google family, or no
cached copy and no network. A journalist told "we cannot set Marr Sans here" has chosen; a silent
stack has not.

**Why Open Sans heads the stack.** It is a Google Font: redistributable, fetched on first use into
a cache outside the repository, and one of the seventeen families MapTiler serves as map glyphs —
so a map label and a panel label can be the same face with no glyph baking. Helvetica and Arial
stay behind it for the WEB genre, where the reader's own browser does the falling back; the
rasteriser reads only the first name.
