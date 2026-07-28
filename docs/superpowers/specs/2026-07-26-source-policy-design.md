# Spec — Source policy (issue Tom #7)

> **Statut :** design, 2026-07-26. Prêt pour → writing-plans.
> **Origine :** issue GitHub **#7** — « Unify source policy for public, local, private, synthetic,
> and prose data ».
> **Branche :** `feat/source-policy` (worktree `splash-source-policy`).
> **Portée fichiers :** paquet neuf `lib/source/**` + **une** addition groupée dans
> `lib/loop/manifest.ts`. Rien d'autre (trois autres chantiers travaillent en parallèle).
> **Langue :** prose FR, identifiants/types/messages en anglais (standard non-négociable).

---

## 1. Problème

Splash tient aujourd'hui **plusieurs règles de source qui se contredisent**, et aucune n'est
portée par un type :

- `lib/core/conformance-l0.ts:69` — « name required, url optional ». Un nom suffit.
- `lib/loop/produce.ts:115` — `source: { name: "Provided by the newsroom" }` **en dur**. Chaque
  visuel produit par la boucle est crédité d'un placeholder, quel que soit ce que le journaliste
  a apporté. C'est le trou le plus grave : l'attribution n'existe pas, elle est simulée.
- `lib/delivery/metadata.ts:48` — `profile.source?.trim() || "Provided by the newsroom"`. Le même
  placeholder, dérivé cette fois du profil rédaction, jamais de l'input du run.
- La render-review (prose, côté skill) traite tout dataset nommé **sans URL publique** comme
  incomplet — donc en désaccord frontal avec conformance-L0 et avec `produce.ts`.

Conséquence exacte décrite par #7 : le modèle **ne sait pas distinguer « aucune URL n'existe » de
« l'agent a oublié de collecter l'URL »**. Un jeu local, interne, non publié ou cité dans le texte
déclenche une inquiétude tardive, et un jeu synthétique de démo ne rencontre *rien* qui l'empêche
de sortir comme du réel.

Le manifest, lui, tient déjà la bonne moitié du travail : `input: { data, article }` gèle chaque
input en **path + sha256**, jamais le contenu, jamais un secret (`lib/loop/freeze.ts`,
`lib/loop/acceptance.test.ts:71`). Il manque **ce que cet input EST** et **ce que ça autorise**.

---

## 2. Décisions de design

### D1 — La classe de source est **déclarée**, jamais inférée à l'usage

