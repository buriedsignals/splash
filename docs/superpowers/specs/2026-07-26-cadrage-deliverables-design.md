# CADRAGE multi-livrables — destination × format × aspect (issue #1)

> Statut : spec de tranche. Couvre l'issue GitHub #1 « Redesign CADRAGE format selection for web,
> video, social, and print ». Prose française, identifiants anglais.
> Ledger-parapluie : `docs/superpowers/specs/2026-07-24-shell-and-desk-journey-design.md` §4
> (la ligne « CADRAGE multi-livrables » y est ajoutée par cette tranche — l'issue #1 n'avait
> aucun chez-soi jusqu'ici).

---

## 1. Le problème (mesuré, pas supposé)

CADRAGE Q3 demande « où ce visuel va-t-il paraître ? » en **choix unique**, **trop tôt**, et
la réponse est un `channel` qui **soude trois questions différentes** :

| Ce que `channel` encode aujourd'hui | destination | aspect | formats permis |
|---|---|---|---|
| `social-vertical` | social | portrait | static, video |
| `social-feed` | social | square | static, video |
| `article-web` | web | landscape (+responsive) | static, interactive, video, scrolly |

Trois conséquences vérifiées dans le code :

1. **Un seul livrable par run.** `lib/loop/manifest.ts:132` — `channel: z.enum(CHANNEL_KEYS)`,
   au niveau du RUN. `produce.ts:82` rend AU channel du run, `propose.ts:20` offre DANS ce
   channel, `provenanceHash` le scelle. Web **et** vidéo — le cas courant — est inexprimable.
2. **`print` n'existe pas.** `ALL_CHANNELS` = exactement trois clés. Pire : le mot « print » est
   déjà dans la table d'alias (`skills/splash/src/channel.ts`, `CHANNEL_KEYWORDS`) et **résout
   vers `article-web`**. Un journaliste qui dit « print » reçoit un PNG 1200×675 à 72 dpi,
   silencieusement. C'est le degré zéro de la dégradation silencieuse.
3. **L'aspect est demandé avant le concept.** Choisir `social-vertical` vs `social-feed` à Q3,
   c'est trancher 9:16 vs 1:1 avant même de savoir quel visuel raconte l'histoire.

Et un quatrième, structurel, que l'issue ne nomme pas mais qui la bloque : `nextActions(run)`
(`manifest.ts:301`) ne lit que `run.elements[0]`. Même si le manifeste portait plusieurs
livrables, un run dont le 1ᵉʳ élément est produit et le 2ᵈ pas encore répondrait **`["show"]`** —
« terminé ». Un modèle multi-livrables posé sur cette fonction livrerait un run à moitié fait en
le déclarant fini. C'est le critère d'acceptation « No requested output is silently dropped »,
et il se joue là, pas dans le schéma.

---

## 2. Le modèle cible

### 2.1 Les trois axes, dé-soudés

```
Destination  = "article-web" | "social" | "print"     ← OÙ ça atterrit
VisualFormat = static | interactive | video | scrolly ← CE QUE c'est   (inchangé)
MediaAspect  = portrait | square | landscape | page   ← QUELLE FORME ça a
```

`Channel` **ne disparaît pas** : il devient la **clé de rendu dérivée** du couple
`(destination, aspect)` — ce que les producteurs (`SPLASH_CHANNEL`), `lib/verify/viewport.ts` et
`assertRenderedSize` consomment déjà. La soudure n'est plus *choisie*, elle est *calculée* :

```
channelFor("social",      "portrait")  → "social-vertical"
channelFor("social",      "square")    → "social-feed"
channelFor("article-web", "landscape") → "article-web"
channelFor("print",       "page")      → "print-page"      ← neuf
```

et l'inverse, `destinationOf(channel)` / `aspectOf(channel)`, décompose. `channelFor` **jette**
sur un couple illégal (fail-closed : c'est la discipline de `normalizeChannel`, jamais élargir
silencieusement un jeu de formats permis).

**Pourquoi garder `Channel` plutôt que le supprimer.** Il est lu par `lib/verify/**` (interdit à
cette tranche), par les quatre `produce.mjs` des moteurs, par `lib/host/capabilities.ts`, par
`lib/core/verbs/exec.ts`. Le remplacer partout serait un refactor transverse sans rapport avec ce
que l'issue demande. Le dé-souder **à la source** (la décision) et le *dériver* pour le rendu
donne exactement le bénéfice demandé — « destination, format et aspect ne sont plus conflatés là
où le journaliste répond » — sans toucher une ligne de la couche rendu.

### 2.2 `print`, première classe

Nouvelle entrée totale dans `CHANNEL_POLICY` :

```ts
"print-page": {
  aspect: "page",
  mediaSize: { width: 2480, height: 1748 },   // A5 paysage @ 300 dpi (210 × 148 mm)
  allowedFormats: ["static"],
  interactiveDefault: false,
}
```

Trois décisions, chacune avec son pourquoi :

- **`allowedFormats: ["static"]`.** Une page imprimée ne survole pas et ne joue pas. C'est le
  garde-fou mécanique du « If print is selected, require a static, print-safe output » de
  l'issue : il n'y a rien à discipliner en prose, `isFormatAllowed("print-page", "video")` est
  `false` et `eligible()` exclut avec sa raison.
- **`aspect: "page"`, valeur neuve.** Pas `"landscape"` : `skills/dw-chart/src/export-aspect.ts`
  indexe `EXPORT_SIZES` par aspect, et réutiliser `landscape` ferait pointer une boîte 1200×675
  écran sur un livrable 300 dpi. Un aspect distinct rend l'incompatibilité *typée* au lieu
  d'inférée.
- **2480×1748 = A5 paysage à 300 dpi.** « Print-safe » n'est pas un mot, c'est une densité.
  Le chemin static de chart-native rend une boîte CSS `mediaSize / 2` capturée à
  `deviceScaleFactor: 2` (`skills/chart-native/vite.config.ts:44-52`) : la boîte CSS vaut donc
  1240×874 — une mise en page normale — et le PNG sort à 2480×1748, soit **300 dpi réels**. Même
  layout, densité doublée : c'est précisément ce que l'impression demande. A5 paysage plutôt
  qu'A4 portrait parce qu'un graphique de presse est un encart large, pas une pleine page
  verticale ; le ratio 1,42:1 est proche de la forme naturelle d'un chart.

**Livraison.** `lib/delivery/routing.ts` encode déjà « l'hébergement est une propriété du
format » (`deliveryGenreFor(format) === "file"` ⇒ paquet portable). `static` est déjà de genre
`file`, donc print y tombe correctement *par accident du format*. On rend la règle **explicite**
et indépendante du format : `defaultDestinationsFor(format, readyIds, destination?)` renvoie
`PORTABLE_PACKAGE` dès que `destination === "print"`. Un livrable print est un fichier, jamais un
embed — y compris le jour où un format non-`file` deviendrait imprimable.

**Datawrapper est exclu du print** dans `eligibility.ts`, sur le même modèle que l'exclusion
fond-sombre déjà présente : le chemin d'export dw-chart n'a que ses trois boîtes écran
(portrait/square/landscape), il n'a pas d'export à densité d'impression. Raison lisible, exclusion
mécanique, aucune promesse qui casserait au produce.

### 2.3 Le porteur : `elements[]`, pas un tableau parallèle

Un **livrable** = un élément portant un bloc `deliverable`.

```ts
RunElement.deliverable?: {
  destination: Destination;
  aspect?: MediaAspect;        // DIFFÉRÉ — absent tant qu'on ne l'a pas demandé
}
RunElement.deliverableOf?: string   // l'élément-racine dont ce livrable est un frère
```

**Pourquoi `elements[]` et pas `run.deliverables[]`.** Un livrable a besoin, chacun pour soi, de :
une offre, un format épinglé, un artefact, un hash de provenance, une review, une livraison, un
état de gate, un blocage. `RunElement` porte **exactement** ces huit champs, avec leurs invariants
déjà écrits et testés. Un tableau parallèle au niveau du run signifierait dupliquer tout ce cycle
de vie — ou pire, le laisser à moitié : un `deliverables[]` sans `review` ni `delivery` serait un
livrable de seconde zone. La question posée était « elements[] est-il le bon porteur ? » : oui,
parce que la seule chose qui manquait à un élément pour ÊTRE un livrable, c'est de savoir où il va.

**Ce qui distingue deux frères d'un simple second élément** : `deliverableOf`. Deux éléments non
liés = deux visuels différents (deux angles). Deux frères = **le même takeaway confirmé**, deux
destinations. `planDeliverables()` copie l'angle de la racine vers chaque frère au moment du plan,
ce qui réalise le « tied to the same confirmed takeaway » de l'issue.

**Ce qui empêche l'héritage de format incompatible** : les frères partagent l'angle et **rien
d'autre**. Aucune `proposal`, aucun `chosenId`, aucun `artifact` n'est copié — chaque frère
repasse par le cerveau *à son propre channel*. Et l'invariant `assertInvariants` refuse d'écrire
un manifeste où un élément porteur de `deliverable` a épinglé un format que son propre channel
n'autorise pas. Le critère « one output cannot inherit an incompatible format from another » est
donc gardé mécaniquement à l'écriture, pas seulement au produce.

### 2.4 L'aspect différé — un vrai gate, `confirm-aspect`

`deliverable.aspect` est **optionnel**. La politique par destination dit s'il faut le demander :

| Destination | aspects légaux | défaut | demande-t-on ? |
|---|---|---|---|
| `article-web` | landscape | landscape | non — un seul choix, rien à demander |
| `social` | portrait, square | — | **oui** : Stories 9:16 ou feed 1:1, ça change le visuel |
| `print` | page | page | non — la taille/orientation fine est différée (§5) |

D'où une `NextAction` neuve : **`confirm-aspect`**, émise par `nextActionsForElement` **après**
`choose-form` et **avant** `produce`. C'est la traduction mécanique du critère d'acceptation
« Aspect ratio questions occur only on branches that require them and after the editorial format
is chosen » : la position dans la chaîne d'états *est* la règle, il n'y a pas de prose à obéir.

`produce()` refuse en `invalid-request` un livrable social sans aspect — défense en profondeur :
même appelé hors du driver, il ne peut pas deviner 9:16 ou 1:1.

### 2.5 `nextActions` : plus un run à moitié fait qui se dit fini

```
nextActions(run) =
  gates de run (orient, off-ramp honnête)
  puis : la 1ʳᵉ action non-terminale du PREMIER élément qui en a une
  sinon : l'état terminal (["show"] ou [])
```

Pour un run mono-élément, **strictement identique** à aujourd'hui. Pour un run multi-livrables,
`["show"]` ne sort que quand **tous** les livrables y sont. `driver.ts` avance l'élément que
`nextActions` a désigné (`liveElementFor(run)`), plus `elements[0]` en dur — sinon le driver
tournerait à vide sur un élément déjà fini pendant que `nextActions` réclame l'autre.

`gateStateOf` reste **par élément** (il l'était déjà, c'est le bon grain) ; `deliverablePlan(run)`
ajoute la lecture d'ensemble : une ligne par livrable — destination, aspect, format, gate,
takeaway — c'est le « final report » du critère d'acceptation.

### 2.6 Provenance : élargie, jamais affaiblie

`provenanceHash` scelle aujourd'hui `{inputData, inputArticle, cadrage, angle, chosenId,
channel, format}`. Une seule clé change de **valeur** :

```ts
channel: channelForElement(run, el),   // le channel EFFECTIF du livrable, plus run.channel
```

**La destination et l'aspect ne sont PAS hachés à côté** — et c'est une décision, pas un oubli.
Premier jet : les ajouter comme deux clés supplémentaires. Le test de migration (T8) l'a réfuté
en rouge : un channel **EST** un couple (destination, aspect), la correspondance est une
bijection (le test de round-trip de `channel-policy.test.ts` la tient telle quelle), donc les
deux clés n'ajoutent **aucune** discrimination — mais elles coûtent la propriété qui rend la
migration honnête. Rendre explicite la destination qu'un run avait déjà
(`materializeDeliverables`) faisait bouger le hash et renvoyait **tous** les artefacts déjà
produits au produce. Le channel effectif suffit.

Trois propriétés, toutes vérifiées par test :

- **Jamais plus faible.** Tout ce qui était haché l'est encore, et le channel est maintenant
  résolu **par élément** — plus fin qu'avant, jamais plus grossier.
- **Une ligne legacy garde son hash à l'octet près** (`channelForElement` vaut `run.channel`).
  Aucun artefact déjà sur disque ne devient périmé du fait de cette tranche.
- **Déplacer la destination ou l'aspect périme l'artefact**, parce que le channel effectif bouge
  avec eux.

### 2.7 Migration : additive, et la normalisation en dehors du numéro de version

**`schemaVersion` reste 4.** Ce n'est pas de la paresse, c'est une contrainte mesurée : 27
fichiers écrivent `schemaVersion: 4` en dur, dont `lib/host/*.test.ts`, `lib/verify/*.test.ts` et
`lib/source/*.test.ts` — trois zones interdites à cette tranche. Un `z.literal(5)` les casserait
toutes sans qu'on ait le droit de les corriger. Les champs neufs sont donc **optionnels et
purement additifs**, ce qui rend la migration **l'identité par construction** : un manifeste v4
sans `deliverable` se lit avec `channelForElement → run.channel`, c'est-à-dire *exactement* ce
qu'il voulait dire avant. Rien ne « parse mais signifie autre chose ».

Le manque, c'est qu'un vieux manifeste reste implicite. `migrate.ts` a déjà le motif pour ça :
`dropLegacyElementsDelivery` y est documenté comme **non gaté sur `schemaVersion`** — « une
correction gatée sur la version ne tournerait jamais pour les manifestes v4 sur disque qui
portent le danger ». On suit ce motif : `materializeDeliverables(run)` rend explicite le bloc
`deliverable` de chaque élément à partir de `run.channel`, exporté depuis `migrate.ts`, appelé
par le rédacteur de plan — jamais imposé silencieusement à la lecture (une réécriture au
`readManifest` ferait diverger un rapport avant/après relecture, ce que
`lib/loop/acceptance.test.ts` vérifie précisément).

`run.channel` survit donc, avec un rôle **redéfini et documenté** : la destination **par défaut**
d'un élément qui n'en déclare pas. Une seule source de vérité par élément —
`channelForElement()` — jamais deux lectures concurrentes.

---

## 3. Le flux CADRAGE re-conçu (les 3 étapes de l'issue)

**Étape 1 — multi-select.** Quatre choix journalistes : `web` · `video` · `social` · `print`.
`deliverableRequestFrom(choice)` les traduit en requêtes typées :

| choix | destination | requestedFormat | aspect |
|---|---|---|---|
| `web` | article-web | — (le cerveau propose) | landscape |
| `video` | article-web | `video` | landscape |
| `social` | social | — | **différé** |
| `print` | print | `static` | page |

**Étape 2 — chemin de production.** `planDeliverables()` ordonne le web en tête (« si le web est
demandé, il est le master éditorial »), dédoublonne (« never silently duplicate »), et refuse un
plan vide. Un run vidéo-seule n'a aucun élément web : « Video-only requests bypass web
production » n'est pas une règle à respecter, c'est l'absence d'une ligne.

**Étape 3 — dimensions différées.** `confirm-aspect` (§2.4), après le choix de forme.

---

## 4. Ce que la tranche livre

- `lib/core/vocabulary.ts` — `DESTINATIONS`/`Destination`, `MEDIA_ASPECTS`/`MediaAspect`,
  `print-page` dans `CHANNELS`.
- `lib/core/channel-policy.ts` — entrée `print-page`, `DESTINATION_POLICY`, `channelFor`,
  `destinationOf`, `aspectOf`, `aspectsFor`, `needsAspectChoice`.
- `lib/loop/manifest.ts` — `deliverable`/`deliverableOf` sur l'élément, `channelForElement`,
  `provenanceHash` élargi, `confirm-aspect`, `nextActions` agrégeant, `liveElementFor`,
  invariants (intégrité référentielle des frères, format légal au channel du livrable).
- `lib/loop/deliverables.ts` *(neuf)* — `deliverableRequestFrom`, `planDeliverables`,
  `confirmAspect`, `deliverablePlan`.
- `lib/loop/migrate.ts` — `materializeDeliverables`.
- `lib/loop/produce.ts` — rend au channel **du livrable**, refuse un aspect non résolu.
- `lib/loop/driver.ts` — avance l'élément désigné.
- `lib/loop/propose.ts` — offre au channel du livrable.
- `lib/brain/eligibility.ts` — exclusion Datawrapper sur print.
- `lib/delivery/routing.ts` — print ⇒ paquet portable, quel que soit le format.
- `lib/loop/resume.ts` — le rapport nomme la destination/l'aspect de chaque livrable.

---

## 5. Explicitement différé (et pourquoi)

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

| Différé | Raison |
|---|---|
| **Taille/orientation print fines** (A4/A3, portrait, gouttière colonne) | L'issue dit « collect print size/orientation later on the print branch ». La tranche livre **une** boîte par défaut à 300 dpi et le point d'accroche (`aspect: "page"` + `DESTINATION_POLICY.print`). Ajouter `print-a4-portrait` etc. = des entrées `CHANNEL_POLICY` de plus, aucun changement de modèle. |
| **CMYK, fonds perdus, PDF vectoriel** | Le pipeline rend du PNG RGB via Chromium. Passer en CMYK/PDF est un travail de moteur (chaîne d'export), pas de modèle de livrable. Un PNG 300 dpi est *print-safe*, pas *press-ready* — la spec le dit plutôt que de le laisser croire. |
| **Dériver la vidéo de la version web** (issue, étape 2 « derive ») | Chaque livrable repasse par le cerveau à son propre channel. « Dériver » suppose un concept de transformation (réutiliser la géométrie choisie en changeant l'aspect) qui n'existe nulle part dans le code. Router indépendamment est **honnête** : on ne prétend pas dériver. Coût : un journaliste choisit sa forme deux fois. |
| **Façade host multi-élément** | `lib/host/drive.ts` a son propre `liveElement()` figé sur `elements[0]`, et `lib/host/**` est hors périmètre. `next`/`advance` restent donc cohérents (ils passent par `nextActions`/`advanceStep`), mais `choose-form`/`request-delivery` via la CLI host ne visent que le 1ᵉʳ élément. Suite immédiate. |
| **Bump `schemaVersion` → 5** | §2.7 : bloqué par des fixtures en zone interdite. À faire par la tranche qui possède ces fichiers. |
| **Print via Datawrapper** | Exclu avec raison ; ouvrir demanderait une boîte d'export à densité côté dw-chart. |
| **Propagation d'un `revise` de takeaway aux frères** | §7. |

---

## 6. Tests (la preuve)

Couverture exigée par l'issue — web-only · video-only · web+video · social+web · print :
`lib/loop/deliverables.test.ts` les couvre tous les cinq de bout en bout au niveau plan+états, et
`lib/loop/multi-deliverable-e2e.test.ts` en pousse **un** (web static + social vidéo… voir §8)
jusqu'à des artefacts réellement rendus.

La preuve réelle est **opt-in** (`SPLASH_E2E_DELIVERABLES=1`) : elle lance deux rendus complets
via les vrais moteurs (plusieurs minutes, réseau, Chromium). Elle a été exécutée une fois, son
résultat mesuré est reporté dans le plan.

---

## 7. Risques assumés

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

Voir la section homonyme du plan `docs/superpowers/plans/2026-07-26-cadrage-deliverables.md`,
tenue à jour à l'exécution (chaque risque avec son arbitrage).
