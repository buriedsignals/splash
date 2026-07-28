# Proposal-cerveau — résidus parqués (2026-07-25)

> Chantier : `feat/proposal-brain`, 47 commits off `feat/delivery-s3`.
> Spec `docs/superpowers/specs/2026-07-25-proposal-brain-design.md` · plan
> `docs/superpowers/plans/2026-07-25-proposal-brain.md`.
> Tout ce qui suit a été **trouvé, jugé et délibérément différé** — rien n'est un oubli.
> Chaque ligne dit ce que c'est, pourquoi ça a été laissé, et ce que ça coûterait de fermer.

## À trancher par Rémy (décisions produit, pas des correctifs)

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

- **La vidéo est structurellement inoffrable.** `rank.ts`'s `FORMAT_ORDER` classe
  `interactive < static < video < scrolly`, et `offer.ts` ne garde qu'une ligne par forme : sur
  `article-web` toute option sort en `interactive`, sur les canaux sociaux en `static`. Vérifié sur
  tous les canaux et toutes les intentions : `video` n'apparaît jamais. De plus, rien ne fait
  remonter une **demande de format explicite du journaliste** jusqu'à `buildOffer` — ce qui perd la
  règle verrouillée Wave 7 (« signal de format explicite GAGNE sur `interactiveDefault` »). Les
  motion graphics sont une promesse publique de la page FJM : ça mérite une décision, pas un
  correctif silencieux.
- **La carte-scrolly est inoffrable par construction.** `map-native` ne déclare pas le format
  `scrolly` et le producteur `scrolly` n'enregistre aucun type (par design : c'est un mécanisme,
  pas un moteur pair). Pourtant `dot-density.md` liste interactive-scrolly et video-scrolly comme
  livrés, et la page publique promet du map-scrolly live. Le modèle de facettes doit trancher.
- ~~**Les publishers servent tout artefact comme du HTML.**~~ **Fermé** (branche
  `feat/proposal-brain`, commit « fix(delivery): a publisher serves the artifact's real format,
  not always html »). `PublishRequest` porte désormais `format: VisualFormat`, résolu par
  `deliver.ts` depuis le MÊME `proposal.chosenId` que `produce.ts` lit (`chosenOption`,
  `lib/loop/manifest.ts`) — refus explicite plutôt que défaut silencieux si aucune option n'est
  résolvable. Les trois adapters branchent sur un mapping partagé unique
  (`artifactMediaFor`, `lib/core/publishers.ts`) : `zip.ts` archive sous `index.<ext>`, `s3.ts`
  upload `<id>.<ext>` avec le bon content-type, `cloudflare-pages.ts` stage `index.<ext>`.
  ~~**Résidu cloudflare-pages** (documenté en commentaire à l'appel de `verifyServed`) :
  Cloudflare Pages ne résout `index.html` qu'à la racine de l'alias — un artefact non-HTML est
  staged avec la bonne extension et le bon content-type, mais l'URL retournée par cet adapter ne
  l'adresse pas encore. zip et s3 sont pleinement corrigés ; cloudflare-pages est partiel.~~
  **Fermé autrement** (spec `docs/superpowers/specs/2026-07-26-delivery-genre-routing-design.md`,
  branche `feat/delivery-genre-routing`) : l'adressage n'a pas été câblé — le résidu a été retiré
  par construction plutôt que fermé par un `${url}/index.png`. L'hébergement est devenu une
  propriété du FORMAT (`deliveryGenreFor`, `lib/core/publishers.ts`) : `static`/`video` sont le
  genre `file` (jamais hébergés — toujours routés vers le paquet zip portable par défaut,
  `lib/delivery/routing.ts`), `interactive`/`scrolly` le genre `embed`. `Publisher.serves`
  déclare que `embed-cloudflare` ne sert que l'embed, et `lib/loop/deliver.ts` refuse une
  destination qui ne sert pas le format AVANT tout I/O. Un artefact non-HTML ne peut donc plus
  atteindre l'appel `verifyServed` de `cloudflare-pages.ts` — l'adressage `${url}/${stagedName}`
  reste vrai mais devient hors-scope (commentaire mis à jour sur place).

## Correctness — réels, non bloquants

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

- **Aucun événement lors du refus d'une forme non constructible.** Choisir une forme marquée
  renvoie à `choose-form` (cf. spec §8) et `advance()` est un no-op total — mais rien n'est écrit,
  donc un manifeste relu après coup montre `chosen → choose-form` sans trace du refus. Fermer = un
  `RunEvent`, ou faire imprimer `readiness.reason` de l'option choisie par `resume`.
- **`assertInvariants` n'exige pas un `why` non vide sur l'option choisie.** Le seam de rédaction
  est tenu par `applyPhrasing` (qui refuse un `why` vide) et par le contrat de `SKILL.md`, mais un
  appelant qui écrit le manifeste directement passe à côté. Fermer = une ligne dans
  `assertInvariants`.
- **`run.route` n'a plus aucun lecteur de production.** Volontaire : `eligibility.ts` ne le lit plus
  (c'est le correctif I2 — la marque porte sur l'existence de la branche, pas sur la route
  demandée). Le champ reste de l'état parqué honnête pour la branche article (spec §8). À câbler
  quand le spec 2 atterrit, sinon il se lira comme une config vivante qui ne change rien.
- **Le couplage schéma ↔ vérificateur de `limits` n'est tenu que par un commentaire.** Une clé
  ajoutée au `z.strictObject` sans l'être à `limitFailure` dégraderait en silence (le sens inverse
  est fermé et testé). Fermer = dériver l'un de l'autre.