`SourceKind` ∈ `public | local | private | synthetic | prose | none` (la liste de #7, non élargie).
Elle est **enregistrée sur le manifest**, à côté des inputs gelés qu'elle qualifie. Une
déclaration absente n'est pas « public par défaut » ni « inconnu, on verra » : c'est un **refus**
(`source-undeclared`). Rien dans `lib/source/` ne devine une classe à partir d'une URL ou d'un
chemin — deviner, c'est exactement ce qui fait qu'on ne distingue plus « pas d'URL » de « URL
oubliée ».

Corollaire assumé : le paquet **n'implémente aucun `inferSourceKind`**. La seule aide au remplissage
est `sourceQuestion()` (§3.7), qui pose **une** question ciblée sur le champ manquant.

### D2 — Une **table de conséquences** par classe, pas des `if` dispersés

Le cœur du paquet est une table `SOURCE_REQUIREMENTS: Record<SourceKind, SourceRequirements>`.
Chaque ligne dit, pour la classe : quels champs sont `required | optional | forbidden`, si elle est
**shippable en run réel**, si elle **exige un avertissement visible**, si les chiffres peuvent être
**calculés** ou seulement **repris verbatim**, et si elle peut porter un visuel qui affirme des
faits. Tous les gates lisent la même ligne ; c'est ça, « one shared source model » — pas un module
qui répète six fois la même décision sous six formes.

| kind | label | url | internalRef | run réel | notice | figures | porte des faits |
|---|---|---|---|---|---|---|---|
| `public` | required | **required + spécifique** | forbidden | oui | non | computed | oui |
| `local` | required | optional (spécifique si présente) | forbidden | oui | non | computed | oui |
| `private` | required (display-safe) | forbidden | optional | oui | non | computed | oui |
| `synthetic` | required | forbidden | optional | **non** | **oui** | computed | oui |
| `prose` | required | optional (spécifique si présente) | forbidden | oui | non | **verbatim** | oui |
| `none` | forbidden | forbidden | forbidden | oui | non | none | **non** |

Trois lignes de cette table sont des **décisions**, pas des recopies de #7 :

- **`local` : `internalRef` forbidden.** La provenance d'un fichier apporté existe déjà — c'est
  l'entrée gelée du manifest (`input.data.path` + `sha256`). Un second exemplaire du chemin dans
  la déclaration ne serait qu'une surface de fuite de plus, pour zéro information neuve. À la
  place, `local` **exige que l'input gelé correspondant existe** (§3.8). C'est l'ancrage sur le
  manifest, pas une duplication à côté de lui.
- **`private` : `url` forbidden.** #7 dit « optional internal reference, with no private URL leaked
  into the visual ». On ne stocke donc pas d'URL privée dans un champ dont la vocation est d'être
  publiée : une adresse d'intranet est un `internalRef`, jamais une `url`. Le champ publiable
  n'existe simplement pas pour cette classe — la non-fuite est **structurelle** avant d'être gardée.
- **`none` : `carriesFacts: false`.** L'abus réel de `none` n'est pas la carte-blanche : c'est
  marquer `none` sur un graphe de données pour esquiver l'attribution. `none` n'est donc légal que
  lorsque l'appelant déclare `carriesFactualData: false`, et le défaut de ce paramètre est `true`.

### D3 — La créance publiable est un **type différent** de la déclaration

`SourceDeclaration` (privé, sur le manifest) → `PublishedSource` (`{ credit, url?, notice? }`).
La projection est construite **champ par champ à partir d'une liste blanche**, jamais par
`spread` ni par `delete`. Un `internalRef` ne peut donc pas atteindre la furniture par oubli : il
n'y a aucun chemin de code qui le transporte. `assertNoPrivateLeak()` (§3.6) reste par-dessus en
ceinture, pour les payloads composés ailleurs.

Distinction explicite, parce que #7 dit « public manifests » : **le `RunManifest` est le registre
PRIVÉ** (il contient déjà des chemins locaux, et il vit dans le run-dir de la rédaction). Ce qui
doit être expurgé, c'est tout ce qui **sort** — furniture du visuel, métadonnées de livraison,
dossier d'export. `publicSourceView()` est le seul objet que ces chemins-là ont le droit de
sérialiser.

### D4 — L'obligation de crédit est **mécanique** : elle est dans la valeur de retour

Il n'y a pas d'API « valide la source » qui rende `true` et laisse l'appelant composer son crédit
comme il veut. `validateSourcePolicy()` rend un `SourceVerdict` **qui contient déjà la ligne de
crédit rendue** (`published.credit`), localisée via `sourceLabel()` de `lib/core/locale.ts` (donc
« Source : » fr, « Quelle: » de, « Fonte: » it). Un appelant qui veut publier sans créditer doit
jeter une valeur qu'on lui a mise dans la main — ce n'est plus un oubli, c'est un acte.

Pour `synthetic`, l'avertissement est **collé dans `credit`** en plus d'être exposé en `notice` :
un moteur qui n'affiche que le crédit affiche quand même « DONNÉES DE DÉMONSTRATION ». On ne
compte pas sur le renderer pour lire un champ optionnel.

### D5 — `prose` est une classe **de plein droit**, et elle ne nourrit que du verbatim

C'est le cas tranchant du sujet. Un chiffre cité dans l'article **n'est pas le même objet
probatoire** qu'une colonne d'un CSV que le journaliste possède : le CSV est un *enregistrement*
(re-vérifiable, re-agrégeable), le chiffre en prose est une *affirmation déjà publiée*, dont
Splash ne tient ni la méthode ni le dénominateur. Deux conséquences :

1. **Crédit qualifié.** `Source : <label> (chiffres cités dans l'article)` — table fr/de/it/en, EN
   en repli. Une URL vers l'article est permise mais **ne fait pas monter la classe à `public`** :
   Splash ne peut pas re-vérifier le chiffre à cette adresse, seulement montrer où il a été lu.
2. **`figures: "verbatim"`.** Tout nombre qui atteint le visuel doit apparaître **littéralement**
   dans la prose apportée. Splash **re-présente**, il ne dérive pas : pas de per-capita, pas de
   part-du-total, pas de moyenne, pas de croissance calculée sur des chiffres de prose. C'est le
   même geste que le claim-grounding de `lib/brain/verify-offer.ts` (« tout nombre de la prose du
   modèle doit venir des facts ou de la fiche »), déplacé d'un cran : ici c'est la *donnée* qui est
   de la prose, donc c'est le rendu qui est contraint.

**Pourquoi l'extrait n'est PAS stocké dans la déclaration.** La tentation était `quotedFrom:
string`. Refusé : le manifest ne stocke jamais le contenu d'un input (`freeze.ts`, acceptance
test §71), et un extrait d'article *est* du contenu d'input. Le grounding prend donc le texte en
**argument**, lu depuis l'article gelé au moment de la vérification. La déclaration ne porte que
`label` (+ `url` optionnelle).

