---
family: "Helvetica, Arial, sans-serif"
origin: default
---

# The typeface this story draws in

`NEWSROOM.md` records `typefaces: "Space Grotesk, Courier New"`, and preflight reads that value
back. `familyResolves("Space Grotesk")` is **false** on the machine this story was produced on, so
`useTypeface` would have refused rather than silently rendering the fallback — which is the correct
behaviour and is why this file has to exist at all.

The three options `render-still.mjs`'s own refusal names were: install Space Grotesk · record a
face this machine has · record `origin: default` and accept the substrate stack as a choice. The
newsroom's second face, `Courier New`, does resolve, but a monospaced typewriter face is not a
chart face and choosing it only because it resolves would be a worse answer than a stated fallback.

So: `origin: default`, recorded here rather than left as a literal in the renderer, and the gap is
named — the newsroom's own primary face is not on this machine, and until it is, these three beats
are not set in it.
