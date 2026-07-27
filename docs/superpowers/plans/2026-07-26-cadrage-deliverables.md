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

_Rempli à l'exécution._

---

## Risques assumés

_Rempli à l'auto-revue._
