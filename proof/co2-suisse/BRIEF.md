---
size: landscape
type: line
---

# Beat 1 — la courbe repasse sous 1967

**Prouve :** que les émissions territoriales suisses de 2024 sont passées sous leur niveau de 1967.
**Médium / genre :** chart / static. **Canal :** article web, 1920 × 1080.

## Hiérarchie de la preuve

1. Le **point de 2024** (32,1 Mt) — le sujet, nommé au bout de la ligne.
2. Le **trait de repère de 1967** (32,5 Mt) — le seul élément de contexte qui porte du texte.
3. La **courbe 1950–2024** — le décor : la montée, le plateau, le décrochage.
4. Le **pic de 1973** — discret, muet sur sa valeur : le texte à côté du visuel la donne déjà.

## Ordre de lecture

Titre (la phrase du journaliste) → source sous le titre → le trait de 1967 et sa légende → la courbe
qui le franchit → le point de 2024 et son étiquette.

## Accent unique

L'accent maison (`#0B7A75`) est réservé au **point de 2024 et à son étiquette**, plus le tracé de la
courbe qui y mène. Le pic de 1973 et le trait de 1967 sont en muted. **Le maximum n'est pas le
sujet** : accentuer 1973 serait exactement l'anti-pattern que la doctrine nomme.

*Amendement du 2026-08-10 :* **l'encre du trait de 1967 n'est plus le muted**, elle est dérivée de
ce que le trait traverse. Le muted mesurait 1,20:1 contre la courbe accentuée que le trait coupe —
et il la coupe précisément au croisement, qui est toute la thèse du beat. La règle du muted tient
toujours pour l'ÉTIQUETTE du trait et pour le marqueur du pic, qui reposent sur la page. Voir la
section « Reproducibility and size » plus bas.

## Source

`Source : Global Carbon Budget 2025, via Our World in Data · données 2024, extraites le 6 août 2026`
Sous le titre, à taille de lecture, en muted.

## Anti-patterns de ce cas

- **Ne pas répéter le texte** : le §2 donne déjà « 46,2 Mt en 1973 ». Le pic est marqué, pas chiffré.
- **Ne pas surinterpréter** : rien dans le titre, l'étiquette ou l'alt ne doit parler d'« empreinte »
  ni de « baisse des émissions suisses » tout court — la limite territoriale est dans la source.
- **Pas d'axe à zéro forcé** : c'est une ligne ; la pente porte la valeur. Trois ticks étiquetés.
- **Pas de légende** : deux étiquettes directes, l'une sur le trait, l'autre au bout de la courbe.
- **Français partout**, y compris la virgule décimale et l'espace insécable des milliers.

## Reproducibility and size — 2026-08-10

*(This section is in English, like every other beat's; the beat's own editorial furniture — title,
subtitle, labels, credit — stays French, as the anti-patterns above require.)*

**This beat could not be reproduced, and it is the beat everything else was written against.**
`co2-suisse-still.png` sat committed at 1800 × 1120 — a 900 × 560 element rasterised at
`fitTo: width × 2`, the doubled-scale defect — beside a component, `EmissionsLine.tsx`, that **no
script imported**. Only `render-web.mjs` existed, and it renders the WEB genre from
`EmissionsWeb.tsx`. A rendered artifact with no producing script is precisely what
`splash/test/claims-grounded-in-data.test.ts`'s ancestry check exists to forbid; this beat passed it
only because a script for the *other* genre happened to sit in the same folder.

**Given a runner, not superseded**, because everything it needs is committed and nothing had to be
invented: `data.csv` holds the frozen OWID series, and `render.mjs` imports the journalist's own
words from `BEAT` in `render-web.mjs` rather than retyping them, so the static and the web genre can
never disagree about what this chart says.

**Its claim is re-checked against the frozen file on every run**, because the claim is a CROSSING and
a data refresh could break it silently:

    1967: 32.5 Mt · peak 1973: 46.2 Mt · 2024: 32.1 Mt — crossing holds

The runner refuses if 1967 is missing, if `BEAT.reference` drifts more than 0.05 Mt from the 1967
reading it names, if 2024 is not under 1967, or if the peak marker names a year that is not the
series' own peak.

**Pinned: landscape (1920 × 1080)**, in the front matter, verified from the delivered PNG's own
IHDR. Fifteen bare spacing literals, the line weight and both dot radii now scale with the row's
`typeScale`; `Y_TICK_HINT` and `X_TICK_HINT` are COUNTS and deliberately do not.

**A credit that ran off the frame, found by looking at another size.** The source was a single
unwrapped `<text>`. It fits 1920 px and does not fit 1080: the square arm printed "Source : Global
Carbon Budget 2025, via Our World in" and lost the rest at the frame edge. A clipped credit is an
attribution failure, not a cosmetic one, so the source wraps like every other block.

**What the square arm showed, and what was NOT done about it.** Unlike most types, a line is not
refused at a tall frame — it has a measured range (0.7–3.6, `proof/aspect-range-probe/`) and
`assertPlotAspect` clamps it. The square arm passes that clamp and is unpublishable: 74 annual
readings in ~510 px of plot, the decade labels merged into one smear, and "Niveau de 1967" printing
through the line it names. This is the standing finding `type-at-size.mjs` already records in the
line's own `suspect` field — the failure travels with the plot's WIDTH against the ink drawn in it
and is aspect-blind — so nothing here invents a tighter bound to hide it. The arm was rendered,
looked at, and deleted; only landscape is delivered.

**A rule nobody could see, found the moment the beat had a runner.** Writing the SVG beside the PNG
put this beat's markup in front of `annotation-reads-over-what-it-crosses.test.ts` for the first
time, and it measured the 1967 reference: drawn in `muted`, it reads 5.92:1 against the white page
it is nominally on and **1.20:1 against the accent series line it crosses** — at the crossing, which
is the beat's whole claim. Its ink is now derived from what it crosses (`inkThatReadsOver([ground,
accent])`, the same helper and the same precedent as the histogram beat's median rule). The label
and the peak marker stay muted: they sit on the page. This is the concrete cost of an artifact
nothing could regenerate — the defect was in the committed still all along, and no guard in this
repository could reach it.
