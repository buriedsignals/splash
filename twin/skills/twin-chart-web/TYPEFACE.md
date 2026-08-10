---
family: "Helvetica, Arial, sans-serif"
origin: default
---

# The typeface this skill draws in

This is the skill's own recorded answer, the file `readTypeface` finds when nothing above it
answers first. A journalist's story root overrides it by carrying its own `TYPEFACE.md`.

`origin: default` is the honest word. Nobody chose this stack — it is the substrate's own, and
recording that as a value rather than leaving it as a literal in the renderer is the whole point:
before this file existed, `FONT_FAMILY = "Helvetica, Arial, sans-serif"` was a hard literal in
all 22 copies of `render-still.mjs`, while `twin-newsroom-charter` measured a newsroom's real
typefaces off its own site, `NEWSROOM.md` recorded them, and preflight read them back. Measured
and then dropped before the render — the same failure `PALETTE.md` exists to have stopped for
colour.

**A newsroom's face is PROPOSED, never imposed.** The charter measures what the newsroom
publishes in; the journalist decides whether the graphic uses it. That decision is what `origin`
records: `newsroom` or `journalist` means somebody chose, `default` means nobody did.

**A face that cannot be resolved is REFUSED, never substituted.** Measured
(`survey/typeface-feasibility.md` §1): resvg never errors on a family it cannot find — it renders
the fallback and reports nothing, as do Chrome and Canvas `measureText`. So `useTypeface` lays a
probe string out in the recorded family and in a family that exists nowhere, and refuses when the
two produce identical ink, naming the family and this file. A journalist told "this machine does
not have Marr Sans" has chosen; a silent stack has not.
