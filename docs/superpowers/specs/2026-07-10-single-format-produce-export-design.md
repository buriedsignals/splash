# Un élément = un format, produit et livré seul — redesign produce→export

> Design validé 2026-07-10 (Rémy). Fait suite au constat Wave 5 QA : le pipeline
> sur-produit sur deux axes et la livraison n'est jamais réduite à l'unique format
> défini. Statut : spec (design approuvé, plan à écrire).

## Problème (constaté Wave 5)

Le pipeline `produce → export` sur-produit sur **deux axes**, et la livraison est un tas,
pas « l'export adapté » :

1. **Axe FORMAT visuel.** Le producteur build `static + interactive + video` même quand un
   seul format est pertinent pour l'élément. `produce.mjs` est appelé avec `formats="all"`
   (défaut). Preuves : `renouvelables` (vidéo) a aussi buildé `interactive.html` +
   `interactive.png` + `static.png` ; `seismes` (vidéo) n'a **jamais** produit le `.mp4` mais a
   buildé `static.png` + `interactive.html` + 4 `responsive-*.png` puis a atteint le turn-cap.
2. **Axe FORME de livraison.** `export-code` matérialise **toutes** les formes d'office (le
   bundle React complet de ~146 fichiers + `interactive.html` + `static.html` + `EMBED.md`)
   AVANT tout choix, et la question a/b/c est proposée mais jamais attendue/honorée (le run se
   marque « delivered » à la proposition). Preuves : `langages` a livré le bundle 146-fichiers
   entier ; `budget` a livré `static.html` + `EMBED.md` d'un chart Datawrapper sans choix.

Cause racine : rien ne **pinne** l'unique format/forme de l'élément ; le pipeline produit et
matérialise tout ce qui est *possible* au lieu de ce qui est *défini*.

## Modèle cible

**Un élément = un format visuel, produit et livré seul.** Deux axes, chacun réduit à UN choix :

### Axe 1 — FORMAT visuel (`static` | `interactive` | `video` | `scrolly`)

- L'IA (suggesteur) propose **un seul** format, dans le set autorisé par le canal
  (`channel.allowedFormats`). Le journaliste le veto/change au gate **PROPOSITION** existant
  (Gate 2) — pas de nouveau gate. Le format retenu est un champ unique de la spec acceptée.
- Le producteur ne build **que ce format**. `produce.mjs` reçoit le format unique
  (`produce.mjs <type> <config> <outDir> <format>`) au lieu de `"all"`.

### Axe 2 — FORME de livraison (interactif/scrolly UNIQUEMENT) — **paresseuse**

