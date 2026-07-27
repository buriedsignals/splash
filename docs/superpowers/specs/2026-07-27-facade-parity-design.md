# Spec — Parité façade ⇄ boucle

> **Statut :** trou 1 implémenté ; trou 2 **mesuré et laissé à une décision de Rémy** (§3).
> **Branche :** `feat/facade-parity`, off `main` @ `3500e87`.
> **Langue :** prose FR, identifiants/code en anglais (standard non-négociable).

---

## 1. Problème — un thème, deux trous

La boucle éditoriale (`lib/loop/`) se pilote depuis une façade CLI JSON (`lib/host/`) pour qu'un
runtime non-JS — **Goose, la cible du partenariat** — puisse dérouler tout le parcours. La façade a
pris du retard sur la boucle **deux fois**, et les deux trous ont la même forme :

> **la façade ne sait pas ce que la boucle sait.**

---

## 2. Trou 1 — la façade ne visait que le premier livrable *(fermé)*

`drive.ts` résolvait son élément par `run.elements[0]`, écrit quand un run n'en portait qu'un. Le
commentaire qui le justifiait — « l'agrégation multi-élément est une question pour la boucle, que
`manifest.ts` parque » — est devenu faux : l'issue #1 l'a dé-parquée. Un récit porte désormais un
master `article-web` et ses frères `social`/`print`, `nextActions` agrège, et le driver avance
**celui dont il a parlé**. La façade continuait d'écrire dans le premier : `next` pouvait dire
`choose-form` à propos du **deuxième** livrable pendant que chaque commande modifiait le master.

### 2.1 Ce qui est décidé

- **Le défaut est `liveElementFor`**, le résolveur de la boucle elle-même — jamais une position.
  C'est le point porteur : un « premier implicite » est exactement **comment ce trou est né**, et
  partager le résolveur du driver empêche la façade de dériver à nouveau.
- **`--element <id>`** pour atteindre un autre élément — le master terminal n'est pas joignable par
  défaut *parce qu'il est fini*, et le rouvrir est un acte délibéré.
- **Nommer un id absent est un REFUS qui liste les ids présents**, jamais un repli silencieux sur
  l'élément vivant : un hôte qui se trompe d'id déciderait sinon du mauvais livrable en s'entendant
  répondre que tout va bien.
- **L'élément décidé est remplacé EN PLACE.** `[decided, ...rest]` le déplaçait en tête et
  réordonnait silencieusement les livrables, dont l'ordre est l'ordre de production choisi par le
  plan (web d'abord, comme master éditorial). Le driver avait déjà appris cette leçon ; la façade
  non.

### 2.2 Ce qui n'a pas eu besoin d'être fait

`resumeReport` expose déjà, par élément, `id` · `gateState` · `nextActions` · `destination` ·
`aspect` · `deliverableOf`. Un hôte peut donc **voir** les livrables qu'il doit nommer : la
lisibilité était déjà là, seule l'adressabilité manquait.

---

## 3. Trou 2 — le contrat de verbes, 4ᵉ consommateur de source **non gardé** *(ouvert, décision)*

`lib/loop/produce.ts` refuse un run qui n'a déclaré aucune source et tire le crédit rendu de
`validateSourcePolicy` au lieu d'un placeholder. Mais `lib/core/verbs/render.ts` **ne valide pas**
`spec.source` : un hôte non-JS appelant `render` directement fournit le crédit qu'il veut, et il
atteint l'artefact sans contrôle. C'est le **R7** du câblage source.

### 3.1 Ce que j'ai essayé, et pourquoi je l'ai retiré

**Piste A — refuser `render` à la façade**, comme `publish` l'est déjà (table `HOST_ONLY_VERBS`, avec
son détour). Le raisonnement se transpose mot pour mot : ce que `produce()` applique est un fait sur
un **run**, et un payload de verbe ne sait pas en nommer un ; porter la politique dans `render()`
casserait deux invariants du contrat (**le spec est OPAQUE** — seul le validateur du moteur le lit,
et le crédit vit dedans — et **le contrat ne porte aucun état ambiant**).

**Mesuré : 9 tests cassent.** Et ils sont porteurs — ils prouvent la garde d'`outDir` destructif au
bord du process, la frontière never-throw, et qu'un vrai moteur est joignable depuis un process qui
n'importe que la CLI. `render` n'est pas `publish` : c'est **une capacité de première classe de la
façade**, et le seul verbe implémenté qui prenne un `outDir`.

**Piste B — accepter `render` mais refuser un payload qui porte `spec.source`** (« le crédit n'est
pas au host de le fournir »). Chirurgical, garde les 7 preuves de sûreté… **mais impossible** :
`NativeSpec.source` est **requis** (`skills/chart-native/src/spec-to-config.ts:45`). Un spec sans
source ne construit pas. La piste B est donc la piste A déguisée.

### 3.2 Le choix est binaire, et il n'est pas technique

- **Fermer** : un hôte non-JS ne peut plus faire que des **runs complets**. Le crédit vient toujours
  d'une source déclarée. Coût : 9 tests à re-concevoir, et une capacité retirée du contrat.
- **Laisser ouvert** : `verb render` reste utilisable seul, et un hôte peut fabriquer une
  attribution. Coût : le seul chemin restant pour poser un crédit non vérifié sur un artefact réel.

**Ça engage le parcours Goose de Tom**, pas seulement l'architecture — d'où le renvoi. La décision
est éditoriale (« qu'a le droit de faire un hôte tiers avec une attribution ? »), pas une question
de placement de garde.

**Fait à corriger dans les deux cas :** `lib/host/README.md` et `lib/host/journey.test.ts:96`
montrent encore `source: { name: "Provided by the newsroom" }` — le placeholder que le câblage
source a supprimé. L'exemple périmé vit dans un test.

---

## 4. Risques assumés

- **Rouvrir le master par `--element` n'est pas gardé.** Re-choisir la forme d'un élément terminal
  périme son artefact (la provenance bouge) et le renvoie en production — c'est le comportement
  voulu, mais rien ne prévient l'hôte que sa décision **annule un travail fini**. Un avertissement
  dans la réponse serait honnête ; il n'y en a pas.
- **`advance` reste sans sélecteur.** Délibéré : `advance` exécute *le* pas que `nextActions`
  désigne, et lui donner un `--element` en ferait un ordre plutôt qu'une dérivation — le contraire
  de ce que la boucle garantit. Un hôte qui veut avancer un livrable précis le rend d'abord vivant
  en décidant dessus.
- **Aucune commande n'enregistre l'angle** (`confirm-angle`) : la façade dit qui doit le faire, sans
  pouvoir le faire. Hérité, hors périmètre.
- **`skills/map-native` n'a pas son navigateur headless** dans un worktree neuf — même classe que
  celle que `feat/runtime-readiness` vient de sonder pour `chart-native`.
