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

---

## 3. `why` non vide sur l'option choisie *(mesuré, PAS livré — et c'est le résultat)*

Le résidu : `assertInvariants` (`lib/loop/manifest.ts`) n'exige pas un `why` non vide sur l'option
**choisie**. Le seam de phrasage est tenu par `applyPhrasing` (`lib/loop/phrase.ts`, seul écrivain
sanctionné, qui refuse un `why` vide) et par un contrat en prose dans `skills/splash/SKILL.md`
(« Never show, and never persist, an option whose `why` is still empty ») — mais un appelant qui
écrit le manifeste directement passe à côté des deux. Une option enregistrée comme **choisie** sur
une phrase vide dit qu'un journaliste a choisi quelque chose que personne ne lui a montré.

La règle est juste. **Le code ne peut pas encore l'honorer, et c'est ça le résultat de l'item.**
Implémentée (une ligne, 4 tests, verts en isolation), elle casse **deux chemins existants et
légitimes** :

1. `lib/host/journey.test.ts` — le parcours de la façade : `advance` (propose) → `choose-form`
   refuse désormais avec exit 2. Cause : **aucune commande de la façade ne phrase**. Le phrasage
   est le tour du desk et vit *au-dessus* de `lib/`, dans `skills/splash` ; `propose()` écrit
   délibérément `why: ""` sur **toutes** les options (`lib/loop/propose.ts` : le cerveau livre le
   grounding, le desk écrit la langue). Sous cet invariant, `choose-form` devient
   **structurellement inatteignable** pour l'hôte non-JS pour lequel la façade existe (Goose).
2. `lib/loop/driver.test.ts:219` — un test de boucle qui pose `chosenId` à la main sur une offre
   construite par le cerveau. C'est littéralement « un appelant qui écrit le manifeste
   directement » que le résidu vise… mais c'est un test, pas la production, et ce fichier est hors
   du périmètre de cette session.

Arbitrage : ne pas livrer. Un invariant qui rend un parcours documenté impossible n'est pas un
garde-fou, c'est une régression — et le faire passer demanderait soit d'affaiblir des tests
existants (interdit), soit d'ouvrir un chantier « la façade sait phraser », qui n'est pas une
ligne. **Le trou réel n'est pas dans `assertInvariants`, il est un cran plus haut : il n'existe
aucun pas de phrasage qu'un hôte puisse exécuter.** Tant que c'est vrai, l'invariant ne peut pas
tenir. Écrit à l'endroit où le prochain regardera : un commentaire à l'emplacement exact où
l'invariant irait, dans `assertInvariants`, qui nomme la raison et les deux tests. À rouvrir avec
le chantier phrasage-façade, où il devient une ligne gratuite.

---

## 4. Un enregistrement de livraison sans artefact *(fermé)*

Même classe que les deux gardes juste à côté — `assertInvariants` refuse `review` et `approved`
sans artefact, mais rien ne refusait `delivery.delivered`. Un enregistrement qui dit « publié » sur
un élément qui n'a rien produit est incohérent. Noté dans
`docs/splash/delivery-l1-followups.md` (§ Résidus mineurs). Vérifié : les deux gardes voisines
étaient bien là, la troisième bien absente.

Fait : une garde jumelle, jugée sur `delivered` et **jamais** sur `requested` — décider d'une
destination avant que l'artefact existe est un run parfaitement ordinaire (`request-delivery` est
justement séparé de `deliver` pour que la décision survive à un échec de publication) ; c'est
l'enregistrement **livré** qui porte la revendication. 3 tests, dont la borne négative
(`requested` seul ne déclenche rien). Aucun autre test de la suite n'a bougé : rien en production
ne produisait cet état — c'était un trou d'expression, pas un bug vivant.