- **Une forme peut être offerte au rang 1 et refusée au rendu par une garde de conformité**
  (préexistant, grain « spec » et non grain « moteur ») : `bump` échoue le contraste L0 sur
  certaines données, `fan` jette `ShapeMismatch` sur un axe x non numérique. La promesse « rien
  d'offert que la production ne sache construire » tient au grain du MOTEUR, pas de la SPEC.
- **Les cartes sont légales sur des données sans géographie.** `limitFailure` ne teste que
  points/séries/lignes et `Facts` ne porte aucun prédicat géographique — donc une intention
  `spatial` plus un compte de lignes qui colle offre un choroplèthe pour n'importe quel CSV. C'est
  ce qui rend la section « Map element type FIRST » de `suggest-chart/SKILL.md` encore porteuse
  (elle a été délibérément conservée pour ça).
- **`facts.series === rowCount`**, donc `maxSeries` et `maxCategories` sont aujourd'hui le même
  test, et la raison d'exclusion peut être trompeuse sur un CSV long/tidy.
- **`propose` lit `m.elements[0]` pendant que `driver` passe `live`** — identique aujourd'hui, mais
  deux sources pour « l'élément vivant ».

## Hygiène KB / cosmétique

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

- `bar.md` énonce deux fois son plafond de catégories (`limits.maxCategories: 25` et « ~20-25 » en
  prose) · `boxplot.md` omet un « n≈5 » jugé illustratif · `streamgraph.md` se contredit (5-10 vs
  ≤7) · `chord.md` clé son plafond d'entités en `maxCategories` là où `radar.md` utilise
  `maxSeries` (les deux types sont déférés) · `radar`/`parallel` ont des planchers d'axes
  (`< 3` rejeté par la conformance) **inexprimables** dans le vocabulaire fermé de `limits` — même
  trou que la clé typo, à fermer ensemble · `image-scrolly.md` utilise `> Source:` et un titre
  `## Correctness` là où la famille chart utilise `> Sources:` et `## Correctness "de base"`.
- La raison `deferred` de `d3-bars-split` est honnêtement hedgée : appartenance de famille vérifiée,
  distinction visuelle exacte d'avec `d3-bars-grouped` non vérifiable sans accès Datawrapper live.
- Aucun test ne conduit `video`/`scrolly` de bout en bout à travers `produce()` — voir aussi le
  point « la vidéo est inoffrable » ci-dessus : le trou est plus large qu'un test manquant.
- Le test d'acceptation ne conduit jamais une option réellement **marquée** jusqu'au rendu (la
  couverture unitaire existe dans `verify-offer.test.ts` et `phrase.test.ts`).
- `whySource.sheet` deviendrait ambigu si un second hôte chargeait une KB depuis une racine hors
  dépôt (deux racines de même layout émettraient la même chaîne). Inerte tant qu'il n'y a qu'un
  hôte.
