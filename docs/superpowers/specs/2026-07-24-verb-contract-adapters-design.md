# Spec — Contrat de verbes + adapters (Substrat, sous-projet B)

> **Statut :** design validé (brainstorming, 2026-07-24). Prêt pour → writing-plans (sur B1 seulement).
> **Parent :** `docs/superpowers/specs/2026-07-24-shell-and-desk-journey-design.md` §4, ligne « Substrat complet » (issue Tom **#8**). Sous-projet A (run manifest v2 + `resume`) est livré sur `feat/run-manifest-resume`.
> **Portée :** ce spec conçoit **le contrat entier** (§2) parce qu'un contrat ne se conçoit pas à moitié. Il se réalise en **deux tranches** : **B1** (§3, seam bas — le plan d'implémentation suit) et **B2** (§4, seam haut — plan ultérieur, éclairé par les findings de B1).
> **Branche :** `feat/verb-contract-adapters` off `feat/run-manifest-resume` (worktree `splash-verbs`).
> **Langue :** prose FR, identifiants/fichiers/types en anglais (standard non-négociable).

---

## 1. Problème (constaté dans le code, pas déduit)

Le spec-parapluie nomme deux dettes : **transport en dur** et **absence de verbes bornés** — avec pour conséquence « ne tourne pas dans Goose, qui exige un contrat d'exécution abstrait ».

L'audit du code montre une situation plus précise, et plus favorable :

- **Le contrat `render` et ses deux adapters existent déjà**, mais au mauvais endroit et pour le mauvais consommateur.
  - `lib/core/contract.ts:27-47` — `ProduceContext` in / `DeliveredArtifact` out, « threadé identiquement quel que soit le transport » ; `assertDeliveredContract` appliqué **une fois**.
  - `lib/core/registry.ts` — 6 manifests moteurs auto-enregistrés, `execution: "subprocess" | "in-process"`, `inProcess` réellement implémenté (dw-chart, map-dw) et awaité en `adapters.ts:412`.
  - `skills/splash/src/adapters.ts:311-420` (`realDispatch`) — registry-driven, **plus aucun switch par producteur**.
- **Et pourtant `lib/loop/produce.ts:67` contourne tout ça** avec son propre `execFileSync` vers `skills/chart-native/scripts/produce-from-spec.mjs` — exactement le script que `skills/chart-native/src/manifest.ts:20` déclare déjà. Deux chemins d'exécution pour la même chose.
- **La flèche de dépendance est inversée** : `lib/core/contract.ts:20-21` et `lib/core/registry.ts:10` type-importent `VisualFormat` / `Channel` depuis `skills/splash/src/`. Le « core » dépend du vocabulaire de l'orchestrateur legacy. `lib/loop/` est aujourd'hui **totalement libre d'imports `skills/`** — le consommer tel quel lui ferait perdre cette propriété.
- **`VisualFormat` est dupliqué à la main** (`skills/splash/src/channel.ts:13` et `producer-spec.ts:11`, commentaire « kept in sync by hand ») — risque de dérive documenté.
- **Les erreurs sortent en `throw` JS** côté boucle (`lib/loop/produce.ts:70`, converti ad hoc en event dans `driver.ts:28`) — un hôte non-JS n'a pas de `catch`.

**Donc B n'est pas « inventer une abstraction ». C'est sortir le dispatcher du legacy, lui donner un payload neutre, et faire de `lib/loop` son premier consommateur.**

### 1.1 Ce qu'on hérite / ce qu'on jette (décision explicite)

`realDispatch` porte des invariants durement gagnés — un clean-room les ferait re-découvrir un par un :

