# Spec — La couche Verify (`capture` · `review` · préview · sévérité · voie « needs-human-eye »)

> **Statut :** design validé, prêt pour → writing-plans.
> **Parent :** `docs/superpowers/specs/2026-07-24-shell-and-desk-journey-design.md` §4, ligne « Verify » — issues Tom **#3, #9, #10, #11**.
> **Contrat hérité :** `docs/superpowers/specs/2026-07-24-verb-contract-adapters-design.md` §2.3 (invariants I1–I7). `capture` et `review` y sont des **slots déclarés** (`VERBS` est fermée, les deux répondent `not-implemented`). Ce spec les remplit.
> **Branche :** `feat/verify-layer` (worktree `splash-verify-layer`).
> **Langue :** prose FR, identifiants/fichiers/types en anglais (standard non-négociable).

---

## 1. Problème (constaté dans le code, pas déduit)

Les quatre issues décrivent **une seule maladie** : *la vérification a l'air verte pendant que l'artefact est faux.* C'est la leçon la plus chère de ce repo (`CLAUDE.md` : « toujours vérifier le LIVRÉ, pas le proof » · « le juge peut mentir aussi »). Chaque issue en est une face :

| Issue | La face | La preuve dans le code |
|---|---|---|
| **#3** | On approuve **sans avoir vu** le livrable. Gate 3b demande « ship it ? » alors que seul un *still* de review a été montré. | `skills/splash/src/gate.ts:26-30` : `applyRenderGate` exige `r.reviewed`, **jamais** qu'une préview du livrable ait eu lieu. Rien dans `lib/loop/` n'écrit `approved` : la V2 n'a **aucun** écrivain d'approbation, donc aucune porte à sauter — le trou est encore ouvert, pas encore creusé. |
| **#10** | Le still est capturé à **une taille arbitraire**, pas à celle de la publication. | Mesuré sur un vrai rendu de la boucle (slope interactive, article-web) : à **900×560** — le viewport codé en dur dans `skills/chart-native/scripts/snap-responsive.mjs:44` — la racine du composant mesure `y=24 h=557` (bas à **581 px**) et `document.scrollHeight = 605`. **Le pied « Source: … » vit à y 554→581, donc SOUS le pli.** À 1200×675 (la taille réelle du canal article-web) il rentre. La capture de #10 n'est pas une hypothèse : elle est reproductible au pixel. |
| **#9** | Le relecteur est **l'auteur**. Une review qui dépend du raisonnement qui a écrit le spec ne peut pas voir un titre trompeur qu'elle a elle-même trouvé juste. | `skills/splash/scripts/review-gate.mjs` : la review est un **argv de chaînes** que l'agent orchestrateur se passe à lui-même. Le ledger `--probes` prouve qu'une sonde a tourné, pas qu'un autre regard a jugé. |
| **#11** | Une faille de source et une remarque de style **sortent par la même porte**. | `review-gate.mjs` : `concerns` = `string[]`. Aucune sévérité, aucun statut, aucune trace qu'un journaliste a *sciemment* passé outre. |

Et une cinquième face, que les issues ne nomment pas mais que ce repo a déjà payée : **un juge LLM qui valide un autre juge LLM mesure sa propre cohérence, pas la vérité.** Le spec S4c (`2026-07-23-s4c-dimension-judges-kappa-design.md`, « Goals » 5) l'écrit noir sur blanc : « κ mesure la *self-consistency* du juge, **pas** la correction, tant qu'il n'existe pas de labels humains ». Empiler un second modèle sur le premier fabriquerait de la confiance, pas de la vérification.

**Donc la couche Verify n'est pas « un juge de plus ». C'est une frontière** : ce que le code peut prouver, il le prouve mécaniquement et bloque ; ce que le code ne peut pas voir, il le **nomme, l'étiquette et le route vers le seul instrument qui voit le plafond** — l'éditeur humain qui signe déjà (Ed25519, `skills/splash/src/editorial-signoff.ts`). Rien ne tombe dans le trou du milieu en se faisant passer pour vérifié.

---

## 2. Le principe qui gouverne (et qui tranche les cas limites)

> **Une affirmation de vérification n'existe que si un mécanisme l'a produite, et elle est étiquetée par ce qui l'a produite.**

