# Defect — the loop chain never applies the newsroom house palette to a map (2026-08-07)

Found on a real `/using-splash` run (Heidi.news, « Pourquoi les prisons genevoises sont-elles
pleines à craquer ? »), run dirs `exports/prisons-genevoises` and `exports/prisons-map`.

> **Two of the three defects this file opened are CLOSED** and have been removed from it rather
> than left as a to-do list nobody trusts:
>
> - **an admin-1 choropleth could not be produced from the prose chain** — the chain has no
>   `orient` step, so `config.featureIdsByValue` was never written and every admin-1 map was
>   offerable, validatable and unbuildable. Closed by `skills/map-native/src/adm1-backfill.ts`,
>   called at the top of both native producers, with the join re-pointed at the column that
>   actually resolves (`canton_code` = "CH-GE" resolves nothing; `canton` = "Genève" resolves
>   4/4) and the confirmed storyboard carried across with it. Proven on a produced render, plus
>   a keyless produce-level test on each of the two producers.
> - **the interactive choropleth popup omitted the space before a word unit** — shipped
>   « Genève — 157détenus / 100 000 hab. » beside a legend that read « 43–65,8 détenus / 100 000
>   hab. ». Both renderers now build that string in one place
>   (`skills/map-native/src/core/region-popup.ts`), and the cartogram and hex-grid callouts route
>   through the shared formatter too. A `%` prints identically either way, which is how it
>   survived every earlier review — the word-unit case is now the asserted one.

## D3 — the loop chain never applies the newsroom house palette to a map

`NEWSROOM-PROFILE.md` declares `palette: ["#d5121e"]` (Heidi.news red). The produced
`config.json` carries **no** `palette` / `brandHue` / `themeBg`, and the map ships default blue.

On the PROSE chain this is `mergeProfileDefaults`' job (`produce-all.mjs`), which erases a map's
auto palette so `houseRamp` derives from the brand hue (CLAUDE.md, session 2026-07-14). The loop
chain has no equivalent: `lib/loop/assemble/map-native.ts` contains no `palette`/`theme`/`brand`
reference at all, and `lib/loop/produce.ts` never sees `decor` (grepped: zero hits for
`decor|theme|palette|brandHue` in both). `Decor` does carry `theme` (`lib/newsroom/decor.ts:69`)
— it is simply never threaded to a map assembler.

⇒ **Every visual built through the loop ignores the newsroom's charter.** That directly
contradicts what INPUT announces to the journalist ("j'applique la charte Heidi.news"), which
makes it worse than a missing feature: the flow promises it in words.

Fix: thread `decor` into `assemble/map-native.ts` (and its siblings) and apply the same
house-palette rule the prose chain applies, then prove it on a render — a config-level test would
pass on a map that still renders blue.

## Cost on the run

The journalist was told the map could not be produced and was offered the chart fallback. No visual
was shipped for the map. Nothing was patched, nothing hand-planted.