| Invariant | Preuve | Verdict |
|---|---|---|
| Jamais de `throw` — tout devient un résultat `failed` enregistré (« drop-proof ») | `adapters.ts:329-333`, `:390` | **hérité** |
| Gate de format **avant** tout appel API | `:377` | **hérité** |
| Validation spec-in au boundary (in-process) | `:389` | **hérité** |
| `freshOutDir` — outDir vierge à chaque dispatch (artefacts d'une tentative supersédée) | `:267-272` | **hérité** |
| stdout **et** stderr capturés, jamais hérités ; tail borné 30 lignes | `:201-224` | **hérité** |
| exit 2 = le moteur décline ce spec | `:237` | **hérité comme mécanisme** (voir §3.1) |
| `assertSafeId` anti-traversal | `:321` | **hérité** |
| `assertDeliveredContract` appliqué une fois | `:357`, `:413` | **hérité** |
| Types de payload `AcceptedProposal` / `Dispatch` (de `produce-all`) | `:311-314` | **jeté** — payload neutre |
| `formatFlag` — seam identité mort | `:165-167` | **jeté** |
| Politique de fallback native→DW (`needs-fallback`) | `:238-243` | **jeté du contrat**, reste chez l'appelant legacy |

**La garantie de ne rien hériter de cassé n'est pas l'isolement : c'est que la suite de tests existante de `adapters.ts` devient le filet de régression du code hoisté.**

---

## 2. Le contrat (conçu une fois, sert les deux seams)

### 2.1 Vocabulaire canonique

Fichier neuf **`lib/core/vocabulary.ts`**, sans dépendance montante. `skills/splash/src/producer-spec.ts` et `channel.ts` **ré-exportent** depuis lui : la flèche s'inverse, les ~46 importateurs existants ne bougent pas, et la duplication main de `VisualFormat` disparaît.

```ts
export type VisualFormat = "static" | "interactive" | "video" | "scrolly";
export type Channel = "social-vertical" | "social-feed" | "article-web";

// Enum FERMÉE — c'est ça, « verbes bornés » : une opération hors liste est un refus
// mécanique, pas une convention documentaire.
export const VERBS = ["render", "capture", "review", "publish"] as const;
export type Verb = (typeof VERBS)[number];
```

Les quatre verbes sont **déclarés** ici ; **seul `render` est implémenté en B1**. `capture` (viewport réel, issue #10) · `review` (indépendante, #9) · `publish` (idempotent/updatable, #4) sont des slots typés que leur propre sous-projet remplira. Déclarer un verbe ne décide pas sa politique.

### 2.2 Requête / résultat

```ts
// Payload de `render` — NEUTRE : ne connaît ni AcceptedProposal ni RunManifest.
export type RenderPayload = {
  engine: string;          // clé du registry ("chart-native", "dw-chart", …)
  spec: unknown;           // propriété du moteur, OPAQUE au contrat
  format: VisualFormat;
  channel: Channel;        // toujours résolu, jamais undefined
  outDir: string;
  id: string;              // slug ; assert anti-traversal avant tout accès disque
};

export type VerbResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: VerbErrorCode; message: string };

export type VerbErrorCode =
  | "invalid-request"      // verbe hors enum, payload malformé
  | "unknown-engine"       // aucun manifest enregistré sous cette clé
  | "unsupported-format"   // le moteur ne déclare pas ce format
  | "invalid-spec"         // manifest.validate a rendu des erreurs
  | "engine-declined"      // le moteur refuse CE spec (chart-native exit 2) + sa raison
  | "engine-failed"        // exécution non nulle : stderr borné (tail 30 lignes)
  | "not-implemented";     // verbe déclaré, corps pas encore écrit
```

`render` réussit en rendant un **`DeliveredArtifact`** — le type existant (`lib/core/contract.ts:41`), inchangé.

### 2.3 Invariants (chacun mécaniquement testable)

| # | Invariant | Raison |
|---|---|---|
| **I1** | **Jamais de `throw`** — tout sort en `VerbResult` | c'est le « drop-proof invariant » du legacy généralisé ; un hôte non-JS n'a pas de `catch` |
| **I2** | **Payload neutre** — le contrat ignore `AcceptedProposal` **et** `RunManifest` | c'est ce qui lui permet de servir le legacy et la boucle sans les coupler |
| **I3** | **Spec opaque** (`unknown`), validée par le moteur via son manifest | le contrat n'a pas à comprendre 42 specs moteurs |
| **I4** | **Enum fermée** — verbe hors liste ⇒ `invalid-request` | refus mécanique de l'improvisation |
| **I5** | **Zéro état ambiant** — le contrat ne lit jamais `process.env` | `SPLASH_CHANNEL` redevient un détail interne de l'adapter subprocess |
| **I6** | **Sérialisable JSON** — requête et résultat traversent `JSON.parse(JSON.stringify(x))` sans perte | **rend B2 gratuit** : la façade CLI n'est plus qu'un `main()` |
| **I7** | **Chemins, jamais des bytes** — un verbe rend `{path}`, jamais un blob base64 | corollaire de I6 : sinon la façade CLI charrie des mégaoctets en JSON |

---

## 3. B1 — le seam bas *(la tranche actionnable)*

### 3.1 Objectif

Faire de `runVerb("render", …)` **le seul chemin d'exécution** vers un moteur, pour le legacy **et** pour la boucle, avec un payload neutre et un résultat typé.

**La preuve que l'abstraction n'est pas un one-off : un verbe, deux transports.** Un même site d'appel pilote chart-native (subprocess, réseau-libre) **et** dw-chart (in-process, vraie API Datawrapper) sans savoir lequel tourne. C'est exactement le fork que `adapters.ts` codait en dur.

**Mécanisme vs politique (l'arbitrage qui structure B1).** L'exit-2 de chart-native est du *mécanisme* : le moteur décline ce spec. Le routage vers Datawrapper est de la *politique* du flow legacy. Le verbe rapporte donc `engine-declined` + la raison du moteur, et **l'appelant** décide : le legacy le traduit en son `needs-fallback` (zéro régression), la boucle l'ignore pour l'instant. La politique ne monte pas dans le contrat.

### 3.2 Scope

**DANS :** `lib/core/vocabulary.ts` + ré-exports · déplacement du mécanisme subprocess · le verbe `render` avec ses deux adapters · `runVerb` sur l'enum fermée · `realDispatch` réduit à un traducteur · `lib/loop/produce.ts` + `driver.ts` portés sur `VerbResult`.

**HORS :** corps de `capture` / `review` / `publish` (slots `not-implemented`) · la façade CLI (**B2**, §4) · MCP · le cerveau-proposal · la politique de fallback DW (reste chez l'appelant legacy) · le parcours SETUP (décor stubbé, cf. §3.4).

### 3.3 Architecture

| Fichier | Responsabilité | État |
|---|---|---|
| `lib/core/vocabulary.ts` | types canoniques + `VERBS` ; `producer-spec.ts`/`channel.ts` ré-exportent | créer |
| `lib/core/verbs/exec.ts` | mécanisme subprocess **déplacé** de `adapters.ts` : `runProducerScript` · `freshOutDir` · `collectOutputs` · `tail`/`toText` | déplacer |
| `lib/core/verbs/render.ts` | le verbe : lookup registry → branche transport → contract-assert → `VerbResult<DeliveredArtifact>` | créer |
| `lib/core/verbs/index.ts` | `runVerb(verb, payload)` sur l'enum fermée ; les 3 autres → `not-implemented` | créer |
| `skills/splash/src/adapters.ts` | `realDispatch` devient un **traducteur** `AcceptedProposal → RenderPayload`, puis `VerbResult → DispatchResult` (dont `engine-declined → needs-fallback`) | modifier |
| `lib/loop/produce.ts` | perd `execFileSync` et le chemin `skills/` ; assemble le `NativeSpec` (logique inchangée) ; un `runVerb("render")` ; rend un `VerbResult` | modifier |
| `lib/loop/driver.ts` | consomme le `VerbResult` → `appendEvent` **sans `try/catch`** (`:28` disparaît) | modifier |

`register-producers` doit être importé avant tout `runVerb` (le registry est vide sinon) — même contrainte qu'aujourd'hui (`adapters.ts:71`), à honorer depuis le nouveau point d'entrée.

### 3.4 Le décor stubbé

La boucle passe `channel: "article-web"` en **constante documentée**, pointant vers le sous-projet Préflight — conforme au « décor stubbé en config fixe » du spec-parapluie §5.2. Aucune lecture de `process.env` (I5).

### 3.5 Tests (`bun:test`, TDD — test rouge d'abord)

- **Le filet.** La suite de tests existante de `adapters.ts` passe **inchangée**. C'est la preuve que le hoist n'a rien perdu.
- **I1.** Chaque chemin d'erreur (moteur inconnu · format non supporté · spec invalide · exit≠0 · exit=2) rend un `VerbResult` — jamais un throw.
- **I4.** Un verbe hors enum ⇒ `invalid-request`.
- **I6.** `JSON.parse(JSON.stringify(req))` et idem pour le résultat : deep-equal. Testé **en B1** — c'est lui qui rend B2 gratuit.
- **La preuve deux-transports.** Un seul site d'appel pilote chart-native (subprocess, réseau-libre) et dw-chart (in-process, **vraie API** — pas de mock, convention projet ; **un** chart pour borner le flake).
- **Intégration boucle.** `produce` rend un vrai `static.png` chart-native, comme aujourd'hui.

### 3.6 Critères de succès

1. `lib/loop/produce.ts` ne contient plus ni `execFileSync` ni chemin vers `skills/` — un appel `runVerb("render")`.
2. `realDispatch` tient en traducteur et sa suite de tests est verte **inchangée**.
3. Le même appel `render` rend les deux moteurs, l'appelant ignorant le transport.
4. Toute requête et tout résultat round-trippent en JSON.
5. `bun run check` vert.

---

## 4. B2 — le seam haut *(conçu ici, planifié ensuite)*

### 4.1 Pourquoi une façade CLI (grounded)

Vérifié dans `buriedsignals/mycroft` : Goose consomme des **skills** markdown (`~/.local/share/goose/mycroft/source/skills`), des **recipes**, et des **extensions MCP** (`tools/validate-recipes.py` : `builtin`, `stdio`, `platform`, `streamable_http`, `frontend`, `inline_python`). Mais `extensions/manifest.json` montre que le pattern **dominant** du pack est le **CLI / REST** (`ft-cli`, `firecrawl-cli`, « No CLI — recipes call REST API via curl »). Et `llms.txt` annonce **« Splash for Visual Journalism is coming in September 2026 »** — le seam haut est aligné sur la date de la bourse.

Une façade CLI marche donc dès aujourd'hui dans Goose **et** dans n'importe quel hôte agentique en ligne de commande (via Bash), sans dépendance protocole ni cycle de vie de serveur.

### 4.2 La surface

L'état vit dans le run dir : **l'hôte ne tient rien**.

```
splash state  --run <dir>              → JSON : manifest + gate state    (resume.ts, déjà écrit)
splash next   --run <dir>              → JSON : nextActions(manifest)    (déjà écrit)
splash verb <name> --run <dir> < req   → JSON : VerbResult
splash verbs                           → JSON : déclaration de capacité (enum + schéma de payload)
```

Codes de sortie stables : `0` succès · `1` verbe refusé (`ok:false`) · `2` usage/entrée illisible.

`state` et `next` sont **déjà implémentés** par le sous-projet A — B2 les habille, ne les invente pas. `splash verbs` est ce qui rendra un wrapper MCP **mécanique** plus tard (les tools se génèrent depuis la déclaration) : le choix CLI ne ferme pas la porte MCP, il la prépare.

### 4.3 Ce que B1 doit révéler avant qu'on écrive B2

C'est le rôle de-risk de la tranche. **Si le payload neutre ne suffit pas à `render` sans re-remonter du contexte legacy** (un champ d'`AcceptedProposal` qui revient par la fenêtre), alors la frontière verbe/appelant est mal placée — et B2 doit être re-conçu **avant** d'exposer une surface publique à Goose.

---

## 5. Risques

| Risque | Réponse |
|---|---|
| Le hoist touche un legacy encore vivant | Sa suite de tests reste le filet ; `realDispatch` reste behavior-preserving ; aucune politique ne bouge |
| Sur-abstraction si le legacy meurt vite (un seul appelant réel) | Deux appelants dès B1 ; le bénéfice visé est Goose (B2), pas le legacy |
| `spec: unknown` fait échouer un mauvais spec plus tard | Inchangé vs aujourd'hui : `validate` au boundary en in-process, in-script en subprocess (non préempté délibérément, `adapters.ts:335-341`) |
| dw-chart dans le gate = vrai appel API → flake réseau | Convention projet existante (e2e DW plafonné) : **un** chart |
| Le déplacement de `runProducerScript` & co. casse un importateur legacy | Ils sont exportés depuis `adapters.ts` : ré-exporter depuis l'ancien emplacement le temps du port, ou re-pointer les imports — tranché à l'implémentation, gate vert comme preuve |

---

## 6. Contraintes globales

- Runtime **Bun**. Tests `bun:test` (`describe`/`it`/`expect`). **TDD** : test qui échoue avant l'implémentation, chaque tâche.
- Code, commentaires, identifiants, noms de fichiers, commits, branches : **anglais**.
- **Aucune mention** vendor dans un artefact commité. Pas de `Co-Authored-By`.
- **Pas de nouveau `any`**. Pas de mock d'API externe (vraies clés, vrais échecs).
- Gate `bun run check` vert avant chaque commit.
- Branche `feat/verb-contract-adapters` off `feat/run-manifest-resume` (worktree `splash-verbs`).