Trois provenances, trois statuts, jamais mélangés dans le record :

1. **`mechanical`** — du code déterministe sur l'artefact rendu (une boîte englobante, un hash, un octet de PNG). Fiable ⇒ peut **bloquer**.
2. **`independent`** — une passe de critique en contexte frais, qui n'a pas écrit la proposition. **Pas implémentée dans cette tranche** (§7) ; le seam existe, et son absence est **enregistrée** (`independentSemanticReview: "unavailable"`), jamais silencieusement requalifiée en indépendance.
3. **`needs-human-eye`** — un **risque de goût** détecté mécaniquement mais **jamais noté** par une machine : densité, blanc, adjacence de palette, divergence titre↔takeaway. Il sort en signal routé vers la signature humaine, avec le mot « risque », jamais « défaut » ni « OK ».

Corollaire dur, et c'est lui qui empêche la maladie de revenir : **aucun composant de cette couche ne convertit un silence en preuve.** Pas de capture ⇒ pas d'approbation possible. Pas de reviewer indépendant ⇒ le champ dit « indisponible », il ne dit pas « passé ».

---

## 3. Architecture

Un paquet neuf **`lib/verify/`** (dépend **uniquement** de `lib/core` — jamais de `lib/loop`, sinon cycle : `lib/loop/manifest.ts` l'importe) + les deux corps de verbes.

| Fichier | Responsabilité | Pur ? |
|---|---|---|
| `lib/verify/types.ts` | `Finding` · `Severity` · `Criterion` · `Override` · `CaptureRecord` · `PreviewRecord` · `ReviewRecord` · `TasteRiskSignal` · `DestinationProfile` | pur (types) |
| `lib/verify/severity.ts` | **la** table sévérité, TOTALE, une seule (#11) | pur |
| `lib/verify/viewport.ts` | `resolveTargets(channel, format, destination?)` → les breakpoints réels (#10) | pur |
| `lib/verify/png.ts` | lecture d'en-tête IHDR (dimensions réelles d'un PNG livré) | IO lecture |
| `lib/verify/capture.ts` | la capture : navigateur réel pour html, IHDR pour image ; métadonnées + checks déterministes (#10) | IO |
| `lib/verify/preview.ts` | `PreviewRecord` + `previewCoversDeliverable()` (#3) | pur |
| `lib/verify/redact.ts` | `buildReviewerInput()` (whitelist) + `assertNoInternals()` + hachage entrée/sortie (#9) | pur |
| `lib/verify/taste.ts` | les détecteurs de risque de goût → `TasteRiskSignal[]` (voie humaine) | pur |
| `lib/verify/review.ts` | `mechanicalReviewer` + `runReview()` : findings, mode, hashes (#9, #11) | pur |
| `lib/verify/approval.ts` | `approvalDecision()` : bloquants ouverts, warnings acquittés, overrides valides (#3, #11) | pur |
| `lib/verify/schema.ts` | les schémas zod du record, pour que `manifest.ts` valide au lieu de croire | pur |
| `lib/core/verbs/capture.ts` · `review.ts` | les deux corps de verbe : gate de payload, jamais de throw, résultat JSON | — |
| `lib/core/verbs/index.ts` | enregistrement **additif** des deux verbes | — |
| `lib/loop/manifest.ts` | remplit le slot `review` dormant + `approveElement()` (seul écrivain sanctionné de `approved`) | — |

**Pourquoi presque tout est pur :** parce que la partie qui touche le monde (le navigateur) est celle qu'on ne peut pas tester en boucle serrée, et la partie qui *décide* est celle qui doit être écrasée de tests. La frontière est nette : `capture.ts` produit des **faits mesurés** (boîtes, hashes, dimensions) ; tout le reste **raisonne sur des faits**, jamais sur un DOM.

---

## 4. `capture` — au vrai viewport de publication (#10)

### 4.1 D'où vient la taille

Deux sources, dans cet ordre :

1. **Le profil de destination de la rédaction** (`DestinationProfile`), s'il existe : la vraie largeur/hauteur d'embed de son CMS, ou son contrat responsive. C'est l'avertissement explicite de #10 — *« Avoid assuming one universal "article web" rectangle »*.
2. **À défaut, `CHANNEL_POLICY`** (`lib/core/channel-policy.ts`), qui est déjà la politique canal→aspect→taille du projet. Un défaut **documenté**, pas un nombre magique.

```ts
type Breakpoint = "primary" | "narrow" | "wide";
type CaptureTarget = {
  breakpoint: Breakpoint;
  cssViewport: { width: number; height: number };
  deviceScaleFactor: number;
};
```

- **`static` / `video`** : UNE cible, `primary`, **exactement** `mediaSize` du canal (1200×675 · 1080×1080 · 1080×1920). Un format à aspect figé n'a pas de breakpoints — prétendre le contraire serait du théâtre.
- **`interactive` / `scrolly`** : trois cibles. `primary` = le conteneur d'article réel (profil) ou, à défaut, `mediaSize` du canal ; `narrow` = 360 ; `wide` = 1600. Les deux extrêmes sont ceux que les moteurs éprouvent déjà (`snap-responsive.mjs:22`) — on hérite d'une calibration existante au lieu d'en inventer une.

### 4.2 Ce qui est capturé, et ce qui est mesuré

Le navigateur (Playwright/chromium, celui dont les 4 moteurs dépendent déjà) charge le **vrai livrable** en `file://`, attend le sélecteur racine puis la fin du reveal (`settleMs`, défaut 2200 — le nombre que `snap-responsive.mjs:29` utilise déjà), screenshote **la racine complète du composant**, et **mesure** :

```ts
type CaptureRecord = {
  breakpoint, path, sha256,                 // l'image de review elle-même
  cssViewport, deviceScaleFactor,
  rootBox: { x, y, width, height },         // la racine du composant
  documentScroll: { width, height },
  artifactSha256, destinationId, channel, format, capturedAt,
  marks: number,                            // éléments de marque rendus (densité)
  markColours: string[],                    // couleurs réellement peintes (adjacence)
};
```

**La racine** est résolue par une liste de candidats — `[data-splash-root]`, `#root > div`, `#root`, `body` — premier trouvé. `#root > div` est la convention réelle des builds (vérifiée sur le rendu produit). C'est une **heuristique assumée**, pas un contrat : `lib/` n'a pas le droit de connaître les sélecteurs d'un moteur, et modifier les moteurs depuis cette tranche est hors frontière. Elle est déclarée telle quelle dans les risques (§8).

**La furniture** est déclarée par l'appelant en **texte attendu**, pas en sélecteur :

```ts
type FurnitureExpectation = { role: "title" | "unit" | "source" | "credit" | "alt-text"; text: string };
```

Pourquoi le texte : c'est la seule description de furniture qui soit **vraie pour les 6 moteurs à la fois** et qui ne demande à personne d'annoter son DOM. Et c'est exactement ce que #10 demande de prouver — *« Required furniture is included and visible in the captured component »* : l'appelant sait quel titre, quelle unité, quelle source il a commandés ; la capture vérifie qu'ils sont **là, visibles, et dans le rectangle capturé**.

### 4.3 Les trois checks déterministes

| Check | Ce qu'il mesure | Ce qu'il attrape |
|---|---|---|
| `capture:furniture-present` | chaque `FurnitureExpectation` résout un nœud visible (box non nulle, pas `display:none`/`visibility:hidden`/`opacity:0`) — sauf `alt-text`, présent au DOM mais visuellement caché **par construction** (1×1, `sr-only`) | une source absente, un titre non rendu |
| `capture:furniture-in-frame` | la box de chaque furniture est **incluse dans `rootBox`** ET **dans le viewport** | **le pied de source sous le pli à 900×560 — la panne de #10, au pixel** |
| `capture:fits-viewport` | `rootBox` (bas et droite) tient dans `cssViewport` | un composant plus haut/large que son conteneur de publication |

Ils sortent en `CaptureCheck[]` (`{ id, breakpoint, outcome: "pass" | "fail", detail }`) — **des faits, pas des verdicts**. C'est `review` qui les mappe en findings sévérisés, une seule fois, au même endroit que tout le reste (#11 : « define the severity mapping centrally »).

### 4.4 La provenance de destination

`review` refuse un `CaptureRecord` dont la cible ne correspond pas au profil accepté (#10 : *« Make review-gate refuse a still whose recorded target does not match the accepted delivery profile »*). C'est la **deuxième** prise sur la panne de #10, indépendante de la première : même si le pied avait tenu dans le cadre, un still pris à 900×560 pour une destination article-web serait refusé comme **non probant**. Deux mécanismes distincts sur la même panne, parce que ce repo a déjà vu une prise unique se faire contourner.

---

## 5. `review` — indépendance, structure, sévérité (#9, #11)

### 5.1 Ce que le relecteur reçoit (et surtout ce qu'il ne reçoit pas)

`buildReviewerInput()` construit l'entrée du relecteur par **whitelist** — jamais par suppression de champs, parce qu'une suppression oublie le champ ajouté demain :

```ts
type ReviewerInput = {
  format, channel,
  confirmedTakeaway, unit, altText, sourceName,      // l'intention éditoriale confirmée
  evidenceExtracts: { text, provenance }[],          // extraits bornés + leur origine
  renders: { breakpoint, path, cssViewport, deviceScaleFactor, rootBox, artifactSha256 }[],
  interactionResults: { name, outcome, detail }[],
  rubric: string[],                                   // la rubrique + la politique de source, partagées
};
```

Et **`assertNoInternals(input)`** rescanne le résultat pour les motifs interdits (`runId`, ids d'élément/option, `chosenId`, `why`/`whySource`, `provenanceHash`, chemins absolus du run dir, ids d'agent/tâche). C'est une ceinture **par-dessus** la bretelle de la whitelist : #9 exige *« Journalist-facing messages contain findings only, never agent IDs or internal task plumbing »*, et une whitelist se trompe silencieusement, un scanner échoue fort.

**Pourquoi c'est ça, l'indépendance, dans cette tranche.** L'indépendance n'est pas « un autre modèle » — c'est **ne pas pouvoir noter le processus.** Un relecteur qui ignore quelle option a été choisie, pourquoi le cerveau l'a classée première et combien de tours ont été nécessaires **ne peut noter que l'artefact**. La frontière de redaction est donc la partie *load-bearing* de #9, et elle est mécaniquement testable ; le second modèle est la partie *chère*, et elle est déférée (§7) — déclarée, jamais simulée.

### 5.2 Findings et sévérité

```ts
type Finding = {
  id: string;              // stable, ex. "furniture-below-fold"
  criterion: Criterion;    // source | accessibility | title-fidelity | data-fidelity
                           // | interaction | furniture | viewport | provenance
                           // | craft | colour-semantics | narrative
  severity: "blocking" | "warning" | "informational";
  status: "open" | "resolved" | "acknowledged" | "overridden";
  summary: string;
  evidence: string[];
  provenance: "mechanical" | "independent" | "self-review";
  confidence?: "high" | "medium" | "low";
};
```

**La sévérité n'est jamais choisie par celui qui trouve.** `severityFor(id, criterion)` la lit dans une table centrale : d'abord par `id` (catalogue mécanique fermé), sinon par `criterion` (défaut pour un adapter). Un relecteur — modèle ou humain — peut **décrire** ce qu'il voit ; il ne peut pas décider que ça bloque. C'est la lecture forte de #11 (« so the same defect cannot be blocking in one producer and advisory in another ») et c'est aussi une défense contre un modèle qui gonfle ou dégonfle ses propres verdicts.

Bloquants (l'énumération de #11) : source fabriquée/invalide, mismatch claim/données, échec a11y sérieux, interaction requise cassée, artefact périmé/non prouvé, **furniture manquante ou hors cadre**, **mismatch de destination**.

### 5.3 Overrides et acquittements

```ts
type Override = { findingId, reason, actorLabel, at, artifactSha256, provenanceHash };
```

Un override **est lié aux octets** : il ne vaut que pour `artifactSha256` + `provenanceHash` courants. Une re-production change les deux ⇒ l'override tombe, mécaniquement, sans que personne ait à s'en souvenir (#11 : *« Re-production invalidates overrides tied to the prior artifact »*). Un warning demande un **acquittement** (l'id listé), pas la cérémonie complète. Un informational ne demande rien.

### 5.4 Le mode, enregistré, jamais supposé

```ts
type ReviewerAttribution = {
  mode: "mechanical" | "independent" | "self-review";
  name: string; version: string;
  inputsHash: string; outputHash: string;
  independentSemanticReview: "available" | "unavailable" | "declined";
};
```

Si aucun adapter indépendant n'est branché, le record dit `mechanical` + `independentSemanticReview: "unavailable"`. **Il ne dit jamais `independent`.** #9, verbatim : *« If the independent reviewer is unavailable, do not silently claim independence »*.

---

## 6. La préview et l'approbation (#3)

### 6.1 Le record de préview

```ts
type PreviewRecord = {
  deliverablePath: string; deliverableSha256: string;
  presentedAs: "opened" | "embedded" | "path-printed";
  presentedAt: string; fallbackReason?: string;
};
```

`previewCoversDeliverable(format, record, artifact)` exige **deux** choses, et c'est là que #3 se joue :

1. `deliverableSha256 === artifact.sha256` — la préview porte sur **ces octets-là**, pas sur un artefact d'avant.
2. Le **genre du fichier montré correspond au format épinglé** : `.html` pour `interactive`/`scrolly`, une image pour `static`, `.mp4` pour `video`. **Un PNG ne peut pas préviewer un interactif** — c'est exactement la panne de #3 (*« A review still is also not a substitute for the actual interactive »*), et c'est un refus de type, pas une phrase de prose.

### 6.2 `approveElement` — la seule porte

`approvalDecision()` (pur) refuse si :

- il n'y a pas de review fraîche pour la provenance courante ;
- il n'y a **pas de préview** couvrant l'artefact courant → `preview-not-presented` ;
- un finding **bloquant** est `open` sans override valide ;
- un **warning** n'est ni acquitté ni overridé.

`approveElement(run, el, decision)` dans `manifest.ts` est **l'unique écrivain sanctionné** de `el.approved`. Ce n'est pas de la prose : aujourd'hui **rien dans `lib/loop/` n'écrit `approved`** (seuls des tests le posent à la main, et `deliver.ts:93` le lit). En arrivant *avant* l'écrivain, la porte n'a pas de contournement historique à rattraper — c'est la seule fenêtre où on peut la poser sans dette.

**Ce qui n'est pas fait, et pourquoi :** on n'ajoute **pas** l'invariant inconditionnel « `approved` ⇒ préview » dans `assertInvariants`. Trois tests existants (`lib/loop/gate-state.test.ts:107,122`, `:207`) posent `approved` à la main sans review, et `lib/loop/*` hors `manifest.ts` est **hors frontière** pour cette tranche. Poser l'invariant en cassant des tests qu'on n'a pas le droit de réparer serait un faux vert déguisé en rigueur. La porte est donc **à l'écrivain**, l'invariant est déféré à la tranche qui câble l'approbation dans le driver (§7). Les invariants **neufs** (sur des formes qui n'existaient pas) sont eux ajoutés tout de suite : un override doit référencer un finding existant ; une préview ne peut pas contredire le hash de l'artefact.

---

## 7. Hors scope — assumé, avec sa raison

| Déféré | Pourquoi (honnête) |
|---|---|
| **La passe de critique sémantique indépendante (un vrai second modèle)** | Le seam existe (`ReviewerAdapter`), la redaction et le hachage sont construits et testés. Ce qui manque est **une décision produit qu'on n'a pas le droit de prendre ici** : #9 exige de *« Define privacy/data-retention requirements before sending unpublished reporting to any additional model or service »* — envoyer une enquête Heidi.news non publiée à un service tiers est un arbitrage de rédaction, pas d'implémentation. Et un second modèle branché sans mode d'isolement local serait précisément le « juge qui valide le juge » que S4c a déjà démonté. Le record dit `unavailable` en attendant. |
| **`capture` du format `video`** | Extraire une frame demande ffmpeg ; `lib/core/video-verify.ts` sait déjà *comparer* un still à un mp4 mais **ne fait aucun IO** (`:7`, verbatim) — l'extraction vit dans les scripts de snap des moteurs. Câbler ça proprement, c'est ré-héberger un mécanisme d'un moteur dans `lib/`, une tranche à part entière. `capture` refuse `video` avec `not-implemented` — **un refus typé, pas un silence** (et le refus est testé). |
| **La capture live d'un Datawrapper hébergé** | Pas de livrable local à ouvrir : il faut la capture live sanctionnée + un token. Même arbitrage réseau/secret que ci-dessus. Refus typé. |
| **Le câblage dans `lib/loop/driver.ts`** | Hors frontière de fichiers de cette tranche (`driver.ts` appartient à une autre voie de travail). Les verbes sont appelables par `runVerb`, l'état a sa place au manifest : le câblage est une ligne de `switch`, pas un design. |
| **La commande `preview.mjs` de #3 dans `skills/splash`** | #3 la suggère dans le **skill legacy** ; cette tranche construit la **V2**. Le record de préview et son refus mécanique sont le cœur transférable ; la CLI legacy dupliquerait un chemin qu'on retire. |
| **κ humain / calibration** | S4c/S4d ont déjà leur chez-soi. Ici on **route** vers l'humain ; on ne mesure pas son accord. |

---

## 8. Risques assumés

| Risque | Réponse / arbitrage |
|---|---|
| **La résolution de racine est une heuristique** (`#root > div` d'abord) | Vérifiée sur un rendu réel de la boucle ; dégrade vers `body` (jamais d'exception) ; le sélecteur retenu est **enregistré dans `CaptureRecord`**, donc une mauvaise racine est lisible dans la preuve au lieu d'être invisible. Le vrai correctif — un `data-splash-root` posé par les moteurs — est un changement côté `skills/`, hors frontière ici. |
| **La furniture est vérifiée par texte** | Un texte dupliqué ailleurs dans le composant peut satisfaire le check par le mauvais nœud. Mitigé en prenant le nœud **feuille** le plus profond qui contient le texte, et en enregistrant sa box : la preuve reste inspectable. Un contrat par attribut serait plus fort, même frontière que ci-dessus. |
| **Playwright entre dans les dépendances racine** | Les 4 moteurs en dépendent déjà (même version épinglée, 1.61.1) et le binaire chromium est partagé. Sans navigateur, pas de capture au vrai viewport — c'est le cœur de #10, il n'y a pas de version « sans browser » de cette issue. |
| **Le reviewer mécanique ne voit rien de sémantique** | C'est **assumé et étiqueté**, pas caché : `provenance: "mechanical"` sur chaque finding, `independentSemanticReview: "unavailable"` sur le record, et la voie « needs-human-eye » nomme explicitement les axes que personne ne juge. Le pire résultat serait un record qui *ressemble* à une review complète — d'où l'étiquetage partout. |
| **La voie « needs-human-eye » ne bloque pas** | Délibéré : bloquer sur un *risque* rendrait les runs autonomes impossibles et ferait du signal un bruit qu'on apprend à cliquer. Il est **présenté à l'approbation** et routé vers la signature ; le durcir en blocage est une politique de rédaction (`requiredSigners`), pas un défaut de code. |

---

## 8bis. Risques assumés *(écrit après implémentation — chacun avec son ruling)*

| # | Résidu constaté | Ruling |
|---|---|---|
| R1 | **`lib/host/capabilities.ts` ment maintenant** : son `IMPLEMENTED = new Set(["render","publish"])` déclare toujours `capture`/`review` « pas encore appelables », alors qu'ils ont un corps. Un hôte qui lit `splash verbs` sera mal informé. | **Laissé tel quel — signalé, pas corrigé.** `lib/host/**` est hors frontière de fichiers pour cette tranche, et le fichier ne CASSE pas (aucun test ne rouge). Un mensonge de déclaration est exactement ce que cette couche combat, donc c'est un follow-up **nommé**, pas un oubli : une ligne à ajouter au set + la ligne correspondante dans `capabilities.test.ts`, par le propriétaire de `lib/host`. |
| R2 | **Une assertion de `lib/host/cli.test.ts` a dû bouger** (`capture` → `not-implemented` devenu `invalid-request`). | **Fait, minimal, documenté dans le commit.** Donner un corps au verbe rend cette assertion fausse *par construction* : il n'existe aucune version de la tâche qui la préserve. Seules les 2 lignes concernées bougent ; le code de sortie et le contrat JSON que le test garde réellement sont inchangés. |
| R3 | **`playwright` entre dans les dépendances de la racine** (+ `bun.lock`). Fichier partagé avec d'autres voies de travail. | **Assumé.** Additif, version épinglée **identique** à celle des 4 moteurs (1.61.1), binaire chromium partagé (déjà en cache). Il n'existe pas de version « sans navigateur » de l'issue #10. |
| R4 | **La racine du composant est une heuristique** (`[data-splash-root]` → `#root > div` → `#root` → `body`). | **Assumé et rendu lisible.** Le sélecteur retenu est **enregistré dans chaque `CaptureRecord`** : une mauvaise racine est visible dans la preuve, pas invisible. Le vrai correctif (un attribut posé par les moteurs) est un changement côté `skills/`, hors frontière. |
| R5 | **La furniture est vérifiée par TEXTE.** Un texte dupliqué ailleurs pourrait satisfaire le check par le mauvais nœud. | **Assumé, mitigé.** On prend le nœud **feuille le plus profond** portant le texte, et sa box est enregistrée. Une correspondance sur le mauvais nœud reste donc inspectable. |
| R6 | **La capture d'un `interactive` ne teste aucune interaction** (pas de hover, pas de tooltip) — `interactionResults` est un champ que l'appelant remplit. | **Déféré, honnêtement typé.** Les moteurs ont déjà leurs scripts d'interaction (`snap-tooltip-viewport.mjs`, …) ; les ré-héberger ici est une tranche à part. Le champ existe pour que le reviewer les reçoive, et il est **vide** plutôt que faussement rempli. |
| R7 | **La taille du still est `rootBox × dpr` à ±2 px de device**, pas une égalité. | **Corrigé sur mesure réelle.** Une racine réelle est fractionnaire (1152 × **557,39** css px), et le navigateur étend un screenshot d'élément aux pixels entiers : 1114,78 revient en **1116**. L'égalité stricte encodait une hypothèse fausse ; la fixture synthétique (hauteur entière) garde, elle, l'égalité exacte. |
| R8 | **Le détecteur d'adjacence de palette voyait les filets de grille** (#e6e6e6 vs #cfcfcf, 69 d'écart) et se déclenchait sur quasiment tout chart. | **Corrigé à la source, pas au seuil.** La récolte prend les `fill` des formes qui remplissent et les `stroke` **plus épais qu'un filet** (>1px) : une règle de grille n'est pas un encodage à décoder. Prouvé sur le rendu réel — le slope monochrome rapporte sa seule couleur (#6b6b6b) et la voie humaine se tait. Résidu accepté : un chart dont une série serait dessinée en trait de 1px serait ignoré. |
| R9 | **`approved ⇒ préview` n'est pas un invariant du manifeste**, seulement une porte à `approveElement`. | **Assumé, avec sa raison** (§6.2) : trois tests de `lib/loop` posent `approved` à la main et sont hors frontière. Un invariant écrit contre eux serait un faux vert. À poser dans la tranche qui câble l'approbation au driver. |
| R10 | **Le corps `review` n'a aucun juge sémantique** : titres trompeurs, type d'encodage inadapté, source inventée ne sont pas détectés. | **C'est le design, pas un manque caché** (§7 + §2) : chaque finding porte `provenance: "mechanical"`, le record porte `independentSemanticReview: "unavailable"`, et les axes non jugés sont **nommés** dans la voie « needs-human-eye ». Le pire résultat serait un record qui *ressemble* à une review complète. |

## 9. Contraintes globales

- Runtime **Bun**. Tests `bun:test`, **TDD** (test rouge d'abord, exécuté, vu échouer).
- Invariants du contrat de verbes **tenus** : I1 jamais de `throw` · I2 payload neutre (ni `AcceptedProposal` ni `RunManifest`) · I3 spec/artefact opaques · I4 enum fermée · I5 **zéro `process.env`** dans la couche · I6 requête et résultat JSON-round-trippables · I7 des chemins, jamais des octets.
- `lib/verify` n'importe **que** `lib/core` (pas de cycle avec `lib/loop`).
- Code, commentaires, identifiants : **anglais**. Aucune mention vendor dans un artefact commité.
- Pas de nouveau `any`. Pas de mock d'un vrai seam : la capture ouvre un **vrai navigateur** sur un **vrai fichier rendu**.
- Preuve sur artefact réel : un interactif produit **par la boucle** (`lib/loop/produce.ts` → chart-native), capturé, revu — opt-in (`SPLASH_VERIFY_PROOF=1`, convention `lib/loop/video-e2e.test.ts:17`), et exécuté au moins une fois avec son résultat mesuré rapporté.