### D6 — `synthetic` ne peut pas être **écrit** dans un run réel

Le ledger porte `mode: "real" | "test"`. Une déclaration `synthetic` dans un run `real` fait
**échouer `writeManifest`** (via `assertInvariants`). Pas « échouer à la publication » : échouer à
l'enregistrement. C'est la seule barrière que ce slice peut réellement câbler (§5), et c'est aussi
la bonne : la contradiction est dans la déclaration elle-même, pas dans son usage tardif.

### D7 — URL publique = URL **spécifique**

`public` exige une URL qui pointe une page/un jeu, pas une racine de site. Règle : `isHostedUrl()`
(réutilisé de `lib/core/contract.ts` — https, domaine réel, rejet des hôtes placeholder) **plus**
un chemin au-delà de `/` ou une query. `https://www.bfs.admin.ch` est refusé
(`url-not-specific`), `https://www.bfs.admin.ch/asset/fr/32229771` passe. La même exigence de
spécificité s'applique aux URL *optionnelles* de `local` et `prose` : une demi-vérité (« voilà la
home du portail ») est refusée partout, ou alors on omet le champ.

### D8 — Un résultat typé, calqué sur `VerbResult`, avec ses propres codes

`SourceResult<T>` = `{ ok: true, value } | { ok: false, code: SourcePolicyCode, message }`. Même
discipline que `lib/core/verbs/types.ts`, même raison que `lib/host/state.ts` (« a host outside
JavaScript has no catch »). Les codes sont **propres au domaine** (`missing-url`,
`url-not-specific`, `synthetic-in-real-run`, …) parce que `VERB_ERROR_CODES` est une liste fermée
que ce slice n'a pas le droit d'élargir (`lib/core/**` interdit) et qu'y écraser six refus
distincts sur `invalid-request` détruirait ce qu'on vient de construire. `toVerbResult()` fait la
conversion en une ligne pour les appelants du contrat verbe.

Les **assertions qui jettent** (`assertNoPrivateLeak`, `assertProseGrounded`, `assertSourceLedger`)
suivent l'autre précédent du dépôt (`assertInvariants`, `assertDeliveredContract`,
`verifyOffer`) : elles gardent un invariant que personne n'est censé vouloir contourner, et un
appelant qui veut être indulgent doit le dire à voix haute avec un `try`.

---

## 3. Architecture — `lib/source/`

| Fichier | Responsabilité |
|---|---|
| `kinds.ts` | Vocabulaire (`SOURCE_KINDS`, `RUN_MODES`), `SourceDeclarationSchema`, `SourceLedgerSchema` — **`z.strictObject`** (un champ inconnu échoue : « migrate without silently widening »). |
| `result.ts` | `SourceResult<T>`, `sourceOk`/`sourceFail`, `SOURCE_POLICY_CODES`, `toVerbResult`. |
| `requirements.ts` | La table §D2 + `requirementsFor(kind)`. Zéro logique. |
| `url.ts` | `sourceUrlVerdict(url)` → `specific | not-a-url | not-specific`, `isSpecificSourceUrl`. |
| `furniture.ts` | `publishedSourceFor(decl, lang)` → `PublishedSource` (crédit localisé, qualificatif `prose`, notice `synthetic`). Liste blanche §D3. |
| `prose.ts` | `figuresIn(text)`, `ungroundedFigures(quoted, rendered)`, `assertProseGrounded(...)`. |
| `redact.ts` | `publicSourceView(ledger, lang)`, `assertNoPrivateLeak(payload, ledger, opts?)`. |
| `policy.ts` | `validateSourcePolicy(decl, ctx)` — **le point d'entrée unique de #7** — + `sourceQuestion(partial)` + `assertSourceLedger(ledger, frozen)`. |
| `index.ts` | Barrel. |

