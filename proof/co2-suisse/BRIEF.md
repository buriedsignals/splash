---
format: static
medium: chart
type: line
grounding: supported
derived: v1
---

# Beat 1 — la courbe repasse sous 1967

**Prouve :** que les émissions territoriales suisses de 2024 sont passées sous leur niveau de 1967.
**Médium / format :** chart / static. **Canal :** article web, 900 × 560.

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

## The choreography

Read this plate as a crossing. The curve rises, plateaus and falls, and the whole argument is
where it ends relative to a line drawn in 1967 — so the dashed rule at 32,5 Mt and its italic
label are the first thing on the plate that carries text. The 1973 peak is MARKED and left mute:
the paragraph beside the visual already gives 46,2 Mt, and accenting the maximum would make the
plate argue the opposite of its own headline. The two oil-shock bands are ground, not argument.
The accent is reserved for the end of the curve and the label that names it, and the small italic
under it says the crossing happened a year before the last reading.

**The eye enters at** `the curve`. **The claim lands at** `subject`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the curve` | `the 2024 point` |
| reference | `the 1967 rule` | `the 2024 point` |
| reveal | `the 1973 peak` | `the curve` |
| subject | `the 2024 point` | — |
| conclusion | `the crossing note` | `the 2024 point` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the curve",
  "stations": [
    {
      "station": "establish",
      "carries": "the curve",
      "subordinateTo": "the 2024 point"
    },
    {
      "station": "reference",
      "carries": "the 1967 rule",
      "subordinateTo": "the 2024 point"
    },
    {
      "station": "reveal",
      "carries": "the 1973 peak",
      "subordinateTo": "the curve"
    },
    {
      "station": "subject",
      "carries": "the 2024 point",
      "subordinateTo": null
    },
    {
      "station": "conclusion",
      "carries": "the crossing note",
      "subordinateTo": "the 2024 point"
    }
  ],
  "claimLands": "subject"
}
```

## Precision

- **The crossing is computed, not eyeballed** — 32,1 Mt in 2024 against 32,5 Mt in 1967 is read off the frozen series, and the beat throws if the last reading is not below the reference.
- **A gap breaks the line** — a missing year breaks the path rather than being bridged across, because a bridged line invents readings the source does not have.
- **1967 is found, not typed** — the reference year is the last year before the peak still at or below the last reading — a search, so a data refresh moves it.
- **Nothing overreaches the territorial scope** — the title, the labels and the alt stay inside what the source measures: territorial emissions, not a footprint.
- **Both levels are on the same plate** — the 1967 level and the 2024 point are asserted in the one frame, which is what makes "below" a reading rather than a memory.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "the-crossing-is-computed-not-eyeballed",
    "a-gap-breaks-the-line",
    "1967-is-found-not-typed",
    "nothing-overreaches-the-territorial-scope",
    "both-levels-are-on-the-same"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "the-crossing-is-computed-not-eyeballed",
    "a-gap-in-the-series-breaks": "a-gap-breaks-the-line",
    "the-reference-year-is-found-not": "1967-is-found-not-typed",
    "nothing-in-the-title-the-label": "nothing-overreaches-the-territorial-scope",
    "asserted-in-the-one-frame": "both-levels-are-on-the-same"
  }
}
```
