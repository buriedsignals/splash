# Spec — Source wiring (la consommation de `lib/source`)

> **Statut :** design, 2026-07-26. Suite directe de
> `docs/superpowers/specs/2026-07-26-source-policy-design.md` (issue Tom **#7**).
> **Branche :** `feat/source-wiring` (worktree `splash-source-wiring`).
> **Portée fichiers :** `lib/source/**`, `lib/delivery/metadata.ts`, `lib/core/conformance-l0.ts`,
> plus **deux touches chirurgicales** dans des fichiers partagés (`lib/loop/produce.ts` — le seul
> crédit ; `lib/loop/manifest.ts` — la seule ligne de `provenanceHash`) et **une** ligne d'appel
> dans `lib/loop/deliver.ts`.
> **Langue :** prose FR, identifiants/types/messages en anglais.

---

## 1. Ce que ce slice livre

Le slice `feat/source-policy` a livré la **déclaration** et sa **vérification** — et l'a dit
franchement dans son R2 : *« ce qui est acquis, c'est la déclaration ; ce qui reste promis, c'est
la consommation »*. Le placeholder `source: { name: "Provided by the newsroom" }` était toujours
en dur dans `lib/loop/produce.ts`.

Ce slice livre la **consommation** : les trois points d'appel de son §5, plus le correctif R1 que
le §5 rend obligatoire.

## 2. Ce que la relecture du code réel a corrigé dans le §5 (spec périmée)

Le §5 a été écrit sur un arbre en mouvement. Trois écarts mesurés :

### 2.1 `published.credit` ne peut PAS aller dans `spec.source.name`

Le §5.1 propose littéralement :

```ts
// spec.source = { name: verdict.value.published.credit, url: ... }
```

C'est **faux au rendu**. `skills/chart-native/src/core/ChartFrame.tsx:275` rend
`{srcLabel} {source.name}` — le moteur pose déjà le préfixe localisé (`sourceLabel(lang)` de
`lib/core/locale.ts`, exactement la même fonction que `publishedSourceFor` utilise). Passer
`credit` produirait **« Source : Source : OFS »**. Même constat côté livraison :
`lib/delivery/adapters/zip.ts:68` écrit `Source: ${m.source}`.

**Décision — `PublishedSource` gagne un jumeau sans préfixe :**

```ts
{ credit: string; attribution: string; url?: string; notice?: string }
```

`attribution` = la même ligne composée (label + qualificatif `prose` + notice `synthetic`) **sans**
le `sourceLabel(lang)` de tête ; `credit` reste exactement ce qu'il était. Un moteur qui possède
déjà sa furniture prend `attribution`, un consommateur qui rend une ligne nue prend `credit`.
D4 est intact : la valeur de retour contient toujours la ligne finie, et la notice `synthetic`
est collée aux **deux** (un renderer qui n'affiche que l'un affiche quand même l'avertissement).

### 2.2 Le point d'appel « render-review » est un **couple**, dont une moitié est hors périmètre

- **La moitié mécanique vivante** est `lib/core/conformance-l0.ts:69`
  (`if (!input.source?.name?.trim()) v.push("missing source name")`, commentée « name required,
  url optional — E2 »). Elle est **live** : `skills/chart-native/src/core/conformance.ts:14`
  l'importe et l'appelle au produce, et map-native en dérive. C'est littéralement la règle que le
  §1 de la spec source nomme comme un des trois avis contradictoires. **C'est celle que ce slice
  câble** (§3.3).
- **L'autre moitié** est `lib/verify/review.ts:170` → finding `source-missing` (severity
  `blocking`, `lib/verify/severity.ts:57`). Elle est dans `lib/verify/**`, **interdit** par le
  périmètre de ce chantier. Elle ne dérive d'ailleurs rien du run : son `sourceName` arrive par
  le payload du verbe `review`, composé par l'hôte. Résidu déclaré (§6, R3).

### 2.3 `deliveryMetadata` n'a pas accès au ledger sans changer sa signature

Le §5.2 dit « `source:` doit venir de `publicSourceView(run.sources)` » — mais
`deliveryMetadata(el, profile, sizing)` ne reçoit ni `run` ni `sources`. Un 4ᵉ paramètre
**optionnel** (`sources?: SourceLedger`) et **une** ligne dans `lib/loop/deliver.ts:141`
(`run.sources`) suffisent, sans importer `lib/loop/manifest` dans `lib/delivery` (le type vient
de `lib/source/kinds`, pas du manifest — `lib/delivery` reste libre de `lib/loop`).

## 3. Les trois câblages

### 3.1 `lib/loop/produce.ts` — le crédit rendu

```ts
const verdict = validateSourcePolicy(run.sources?.data, {
  mode: run.sources?.mode,
  carriesFactualData: true,
});
if (!verdict.ok) return toVerbResult(verdict);
// …
source: {
  name: verdict.value.published.attribution,
  ...(verdict.value.published.url ? { url: verdict.value.published.url } : {}),
},
```

`carriesFactualData: true` sans condition : un visuel de données produit par la boucle **affirme
des faits**, donc `none` y est refusé — c'est exactement l'abus que D2 nomme.

`lang` n'est **pas** passé : la boucle n'a aujourd'hui aucun axe langue (le manifest n'en porte
pas, `NativeSpec.lang` n'est jamais posé par `produce.ts`, ChartFrame rend donc déjà sa furniture
en anglais). Passer un `lang` inventé ici mettrait un qualificatif français à côté d'un
« Source: » anglais. Résidu déclaré (§6, R4).

