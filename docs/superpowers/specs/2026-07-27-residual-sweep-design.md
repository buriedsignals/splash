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

---

## 2. La CLI de production ne recevait pas le probe browser *(fermé)*

`lib/newsroom/probe.ts` a gagné `probeRemotionBrowser` et `lib/newsroom/readiness.ts` l'appelle
pour toute capacité dont `criticalDeps.packages` contient `"remotion"` — mais seul le chemin de la
**page** `install/preflight` en profitait. La CLI de production `skills/splash/src/preflight.ts`
était hors du périmètre de ce slice, et son propre §5 « Risques assumés » le nomme. Vérifié :
`preflight.ts` importait bien `defaultResolveDep`/`isSet`/`parseEnvFile` du probe partagé, et pas
`probeRemotionBrowser` — le résidu était exact.

Ce qui rend le trou coûteux : `preflightFindings` est le gate qui tourne **juste avant la
production** (`produce-all.ts:160`, fail-fast en langue journaliste). C'est précisément là que
l'incident se paie — la résolution de paquet répond « installé » pendant qu'un téléchargement
interrompu a laissé le headless-shell à moitié extrait, et le rendu vidéo meurt en plein produce
avec un dump de sous-process illisible. La page d'install le voyait, le gate de production non.

Fait : `PreflightOpts` gagne un `probeBrowser?` injectable (défaut = le vrai
`probeRemotionBrowser`, jamais une seconde implémentation), et `preflightFindings` pousse un
finding `deps` — donc statut **red**, un problème d'install et pas de clé — quand le probe ne
répond pas `ready`. Deux choix de portée, tous deux copiés de `readiness.ts` pour que les deux
consommateurs ne puissent pas diverger : le probe ne tourne **que** si `criticalDeps.packages`
contient `"remotion"` (scrolly, react+vite, n'est pas concerné), et **seulement** si tous les
paquets résolvent — un `remotion` non résolu se répare par un `bun install`, et empiler l'ordre
`bunx remotion browser ensure` par-dessus donnerait deux commandes pour un seul problème.
6 tests, dont les deux bornes négatives (moteur sans vidéo, paquet manquant).