### 3.1 `SourceDeclaration`

```ts
{ kind: SourceKind; label?: string; url?: string; internalRef?: string }
```

Quatre champs, `strictObject`. Pas de `name`/`title`/`note` : la furniture se compose, elle ne se
stocke pas.

### 3.2 `SourceLedger` (ce qui s'ajoute au manifest)

```ts
{ mode: "real" | "test"; data?: SourceDeclaration; article?: SourceDeclaration }
```

Miroir exact de `run.input` (`data` / `article`), au **niveau run** : c'est l'input qui est
qualifié, et les inputs sont run-level. Un override par élément est différé (§6).

### 3.3 `validateSourcePolicy(decl, ctx)`

`ctx = { mode?, lang?, carriesFactualData? }` (défauts : `real`, `en`, `true`).
Rend `SourceResult<SourceVerdict>` avec
`SourceVerdict = { kind, requirements, published: PublishedSource }`.

Ordre des refus (déterministe, un seul code par appel) : déclaration absente → champs requis
manquants → champs interdits présents → URL non spécifique → `none` sur un visuel factuel →
`synthetic` en run réel.

### 3.4 `PublishedSource`

```ts
{ credit: string; url?: string; notice?: string }
```

`credit` est `""` **uniquement** pour `none` (le seul cas où l'absence de crédit est correcte, et
il est déjà borné par `carriesFacts: false`).

### 3.5 Grounding prose

`figuresIn` reprend la normalisation de `verify-offer.ts` (collapse des séparateurs de milliers
espace/U+00A0/U+202F, virgule décimale → point) pour qu'un « 17 600 » français ne soit pas lu
comme deux nombres. Le code est **dupliqué**, pas importé : `numbersIn` n'est pas exporté de
`lib/brain/verify-offer.ts` et `lib/brain/**` est hors périmètre de ce slice. Résidu assumé §7.

### 3.6 Non-fuite

`publicSourceView` construit par liste blanche. `assertNoPrivateLeak(payload, ledger, opts?)`
sérialise le payload et **jette** si l'`internalRef` d'une déclaration y apparaît (insensible à la
casse), si un `file://` y apparaît, ou si un `alsoRedact` fourni y apparaît. Quand l'`internalRef`
ressemble à un chemin, son **dernier segment** est aussi cherché (≥ 5 caractères) — un export qui
ne recopie que `salaires-internes-2024.csv` fuit exactement autant.

### 3.7 La question ciblée

`sourceQuestion(partial)` rend **une seule** question, en anglais, ou `null` si rien ne manque :
la classe d'abord, puis le premier champ requis absent. C'est la moitié « code » de ce que #7
demande au flux CADRAGE ; la moitié « copy localisée » vit dans `lib/newsroom/ui-copy.ts`, hors
périmètre (§6).

### 3.8 `assertSourceLedger(ledger, frozen)`

`frozen = { data: boolean, article: boolean }` — booléens **structurels**, pas le `RunManifest` :
`lib/source/` ne doit pas importer `lib/loop/` alors que `lib/loop/manifest.ts` importe
`lib/source/` (pas de cycle, même de types). Vérifie, pour chaque slot déclaré : la policy de la
classe (au `mode` du ledger, `carriesFactualData: true`), que `data` n'est pas `none` (une entrée
de données gelée EST une donnée factuelle), et que `local` a bien son input gelé.

---

## 4. Ce que ça ferme dans les critères d'acceptation de #7