### 3.2 `lib/delivery/metadata.ts` — la métadonnée de livraison

`source` vient du ledger, **jamais** du profil rédaction. `profile.source` était la seconde
fabrication : le nom de la rédaction (ou `NEUTRAL_SOURCE`) servant d'attribution de la **donnée**.
Le profil ne garde que `credit` (l'auteur) et `lang`.

Le champ `ProfileFacts.source` **reste dans le type** et reste utilisé **quand aucun ledger n'est
fourni** — c'est le chemin des appelants directs (tests, hôtes) qui n'ont pas de run. Dès qu'un
ledger est fourni, il gagne, et un ledger fourni mais **invalide** fait échouer la métadonnée
(`publicSourceView` refuse plutôt que de redacter en silence).

Cas `data` non déclaré alors que le ledger existe : refus (`invalid-request`), même règle qu'au
produce — voir §4.

`lang` : ici il existe (`profile.lang`), donc il est passé à `publicSourceView` — le qualificatif
`prose` et la notice `synthetic` sortent dans la langue de la livraison.

### 3.3 `lib/core/conformance-l0.ts` — « incomplet » devient une lecture de la table

`ConformanceL0Header` gagne `sourceKind?: SourceKind`, **opt-in** :

- **absent** → comportement byte-identique à aujourd'hui (`name required, url optional`). Aucun
  appelant existant (chart-native, map-native, leurs fixtures) ne change de verdict.
- **présent** → les règles viennent de `requirementsFor(kind)` : `label` requis/interdit, `url`
  requise ssi `requirementsFor(kind).url === "required"`, URL présente mais non spécifique
  refusée (`lib/source/url.ts`), URL présente sur une classe qui n'en publie pas refusée.

C'est la fermeture littérale du §5.3 : *« incomplete si et seulement si
`requirementsFor(kind).url === "required"` »*. Une source `public` sans URL, aujourd'hui acceptée
par la conformance et refusée par la policy, est désormais refusée des deux côtés ; une source
`local` nommée sans URL, aujourd'hui refusée par la render-review en prose, est légitime des deux
côtés.

**Sens du câblage.** `lib/core/` ne dépend de `lib/source/` que par `requirements.ts` + `url.ts` +
`kinds.ts`, qui n'importent rien de `lib/core` (seul `furniture.ts` le fait, et il n'est pas sur
ce chemin) — pas de cycle, même de types.

**Ce qui n'est PAS fait ici :** `produce.ts` ne *thread* pas `sourceKind` jusqu'à la config
chart-native. Ce threading traverse `skills/chart-native/src/spec-to-config.ts` (900 lignes,
39 sites `src(spec.source)`) et `ChartConfig`, hors du périmètre fichiers de ce chantier. La
branche kind-aware est donc **testée mais pas encore atteinte depuis un produce réel**. Dit
franchement, avec son interface exacte, en §6 (R2) — le même honnête « disponible ≠ acquis » que
la spec source a pratiqué, mais cette fois sur un seul point au lieu de quatre.

