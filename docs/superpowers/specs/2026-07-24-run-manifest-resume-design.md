# Spec — Sous-projet A : Run manifest complet + `resume`

> **Statut :** design validé (brainstorming, 2026-07-24). Prêt pour → writing-plans.
> **Origine :** décomposition du « Substrat » (spec-parapluie `2026-07-24-shell-and-desk-journey-design.md` §4) + issue GitHub Tom **#8** (`buriedsignals/splash`) + follow-ups de durcissement de la review finale de la 1ʳᵉ tranche.
> **Portée :** fait **grandir** le `RunManifest` minimal de `lib/loop/` (la boucle éditoriale mince) en ledger d'orchestration durable + livre une commande `resume` déterministe. **Ne touche PAS** le monolithe legacy (`accepted.json`/`report.json`, en retrait) ni un module standalone.
> **Hors scope :** contrat de verbes + adapters Goose (= sous-projet **B**, après A). LOGIQUE review/delivery réelle (= sous-projets Verify/Livraison — ici seulement les slots dormants + les règles d'héritage de provenance).
> **Langue :** prose FR, identifiants/fichiers/types en anglais (standard non-négociable).
> **Base git :** branche `feat/run-manifest-resume` **off `feat/editorial-loop-slice`** (worktree `splash-manifest`).

---

## 1. Problème (ce qu'on répare)

L'état d'orchestration de Splash est éparpillé — conversation + `accepted.json` + `report.json` + connaissance implicite de « quelle commande a tourné en dernier » (issue Tom #8, verbatim). Après un restart, une compaction de contexte, un crash de terminal, ou un handoff à un autre journaliste, **rien ne répond de façon déterministe** :

- À quel gate en est ce run ?
- Quels éléments sont proposés / acceptés / produits / reviewés / approuvés / livrés ?
- Quelle est la prochaine action valide ?
- Le rapport/artefact courant est-il toujours celui qui a été reviewé ?

L'agent reconstruit ça depuis de la prose et des fichiers — fragile, non auditable.

La 1ʳᵉ tranche (`lib/loop/`) a **prouvé** l'état-centre revisitable + l'invalidation par provenance sur le chemin `data→chart` mono-élément. Elle s'arrête à `produce`. Sa review finale a laissé des **follow-ups de durcissement explicitement déférés ici** (§7). Ce sous-projet est **la fondation dont tout le reste du Substrat dépend** : reprise + audit déterministes.

## 2. Décisions verrouillées (brainstorming 2026-07-24)

1. **A fait grandir `lib/loop/RunManifest`** — pas le monolithe legacy, pas un standalone. Le monolithe est en retrait ; le manifest ne l'enveloppe pas.
2. **Colonne complète + slots dormants.** A pose la machine à états complète (enum de gate + transitions valides + `nextActions`) ET le conteneur `elements[]` multi-élément. Les payloads des étapes non-construites (`review?`, `delivery?`) sont des slots optionnels minimaux, remplis plus tard par Verify/Livraison (via bump de `schemaVersion` si besoin). Motivation : éviter la migration douloureuse single→multi et faire du manifest la colonne vertébrale stable sur laquelle les sous-projets avals se branchent.
3. **`resume` = lecture/rapport pur.** Lit, valide, dérive, **imprime** ; ne mute **jamais**. C'est le `driver`/l'humain qui agit ensuite (respecte P1 : l'humain décide).
4. **Inputs gelés dans le run-dir ; le manifest stocke path (relatif) + content-hash, jamais le contenu, jamais un secret.** Self-contained au niveau du run (le dossier voyage entier au handoff). Colle au « points to exact versions » de #8.
5. **État de gate dérivé-d'abord + marqueurs de verdict explicites.** L'état = fonction pure des champs présents, SAUF les verdicts non-dérivables (`blocked`/`dropped`/`approved`) qui sont des marqueurs. Garde la propriété anti-desync du loop.
6. **Les follow-ups de durcissement de la tranche sont gravés ici** (hash canonique, `schemaVersion` lu + validation à la lecture, tmp unique, `produce` robuste).

## 3. Contrat typé (le schéma v2)

`schemaVersion: 1 → 2`. Le run = **un article/input**. `elements[]` = les visuels pour cet article ; partagé au niveau run, le reste per-élément.

```ts
type RunManifest = {
  runId: string;
  schemaVersion: 2;
  input: {                                        // gelé — jamais de contenu, jamais de secret
    data?:    { path: string; sha256: string };   // path relatif au run-dir
    article?: { path: string; sha256: string };
  };
  cadrage?: { answers: Record<string, string> };   // cadrage partagé, réponses confirmées, borné
  orient?:  { profile: DataProfile };              // profil factuel de la data partagée
  elements: RunElement[];
  events: RunEvent[];                              // log borné (ring capé) — failures + transitions
};

type RunElement = {
  id: string;
  angle?:    { confirmedTakeaway: string; emphasis?: string; altInsight: string; unit: string };
  proposal?: { options: FormOption[]; chosenId?: string };
  artifact?: { path: string; sha256: string; provenanceHash: string; producedAt: string };
  // --- slots DORMANTS (remplis par Verify #3/9/10/11 et Livraison #4) ---
  review?:   { findings: unknown[]; reviewedProvenanceHash: string };
  delivery?: { requested: string[]; delivered: { path: string; sha256: string }[] };
  // --- marqueurs de VERDICT (non-dérivables) ---
  blocked?:  { reason: string; at: string };
  dropped?:  { reason: string; at: string };
  approved?: { signoffPath: string; approvedProvenanceHash: string };  // se branche sur l'Ed25519 S4d
};

type FormOption = { id: string; nativeType: string; why: string };
type DataProfile = { columns: string[]; numericColumns: string[]; rowCount: number };
type RunEvent = {
  at: string;                    // ISO timestamp
  kind: "failure" | "transition";
  elementId?: string;
  action: string;                // le step tenté (ex "produce")
  message: string;               // borné, sans secret
};

type GateState =
  | "empty" | "oriented" | "angled" | "proposed" | "chosen"
  | "produced" | "stale" | "reviewed" | "approved" | "delivered"
  | "blocked" | "dropped";
```

**Notes de schéma :**
- `orient` reste au niveau run (il profile la data partagée). La 1ʳᵉ tranche couplait `profile` + `supportsPoint` ; en v2 le `profile` factuel est run-level, le verdict d'honnêteté per-point reste porté par la confirmation d'angle (l'honnêteté fine per-élément = proposal-cerveau #2).
- Le chemin **live** de A ne crée qu'**un** élément (`elements.length === 1`) jusqu'à ce que le proposal-cerveau #2 câble le multi. A bâtit le conteneur + le tracking indépendant, pas la production de N éléments.

## 4. État de gate — dérivé + verdicts explicites

`gateStateOf(run, el): GateState` = fonction **pure**, priorité décroissante :

`dropped` > `blocked` > `delivered` (delivery.delivered non vide) > `approved` (frais) > `reviewed` (frais) > `produced`|`stale` (artifact présent, selon provenance) > `chosen` (proposal.chosenId) > `proposed` (proposal) > `angled` (angle) > `oriented` (orient) > `empty`.

`nextActions(run, el): NextAction[]` dérive du même graphe. Les transitions `reviewed`/`approved`/`delivered` sont **modélisées mais inatteignables en live** tant que Verify/Livraison ne câblent pas leurs steps — dormant, pas absent.

Un **validateur** (`assertInvariants`) asserte que `state ↔ data` ne peut pas désync (ex : `approved` sans `artifact` = invalide ; `chosenId` absent des `options` = invalide). Appelé à la lecture et après chaque write.

## 5. Provenance & invalidation (le cœur revisitable, étendu)

```ts
// hash CANONIQUE (ordre de clés stable) de ce dont dépend l'artefact d'un élément.
provenanceHash(run, el) = canonicalHash({
  inputData:    run.input.data?.sha256 ?? null,
  inputArticle: run.input.article?.sha256 ?? null,
  cadrage:      run.cadrage?.answers ?? null,
  angle:        el.angle ?? null,
  chosenId:     el.proposal?.chosenId ?? null,
});

stalenessOf(run, el) = el.artifact != null
  && el.artifact.provenanceHash !== provenanceHash(run, el);
```

- `artifact.provenanceHash` figé au `produce` ; `stale` = mismatch (existant, durci par le hash canonique).
- **Règle d'héritage (critère #8).** `review.reviewedProvenanceHash` et `approved.approvedProvenanceHash` figent la provenance validée. Si l'angle/le cadrage/l'input change → la provenance change → **la review/approval périmée ne peut PAS être héritée** : `gateStateOf` la traite comme non-fraîche et retombe sur `stale`/`produced`. Mécanique, pas déclaratif. C'est le critère « a newer artifact, stale report, or changed accepted spec cannot inherit prior review/approval ».

## 6. Freeze des inputs (sans secret)

`freezeInput(runDir, srcPath, kind): { path; sha256 }` :
- copie le fichier apporté dans `<runDir>/input/` ;
- calcule le `sha256` du contenu ;
- retourne le path **relatif au run-dir** + le hash ;
- idempotent par hash (re-freeze du même contenu = no-op).

`produce` lit le **path gelé** (fini le contenu inline v1). `resume` re-hashe les fichiers gelés → détecte corruption/altération. Le manifest reste léger, committable, **zéro secret** — un test scanne le manifest sérialisé pour garantir qu'aucun contenu d'input n'y figure.

## 7. Durcissement — les follow-ups de la tranche, gravés ici

- **Hash canonique** : `canonicalHash` sérialise avec un ordre de clés stable → `provenanceHash` insensible à l'ordre JSON (corrige le follow-up).
- **`schemaVersion` lu + validation** : `readManifest` lit la version, **migre** si `< 2`, puis **zod-valide** (corrige « schemaVersion jamais lu » + « readManifest sans validation »).
- **Tmp unique** : `writeManifest` écrit dans `<path>.<pid>.<rand>.tmp` puis `rename` atomique (corrige « tmp non-unique »).
- **`produce` robuste** : exit-code non-zéro capturé → **failure event** appendé, **état non avancé** (corrige « exit-2 perdu ») ; temp dir de spec nettoyé (corrige « temp dir non nettoyé ») ; `existsSync` sur le path d'artefact avant de le recorder (corrige « path recordé sans existsSync »).

## 8. Événements & atomicité

- **Failure events** : tout step déterministe qui échoue append un `RunEvent{kind:"failure"}` **borné** et **n'avance pas l'état** (aucun champ de progression écrit). `events` = ring capé (~50 derniers) pour borner la taille du ledger. Critère #8 « failed commands append a bounded failure event without advancing state ».
- **Atomicité / crash recovery** : chaque write = tmp unique + `rename` atomique (même FS). Un crash laisse soit l'ancien soit le nouveau fichier **complet**, jamais partiel. Un `.tmp` orphelin est ignoré (jamais lu) et peut être nettoyé.

## 9. Migration de schéma

- `migrate(raw): RunManifest` — pur, testé.
- **v1 → v2** : enveloppe l'unique élément v1 (`angle`/`proposal`/`artifact` au niveau racine) dans `elements[0]` ; **gèle** le contenu `input.dataCsv` inline v1 en ref `input.data{path,sha256}` (écrit le fichier gelé) ; initialise `events: []`.
- Version **inconnue / plus récente que 2** → refus honnête (forward-incompatible, erreur claire) plutôt qu'une lecture silencieusement fausse.
- zod valide **après** migration.

## 10. `resume` — la commande (lecture/rapport pur)

`bun lib/loop/resume.ts <runDir | manifestPath>` :

1. Lit + zod-valide + migre si `schemaVersion < 2` (pur, en mémoire — n'écrit pas la migration).
2. Re-hashe les inputs gelés + les bytes d'artefact de chaque élément → **rapport de validation** (`ok` / `stale` / `missing` / `tampered`).
3. Dérive `gateState` + fraîcheur de provenance par élément.
4. Imprime, **sans jamais muter** :
   - **Statut journaliste** (dans sa langue) : par élément, en clair, « où on en est » + pourquoi c'est périmé le cas échéant.
   - **Next actions** : le/les pas valide(s) exact(s) (l'enum `nextActions` mappé en instruction concrète) — parle au journaliste (prose) ET au driver/agent (structuré).
   - **Validation** : hashes OK / dérive détectée.
5. Exit ≠ 0 **seulement** si le ledger est illisible/corrompu ; jamais pour un état normal.
6. **Ne déduit jamais** la complétion depuis du texte de conversation — uniquement depuis le manifest + les hashes (critère #8).

Cœur pur `resumeReport(run): ResumeReport` (testable sans I/O) + une fine couche CLI d'impression.

## 11. Architecture (unités isolées/testables)

Toutes sous `lib/loop/` (le dossier de la tranche). Chaque unité = une responsabilité, un fichier focalisé.

| Fichier | Responsabilité | Dépend de |
|---|---|---|
| `manifest.ts` | schéma v2 (zod) · `readManifest`(atomique/validé/migrant) · `writeManifest`(tmp unique) · `provenanceHash`(canonique) · `stalenessOf` · `gateStateOf` · `nextActions` · `assertInvariants` · `appendEvent` | zod, `migrate`, `canonicalHash` |
| `canonical-hash.ts` | sérialisation à ordre de clés stable + hash blake3 | @noble/hashes |
| `freeze.ts` | `freezeInput` (copie + hash dans le run-dir) | node:fs |
| `migrate.ts` | migration v1→v2 (pure) | `freeze` |
| `resume.ts` | `resumeReport(run)` pur + CLI read-only | `manifest` |
| `produce.ts` (maj) | lit l'input gelé · record `sha256`+`producedAt` · exit robuste · temp cleanup · `existsSync` · failure event | `manifest`, `freeze` |
| `driver.ts` / `revise.ts` / `orient.ts` / `propose.ts` (maj) | opèrent sur `elements[]` (longueur 1 en live), input gelé | `manifest` |

**Contrainte d'isolation :** aucune de ces unités n'importe un `src/` de moteur. La couture `produce` reste un subprocess vers `skills/chart-native/scripts/produce-from-spec.mjs` (prouvé propre par la tranche).

## 12. Flux de données (chemin live, mono-élément)

```
apporter(data + point)
  → freezeInput → manifest.input.data{path,sha256}
  → orient       → manifest.orient.profile
  → [journaliste confirme l'angle] → elements[0].angle
  → propose      → elements[0].proposal.options
  → [journaliste choisit] → elements[0].proposal.chosenId
  → produce      → elements[0].artifact{path,sha256,provenanceHash,producedAt}   [+ failure event si échec]
  → MONTRE
  → [journaliste revise l'emphase/angle] → revise → elements[0].angle' → artifact devient stale
  → produce (re-dérive) → MONTRE'

À tout moment : resume <runDir> → statut + next actions + validation (jamais de mutation)
```

`nextActions` state-driven, dérivé par élément. `gateStateOf` = fonction pure du manifest + des hashes. Rien n'est déduit de la conversation.

## 13. Gestion d'erreur / off-ramps

- **freeze** : fichier source absent/illisible → erreur claire, aucun état écrit.
- **produce** : gardes de conformance chart-native existantes (alt-text WCAG, contraste) réutilisées telles quelles ; échec → failure event borné, état non avancé.
- **stale** : `resume` et le step *montrer* refusent d'afficher un artefact `stale` comme courant (garde mécanique — critère #8).
- **manifest corrompu** : `resume` exit ≠ 0 avec message honnête ; ne devine jamais.
- **version inconnue** : refus explicite (§9).

## 14. Tests (`bun:test`, TDD — rouge d'abord) — couvrent l'acceptance #8

- `canonicalHash` / `provenanceHash` : golden + **invariant ordre-des-clés** (deux manifests équivalents à clés permutées → même hash).
- `gateStateOf` : chaque état atteint + **combos invalides rejetés** par `assertInvariants`.
- **staleness → non-héritage** (le test-clé) : changer l'angle → artefact `stale` → une `review`/`approved` figée sur l'ancienne provenance **n'est pas héritée** ; re-produce clear le stale ; jamais un `stale` montré comme courant.
- **multi-élément indépendant** : 2 éléments, l'un avance (angle→produce) sans toucher l'état de l'autre.
- **crash recovery** : write atomique ; un `.tmp` partiel/orphelin est ignoré ; le dernier manifest complet est lu.
- **migration v1→v2** : golden (manifest v1 réel de la tranche → v2 attendu, input gelé) ; version inconnue → refus.
- **`resume` ne mute jamais** : assert bytes du manifest inchangés après resume ; exit ≠ 0 uniquement sur corrompu ; statut + next actions corrects par état.
- **failure event** : produce en échec → event appendé, état non avancé.
- **no-secrets** : scan du manifest sérialisé → aucun contenu d'input, aucun token.
- **end-to-end** : cas réel — fermer + rouvrir un run reprend au **même gate** avec les **mêmes next actions**.

## 15. Critères de succès (miroir de l'acceptance #8)

1. Fermer et rouvrir un run reprend au même gate avec les mêmes actions valides.
2. Les runs multi-éléments trackent chaque élément indépendamment, sans dropper le travail non fini.
3. Un artefact plus récent, un rapport périmé, ou un spec accepté modifié est détecté et **ne peut pas hériter** review/approval antérieure.
4. Les updates du manifest sont atomiques et récupèrent proprement après interruption.
5. Aucune clé API, token, secret d'article, ou credential complet n'entre dans le manifest.
6. Les tests couvrent chaque transition de gate, les transitions invalides, la crash recovery, la provenance périmée, la migration de schéma, et la reprise multi-élément.

## 16. Hors scope (déféré — chacun sa case §4 de la spec-parapluie)

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

- Contrat de verbes abstraits + adapters Goose → sous-projet **B** (après A).
- LOGIQUE review/delivery réelle → sous-projets **Verify** (#3/9/10/11) & **Livraison** (#4). Ici : seulement les slots dormants `review?`/`delivery?` + les règles d'héritage de provenance.
- Production de **plusieurs** éléments depuis un article → besoin du **proposal-cerveau** (#2). A bâtit le conteneur `elements[]` + le tracking indépendant ; le chemin live crée 1 élément.
- Monolithe legacy (`accepted.json`/`report.json`, `gate.ts`, `produce-all`, `review-gate`) → en retrait, non enveloppé.

## 17. Contraintes globales

- Runtime **Bun**. Tests `bun:test` (`describe`/`it`/`expect`). **TDD** : test qui échoue avant l'implémentation, chaque tâche.
- Code, commentaires, identifiants, noms de fichiers, commits, branches : **anglais**.
- **Aucune mention** vendor (Claude/Anthropic) dans un artefact commité. Pas de `Co-Authored-By`.
- **Pas de nouveau `any`** ; pas d'import cross-moteur de `src/` (la couture passe par le CLI/verbe).
- Gate `bun run check` vert avant chaque commit.
- **Git** : branche `feat/run-manifest-resume` **off `feat/editorial-loop-slice`** (worktree `splash-manifest`).