| Critère #7 | Statut ici |
|---|---|
| Gate 2 et render-review appliquent la même policy | **Différé** — le module unique existe et est testé ; le brancher aux gates touche `lib/brain/`, `skills/` (§5). |
| `public` exige une URL de page/jeu spécifique | **Fait** (D7). |
| `local`/`private` valides sans URL publique, provenance privée auditable | **Fait** (D2, ancré sur l'input gelé). |
| Chemins/URL privés jamais dans les visuels ni les manifests publics | **Fait par construction** (D3) + garde (§3.6). |
| `synthetic` visiblement marqué et impubliable comme du réel | **Fait** — refus à l'écriture du manifest (D6) + notice collée au crédit (D4). |
| Les champs existants migrent sans élargir le valide | **Fait** — `strictObject`, ledger `optional` (aucun manifest existant ne change de validité), et une déclaration absente **refuse** au lieu de valoir « public ». |
| Tests sur chaque classe, la redaction, la spécificité d'URL, le mode test, la furniture | **Fait**. |

---

## 5. Ce que ce slice **ne** branche **pas** (et pourquoi)

Le périmètre fichiers de ce chantier interdit `lib/brain/**`, `lib/delivery/**`, `lib/core/**`,
`skills/**` et tout `lib/loop/` sauf `manifest.ts`. Le seul câblage réel disponible est donc
`writeManifest → assertInvariants → assertSourceLedger`, et il est pris. Les trois autres points
d'appel sont **spécifiés ici comme interfaces**, à implémenter par le slice suivant :

1. **`lib/loop/produce.ts:110-119`** — remplacer `source: { name: "Provided by the newsroom" }` par
   ```ts
   const verdict = validateSourcePolicy(run.sources?.data, {
     mode: run.sources?.mode, lang, carriesFactualData: true,
   });
   if (!verdict.ok) return toVerbResult(verdict);   // refus typé, jamais un placeholder
   // spec.source = { name: verdict.value.published.credit, url: verdict.value.published.url }
   ```
   Effet de bord voulu : **un run sans source déclarée ne produit plus**. C'est un changement de
   comportement pour les fixtures existantes, donc il appartient à un slice qui a le droit de les
   toucher — pas à celui-ci.
2. **`lib/delivery/metadata.ts:48`** — `source:` doit venir de `publicSourceView(run.sources)`, le
   profil rédaction ne servant que de `credit` (l'auteur), jamais de source de la donnée.
3. **Render-review / conformance** — la règle « named dataset without URL = incomplete » doit
   devenir « incomplete **si et seulement si** `requirementsFor(kind).url === "required"` ». C'est
   la contradiction nommée en tête de #7, et elle se ferme en une ligne une fois la classe portée.

**Prédicat géographique (résidu garé, hors périmètre).** `limitFailure` n'examine que
points/séries/lignes, et `Facts` ne porte aucun prédicat géographique : une intention `spatial`
plus un nombre de lignes compatible offre une choroplèthe sur n'importe quel CSV. Ce n'est **pas**
un problème de classe de source (la donnée peut être parfaitement `public` et créditée), donc ce
slice n'y touche pas. Interface précise pour le slice qui le fera, dans `lib/brain/facts.ts` :
`Facts` gagne `geo: { kind: "none" | "names" | "codes" | "coordinates"; column?: string;
matched?: number }`, et `eligibility.ts` refuse tout candidat `map-native` quand `facts.geo.kind
=== "none"` — au même endroit et sous la même forme que les refus `limitFailure` existants.

---

## 6. Différé, avec sa raison

- **Override de source par élément.** Les inputs sont run-level ; un run multi-éléments dont un
  élément cite une autre source est réel mais rare. Le jour où il arrive :
  `RunElement.source?: SourceDeclaration`, la résolution étant « élément d'abord, sinon run ».
  Ajouter ça maintenant, c'est du schéma non consommé.
- **Localisation des questions CADRAGE.** `sourceQuestion` rend de l'anglais ; la copie fr/de/it
  vit dans `lib/newsroom/ui-copy.ts`, hors périmètre.
- **Redaction généralisée du payload** (scanner tout chemin absolu, tout hôte non public d'un
  export). Trop de faux positifs sans une liste blanche de la rédaction ; on redacte ce qui est
  **déclaré** privé, pas ce qui *ressemble* à privé.
- **`figures: "verbatim"` appliqué automatiquement.** Le grounding prose est fourni et testé, mais
  personne ne l'appelle : le point d'appel est le produce (§5.1). Sans le câblage, la garantie
  reste « disponible », pas « acquise » — dit franchement plutôt que maquillé.
- **Extraire `figuresIn` dans `lib/core/`** pour que `verify-offer.ts` et `prose.ts` partagent une
  seule normalisation (`lib/core/**` interdit ici).

---

## 7. Risques assumés

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

Relecture du diff après implémentation. Chaque point avec son arbitrage.

**R1 — `provenanceHash` n'inclut PAS `sources`. (le plus important)**
`provenanceHash` (`lib/loop/manifest.ts:184`) hache `input × cadrage × angle × chosenId ×
channel × format`. Changer le label ou la classe d'une source **n'invalide donc pas** un artefact
déjà produit. Aujourd'hui c'est inoffensif (rien ne rend encore le crédit — cf. §5), mais à la
minute où `produce.ts` consommera le verdict, un visuel gardera à l'écran un crédit périmé en se
déclarant `fresh`. **Arbitrage :** non corrigé ici — élargir le hash modifie une logique
existante et partagée du fichier que trois chantiers se partagent, hors de la discipline
ADD-only, et re-value tous les hachages. **Le slice qui câble §5.1 DOIT ajouter
`sources: run.sources ?? null` à `provenanceHash` dans le même commit** que la lecture du crédit.

**R2 — La policy est prête, elle n'est appliquée qu'à un seul endroit.**
Seul `writeManifest → assertInvariants` l'exerce. `validateSourcePolicy`, `assertProseGrounded`,
`publicSourceView` et `assertNoPrivateLeak` sont testés mais **sans appelant en production**, par
contrainte de périmètre (§5). Dit franchement : la classe d'une source est **enregistrée et
vérifiée** dès maintenant ; le placeholder « Provided by the newsroom » de `produce.ts:115` est
**toujours là**. Ce qui est acquis, c'est la déclaration ; ce qui reste promis, c'est la
consommation.

**R3 — `assertNoPrivateLeak` ne redacte que ce qui est DÉCLARÉ privé.**
Il ne cherche ni « tout chemin absolu » ni « tout hôte non public ». Un `internalRef` qu'un export
**reformule** (chemin ré-encodé, séparateurs changés, tronqué au-dessus du dernier segment) passe.
**Arbitrage :** une heuristique large ferait échouer des exports légitimes (le run-dir contient
des chemins absolus parfaitement normaux) et cette classe de garde se désamorce dès qu'elle crie
au loup. La non-fuite **structurelle** (§D3) est la vraie défense ; ceci en est la ceinture.

**R4 — Le seuil `MIN_SEGMENT = 5` est un jugement, pas une mesure.**
Un `internalRef` dont le dernier segment fait 4 caractères (`/nas/q1.csv` → `q1.csv` passe,
`/nas/x.db` → `x.db` non) n'est cherché qu'en entier. **Arbitrage :** en dessous, un segment est
un mot courant et le garde devient bruyant ; la référence complète reste couverte.

**R5 — `figuresIn` duplique `numbersIn` de `lib/brain/verify-offer.ts`.**
Même normalisation, deux copies, donc deux endroits où corriger un bug de tokenisation.
**Arbitrage :** `numbersIn` n'est pas exporté et `lib/brain/**` est hors périmètre. Extraction
dans `lib/core/` notée en §6. Un test verrouille les trois séparateurs de milliers des deux côtés.

**R6 — Le grounding prose est purement lexical.**
« vingt-six » passe (chiffres seulement, exactement la limite déjà assumée par `verify-offer.ts`),
et un nombre présent dans l'article mais **sans rapport** avec la donnée rendue passe aussi : la
garde vérifie la présence, pas la référence. **Arbitrage :** vérifier la référence demanderait de
comprendre la phrase — hors d'atteinte d'une garde mécanique, et une garde qui prétend le faire
ment. Elle attrape ce qu'elle prétend attraper : le chiffre **dérivé** (somme, part, taux) que
l'article ne prononce jamais.

**R7 — `sourceQuestion` rend de l'anglais.**
Un desk francophone verra une question en anglais tant que la copie n'est pas passée par
`lib/newsroom/ui-copy.ts` (hors périmètre, §6). Le reste de la furniture **est** localisé (le
crédit passe par `sourceLabel()` fr/de/it/en).

**R8 — `local` interdit `internalRef`, ce qui déplace une information dans le manifest.**
Un journaliste qui veut noter « c'est le fichier que la mairie m'a envoyé le 3 juin » n'a pas de
champ pour ça : il le met dans le `label`, donc **visible du lecteur**. **Arbitrage :** assumé —
une note interne sur un fichier local est de la documentation de run, pas une source, et lui
ouvrir un champ rouvrirait exactement la surface de fuite que `local` referme (§D2).

**R9 — Le ledger est run-level : `mode` vaut pour tout le run.**
Un run ne peut pas mélanger une source réelle et une source de démonstration. C'est voulu
(un run est une pièce, pas un bac à sable partagé), mais ça veut dire qu'une seule colonne
inventée oblige à déclarer **tout** le run en `test`. C'est le bon sens de la règle, et c'est
aussi son coût.