## 4. La décision « run sans source déclarée »

**Décision : REFUS. Pas de défaut nommé.**

Un run dont `sources.data` n'est pas déclaré ne produit plus. Le refus est un `VerbResult`
typé (`invalid-request`, message préfixé du code de domaine `source-undeclared:` par
`toVerbResult`), jamais un throw — l'invariant I1 des verbes tient.

Pourquoi pas un défaut nommé (« Provided by the newsroom », le nom de la rédaction, « Source non
déclarée ») :

1. **C'est le bug qu'on est venu fermer.** Un défaut nommé rend *indiscernables* le run qui n'a
   rien déclaré et le run qui a déclaré quelque chose — exactement l'indistinction que #7 ouvre
   (« le modèle ne sait pas distinguer "aucune URL n'existe" de "l'agent a oublié de collecter
   l'URL" »), déplacée d'un cran en aval. Le placeholder n'est pas un moindre mal : c'est
   l'attribution simulée.
2. **La policy a déjà tranché, une fois.** D1 : une déclaration absente est un **refus**
   (`source-undeclared`), pas un défaut. Un `produce` indulgent réintroduirait un second avis
   contradictoire dans le module dont l'unique raison d'être est qu'il n'y en ait qu'un.
3. **Le coût est d'une ligne pour le journaliste**, et la question exacte à poser existe déjà :
   `sourceQuestion(undefined)`. Un fichier apporté est `kind: "local"` + un label — ce que 100 %
   des fixtures existantes sont réellement.
4. **La direction est sûre.** Refuser trop tôt coûte une déclaration ; accepter trop tôt publie
   une attribution fausse sous une signature de rédaction.

**Coût assumé et mesuré :** les fixtures/tests qui produisent sans déclarer doivent déclarer.
Elles sont migrées vers `sources: { mode: "real", data: { kind: "local", label: … } }` — la
classe qui décrit *vraiment* un CSV écrit par le test dans son propre `runDir`.

**La décision est visible dans un test, pas dans une fixture** : `lib/loop/produce.test.ts` porte
un cas dédié « produce refuses a run that declared no source » qui assert le code de domaine dans
le message, et un cas « the declared credit reaches the rendered spec ». Un lecteur qui se demande
« que fait un run sans source ? » lit la réponse dans un test nommé, pas en déduisant d'un `??`.

## 5. `provenanceHash` couvre `sources` (R1 de la spec source)

`provenanceHash` gagne **une ligne** :

```ts
sources: run.sources ?? null,
```

C'est une **exigence de correction**, pas un confort, et elle est dans le **même commit** que le
premier consommateur (§3.1) — comme la spec source l'exige explicitement. Sans elle : le crédit est
rendu **dans** l'artefact (pixels du PNG, DOM du HTML), donc changer le label d'une source laisse à
l'écran un **crédit périmé sur un artefact qui se déclare `fresh`** — `stalenessOf` répond `false`,
`nextActions` dit « montrer », et la rédaction publie une attribution qu'elle a corrigée.

Élargir le hash **re-value tous les hachages** : un artefact enregistré avant ce changement lit
`stale` une fois et est re-produit. C'est la direction sûre, et c'est le précédent déjà posé par
l'ajout de `channel`/`format` au même endroit (note en tête de `provenanceHash`) — aucun test ni
fixture sur disque ne pinne une valeur littérale, tous la recalculent.

Le ledger entier est haché (pas seulement le label) : la **classe** change ce que le visuel a le
droit d'affirmer, le `mode` change si l'artefact est du reportage, l'`internalRef` ne sort pas mais
son changement signale une re-déclaration. `null` quand il n'y a pas de ledger, pour que la valeur
soit stable sur les runs qui n'en portent pas.

## 6. Résidus, avec leur arbitrage → voir `## Risques assumés` en fin de fichier

## 7. Preuve — trois mesures sur des artefacts réels

Pas d'assertion depuis le code. Chaque mesure est journalisée dans le plan
(`docs/superpowers/plans/2026-07-26-source-wiring.md`), avec son run.

1. **Le crédit déclaré est LU dans le DOM rendu d'un vrai navigateur.**
   `lib/verify/real-artifact-proof.test.ts` (opt-in `SPLASH_VERIFY_PROOF=1`) produit un
   `interactive` par la boucle, l'ouvre dans Chromium et vérifie la furniture *présente et dans
   le cadre*. Sa constante `SOURCE` valait `"Source: Provided by the newsroom"` — « ce que
   produce.ts écrit vraiment », commenté comme tel. Elle vaut maintenant
   `"Source: " + DECLARED_SOURCE`, où `DECLARED_SOURCE` est le label du ledger du run. Le
   check `capture:furniture-present` (rôle `source`) passe : c'est la déclaration lue à
   l'écran, pas dans un blob de config.
2. **Le crédit est dans les PIXELS.** `lib/source/wiring-proof.test.ts` (opt-in
   `SPLASH_SOURCE_PROOF=1`) produit deux `static` identiques en tout **sauf le label déclaré** —
   même CSV, même angle, même canal, même type — et mesure que les PNG **diffèrent** (bytes et
   sha256). Aucun OCR : la seule variable ayant pu déplacer un pixel est la ligne de crédit.
3. **Le crédit corrigé rend l'artefact périmé, et la ré-production converge.** Même fichier :
   sur l'élément **déjà produit**, changer le label fait passer `stalenessOf` de `false` à
   `true` et `nextActions` de `["show"]` à `["produce"]` ; re-produire au label corrigé retombe
   **exactement sur le sha256 de l'autre run** — la staleness pointait une vraie différence.
4. **La livraison dit la même chose.** Même fichier : `deliver` → publisher `zip` → le `README.md`
   est **dézippé** et contient `Source: <label déclaré>`, ne contient ni le placeholder ni
   `Source: Heidi.news` (le profil rédaction passé exprès avec `source: "Heidi.news"`), et garde
   `Credit: Rédaction`.

---

## Risques assumés

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

**R1 — La branche kind-aware de `conformanceL0` n'est pas atteinte depuis un produce réel.**
`produce.ts` ne pose pas `sourceKind` sur le `NativeSpec`, donc chart-native appelle `conformanceL0`
sans kind et prend la branche historique. Interface exacte du threading, pour le slice qui le fera :
`NativeSpec.sourceKind?: SourceKind` (`skills/chart-native/src/spec-to-config.ts`) → injecté sur
chaque config au point unique de `specToNativeConfig` (là où `lang`/`subject`/`themeBg` le sont
déjà, ~l.909) → `ChartConfig.sourceKind` → passé par `checkGlobalConformance` à `conformanceL0`.
**Arbitrage :** ces trois fichiers sont hors du périmètre de ce chantier, et
`spec-to-config.ts` est le fichier le plus partagé de chart-native. Le refus au produce (§3.1)
couvre déjà le cas dangereux (`public` sans URL est refusé AVANT le rendu) — la conformance
kind-aware est la ceinture, pas la bretelle. Résidu **borné et nommé**, pas une promesse ouverte.

**R2 — Le finding `source-missing` de la render-review reste dépendant d'un `sourceName` composé
par l'hôte.** `lib/verify/review.ts:170` est dans un répertoire interdit à ce chantier, et rien en
`lib/` ne compose son `ReviewerSource` : il arrive par le payload du verbe `review`. Un hôte qui
compose ce payload à la main peut donc encore y mettre n'importe quoi. **Arbitrage :** le câbler
demande de décider *qui* compose le payload depuis le run, ce qui est un chantier de l'hôte, pas de
la policy. Ce qui est acquis ici : le crédit **rendu dans l'artefact** vient du ledger, donc un
`sourceName` divergent est désormais contredit par le pixel que la review regarde.

**R3 — `deliveryMetadata` garde `profile.source` comme repli quand AUCUN ledger n'est fourni.**
Un appelant direct sans run (test, hôte) obtient l'ancien comportement, placeholder compris.
**Arbitrage :** refuser sans ledger transformerait une fonction pure en fonction exigeant un
contexte de run, et casserait des appelants dans des répertoires interdits à ce chantier
(`lib/newsroom/**`). Le chemin de production est couvert autrement, et strictement : `deliver()`
exige `el.artifact` non périmé, `provenanceHash` inclut désormais `sources` (§5), donc un artefact
produit sans ledger est **stale** et la livraison le refuse avant d'atteindre la métadonnée. Le
repli n'est atteignable que hors boucle.

**R4 — Le crédit produit par la boucle est en anglais, quelle que soit la langue de l'article.**
`produce.ts` ne passe pas de `lang` (le manifest n'en porte pas). Le qualificatif `prose` et la
notice `synthetic` sortent donc en anglais dans l'artefact, alors qu'ils sortent localisés à la
livraison (`profile.lang`). **Arbitrage :** inventer une langue au produce serait pire que
l'absence (un qualificatif français sous un « Source: » anglais, puisque ChartFrame lit sa propre
`config.lang` que produce ne pose pas non plus). La vraie fermeture est un axe langue au niveau
run, qui bénéficierait aussi au titre et à la furniture — hors de ce chantier.

**R5 — Le refus au produce déplace le coût sur l'auteur du run, pas sur le journaliste.**
En l'état, rien dans la boucle ne *demande* la déclaration : `sourceQuestion()` existe et n'est
appelée par personne (résidu hérité de la spec source §6). Un journaliste rencontre donc un refus
avant de rencontrer la question. **Arbitrage :** le refus reste le bon défaut (§4), et le message
du refus **porte la question** — mais la place propre de cette question est le CADRAGE
(`lib/newsroom/ui-copy.ts` pour la copie localisée), interdit à ce chantier.

**R6 — Hacher le ledger entier re-value tous les hachages, y compris sur un changement
d'`internalRef` qui ne sort jamais.**
Un run qui corrige une référence interne (une note de rangement) verra son artefact devenir stale
et sera re-produit pour rien. **Arbitrage :** l'alternative — hacher une projection publique — fait
dépendre la fraîcheur d'une **deuxième** définition de « ce qui compte », qui pourrait diverger de
la première le jour où la projection change. Une re-production superflue coûte une minute ; une
staleness qui rate un crédit change ce que le lecteur lit. On hache l'état déclaré.

**R7 — Il existe un QUATRIÈME consommateur, non couvert : le contrat de verbe lui-même.**
Un hôte non-JS appelle `render` directement avec un `spec.source` de son choix (l'exemple de
`lib/host/README.md:463` est littéralement
`"source": { "name": "Provided by the newsroom" }`), sans passer par `produce()` — donc sans
policy, sans ledger, sans refus. Les trois points d'appel du §5 sont câblés ; ce chemin-là ne
l'est pas et n'est pas nommé dans la spec source. **Arbitrage :** le fermer signifie appliquer la
policy **dans le verbe `render`**, ce qui suppose de décider si un `spec.source` sans ledger est
une déclaration implicite (retour au devinage) ou un refus (rupture du contrat verbe pour tous
les hôtes existants). C'est une décision de contrat, pas de câblage — et `lib/core/verbs/**`
comme `lib/host/**` sont hors périmètre ici. Nommé pour que le prochain slice ne le redécouvre pas.

**R8 — Deux fixtures ont été migrées dans des répertoires que le périmètre interdisait.**
`lib/verify/real-artifact-proof.test.ts` et `lib/brain/acceptance.test.ts` appellent `produce()`
sur un run sans ledger : le refus du §4 les casse, et les laisser rouges aurait été livrer une
suite rouge. L'édition est **additive et minimale** (le bloc `sources` sur la fixture ; plus, pour
le premier, la constante `SOURCE` qui décrivait le placeholder comme « ce que produce.ts écrit
vraiment » et serait devenue un mensonge documenté). **Arbitrage :** affaiblir la décision §4 pour
éviter deux ajouts de fixture aurait été laisser la queue remuer le chien. Signalé plutôt que
dissimulé — c'est la limite d'instruction qui s'est révélée fausse, pas la décision.

**R9 — `attribution` ajoute un champ à `PublishedSource`, donc deux façons de rendre la même
chose.** Un appelant peut choisir le mauvais des deux et double-préfixer (« Source : Source : … »),
exactement le bug que ce champ existe pour éviter. **Arbitrage :** la distinction est réelle (les
moteurs possèdent déjà leur furniture, les README/zip non), la documenter dans le type est plus
sûr que de forcer chaque appelant à re-découper `credit` à la main sur un préfixe localisé. Un test
verrouille l'invariant `credit === sourceLabel(lang) + " " + attribution` pour toute classe créditée.
