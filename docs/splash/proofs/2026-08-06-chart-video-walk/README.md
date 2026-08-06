# Toute vidéo de graphique porte les mots de sa marche — la preuve rendue

Frames extraites d'un **vrai mp4**, aux frontières de beats — jamais le still de revue, qui tombe
après la fenêtre d'échelonnement. Spec :
`docs/superpowers/specs/2026-08-06-every-chart-video-carries-its-words-design.md`.

## Grain ANCRÉ — `lollipop` (un type qui n'est pas `bar`)

Données : Genève 5, Vaud 12, Valais 8. La géométrie **trie par valeur**, donc l'ordre rendu est
Vaud, Valais, Genève. La marche du journaliste ouvre sur **Genève**.

| frame | ce qu'on voit |
|---|---|
| `lollipop-beat1-f47.png` | Genève entre **en premier** — dernier au tri — avec sa propre phrase |
| `lollipop-beat2-f83.png` | Vaud entre, sa phrase à l'écran |
| `lollipop-beat3-f118.png` | le Valais ferme, sa phrase à l'écran |

C'est cette série qui a démasqué les deux défauts du lot : `beats` n'arrivait jamais jusqu'à la
config du composant, puis le récit passait dans l'ordre des **données** et non dans celui du
journaliste. Aucun test unitaire ne pouvait les voir.

## Grain SÉQUENCÉ — `pie`

| frame | ce qu'on voit |
|---|---|
| `pie-seq1-f36.png` | première phrase, sur le balayage naissant |
| `pie-seq3-f184.png` | dernière phrase, camembert complet |

Pas d'ancre : les phrases se suivent dans l'ordre écrit. C'est ce que l'offre promet pour ce
grain, et rien de plus.
