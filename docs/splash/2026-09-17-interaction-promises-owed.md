# Interaction promises owed — the beats whose prose promises an input they do not answer

Found 2026-09-17, the first run in which
`skills/splash/test/interaction-promises-are-kept.test.ts` could read this corpus: its promise
vocabulary was English only while every beat writes French, and the reading contract had moved into
`<p class="chart-reading">`, which the guard did not read. Both are fixed; these are what they
surfaced. Every one of them is RED in that test today, on all three directions of the beat.

| beat | promises | measured | probes |
| --- | --- | --- | --- |
| `proof/web-area-swiss-co2` | hover, tap, keyboard | hover 1 of 3 marks silent; tap 3 of 3 silent | ×3 directions |
| `proof/web-cartogram-europe-lowcarbon` | hover, tap, keyboard | tap 3 of 3 silent | ×3 directions |
| `proof/web-population-pyramid-switzerland` | hover, tap, keyboard | tap 3 of 3 silent | ×3 directions |
| `proof/web-sankey-electricity-sources` | hover, tap, keyboard | tap 3 of 3 silent | ×3 directions |
| `proof/web-streamgraph-swiss-electricity` | hover, keyboard | hover 1 of 3 marks silent | ×3 directions |

## The tap class, reproduced by hand

Driven outside the test with a CDP touch sequence on
`proof/web-sankey-electricity-sources/renders/creme.html`, 390×844 with touch emulation:

```
during tap: SHOWN: solaire vers France · 24,9 TWh · 19,6 % de tout le …
after lift: hidden: solaire vers France · 24,9 TWh · 19,6 % de tout le …
```

The reading appears under the finger and is gone the moment it lifts, while the page's own prose
says « Survolez, touchez ou tabulez … ». This is the original defect the guard was built for.

Mechanism: `skills/chart-web/assets/interaction.mjs` binds `pointerleave` straight to `clear`
(lines 169 and 306) without asking `event.pointerType`. A touch pointer fires `pointerleave` as
the finger lifts. The beats that pass tap pass by accident — tapping their mark also focuses it and
the focus handler re-shows the tooltip a moment later, which is this guard's own blind spot 7.

## What closing it takes

1. `interaction.mjs` ignores `pointerleave` from a touch pointer (keep clearing for mouse and pen);
2. the hover cases are per-beat — one mark of three is silent on `web-area-swiss-co2` and
   `web-streamgraph-swiss-electricity`, which is the mark-at-the-edge class, measured per mark;
3. the affected pages are re-rendered, since the interaction module is inlined into each delivered
   file, and re-verified with the same test.

Not done here: a renderer change plus a re-render of the web corpus is production work with its own
direction rules, and it is not a test repair.
