# Spec — Balayage de résidus (2026-07-27)

> **Statut :** en cours.
> **Branche :** `feat/residual-sweep`, off `687dadf`.
> **Langue :** prose FR, identifiants/code en anglais (standard non-négociable).

---

## 0. Pourquoi ce document

Six résidus petits, déjà identifiés, déjà jugés, chacun parké **avec sa raison** par le chantier
qui l'a trouvé. Aucun n'est un bug ouvert ; ensemble ils forment la dette qu'une session dédiée
ferme moins cher que six sessions distraites. Un paragraphe par résidu : ce que c'était, ce qui a
été fait — ou pourquoi il reste ouvert.

Discipline de la session : chaque item a été **vérifié contre le code réel avant d'être touché**
(plusieurs avaient été notés contre un arbre mouvant, les numéros de ligne pouvaient être périmés),
puis fermé en TDD, un commit par item.

---

## 1. Le placeholder périmé vivait dans la doc et dans un test *(fermé)*

`lib/host/README.md` et `lib/host/journey.test.ts` montraient encore
`source: { name: "Provided by the newsroom" }` dans l'exemple de charge utile du verbe `render` —
exactement le placeholder que le câblage source (spec `2026-07-26-source-wiring-design.md`) a
supprimé de la production : `lib/loop/produce.ts` prend désormais le crédit de
`validateSourcePolicy` et **refuse un run qui n'a rien déclaré**. Vérifié : les deux occurrences
étaient bien là, et les deux fixtures du test déclaraient déjà un `sources` réel
(`{ kind: "local", label: "Relevés cantonaux 2024" }`) — seule la charge utile `verb render`
écrite à la main contredisait encore le comportement livré. Un exemple documenté qui contredit le
code enseigne le mauvais geste, et c'est un exemple que des hôtes non-JS recopient.

Fait : le test **dérive** maintenant le crédit du ledger du run lui-même
(`run.sources!.data!.label`) plutôt que de le retaper — l'exemple ne peut plus diverger de la
déclaration posée trois lignes au-dessus. Le README montre le même crédit réel et gagne une phrase
qui dit d'où il vient (le ledger, comme la boucle) et ce que fait `produce.ts` d'un run non
déclaré. La charge utile exacte du README a été rejouée à travers `bun lib/host/cli.ts verb render`
et le PNG rendu porte bien « Source: Relevés cantonaux 2024 » — l'exemple est vérifié, pas
seulement corrigé.
