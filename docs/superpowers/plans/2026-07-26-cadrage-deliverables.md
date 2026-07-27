# Plan — CADRAGE multi-livrables (issue #1)

Spec : `docs/superpowers/specs/2026-07-26-cadrage-deliverables-design.md`.
Branche : `feat/cadrage-deliverables`. Runtime **Bun**, tests `bun:test`, **TDD strict** :
le test rouge est écrit ET exécuté (on regarde l'échec) avant l'implémentation.

Baselines à garder vertes :
`cd lib && bun test` → 940 pass / 7 skip / 0 fail · `cd lib && bunx tsc --noEmit` ·
`cd skills/splash && bunx tsc --noEmit` (+ `bun test` 766) · `cd install && bunx tsc --noEmit`.

Un commit par tâche, message en anglais minuscule décrivant le comportement.

---

## T1 — les trois axes dans le vocabulaire, et `print-page` dans la politique

**Rouge** (`lib/core/channel-policy.test.ts`) :
- `channelFor("social","portrait") === "social-vertical"`, `("social","square") === "social-feed"`,
  `("article-web","landscape") === "article-web"`, `("print","page") === "print-page"`.
- `channelFor("social","landscape")` **jette** (fail-closed).
- `destinationOf`/`aspectOf` inversent chaque channel de `ALL_CHANNELS` (round-trip total).
- `allowedFormats("print-page")` === `["static"]` ; `isFormatAllowed("print-page","video")` faux.
- `CHANNEL_POLICY["print-page"].mediaSize` = 2480×1748, et la boîte CSS `mediaSize/2` est entière
  (le chemin static de chart-native halve puis double).
- `needsAspectChoice("social")` vrai · `("article-web")` et `("print")` faux.

**Vert** : `DESTINATIONS`/`MEDIA_ASPECTS` + `print-page` dans `CHANNELS` (vocabulary.ts) ;
entrée `print-page`, `DESTINATION_POLICY`, `channelFor`/`destinationOf`/`aspectOf`/`aspectsFor`/
`needsAspectChoice` (channel-policy.ts).

**Retombées attendues hors lib** (à corriger dans la même tâche, avec justification écrite) :
`skills/splash/tests/channel.test.ts` fige `ALL_CHANNELS` à trois et affirme
`normalizeChannel("print") === "article-web"` — c'est le bug de l'issue, l'alias est repointé sur
`print-page`. `skills/dw-chart/tests/export-aspect.test.ts` itère `ALL_CHANNELS` contre
`EXPORT_SIZES[aspect]` : la garde de dérive n'a de sens que pour les aspects que Datawrapper
exporte, elle est restreinte à ceux-là.

---

## T2 — le livrable sur l'élément, et le channel effectif

**Rouge** (`lib/loop/manifest.test.ts`) :
- Un élément avec `deliverable: {destination:"social", aspect:"square"}` ⇒
  `channelForElement(run, el) === "social-feed"` même si `run.channel === "article-web"`.
- Un élément sans `deliverable` ⇒ `channelForElement === run.channel` (identité legacy).
- `provenanceHash` d'un élément legacy est **inchangé** par rapport au calcul d'avant
  (test de non-régression : hash recalculé sur un manifeste témoin construit à la main).
- Déplacer `deliverable.destination` (ou `aspect`) fait bouger `provenanceHash` ⇒ artefact périmé.
- Deux frères aux destinations différentes ont des `provenanceHash` **différents** à angle égal.

**Vert** : `DeliverableSchema` optionnel sur `RunElementSchema` + `deliverableOf`,
`channelForElement`, `provenanceHash` élargi.

---

## T3 — `confirm-aspect` : la question d'aspect, au bon moment

**Rouge** (`lib/loop/manifest.test.ts`) :
- Élément social **sans** aspect, angle confirmé, offre faite, forme choisie ⇒
  `nextActionsForElement === ["confirm-aspect"]`.
- Le même **avant** le choix de forme ⇒ `["choose-form"]` (l'aspect n'est jamais demandé avant).
- Une fois l'aspect posé ⇒ `["produce"]`.
- Un livrable web ou print n'émet **jamais** `confirm-aspect`.

**Vert** : `NextAction` + branche dans `nextActionsForElement`, placée entre `choose-form` et
`produce`.

---

## T4 — `nextActions` agrège : un lot à moitié fait ne se dit pas fini

**Rouge** (`lib/loop/manifest.test.ts`) :
- Run à deux éléments, e1 produit et frais, e2 sans angle ⇒ `nextActions === ["confirm-angle"]`
  (aujourd'hui : `["show"]` — le bug).
- Tous les éléments à `show` ⇒ `["show"]`.
- Run mono-élément : chaque état rend exactement ce qu'il rendait (non-régression).
- `liveElementFor(run)` désigne l'élément dont l'action a été retournée.

**Vert** : boucle d'agrégation dans `nextActions`, `liveElementFor`, `driver.ts` avance l'élément
désigné (et le remplace au bon index).

---

## T5 — planifier plusieurs livrables (les 5 combinaisons de l'issue)

**Rouge** (`lib/loop/deliverables.test.ts`, neuf) :
- web-only · video-only · web+video · social+web · print+web : chaque plan produit le bon nombre
  d'éléments, les bonnes destinations, les bons `requestedFormat`.
- video-only ⇒ **aucun** élément web-static (« bypass web production »).
- web+video ⇒ le web est **premier** (master éditorial).
- Le même choix demandé deux fois ⇒ un seul livrable (« never silently duplicate »).
- Un plan vide est refusé (`invalid-request`), pas silencieusement ignoré.
- Les frères partagent le `confirmedTakeaway` de la racine et **ne partagent ni proposal ni
  artifact**.
- `confirmAspect(el, "portrait")` refuse un aspect illégal pour la destination.
- `deliverablePlan(run)` liste **chaque** livrable demandé avec son gate (le « final report »).

**Vert** : `lib/loop/deliverables.ts`.

---

## T6 — un format ne peut pas hériter d'un channel incompatible

**Rouge** (`lib/loop/manifest.test.ts`) :
- `writeManifest` **jette** sur un élément `deliverable: {destination:"print"}` dont l'option
  choisie a `format: "interactive"`.
- `deliverableOf` pointant sur un id inexistant ⇒ jette.
- Un manifeste legacy (sans `deliverable`) n'est **jamais** soumis à cette vérification.

**Vert** : deux invariants dans `assertInvariants`, portés uniquement par les lignes qui
déclarent un livrable.

---

## T7 — produce/propose au channel du livrable, print livré en fichier

**Rouge** :
- `lib/loop/produce.test.ts` : un livrable social sans aspect ⇒ `invalid-request` nommant
  l'aspect (jamais un rendu deviné).
- `lib/loop/propose.test.ts` : l'offre d'un élément print ne contient que du `static`, et exclut
  dw-chart avec sa raison.
- `lib/brain/eligibility.test.ts` : `channel: "print-page"` exclut dw-chart/map-dw, garde les
  moteurs natifs.
- `lib/delivery/routing.test.ts` : `defaultDestinationsFor(f, ready, "print")` renvoie `["zip"]`
  pour tout format, y compris quand un hôte est prêt.

**Vert** : `produce.ts` (`channelForElement` + refus d'aspect), `propose.ts` (channel par
élément), `eligibility.ts` (exclusion print/DW), `routing.ts` (+ passage de la destination depuis
`request-delivery.ts`).

---

## T8 — la migration rend explicite ce qui était implicite

**Rouge** (`lib/loop/migrate.test.ts`) :
- `materializeDeliverables` sur un run v4 `channel: "social-vertical"` pose
  `{destination:"social", aspect:"portrait"}` sur chaque élément, **sans changer** un seul
  `provenanceHash` ni un seul `channelForElement`.
- Une chaîne v1→v4 puis matérialisation aboutit à `article-web`/`landscape`.
- Un élément portant déjà un `deliverable` n'est pas écrasé.

**Vert** : `materializeDeliverables` dans `migrate.ts` (non gaté sur `schemaVersion`, motif
`dropLegacyElementsDelivery`).

---

## T9 — le rapport nomme chaque livrable

**Rouge** (`lib/loop/resume.test.ts`) : chaque ligne d'élément porte sa destination et son aspect
quand ils existent ; un run legacy garde exactement la forme de rapport d'avant.

**Vert** : champs additifs dans `resumeReport`.

---

## T10 — preuve sur un run réel (opt-in, exécutée une fois)

`lib/loop/multi-deliverable-e2e.test.ts`, gardé par `SPLASH_E2E_DELIVERABLES=1` (`test.skipIf`) :
un run réel, données gelées, **deux livrables** (web + social), poussés par `advanceStep` en
boucle jusqu'à ce que `nextActions` dise `show` — avec les vrais moteurs, deux artefacts sur
disque, dimensions lues dans le PNG et comparées à `renderSize(channel)` de chaque livrable.

Mesures reportées ci-dessous après exécution.

---

## Vérification finale

`cd lib && bun test` · `cd lib && bunx tsc --noEmit` · `cd skills/splash && bunx tsc --noEmit` ·
`cd skills/splash && bun test` · `cd install && bunx tsc --noEmit` · le e2e opt-in une fois.

---

## Résultat mesuré (T10)

`SPLASH_E2E_DELIVERABLES=1 bun test loop/multi-deliverable-e2e.test.ts` — **1 pass / 0 fail**,
20,2 s, moteurs réels (chart-native, Vite + Chromium), trois PNG sur disque :

```
[deliverables-e2e] /var/folders/.../loop-deliverables-e2e-l9O0Pk
  e1:    article-web → article-web  {"width":1200,"height":676}   elements/e1/static.png
  e1-d2: social      → social-vertical {"width":1080,"height":1920} elements/e1-d2/static.png
  e1-d3: print       → print-page   {"width":2480,"height":1748}  elements/e1-d3/static.png
```

Ce que le run prouve, au-delà des unitaires :

- **Trois livrables, un seul takeaway confirmé** (`new Set(takeaways).size === 1`), trois
  géométries distinctes — aucun artefact réutilisé d'un livrable à l'autre.
- **`nextActions` ne dit `show`** qu'une fois les trois produits (assertion finale du test).
- **`confirm-aspect` s'est déclenché une seule fois**, sur le livrable social, **après** son
  choix de forme : le driver ne l'a jamais demandé pour le web ni pour le print.
- **Le print REND vraiment** : 2480×1748 = A5 paysage à 300 dpi. **Vérifié à l'œil sur le PNG**
  (pas seulement à l'IHDR) — barres horizontales, titre, sous-titre unité, value-labels, ligne
  de source, mise en page saine à densité doublée. Idem pour le 1080×1920 social.
- 1200×676 pour l'article-web = le 1px de l'arrondi CSS connu (hauteur impaire 675), dans la
  tolérance ±2 px que `assertRenderedSize` applique déjà.

Détail utile : le premier jet du test utilisait des données cantonales et le cerveau a classé
des formes **carto** en tête (`hex-grid, choropleth, cartogram`) — non constructibles par la
boucle, le run bloquait sur l'offre. Données non géographiques, et le run passe. Ce n'est pas un
défaut de cette tranche (map-native n'est pas encore dans `LOOP_BUILDABLE_ENGINES`), mais ça
mérite d'être noté : un run print sur des données géo n'a **rien** à choisir aujourd'hui.

---

## Risques assumés

1. **`schemaVersion` reste 4 alors que le schéma a grandi.**
   *Arbitrage :* les champs neufs sont optionnels et additifs, donc un manifeste v4 d'avant
   parse et signifie exactement la même chose (`channelForElement → run.channel`) — il n'y a
   aucune ambiguïté de lecture à lever. Le bump est bloqué par 27 fichiers écrivant
   `schemaVersion: 4` en dur, dont trois zones interdites à cette tranche (`lib/host`,
   `lib/verify`, `lib/source`). À faire par la tranche qui possède ces fichiers. **Accepté.**

2. **`run.channel` survit à côté de `elements[].deliverable` — deux endroits où « où ça va »
   peut être écrit.**
   *Arbitrage :* une seule LECTURE existe (`channelForElement`), et `run.channel` y a un rôle
   nommé (le défaut d'un élément qui ne déclare rien). La drift possible est donc décorative,
   pas sémantique. La supprimer imposerait de rendre `deliverable` obligatoire → migration
   dure → bump de version → risque 1. **Accepté, avec la lecture unique comme garde.**

3. **Un `revise` du takeaway sur un frère le fait diverger de son master, silencieusement au
   niveau du manifeste.**
   *Arbitrage :* `deliverablePlan()` **rapporte** la divergence (`takeawayDrift`) au lieu de la
   refuser. Un invariant d'égalité aurait fait **jeter `writeManifest`** après un `revise`
   parfaitement légitime, échouant un run au lieu de le signaler — et `revise.ts` ne connaît
   que l'élément, pas ses frères. Propagation = suite. **Signalé, pas gardé.**

4. **La façade host (`lib/host/drive.ts`) vise toujours `elements[0]` pour `choose-form` et
   `request-delivery`.**
   *Arbitrage :* `next`/`advance` sont cohérents (ils passent par `nextActions`/`advanceStep`,
   tous deux multi-livrables désormais), mais les deux commandes de décision décideraient pour
   le mauvais livrable sur un run à plusieurs. `lib/host/**` est hors périmètre de cette
   tranche. **Trou réel, nommé, non refermé** — première chose à faire dans la suite.

5. **Le défaut print est une seule boîte (A5 paysage 300 dpi) que personne n'a validée avec un
   imprimeur.**
   *Arbitrage :* c'est un défaut *raisonné* (encart de presse large, 1,42:1, densité vraie),
   pas un chiffre au hasard, et il est render-prouvé. Mais « print-safe » ≠ « press-ready » :
   RGB, PNG, pas de fond perdu, pas de CMYK. La spec §5 le dit au lieu de le laisser croire.
   **Accepté et écrit.**

6. **Un run print sur des données géographiques n'a rien à choisir.**
   *Arbitrage :* conséquence de `LOOP_BUILDABLE_ENGINES = ["chart-native"]`, pas de cette
   tranche — et le refus est **loud** (le cerveau marque les formes non constructibles, et
   `chooseForm` refuse). Rien à corriger ici, mais c'est ce que rencontrera le premier vrai
   article carto+print. **Constaté au run réel, reporté.**

7. **`normalizeChannel("print")` a changé de réponse** (`article-web` → `print-page`).
   *Arbitrage :* c'est le bug de l'issue, pas une régression : l'ancienne réponse répondait à
   une demande d'impression par un PNG écran 72 dpi. Un appelant qui écrivait « print » en
   voulant dire « web » recevra désormais une boîte print — mais ce n'est pas ce qu'il a écrit.
   Test `skills/splash/tests/channel.test.ts` mis à jour avec la raison. **Changement voulu.**

8. **Trois fichiers hors du périmètre annoncé ont été touchés** :
   `skills/splash/src/channel.ts` (alias print), `skills/splash/tests/channel.test.ts` et
   `skills/dw-chart/{src/export-aspect.ts,tests/export-aspect.test.ts}` (Datawrapper refuse le
   channel print par son nom au lieu de caster sur une boîte inexistante).
   *Arbitrage :* aucun n'est dans la liste interdite, aucun n'est le fichier partagé avec
   l'autre agent, et les laisser tels quels signifiait soit un test rouge, soit un `TypeError`
   sur `box.width`. **Assumé, chacun commenté sur place.**

9. **La destination et l'aspect ne sont pas hachés dans `provenanceHash`** (seul le channel
   effectif l'est).
   *Arbitrage :* la correspondance channel ↔ (destination, aspect) est une bijection tenue par
   un test de round-trip sur `ALL_CHANNELS`. Si un jour deux couples partageaient un channel,
   la provenance cesserait de les distinguer. Le garde-fou est ce test ; **il doit rester**.
   **Accepté, dépendance nommée.**