- À « ship it » (après render-review), atelier propose a/b/c, **attend la réponse**, et ne
  build/livre **que la forme choisie** :
  - **code source** → le bundle React est construit *à ce moment-là* (pas d'office) ;
  - **HTML autonome** → on livre simplement le fichier `interactive.html` / `scrolly.html` ;
  - **embed hébergé** → déploiement fly.io *à ce moment-là*, on partage l'URL.
- `static` et `video` n'ont **pas** d'axe forme : on sort le média directement.

## Livraison par format

| Format | Livré | Axe forme a/b/c ? | `.html` ? |
|---|---|---|---|
| **static** | le média directement (`.png`/`.svg`) | non | **non** |
| **video** | le `.mp4` directement | non | non |
| **interactive** | `interactive.html` (défaut) · bundle React (si choisi) · URL fly.io (si choisi) | oui, paresseux | oui |
| **scrolly** | `scrolly.html` (défaut) · bundle React (si choisi) · URL fly.io (si choisi) | oui, paresseux | oui |

## Changements pipeline (composant par composant)

- **Suggesteur / PROPOSITION** (`suggest-chart`, `suggest-article`, `atelier` SKILL.md) : la spec
  acceptée porte **un** champ format (un `VisualFormat`), pinné à la proposition. Le suggesteur
  choisit UN format dans le set du canal (réutilise `interactiveDefault` + la logique existante).
- **`produce-all.mjs` / `produce.mjs`** (chart-native, map-native, dw-chart) : passer le format
  unique. `produce.mjs` doit builder **exactement** le format demandé — étendre le mode
  single-format (aujourd'hui `"static"` existe ; ajouter `interactive` / `video` / `scrolly`
  comme builds uniques). Ne plus builder les autres formats ni les `responsive-*` non requis.
- **Render-review (Gate 3)** : un *still de revue* reste nécessaire pour juger. Pour `static`,
  le média EST le still. Pour `video`, le `video-still`. Pour `interactive`/`scrolly`, produire un
  snapshot de revue **éphémère** (`interactive.png`, non livré) + lancer les snaps d'interaction
  (`snap-tooltip-viewport.mjs` etc.). Le still de revue n'est **pas** un livrable.
- **`export-code.mjs`** : refonte de la livraison.
  - `static` → livrer le fichier média directement (chemin propre), pas de dossier, pas de `.html`.
  - `video` → livrer le `.mp4` directement.
  - `interactive`/`scrolly` → proposer a/b/c, **attendre**, puis matérialiser+livrer **la seule
    forme choisie** (fichier html | bundle React construit à la demande | déploiement fly.io).
  - Ne plus matérialiser d'office le bundle, `static.html`, ni un `EMBED.md` qui liste tout.

## Renversement de décision verrouillée (à graver au log)

- **2026-06-23 → 2026-07-10 : le fallback no-JS `static.html` n'est plus auto-produit.** La
  mitigation a11y+souveraineté (« la dépendance SaaS ne rot jamais l'archive ; lecteurs sans-JS
  couverts ») est **remplacée** par : **l'a11y/le fichier possédé no-JS = choisir le format
  `static`**. Un interactif = juste l'interactif. Conséquence assumée par Rémy : un interactif
  ou un embed n'embarque plus de repli no-JS ; l'accessibilité sans-JS est un choix de format,
  pas un ajout automatique.
- Ceci met aussi à jour la décision `export-form-choice` (2026-07-10, « produire toutes les
  formes d'office = local-first ») → **produire/livrer seulement la forme choisie** (paresseux).
  Le local-first reste préservé pour `static`/`video`/`html autonome` (un fichier possédé
  existe) ; « embed » reste un choix explicite du journaliste (hébergé, pas de fichier possédé).

## Gardes mécaniques affectées

- **`assertDelivered`** (export-guard) : ne plus exiger `static.html` pour un interactif.
  Nouvelle règle : le livrable est **la forme choisie** (fichier média pour static/video ;
  fichier html | dossier bundle | URL pour interactif/scrolly). Un livrable `static`/`video`
  n'est plus un dossier `-export` mais un média.
- **`assertRenderedSize`** (conformance canal) : s'applique au format produit (inchangé sur le
  principe, appliqué à l'unique format).
- **`judge.md`** (harness) : la rubrique EXPORT/Gate 4 doit refléter le nouveau modèle (un
  format produit seul ; static/video = média direct ; interactif = forme choisie paresseuse ;
  plus de `static.html` a11y auto ; « pleins de formats produits » devient un DÉFAUT à flagger).

## Hors scope (fix séparés, notés — PAS dans ce spec)

- **Hang du rendu vidéo symbole animé** (`seismes`) : bug technique Remotion+MapLibre par frame
  (frame-gating / plomberie). Ce redesign *réduit* le déclencheur (moins d'over-produce → la
  vidéo garde ses tours) mais ne corrige pas le hang. Follow-up dédié.
- **Harness qui coupe avant la réponse a/b/c** : le driver marque « delivered » à la proposition,
  donc le choix de forme n'est jamais capturé en test. Fix harness (continuer le run jusqu'au
  choix + ne marquer « delivered » qu'après la forme livrée). Nécessaire pour VOIR la forme
  livrée en QA, mais séparé du produit.

## Critères de succès

1. Un élément à format `static` livre **un fichier image**, rien d'autre — pas de `.html`, pas de
   dossier, pas d'autres formats sur disque.
2. Un élément `video` livre **un `.mp4`**, sans `interactive.html`/`static.png` en byproduct.
3. Un élément `interactive` propose a/b/c, attend, et livre **une seule** forme ; le bundle React
   n'existe que si « code source » a été choisi.
4. Aucun `static.html` a11y auto-produit.
5. `produce.mjs` appelé avec le format unique ne build que ce format (vérifiable : le dossier de
   build ne contient que les artefacts de ce format + un still de revue éphémère).
6. Gate `bun run check` vert ; `judge.md` aligné ; décisions verrouillées mises à jour dans
   `CLAUDE.md` + `CHANGELOG.md`.
