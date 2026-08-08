# Audit — les verbes et les gates de Splash tiennent-ils quand le pilote est Goose ?

> **Date :** 2026-08-02. **Arbre lu :** `/Users/rmdms/Sites/Professional/splash-merge`, branche `main`,
> HEAD `4ccfa00f`. **Mode :** lecture seule — aucun fichier modifié, aucun run exécuté, `bun run check`
> non lancé, Goose non lancé. Tout ce qui suit vient de la lecture du code et de commandes
> d'énumération non destructives (`grep`, `find`, `git show`).
> **Langue :** prose FR, identifiants et chemins en anglais.

---

## 0. Ce que cet audit peut établir, et ce qu'il ne peut pas

Trois classes de conclusions, à ne pas confondre :

- **Établi par lecture** — un gate existe dans le code, un chemin d'appel le traverse ou l'évite. Ces
  affirmations citent un fichier et une ligne. C'est l'essentiel du document.
- **Établi par la trace d'un run passé** — ce que `docs/installer/goose-proof.md` a mesuré en direct le
  2026-07-14. Je le rapporte, je ne le rejoue pas.
- **Indécidable sans exécuter Goose contre une clé payante** — signalé explicitement à chaque fois, avec
  ce qui le trancherait (§ 5). Je ne comble aucun de ces trous par inférence.

**Deux rectificatifs de périmètre, avant tout le reste :**

1. Le document de conception `docs/superpowers/specs/2026-07-30-skill-phase-split-design.md` **n'existe
   pas dans `main`**. Il vit sur la branche `feat/skill-phase-split`, commit `99b2eb76`. Je l'ai lu via
   `git show`. Il porte le statut « conçu, non implémenté ». Sa conclusion la plus importante pour cet
   audit est en § 2.6 ci-dessous, et elle n'est pas celle qu'on attendrait.
2. `lib/host/gates.ts` ne contient **pas** les gates du journaliste. Il contient trois actes de façade —
   `describePrecheck` (`gates.ts:75`), `presentIn` (`gates.ts:144`), `describeProbeRun` (`gates.ts:160`).
   Les vrais points d'arrêt du parcours sont ailleurs : dans `skills/splash/SKILL.md` (la prose), dans
   `skills/splash/src/*.ts` + `skills/splash/scripts/*.mjs` (la chaîne prose), et dans `lib/loop/*`
   (la boucle V2, que le journaliste n'atteint jamais — § 3).

---

## 1. Les gates, énumérées

### 1.1 La grille de lecture

Pour chaque gate, trois questions distinctes, parce que les remèdes diffèrent :

- **Où il vit** — prose (`SKILL.md`) ou code.
- **Ce qui l'applique réellement** — quel symbole refuse quoi, et sur quelle donnée.
- **Ce qui tient si le modèle désobéit** — c'est la seule colonne qui compte pour un audit multi-hôte.

Et une distinction que je maintiens partout, parce qu'elle est le cœur de la commande :
**une garde de PRÉSENCE n'est pas une garde de VÉRITÉ.** `confirmedTakeaway` doit être non vide pour que
le produce parte ; rien ne vérifie que la phrase a été confirmée par un humain. C'est un levier réel — il
force le modèle à écrire quelque chose et rend le mensonge explicite — mais c'est un levier de forme.

### 1.2 Le tableau

| # | Gate | Où il vit | Ce qui l'applique | Tient si le modèle désobéit ? |
|---|---|---|---|---|
| G0 | INPUT — capacités + clés | prose, `SKILL.md:98-171` | `bun lib/host/cli.ts newsroom` ; `preflight.mjs` **« ALWAYS exits 0 »** (son propre en-tête) | **Non.** Annonce, jamais blocage. Assumé et écrit. |
| G1 | CADRAGE — branche DIRECT/GUIDED | prose, `SKILL.md:209-216` | trace auto-déclarée : premier jeton de `skillsInvoked` (`validate-gate.ts:648`) | **Non.** Le modèle écrit le jeton lui-même. |
| **G1b** | **Takeaway confirmé** | prose, `SKILL.md:217-225` + code | GUARD 3 : `confirmedTakeaway` absent/vide ⇒ `status:"failed"` (`validate-gate.ts`, cité `SKILL.md:895-899`) ; GUARD 3b : deux propositions au takeaway byte-identique ⇒ échec | **Présence oui, vérité non.** Un takeaway inventé et jamais soumis passe. |
| G1b′ | Arc narratif (scrolly/vidéo, carte) | prose + code | `arcErrors` (`chart-story.ts`), `unsupportedArcBeatsErrors` (`map-arc.ts`), `validateHexGridConfig` | **Forme oui.** L'ancre doit exister dans les données — c'est une vérification de contenu réelle. Le fait que le journaliste ait vu le plan, non. |
| G2b | Table de prose | prose, `SKILL.md:341-352` | `produce-all` renvoie `needs-confirmation` si `provenance:"prose"` et `confirmedTable ≠ true` (`SKILL.md:962-964`) | **Non.** `provenance` **et** `confirmedTable` sont tous deux écrits à la main par le modèle. Déclarer `provenance:"table"` désarme la gate entière. |
| G2c | Source établie avant routage | prose, `SKILL.md:353-386` | GUARD 2 : URL sur TLD réservé (`example.com`, `.test`, `.invalid`, `.localhost`) ⇒ échec (`src/source-guard.ts`) ; `sourceNamePreservedReason` / `sourceUrlFidelityReason` comparent la source livrée au `sourceHint` | **Partiellement — et le document l'avoue.** `SKILL.md:865-868` : « there is no script that transforms `suggest-article`'s in-context ProposalSet into `accepted.json` — YOU copy the hint across here, verbatim. **Dropping `sourceHint` silently disarms those guards.** » Le filet (`SKILL.md:868-872`) est un **warning non bloquant**. |
| G-Q6 | Canal | prose, `SKILL.md:431-470` | `channel` requis dans `accepted.json` ; `assertFormatAllowed(channel, format)` au produce | **Oui pour la cohérence, non pour l'origine.** Un `channel` **absent** retombe sur le permissif `article-web` (`SKILL.md:900-903`) ; garbled = fail-closed. |
| **G2** | **PROPOSITION — menu vetoable** | prose + code | `produce-all` **refuse** toute proposition non-directe dont le `producer` n'est pas nommé dans `candidates.json`, et refuse tout run **sans** `candidates.json` (`SKILL.md:515-518`). Vérifiable seul : `bun lib/host/cli.ts precheck --stage production` (`gates.ts:82`, `productionPrecondition`) | **Oui pour l'existence du menu, non pour son antériorité.** `candidates.json` est écrit à la main (§ 2.1) : rien n'empêche de l'écrire *après* avoir décidé. L'exemption directe est auto-déclarée (`skillsInvoked`). |
| **G3a** | **Relecture du rendu** | prose + code | `review-gate.mjs` — **c'est le seul endroit du parcours où le code remplace le jugement du modèle** : chaque sonde `mechanical` porte son argv, le script **l'exécute lui-même**, et le `outcome` enregistré est le code de sortie réel, « never what you wrote for it » (`SKILL.md:1028-1031`). Une sonde `editorial` exige `--reviewer <name>@<version>`. `assertShippable` refuse un `!r.reviewed` (`export-guard.ts:29-32`) | **Oui, réellement.** Le ledger n'est pas auto-noté. C'est le gate le plus solide du parcours. |
| **G3b** | **Montrer, puis demander, puis approuver** | prose + code | `applyRenderGate` (`gate.ts:14-58`) est **le seul écrivain** de `renderApproved`. Il exige : `status==="produced"`, `r.reviewed`, et surtout `shownCovers(artifactPath, approvedHash)` (`gate.ts:41-42`) — le reçu de présentation écrit par `bun lib/host/cli.ts present --path` (`lib/loop/presentation.ts:52-96`), **relu depuis le chemin de l'artefact, jamais fourni par l'appelant** | **Oui, sur les octets.** Approuver un artefact que personne n'a « ouvert », ou modifié depuis l'ouverture, est un refus dur. ⚠️ Une réserve réelle : le reçu peut valoir `presentedAs:"path-printed"` (`preview.ts:80,92,101`) et `shownCovers` **l'accepte** — sur une machine sans viewer, la gate passe alors que rien ne s'est affiché. |
| G3-prov | Provenance du rendu | code | `assertChainProvenance` — refuse tout artefact dont la chaîne ne trace pas `candidates.json → accepted.json → produce-all → outputs` (`SKILL.md:1365`, `export-code.mjs:203`) ; `generatedAt` invalide une approbation de génération périmée | **Oui.** Structurel, pas déclaratif. |
| **G4** | **EXPORT — choix de la forme a/b/c** | prose, `SKILL.md:1164-1249` | Le **deux-phases** est mécanique : phase 1 (sans `--form`) ne construit rien, phase 2 (`--form`) construit et livre ; `assertDelivered(files,{format,form})` refuse une forme mal formée. **Mais le WAIT est pure prose** : `SKILL.md:1182-1193`, « ★ WAIT means WAIT: after emitting the proposal, `--form` MUST NOT run until a journalist message answering THIS proposal exists in the conversation » | **Non.** Aucun mécanisme n'empêche d'enchaîner phase 1 et phase 2 dans le même tour. Le document nomme la violation observée (« je finalise pour les deux ») et n'a que sa propre phrase pour l'arrêter. |
| G4-place | Placement dans l'article | code | `undeclaredPlacementRefusal` — un élément qui ne déclare ni `anchor` ni `freeStanding` est **refusé avant tout mkdir/copy** (`export-code.mjs:236-244`) | **Oui.** |
| G4-signoff | Sign-off éditorial | code | `assertEditoriallyCleared` re-vérifie les signatures Ed25519 contre les octets exacts (`export-code.mjs:277-303`, `deploy-embed.mjs:96`) | **Oui — mais seulement si `requiredSigners` est déclaré.** Sans signataire déclaré : n'affiche que l'état honnête (`EDITORIAL: unsigned — LLM render-approval only`, `export-code.mjs:293`) et laisse passer. |

### 1.3 Ce que ça donne en une phrase

Le parcours a **trois gates réellement mécaniques** — G3a (les sondes tournent pour de vrai), G3b (l'approbation est liée aux octets montrés) et la chaîne de provenance — plus une famille de gardes de **forme** qui obligent le modèle à écrire ses affirmations quelque part. Tout le reste — la branche, la table de prose, la source, le canal, l'antériorité du menu, l'attente à l'export — repose sur la prose et sur des champs que le modèle remplit lui-même.

Et — c'est le point qui compte pour la commande — **presque rien de tout cela ne tient grâce à Claude Code.** Le harness ne fait respecter aucun gate. Ce qu'il apporte est ailleurs (§ 2) : trois *comportements* que la prose suppose acquis.

---

## 2. Ce qui casse sur Goose spécifiquement

### 2.1 L'invocation imbriquée — le risque n° 1, et il est structurel

La prose exige, en toutes lettres, de vraies invocations de skill depuis l'intérieur d'un skill :

- `SKILL.md:175` — « Invoke `suggest-article` **as a real Skill call** (not a mental paraphrase — actually run the `suggest-article` skill) »
- `SKILL.md:485` — « invoke `suggest-chart` **as a real Skill call** »
- `SKILL.md:1366` (liste Never) — « This means actually INVOKING `suggest-article` … and `suggest-chart` … as real Skill calls … their eval-hardened guardrails and KB grounding only fire when they genuinely run »

C'est exactement la couche que le run Goose du 2026-07-14 **n'a pas atteinte**. `goose-proof.md:53-55` : Goose a activé le skill `splash` (`# Loaded Skill: splash`), lu son flux et conduit l'orchestration « toward `suggest-article`/`suggest-chart` », puis le quota Gemini gratuit (`free_tier_requests limit: 5`) l'a coupé « BEFORE the nested invocation completed ». Codex, lui, a bouclé la chaîne : `codex-proof.md:127-134` — « a full `codex exec` run … invoked `splash:suggest-article` → `splash:suggest-chart` → `splash:dw-chart` as real nested skill calls and wrote a correct `accepted.json` ».

**Pourquoi c'est structurel et pas seulement « non prouvé ».** La seule garde qui prétend attraper l'absence d'invocation est GUARD 5 : `validate-gate.ts:655` fait échouer une proposition guidée qui ne liste pas `suggest-chart` dans `skillsInvoked`. Mais `skillsInvoked` est **écrit par le modèle lui-même** (`SKILL.md:859-860`, « the skills you actually invoked … Copied across like `channel`/`confirmedTakeaway` »). Un hôte qui ne sait pas imbriquer, mais qui lit `skills/suggest-chart/SKILL.md` de mémoire et écrit `skillsInvoked: ["splash:cadrage-guided","suggest-chart"]`, **passe la garde sans avoir rien invoqué**. Le produce part, le chart sort, et la seule chose perdue est le grounding KB — silencieusement.

C'est le seul endroit de tout l'audit où une défaillance d'hôte produit un artefact **qui a l'air correct et ne l'est pas**.

Le remède est déjà écrit, ailleurs, et jamais appliqué — `codex-proof.md:66-71` :

> « **FAIL → documented fallback (do NOT apply blind):** if Codex will not fire a *skill-from-within-a-skill* natively, the fix is to reword the orchestrator's invocation lines … to an explicit, tool-agnostic instruction like *"read `skills/suggest-chart/SKILL.md` and follow it"* — which Codex's read/shell tools can always do. »

Ce reformulage est **plus robuste que l'invocation native pour tout hôte**, et il est indépendant de Goose.

### 2.2 Le point d'entrée : `/splash` n'existe pas sur Goose

`commands/splash.md` est un slash-command de plugin Claude Code, et `commands/` n'est câblé que par `--plugin-dir` (`install/runtimes/claude.sh:15`, `runtime_launch_cmd() { echo 'claude --plugin-dir .'; }`). `install/bootstrap.sh:14` le dit : « Claude Code uses `--plugin-dir` instead and does not call this. » Goose lance `goose session` nu (`install/runtimes/goose.sh:29`) et découvre les skills par `~/.agents/skills/` (`bootstrap.sh:15-20`).

Or le catalogue journaliste continue de documenter la porte Claude : `skills/using-splash/SKILL.md:14` — « Start the end-to-end flow: `/splash "<article/data>"` » — et `:23` — « **`splash`** (via `/splash`) ». Un journaliste Goose qui tape `/splash` ne déclenche rien.

**Impact réel : faible.** Le run du 2026-07-14 prouve que l'activation par `description` fonctionne (`# Loaded Skill: splash`). C'est de la documentation périmée, pas une panne.

### 2.3 Les chemins relatifs — la panne la plus probable en usage réel

**Chaque** commande exécutable de la prose est relative à la racine du dépôt, et **aucun `SKILL.md` ne dit jamais comment trouver cette racine.** Recensement :

- `bun lib/host/cli.ts …` — `SKILL.md:99, 920, 1239, 1370, 1371, 1383, 1386`
- `bun skills/splash/scripts/…` — `SKILL.md:117, 690, 908, 910, 912, 930-931, 1044, 1069, 1148, 1156, 1172, 1212`
- `cd skills/<engine>` — `skills/scrolly/SKILL.md:156-163`, `skills/chart-native/SKILL.md:185-192`, `skills/map-native/SKILL.md:290-304`
- Un placeholder `<repo-root>` **jamais défini nulle part** : `suggest-article/SKILL.md:116-117`, `suggest-chart/SKILL.md:104, 124, 213, 240`
- Un chemin absolu **littéralement faux** — `/splash/.env`, alors que l'installeur pose `~/Splash/.env` (`bootstrap.sh:9`) : `dw-chart/SKILL.md:23, 46`, `map-dw/SKILL.md:175`, `suggest-chart/SKILL.md:371, 413, 452, 493`

La **seule** chose qui fait résoudre ces chemins est le lanceur généré, `bootstrap.sh:102` :

```bash
cd "$(dirname "$0")" && set -a && . ./.env && set +a && $launch_cmd
```

Sur Claude Code, `--plugin-dir .` porte en plus le contexte du dépôt dans la commande elle-même. Sur Goose, `goose session` ne porte rien : **si le journaliste lance Goose autrement que par le double-clic sur `Launch Splash.command`** — depuis le Terminal, depuis un autre dossier, ou après un `cd` — toute la chaîne de commandes échoue, y compris les trois gates réellement mécaniques. Codex a d'ailleurs déjà rencontré ça et l'a écrit noir sur blanc, `.codex/INSTALL.md:69` : « Launch Codex **from `~/Splash`** ». Goose n'a pas d'équivalent.

C'est une panne bruyante (le run se plante), pas silencieuse — donc « run échoué », pas « artefact faux ». Mais c'est le mode de panne le plus probable en conditions réelles.

### 2.4 L'outil de question structurée — les gates deviennent de la prose libre

`SKILL.md:184-187` :

> « Ask each question as ONE well-formed **single-select prompt** (a short header, 2–4 concrete options) and wait for the answer before the next — never batch several into one call, **which is what malforms the question tool**. »

et `SKILL.md:432` : le canal (Q6) est « a **STRUCTURED single-select** … exactly three options ». Ces trois options mappent 1:1 sur l'énum `Channel` de `skills/splash/src/channel.ts`, qui fixe la taille du média et l'ensemble des formats autorisés.

Le CLI Goose n'a pas d'outil de question structurée : il répond en texte. **Aucune formulation de repli n'est décrite nulle part** dans la prose. Conséquence concrète : sur Goose, le mapping réponse-libre → énum `Channel` est fait par le modèle, sans surface structurée. Un canal mal mappé est fail-closed au produce (`assertFormatAllowed`), mais un canal **absent** retombe sur le permissif `article-web` (`SKILL.md:900-903`) — c'est-à-dire le canal qui autorise l'interactif.

Note honnête : ce n'est pas *strictement* Claude-only — d'autres hôtes ont des primitives de choix. Mais la prose ne prévoit qu'un cas et n'en nomme aucun autre.

### 2.5 `SendUserFile` — nommé en premier, inexistant sur Goose

`SKILL.md:1050` et `:1371` nomment `SendUserFile` comme l'acte de montrer le rendu. Cet outil n'existe pas dans Goose.

**Mais le mécanisme réel est déjà tool-agnostique**, et la même ligne `:1371` le dit : « the duty is one command: `bun lib/host/cli.ts present --path <artifact>` ». `present` résout l'ouvreur de la plateforme — `open` / `start` / `xdg-open` (`preview.ts:58-61`) — et écrit le reçu que `applyRenderGate` relit. Le mécanisme est *plus* portable que le texte qui le précède.

Il reste la réserve de § 1.2 : sur une machine sans serveur d'affichage (`preview.ts:86-94`), le reçu vaut `path-printed` et `shownCovers` l'accepte. G3b devient alors « un chemin a été imprimé », pas « quelque chose s'est affiché ». C'est un choix assumé (le fallback porte sa raison), mais c'est le plancher réel de la gate.

### 2.6 Le découpage par phase augmenterait la dépendance à l'imbrication

La spec `2026-07-30-skill-phase-split-design.md` (branche `feat/skill-phase-split`, `99b2eb76`, statut « conçu, non implémenté ») propose de ramener la racine à ~200 lignes et de sortir cinq skills de phase : `splash-input`, `splash-cadrage`, `splash-proposition`, `splash-production`, `splash-export`.

Le diagnostic est juste et mesuré — 1354 lignes chargées d'un bloc, et « 5 des 8 retours d'un test manuel portaient sur des règles DÉJÀ écrites, dont deux citant mot pour mot la phrase fautive ». La spec est d'ailleurs lucide sur sa propre portée : « **le découpage seul ne répare pas l'obéissance** … La règle a été lue et violée. »

**Mais du point de vue multi-hôte, ce découpage déplace le parcours entier sur le mécanisme le moins prouvé de Goose.** Aujourd'hui, deux invocations imbriquées sont requises (`suggest-article`, `suggest-chart`) ; après découpage, **cinq de plus**, et cette fois pour les *règles de parcours* elles-mêmes, pas pour les suggesteurs. Un hôte qui n'imbrique pas se retrouverait avec **moins** de règles en contexte qu'avant — la spec le voit et prévoit la parade (§ 1, item 2 : « **La garde d'invocation** — sans elle, le découpage crée un mode de panne neuf … un run qui n'invoque pas le skill de sa phase a **moins** de règles en contexte qu'avant » ; § 3 : « Si le skill ne se charge pas, **ARRÊTE-TOI** »).

**Recommandation :** ne pas exécuter ce découpage avant que Layer B soit passé sur Goose (§ 5). Sur un hôte qui n'imbrique pas, la garde d'invocation transforme un run dégradé en run mort — ce qui est le bon comportement, mais rend Goose inutilisable jusqu'à ce que le reformulage `codex-proof.md:69` (« read `skills/<x>/SKILL.md` and follow it ») soit appliqué. **Les deux chantiers vont ensemble.**

### 2.7 La récursion dans `node_modules` — confirmée, non corrigée, et pire qu'au moment de la mesure

`goose-proof.md:37-42` a relevé que Goose descend *dans* les répertoires de skill symlinkés et fait remonter deux skills de dépendance : `playwright-cli` et `playwright-trace`. « Flagged, not fixed here. »

État vérifié aujourd'hui dans cet arbre :

- Les manifestes parasites **existent** : `skills/dw-chart/node_modules/playwright-core/lib/tools/trace/SKILL.md` (`name: playwright-trace`) et `.../cli-client/skill/SKILL.md` (`name: playwright-cli`). Idem sous `chart-native`, `map-native`, `scrolly` — 2 chacun, soit **8 entrées parasites potentielles**.
- **Aucun `.gooseignore`** nulle part — ni dans le dépôt, ni dans `$HOME`. Le seul endroit où la chaîne apparaît est le paragraphe de suivi de `goose-proof.md:41`.
- `link_agents_skills` (`bootstrap.sh:15-20`) symlinke le **répertoire entier**, sans exclusion : `ln -sfn "$skill_dir" …`. Zéro occurrence de `node_modules` dans tout `install/`.
- `node_modules` est gitignoré donc absent du zip, **mais** `bootstrap.sh:45` et `:80-85` relancent `bun install` à la racine et dans `chart-native`/`map-native` après dézippage — ce qui le **recrée à l'intérieur de l'arbre symlinké**.
- Le compte a grimpé : le dépôt a maintenant **12** répertoires de skill (11 avec `SKILL.md`) contre 8 au moment de la preuve, `link_agents_skills` les prend tous.

Cosmétique pour la correction d'un artefact ; réel pour la confiance d'un journaliste qui voit `playwright-trace` dans sa liste de skills.

### 2.8 Le test hermétique Goose ne teste pas le vrai helper

`docs/installer/goose-runtime.test.ts:78-83` **ré-implémente** `link_agents_skills` en ligne dans son harnais bash au lieu de l'extraire de `bootstrap.sh`. Le test Codex fait exactement l'inverse — `codex-runtime.test.ts:20-27` extrait la vraie fonction par regex, avec le commentaire : « Extract the REAL shared link_agents_skills helper from bootstrap.sh so the behavioral test exercises the actual seam wiring codex.sh depends on, **not a re-implementation of it** ».

Conséquence : une dérive du vrai helper (exclusion de `node_modules`, changement de destination) ne rougirait pas le test Goose. C'est précisément la classe « le chemin de vérification évite la casse ».

### 2.9 `goose.sh` ne pose aucune configuration, contrairement à `codex.sh`

`codex.sh:31-52` écrit `~/.codex/config.toml` (`sandbox_mode = "workspace-write"`, `approval_policy = "on-request"`, `network_access = true`) — parce que sans réseau ni écriture, aucun producteur ne tourne. `goose.sh` n'écrit **rien** : `:2-3` revendique « zero extra config », et `:4-6` laisse le journaliste faire `goose configure`.

**Indécidable par lecture :** je ne peux pas établir depuis ce dépôt si le `goose session` par défaut (a) a l'extension `developer` active, donc un outil shell, (b) demande une approbation par commande, et (c) laisse passer les appels réseau des producteurs. Ce sont trois conditions nécessaires au parcours, et zéro ligne du dépôt ne les vérifie ni ne les documente. Codex a dû le découvrir et l'écrire (`codex-proof.md:136-143` : sous `approval_policy=never`, les écritures Playwright hors workspace sont refusées et le produce ne finit pas).

### 2.10 Ce qui, contrairement à l'intuition, ne casse PAS sur Goose

À dire aussi, sinon l'audit est déséquilibré :

- **Découverte des skills** : prouvée en direct, `goose skills list` liste les 8 (`goose-proof.md:33-36`). Goose est même « the cheapest of the three non-Claude adapters on the discovery axis » (`:64`).
- **Frontmatter** : aucun skill ne porte `allowed-tools`, `model`, `license` — rien de Claude-spécifique. Deux portent un `output_mode` non standard (`dw-chart/SKILL.md:4`, `map-dw/SKILL.md:4`) ; le risque a été retiré côté Gemini (`gemini-proof.md:152-154`), non re-testé côté Goose. Faible.
- **Les interdits Agent/Task** (`SKILL.md:1014-1015`, `:1387`) sont sans objet sur Goose — inoffensifs.
- **Aucun hook, aucun `settings.json`, aucun `.claude/`** dans le dépôt. La prose ne dépend d'aucun mécanisme de configuration Claude Code.
- **La façade CLI est délibérément conçue pour ce cas** — `lib/host/README.md:1536` : « A CLI façade works today in Goose, and in any other agentic host that can spawn a process and read stdout ».

---

## 3. L'écart entre les deux surfaces de verbes

### 3.1 La question, précisément

`lib/host/capabilities.ts:31-38` déclare :

```ts
export const HOST_ONLY_VERBS = {
  publish: {
    why: "publishing goes through the editorial loop, which applies the sign-off, provenance and readiness gates the neutral contract cannot see",
    commands: ["request-delivery --run <dir>", "advance --run <dir>"],
  },
};
```

`cli.ts:456-468` refuse `verb publish` avant même de lire stdin. La question posée est : **le chemin prose applique-t-il ces mêmes gates, ou peut-il produire et livrer en les sautant ?**

### 3.2 D'abord, le fait de structure : les deux chaînes ne se touchent pas

`docs/splash/two-chains-gap-2026-07-28.md` § 1.3 l'a mesuré et je le confirme par lecture : **aucun pont exécutable.** Aucun fichier de `skills/` n'importe ni ne lance `lib/loop` ou `lib/host`. Rien dans le dépôt ne lance `lib/host/cli.ts` hors des tests et de la doc.

Donc le parcours journaliste **ne crée jamais de run**, n'appelle jamais `deliver()`, et n'atteint jamais `verb publish` — ni pour le faire, ni pour se le voir refuser. **La promesse de `capabilities.ts:35` décrit une boucle où le journaliste n'entre pas.** Le refus est correct pour un hôte JSON ; il ne dit rien du chemin réel.

Nuance importante : `SKILL.md:759-822` **documente** la boucle V2 (la table `initRun`/`confirmAngle`/`applyPhrasing`/`chooseForm`/`requestDelivery`/`approve`, `:768-775`) et répète même son verdict, `:813-815` : « **Publishing never goes through `verb publish`** ». Mais le chemin chaud du même document (§ 5 PRODUCTION, `:928-932`) appelle `produce-all.mjs` sur `accepted.json`. Le `SKILL.md` reconnaît les deux pipelines dans une seule phrase, `:712-714` : « This pipeline is the one with a run manifest to write it onto; Stage 2's `suggest-chart` above has none. »

### 3.3 Ce que le chemin prose applique quand même — plus que je ne m'y attendais

Il faut être précis, parce que l'intuition (« la prose = pas de gate ») est **fausse** ici. Le chemin d'embed auto-hébergé est gardé :

| Garde de `deliver()` | Équivalent prose | Où |
|---|---|---|
| approbation liée à la provenance (`deliver.ts:127-133`) | `assertShippable` : `produced` + `reviewed` + `renderApproved` | `export-guard.ts:22-36` |
| — | `assertChainProvenance` : `candidates → accepted → produce-all → outputs` | `export-code.mjs:203` |
| sign-off `requiredSigners` (`deliver.ts:130-131`) | `assertEditoriallyCleared` : re-vérifie Ed25519 sur les octets exacts | `export-code.mjs:277-303` **et** `deploy-embed.mjs:96` |
| artefact périmé refusé (`deliver.ts:100-103`) | `generatedAt` + reçu de présentation | `render-provenance.ts`, `gate.ts:41` |

Et surtout : **`deploy-embed.mjs` porte ses propres gardes**, indépendamment de `export-code.mjs` — `deploy-embed.mjs:79` (`assertShippable`) et `:96` (`assertEditoriallyCleared`), plus `:109-111` qui **refuse purement** de déployer un répertoire quand `requiredSigners` est posé. Appeler le script directement ne contourne rien.

Donc, sur ce chemin-là : **non, un agent conversationnel ne peut pas produire puis livrer un embed auto-hébergé en sautant les gates.**

### 3.4 Mais la divergence existe, et elle est ailleurs — sur le chemin par défaut

**Trois écarts réels, du plus grave au moins grave.**

**(a) Le Datawrapper hébergé est publié sur le web public AU PRODUCE, avant tout gate éditorial.**

`skills/dw-chart/src/produce.ts:184` :

```ts
let publicUrl = await publishChart(id);
```

`publishChart` fait `POST /charts/{id}/publish` (`datawrapper.ts:49-53`) et renvoie une URL `https://` vivante. Cet appel a lieu **à l'intérieur du produce**, c'est-à-dire :

- avant G3a (la relecture de rendu),
- avant G3b (le journaliste n'a rien vu),
- avant G4 (aucune forme de livraison choisie),
- avant tout sign-off.

Et à l'export, la gate éditoriale est **explicitement sautée** pour cette forme — `export-code.mjs:474-487` :

```js
// export-code.mjs:481
console.log("EDITORIAL: skipped (hosted embed — no owned bytes to re-verify; see S4d follow-up)");
```

La raison invoquée est honnête (les octets vivent chez le fournisseur, il n'y a rien à re-hacher) — mais elle décrit la conséquence, pas la cause. La cause est que **la publication a déjà eu lieu**, une phase plus tôt.

Ce n'est pas un chemin exotique : `dw-chart` est décrit dans le catalogue journaliste comme « **The default, thin chart path** » (`using-splash/SKILL.md:44-46`). C'est donc le chemin le plus fréquent d'un run réel.

Deux atténuations à dire pour rester honnête : l'URL est non indexée et non devinable (id aléatoire), et `assertShippable` s'applique quand même **avant** que l'URL soit **relayée** au journaliste (`export-code.mjs:202`). Ce qui n'est pas gardé est la **publication** elle-même, pas la remise. La différence compte pour un journaliste : un brouillon rejeté au gate 3 reste néanmoins accessible à quiconque a l'URL.

**(b) `assertShippable` est plus faible que `deliver()`, et le code le dit lui-même.**

`export-guard.ts:37-61` porte un commentaire de 25 lignes qui est un aveu :

> « this catches a stale or tampered VALUE, never an absent one — and **it is bypassable by omission: a report with no `shownSha256` at all still ships** »

La raison du choix est documentée (≈45 fixtures de test antérieures au champ), et la fermeture réelle est décrite mais non faite : relire le reçu de présentation à l'export via `shownCovers(path, r.approvedHash)`. Face à ça, `deliver()` (`deliver.ts:127-133`) refuse **inconditionnellement** sans approbation liée à la provenance courante.

**(c) Aucun re-contrôle de readiness à l'export côté prose.**

`deliver()` rejoue `capabilityReadiness` avant de publier (`deliver.ts:266-272`). Le chemin prose n'a que `preflight.mjs`, à l'INPUT, et qui « ALWAYS exits 0 ». C'est le troisième terme de la phrase de `capabilities.ts:35` (« sign-off, provenance **and readiness** gates ») — le seul qui n'ait aucun équivalent prose.

### 3.5 Réponse

**Non — les deux surfaces n'appliquent pas les mêmes gates. Confiance : haute sur la lecture, aucune exécution.**

Formulée précisément : le chemin prose applique un **sur-ensemble** de gates que la boucle n'a pas (placement, chaîne de provenance `candidates→accepted`, sondes exécutées du review-gate) et un **sous-ensemble** de celles qu'elle a (approbation bypassable par omission, aucune readiness à l'export). Et sur le chemin Datawrapper hébergé — le chemin par défaut — **la publication précède l'ensemble du dispositif éditorial**, ce qui est exactement ce que `HOST_ONLY_VERBS.publish` prétend empêcher.

Le refus de `verb publish` est donc juste dans sa lettre et trompeur dans sa portée : il protège une porte que le journaliste ne franchit jamais, pendant qu'une autre publie une phase plus tôt.

---

## 4. Constats classés

Sévérité par **conséquence journaliste** : S1 = artefact faux ou non redevable · S2 = run bloqué / décision non prise · S3 = cosmétique, hygiène, dette de doc.

| # | Sév. | Constat | Fichier:ligne | Ce que je changerais |
|---|---|---|---|---|
| **F1** | **S1** | Un chart Datawrapper est **publié sur le web public au produce**, avant relecture, avant que le journaliste ait rien vu, avant tout sign-off ; et la gate éditoriale est explicitement sautée à l'export pour cette forme. C'est le chemin par défaut. | `skills/dw-chart/src/produce.ts:184` ; `skills/dw-chart/src/datawrapper.ts:49` ; `skills/splash/scripts/export-code.mjs:474-487` | Découpler créer de publier : au produce, créer le chart **sans** `publishChart` et capturer le PNG possédé pour la relecture (le PNG est déjà produit) ; n'appeler `publishChart` que dans la branche `--form embed`, après G3b et le choix du journaliste. Si l'API DW impose une publication pour l'export PNG, le dire dans le SKILL.md à G2 comme un fait à annoncer au journaliste (« ce chart existera à une adresse publique non listée dès la production »), et non le passer sous silence. |
| **F2** | **S1** | L'invocation imbriquée est **exigée par la prose et attestée par le modèle** : GUARD 5 lit `skillsInvoked`, que le modèle écrit lui-même. Un hôte qui n'imbrique pas produit un artefact d'apparence correcte, sans grounding KB, sans que rien ne le signale. Non prouvé sur Goose. | `SKILL.md:175, 485, 1366` ; `skills/splash/src/validate-gate.ts:648-655` ; `docs/installer/goose-proof.md:43-44, 53-55` | Deux gestes, indépendants : **(1)** appliquer le reformulage déjà rédigé `codex-proof.md:69` — « read `skills/suggest-chart/SKILL.md` and follow it » — qui marche sur tout hôte, y compris Claude Code ; **(2)** rendre la preuve mécanique plutôt qu'attestée : que `save-decision.mjs suggest-chart-invoked` (déjà prévu, `SKILL.md:908`, et qui « REFUSES a decision whose evidence is missing ») soit la **seule** source de `skillsInvoked`, au lieu d'un champ recopié à la main. |
| ~~**F3**~~ **FERMÉ 2026-08-07** | **S1** | ~~`sourceHint` est recopié à la main et son omission **désarme deux gardes de source** — le document l'écrit lui-même. Le filet est un warning non bloquant.~~ **Fermé exactement comme ce constat le prescrivait** : `save-opportunities.mjs` persiste le `sourceHint` qu'il recevait déjà et jetait, et `skills/splash/src/source-provenance.ts` confronte reçu et livraison au produce (L1/L2/L3). Les deux gardes dormantes (B : nom d'organisation effondré ; D : URL approfondie) ont été vues **tirer** sous mutation. `noSourceNamed: true` est la déclaration explicite qui remplace le silence. | `SKILL.md:862-872` ; `skills/splash/src/source-guard.ts` | — |
| **F4** | **S1** | `assertShippable` est bypassable par omission : un report sans `shownSha256` livre quand même. Auto-documenté, avec la fermeture décrite et non faite. | `skills/splash/src/export-guard.ts:37-62` | Appliquer la fermeture que le commentaire décrit : relire le reçu à l'export via `shownCovers(path, r.approvedHash)` (`lib/loop/presentation.ts:105`) et exiger la **présence** de `shownSha256`. Les ~45 fixtures périmées sont un coût de test, pas un argument. |
| **F5** | **S2** | Toutes les commandes de la prose sont relatives à la racine, `<repo-root>` n'est défini nulle part, `/splash/.env` est un chemin absolu faux. Sur Goose (`goose session` nu) rien ne garantit le cwd hors du lanceur. | `SKILL.md:99, 920, 1239` etc. ; `suggest-chart/SKILL.md:104, 371` ; `dw-chart/SKILL.md:23` ; `bootstrap.sh:102` | Poser `SPLASH_ROOT` dans le lanceur (`bootstrap.sh:100-103`, une ligne) et ouvrir `SKILL.md` sur une phrase de résolution : « toutes les commandes s'exécutent depuis `$SPLASH_ROOT` ; si la variable est absente, dis-le au journaliste et arrête-toi ». Puis corriger les 7 occurrences de `/splash/.env`. Un `.gooseignore`/`AGENTS.md` ne remplace pas ça. |
| **F6** | **S2** | Le questionnaire CADRAGE est spécifié en termes d'outil de question structurée, sans repli documenté. Goose n'en a pas. Q6 (canal) est celui qui coûte, car un canal absent retombe sur le permissif `article-web`. | `SKILL.md:184-187, 432` ; `SKILL.md:900-903` | Écrire le repli texte à côté de la règle structurée (« si l'hôte n'a pas de sélecteur : une question, les options numérotées, une seule réponse attendue »), et rendre `channel` **obligatoire** dans `accepted.json` au lieu de retomber sur `article-web` — un défaut permissif sur un champ non collecté est le mauvais sens du fail-closed. |
| **F7** | **S2** | « WAIT means WAIT » (G4) est de la pure prose ; rien n'empêche d'enchaîner phase 1 et phase 2 dans le même tour. La violation est nommée dans le doc parce qu'elle a été observée. | `SKILL.md:1182-1193, 1386` | Une gate mécanique existe déjà en forme : que la phase 1 écrive un marqueur horodaté (`<id>-export/PROPOSED.json`) et que `--form` refuse si le marqueur est absent **ou** si aucune entrée de choix n'a été enregistrée à côté — le pendant de `DECLINED.txt` déjà prévu (`SKILL.md:1299-1300`). Le mécanisme du refus existe (`assertDelivered`), il lui manque cette précondition. |
| **F8** | **S2** | `goose.sh` ne pose aucune configuration d'extension / d'approbation / de réseau, là où `codex.sh` en pose une et l'a vérifiée en direct. Indécidable par lecture. | `install/runtimes/goose.sh:1-29` vs `install/runtimes/codex.sh:14-25, 31-52` | À trancher par le run de § 5, pas par le code. Si le `goose session` par défaut ne donne pas d'outil shell ou impose une approbation par commande, ajouter un `seed_goose_config` symétrique de `seed_codex_config`, non-clobbering. |
| **F9** | **S3** | Récursion `node_modules` : 8 manifestes parasites potentiels aujourd'hui (contre 2 mesurés), aucun `.gooseignore`, `link_agents_skills` symlinke le répertoire entier. | `docs/installer/goose-proof.md:37-42` ; `install/bootstrap.sh:15-20` ; `skills/*/node_modules/playwright-core/lib/tools/*/SKILL.md` | La correction la plus propre n'est pas un `.gooseignore` (fichier de plus, hôte-spécifique) mais de ne pas symlinker le répertoire entier : linker `SKILL.md` + `references/` + `scripts/` + `assets/`, ou déplacer les deps hors de l'arbre de skill. |
| **F10** | **S3** | `goose-runtime.test.ts` ré-implémente `link_agents_skills` au lieu de l'extraire ; le test Codex fait l'inverse et explique pourquoi. Le test Goose est aveugle à la dérive du vrai helper. | `docs/installer/goose-runtime.test.ts:78-83` vs `docs/installer/codex-runtime.test.ts:20-27` | Copier le motif Codex. Trois lignes. À faire **avant** F9, sinon la correction de F9 ne sera pas couverte. |
| **F11** | **S3** | `SendUserFile` (Claude-only) est nommé en premier là où le mécanisme réel (`present --path`) est portable. Et `shownCovers` accepte un reçu `path-printed`, donc G3b vaut « un chemin a été imprimé » sur une machine sans viewer. | `SKILL.md:1050, 1371` ; `lib/loop/preview.ts:80-102` ; `lib/loop/presentation.ts:110-118` | Inverser l'ordre : nommer `present --path` comme **le** geste, et l'outil de l'hôte comme complément facultatif. Séparément, décider si un reçu `path-printed` doit suffire à G3b — c'est une décision produit, pas un bug. |
| **F12** | **S3** | `/splash` est documenté comme le point d'entrée dans le catalogue journaliste ; il n'existe que sous Claude Code. | `skills/using-splash/SKILL.md:14, 23` ; `commands/splash.md` ; `install/runtimes/claude.sh:15` | Formuler l'entrée par l'intention (« dis-lui : voici mon article, fais-moi un visuel »), et mentionner `/splash` comme raccourci d'un runtime parmi d'autres. |
| **F13** | **S3** | `goose.verified: true` rend le bouton radio Goose sélectionnable sur la page d'installation exactement comme Codex, alors que l'un est prouvé de bout en bout et l'autre non. Le seul consommateur du drapeau est l'état `disabled` du radio. | `install/configurator-core.ts:23` ; `install/preflight/client.ts:380-388` | Ne pas retirer le drapeau (la décision produit est assumée et documentée), mais séparer « sélectionnable » de « prouvé » : un troisième état dans `RUNTIMES` (`proven: boolean`) et une mention à côté du radio. Aujourd'hui le journaliste ne peut pas savoir. |
| **F14** | **S3** | Le découpage par phase, s'il est exécuté avant la fermeture de F2, transforme un run Goose dégradé en run mort (garde d'invocation) ou en run sans règles (sans elle). | `2026-07-30-skill-phase-split-design.md` § 1-3 (branche `feat/skill-phase-split`, `99b2eb76`) | Séquencer : F2 (reformulage tool-agnostique) → run Layer B Goose (§ 5) → découpage. Pas l'inverse. |

---

## 5. Ce qui reste vraiment non prouvé, et l'expérience la moins chère

### 5.1 L'inventaire des inconnues

| Inconnu | Pourquoi la lecture ne suffit pas | Coût pour trancher |
|---|---|---|
| **Goose sait-il invoquer un skill depuis un skill ?** (Layer B) | Le run du 2026-07-14 a été coupé au quota avant d'y arriver (`goose-proof.md:53-55`) | 1 run, clé payante |
| L'extension `developer` / l'outil shell est-il actif par défaut dans `goose session` ? | `goose.sh` n'écrit aucune config ; aucune ligne du dépôt ne le vérifie | même run |
| Goose demande-t-il une approbation par commande ? bloque-t-il le réseau des producteurs ? | idem ; Codex a dû le découvrir en direct (`codex-proof.md:136-143`) | même run |
| `output_mode:` dans le frontmatter de `dw-chart`/`map-dw` gêne-t-il Goose ? | retiré pour Gemini (`gemini-proof.md:152-154`), jamais re-testé pour Goose | même run |
| Les 8 manifestes parasites apparaissent-ils tous dans `goose skills list` aujourd'hui ? | la mesure date de 8 skills ; il y en a 12 | **gratuit**, sans LLM |

### 5.2 L'expérience la moins chère, exactement

**Deux commandes, dont une gratuite.**

**Étape 0 — gratuite, sans clé, 30 secondes.** Confirme F9 à son ampleur actuelle :

```bash
cd ~/Splash && bash install/bootstrap.sh   # ou seulement re-lancer link_agents_skills
goose skills list
```

Attendu : les 11 skills porteurs de `SKILL.md` **plus** les entrées `playwright-cli` / `playwright-trace`. Le compte des parasites est la mesure.

**Étape 1 — le run Layer B. Un seul cas, choisi pour être le moins cher du corpus.**

Fixture : `../splash-harness/cases/budget-commune-part/` — un article FR (« À Fontenay-le-Perreux, l'école avale près d'un tiers du budget communal ») + `data.csv`, une répartition part-à-tout à 6 postes. Choisi parce qu'il route vers **`dw-chart` statique** : pas de Playwright vidéo, pas de MapTiler, pas de bundle React, et **l'article porte sa propre URL de source traçable** en dernière ligne — donc G2c se résout sans aller-retour, et le run tient en peu de tours.

```bash
cd ~/Splash
export GOOSE_PROVIDER=anthropic          # ou openai — n'importe quel provider payant
export GOOSE_MODEL=<modèle du provider>
cp ../splash-harness/cases/budget-commune-part/article.md /tmp/fixture-article.md
cp ../splash-harness/cases/budget-commune-part/data.csv   /tmp/fixture-data.csv

goose run --name splash-layerb -t "Voici mon article : /tmp/fixture-article.md, et mes données : /tmp/fixture-data.csv. Fais-moi un visuel pour le web." 2>&1 | tee /tmp/goose-layerb.log
```

⚠️ Lancer **depuis `~/Splash`** est nécessaire (F5) — et c'est aussi une observation du test : si le run ne survit qu'à cette condition, F5 est confirmé par la même exécution.

**Critères de réussite, dans l'ordre, chacun tranchant un inconnu distinct :**

| # | Ce qu'on regarde | Tranche |
|---|---|---|
| 1 | `grep -c "Loaded Skill: suggest-article" /tmp/goose-layerb.log` ≥ 1 **et** `"Loaded Skill: suggest-chart"` ≥ 1 | **F2 — l'inconnu principal.** Si zéro alors que `accepted.json` existe : l'hôte a paraphrasé, et l'attestation `skillsInvoked` a menti. C'est le résultat qui rend F2 urgent. |
| 2 | `ls exports/*/candidates.json exports/*/accepted.json exports/*/report.json` | La chaîne mécanique a tourné ; G2 a un menu antérieur |
| 3 | `jq '.results[].status' exports/*/report.json` == `"produced"` | shell + réseau OK (F8) |
| 4 | `ls exports/*/_shown/` non vide | G3b atteint, reçu de présentation écrit — et son champ `presentedAs` répond à la réserve `path-printed` de F11 |
| 5 | le log contient le bloc `EXPORT_FORMS_PROPOSAL`, **et** un tour journaliste le sépare d'un éventuel `--form` | F7 observé en conditions réelles |
| 6 | `jq '.results[].publicUrl' exports/*/report.json` non nul **avant** toute trace de G3a dans le log | **F1 observé de visu** — l'URL publique existe avant la relecture |

**Ce que ça coûte :** un run, un article court, un chart statique. C'est le run le moins cher qui tranche simultanément l'inconnu n° 1 (F2), les trois inconnus de configuration (F8), la réserve de reçu (F11), et qui **observe** F1 et F7 sans les provoquer.

**Ce que ça ne tranche pas :** rien sur l'interactif, le scrolly, la vidéo, la carte, ni sur le déploiement Cloudflare. Si Layer B passe, le run suivant à faire est un `article-web` interactif — c'est le seul chemin où G4 (a/b/c) existe vraiment.

### 5.3 Ce que je ne prétendrai pas savoir

- Je n'ai **pas** exécuté Goose. Tout le § 2 hors § 2.7 (vérifié sur disque) et § 2.1 (trace du 2026-07-14) est de la lecture.
- Je n'ai **pas** lancé `bun run check` ni aucune suite. Les comportements de gardes cités viennent du code, pas d'une exécution.
- La conclusion du § 3.4(a) — publication DW avant les gates — est établie par lecture de `produce.ts:184` → `datawrapper.ts:49` (un `POST /publish` réel). **Je ne l'ai pas observée en direct.** C'est le constat le plus grave du document et c'est le premier que le run de § 5.2 (critère 6) devrait confirmer ou réfuter.
- Sur le mode d'approbation et le jeu d'extensions par défaut de Goose : je ne sais pas, et rien dans ce dépôt ne le sait non plus.

---
---

# Extension multi-hôte — Claude Code, Claude Desktop, Codex, Gemini CLI

> **Date :** 2026-08-02 (même journée, second passage). **Arbre lu :** `/Users/rmdms/Sites/Professional/splash-merge`, branche `main`.
> **Mode :** lecture + **sondes gratuites, sans LLM, sans écriture dans l'arbre ni dans le `$HOME` réel**
> (§ 6.2). `bun run check` non lancé. Aucun fichier du dépôt modifié.
> **Périmètre :** ce qui change *par hôte*. Les constats **indépendants de l'hôte** du § 4 — F1 (publication
> Datawrapper au produce), F3 (`sourceHint`), F4 (`assertShippable` bypassable), F7 (« WAIT means WAIT »),
> F14 (séquencement du découpage) — valent identiquement sur les quatre hôtes et ne sont pas re-plaidés ici.
> Ils sont simplement rappelés dans la colonne « gates » du tableau final.

---

## 6. Ce que ce second passage établit en plus, et par quel moyen

### 6.1 Le renversement de méthode

Le § 5.3 disait « je n'ai exécuté aucun hôte ». Ce passage-ci en exécute **quatre**, mais uniquement sur
leurs **surfaces d'inventaire** — les commandes qui listent ce qu'un hôte voit **sans appeler de modèle**,
donc sans dépense, sans clé, sans quota. C'est exactement la classe d'inconnues que le § 5.1 chiffrait à
« gratuit, sans LLM », et elle tranche à elle seule toute la ligne **Découverte** du tableau final.

Les quatre binaires sont installés sur cette machine — `goose 1.43.0`, `codex-cli 0.144.1`, `gemini 0.50.0`,
`bun 1.3.5`, `node v20.19.0` — ce qui rend la mesure possible sans rien installer.

### 6.2 La méthode, pour qu'elle soit rejouable

`~/.agents/skills` existant sur cette machine est **périmé** (il pointe vers `…/Professional/atelier/`,
chemin d'avant le renommage, et ne connaît que 9 skills). Le réparer aurait été une écriture dans le `$HOME`
du propriétaire. À la place, `link_agents_skills` (`install/bootstrap.sh:15-20`) a été **reproduit à
l'identique dans un `$HOME` de brouillon** — même boucle, même `ln -sfn` du répertoire entier — puis chaque
CLI a été lancé avec `HOME=<brouillon>`. Rien hors du scratchpad n'a été écrit.

| # | Sonde | Coût | Ce qu'elle tranche |
|---|---|---|---|
| P1 | `claude --plugin-dir . plugin details splash` | gratuit | inventaire + coût en tokens vus par Claude Code |
| P2 | `HOME=<brouillon> goose skills list` | gratuit | inventaire Goose, récursion `node_modules` |
| P3 | `HOME=<brouillon> gemini skills list` | gratuit | inventaire Gemini, tolérance `output_mode` |
| P4 | `HOME=<brouillon> codex debug prompt-input` | gratuit | le bloc `<skills_instructions>` réellement injecté à Codex |
| P5 | `claude --plugin-dir . plugin details splash` depuis un **autre** cwd | gratuit | mode de panne racine (S2) sur Claude Code |
| P6 | `claude --plugin-dir .` sur un plugin de brouillon **sans** `commands/` | gratuit | ce qu'est la 12ᵉ entrée de l'inventaire Claude Code |
| P7 | comptage des `tool_use` `Skill` dans les 444 transcripts de `../splash-harness/runs/` | gratuit | invocation imbriquée sur Claude Code, **prouvée ou non** |

### 6.3 Le rectificatif factuel que ces sondes imposent au § 2.7

Le § 2.7 comptait **8 manifestes parasites potentiels** sous `skills/*/node_modules/`. Le chiffre est juste
sur le disque (`find -L skills -path '*node_modules*' -name SKILL.md` ⇒ 8, répartis 2×4 sous `chart-native`,
`dw-chart`, `map-native`, `scrolly`). Mais **ce n'est pas ce que le journaliste voit** : Goose déduplique par
`name`, et les 4 copies portent les 2 mêmes noms. P2 mesure donc **2 lignes parasites**, pas 8 —
`playwright-cli` et `playwright-trace`, toutes deux résolues vers la copie de `dw-chart`. F9 reste vrai dans
sa nature et **surestimé d'un facteur 4** dans son ampleur. Et surtout : les trois autres hôtes n'ont
**aucune** ligne parasite (§ 7.1, § 9.1, § 10.1). **La récursion `node_modules` est une particularité de
Goose, pas une propriété du dépôt.**

---

## 7. Claude Code — l'implémentation de référence, et le seul hôte où la chaîne est prouvée

### 7.1 Découverte — mesurée, et elle ne recurse pas

P1, depuis la racine du dépôt :

```
Component inventory
  Skills (12)  chart-native, dw-chart, map-dw, map-native, newsroom-charter, scrolly,
               splash, splash, suggest-article, suggest-chart, suggest-image, using-splash
  Agents (0)   Hooks (0)   MCP servers (0)   LSP servers (0)
Projected token cost
  Always-on:   ~2,213 tok   added to every session
```

Trois faits, tous mesurés :

1. **Les 11 skills porteurs d'un `SKILL.md` surfacent, tous.** `skills/image-native/` n'apparaît pas — il n'a
   toujours pas de `SKILL.md`, exactement comme le notaient `codex-proof.md:39-40` et
   `gemini-proof.md:66-71`. La note « 8 skills » de ces deux documents est **périmée** : le dépôt en a 11
   (les trois nouveaux : `newsroom-charter`, `suggest-image`, `using-splash`).
2. **Zéro `playwright-cli` / `playwright-trace`.** Claude Code ne descend pas dans `node_modules`. Vérifié
   deux fois : P6 a rejoué l'inventaire sur un plugin de brouillon dont le `skills/` est un **lien vers le
   répertoire réel**, `node_modules` compris — même résultat.
3. **La 12ᵉ entrée s'appelle `splash` elle aussi.** P6 le tranche : sans le répertoire `commands/`,
   l'inventaire retombe à `Skills (11)`. La 12ᵉ ligne est donc `commands/splash.md` — Claude Code compte le
   slash-command dans la même rubrique, et il **entre en collision de nom** avec le skill `splash`. Sans
   conséquence connue (les deux coûts sont distincts : ~52,7k tok à l'invocation pour le skill, ~240 pour la
   commande), mais c'est une ambiguïté gratuite à lever.

**Le chiffre le plus intéressant de P1 n'est pas l'inventaire, c'est le coût.** `splash` coûte **~52 700
tokens à chaque invocation**, `suggest-chart` ~18 800, `map-native` ~13 800. Goose mesure la même masse à sa
façon (`splash` = 33 389 *content tokens*). Ce n'est pas une remarque d'hygiène : c'est **la cause mécanique
de l'échec Layer B de Gemini** (`gemini-proof.md:164-168` — palier gratuit à 250k tokens d'entrée et 20
requêtes/jour). Un hôte dont la fenêtre ou le quota ne porte pas ~50k tokens par invocation, multipliés par
les trois skills de la chaîne, ne peut pas faire tourner Splash — indépendamment de toute question
d'imbrication. **Le poids de la prose est lui-même une contrainte d'hôte.**

### 7.2 Invocation imbriquée — PROUVÉE, massivement, et seulement ici

C'est le résultat le plus important de ce passage. P7 a parcouru les **444 transcripts** de
`../splash-harness/runs/*/transcript.jsonl` et compté les blocs `tool_use` de nom `Skill` :

| Skill invoqué comme véritable appel d'outil | Runs |
|---|---|
| `atelier:atelier` / `splash:splash` | 263 + 171 |
| `atelier:suggest-article` / `splash:suggest-article` | 262 + 171 |
| `atelier:suggest-chart` / `splash:suggest-chart` | 257 + 168 |
| **transcripts contenant un appel réel à `suggest-chart`** | **425 / 444 (96 %)** |

Un exemple lisible, `runs/budget-commune-part-2026-07-09T17-14-06-539Z/transcript.jsonl` — trois `tool_use`
`Skill`, dans l'ordre : `{"skill":"atelier:atelier"}`, `{"skill":"atelier:suggest-article"}`,
`{"skill":"atelier:suggest-chart"}`.

**Ce que ça établit :** sur Claude Code, la chaîne `splash → suggest-article → suggest-chart` fire comme de
vrais appels de skill imbriqués, dans 96 % des runs du corpus QA, sur deux nommages successifs (avant et
après le renommage). **F2 — le constat S1 « l'invocation est exigée par la prose et attestée par le modèle »
— est retiré pour Claude Code.** Il reste entier pour Goose (jamais atteint) et Gemini (jamais atteint).

**Ce que ça n'établit pas, et qui corrige une formulation de `codex-proof.md`.** Le troisième saut — le skill
de moteur — n'est **presque jamais** un appel de skill : `splash:dw-chart` apparaît dans 3 runs sur 444,
`splash:chart-native` dans 1. Dans tous les autres, l'orchestrateur **shell-out directement** sur
`produce.mjs`. `codex-proof.md:130-132` décrit sa preuve comme « `suggest-article` → `suggest-chart` →
`dw-chart` as real nested skill calls » : sur Claude Code, le troisième maillon de cette phrase n'est pas ce
qui se passe en pratique, et ça n'a aucune importance — la prose n'exige un « real Skill call » que pour les
deux suggesteurs (`SKILL.md:175`, `:485`), et c'est bien ce qui fire. Il faut juste ne pas lire la phrase de
Codex comme une exigence à trois maillons.

### 7.3 Exécution — le modèle de permission le plus permissif des quatre

Claude Code exécute `bun`, Playwright, Remotion et écrit des fichiers via ses outils natifs, sous le régime
de permission de l'utilisateur (allowlist/prompt). Aucun sandbox à configurer : `install/runtimes/claude.sh`
n'écrit **aucun** fichier de configuration — contrairement à `codex.sh:31-52` qui doit seeder un
`~/.codex/config.toml` pour rouvrir le réseau. Ce n'est pas une négligence symétrique de celle de `goose.sh`
(§ 2.9) : c'est qu'il n'y a rien à ouvrir. **Corollaire : la contrainte Playwright de
`codex-proof.md:136-143` — les écritures hors workspace refusées par le sandbox — n'a pas d'équivalent
Claude Code.** C'est le seul hôte où le chemin de production n'a jamais été bloqué par une politique de bac
à sable.

### 7.4 Le problème de racine (S2/F5) — présent, mais **bruyant, et il se dénonce lui-même**

`--plugin-dir .` est relatif au cwd (`claude.sh:15`, `claude.ps1:17`). P5 mesure ce qui arrive quand le
journaliste ne lance pas depuis `~/Splash` :

```
$ cd /ailleurs && claude --plugin-dir . plugin details splash
Plugin "splash" not found. Run `claude plugin list` to see installed plugins,
or pass --plugin-dir <path> to load one from disk.
```

**Le plugin ne se charge pas du tout.** C'est la meilleure défaillance possible : rien ne démarre, le
journaliste le voit immédiatement, et aucun `bun …` relatif ne peut partir depuis un mauvais répertoire
puisqu'aucun `SKILL.md` n'a été lu. Comparez avec Goose / Codex / Gemini, qui lisent les skills depuis
`~/.agents/skills` — **un chemin global, indépendant du cwd** : chez eux, la prose se charge parfaitement et
c'est seulement la 3ᵉ ou la 12ᵉ commande qui échoue, en plein milieu du dialogue. **La même racine relative
produit une panne franche sur Claude Code et une panne différée sur les trois autres.** F5 reste juste ; sa
gravité est très inégale selon l'hôte.

### 7.5 Gates — toutes celles du § 1.2 tiennent, aucune ne dépend de Claude Code

Rien dans le § 1.2 n'est appliqué par le harness Claude Code : G3a (`review-gate.mjs`), G3b (`gate.ts:14-58`)
et la chaîne de provenance sont du code Bun, qui tourne partout où un shell tourne. Réciproquement, aucune
gate n'est *renforcée* ici. Ce que Claude Code apporte, c'est ce que §§ 7.1-7.2 mesurent : la découverte
complète, l'imbrication réelle, et une exécution non contrainte — les trois *comportements* que la prose
suppose acquis. **Aucun gate, trois prérequis.**

### 7.6 Le trou de dossier : `claude.verified: true` n'a aucune preuve écrite

`configurator-core.ts:14` marque `claude` vérifié sans commentaire, et c'est le seul des quatre dans ce cas —
les trois autres portent soit un `-proof.md`, soit un commentaire qui qualifie le drapeau. Or
`docs/installer/` contient `codex-runtime.test.ts`, `gemini-runtime.test.ts`, `goose-runtime.test.ts` et
`codex-proof.md`, `gemini-proof.md`, `goose-proof.md` — **et rien pour Claude Code.** Le chemin d'installation
réellement livré (`--plugin-dir .`, `.claude-plugin/plugin.json`, la collision `commands/splash.md`) n'est
couvert par **aucun test** du dépôt.

Ce n'est pas grave pour la fiabilité — §§ 7.1-7.2 viennent de le mesurer, et 444 runs de harness l'exercent —
mais c'est un déséquilibre de dossier : l'hôte le mieux prouvé est le seul dont la preuve n'est nulle part
dans le dépôt, elle est dans un dépôt privé (`../splash-harness`) que la release MIT ne publiera pas. Les
sondes P1/P6/P7 ci-dessus sont, telles quelles, le squelette d'un `claude-proof.md` et d'un
`claude-runtime.test.ts` (P1 et P6 sont **automatisables et gratuites** : elles n'appellent aucun modèle).

---

## 8. Claude Desktop — il n'y a pas d'adaptateur, et le pont évident débouche sur le mauvais tuyau

C'est l'hôte sur lequel une réponse droite était demandée. La voici, en une phrase, avant tout détail :

> **Non. Aujourd'hui, un journaliste sur Claude Desktop ne peut pas obtenir un visuel Splash — il ne peut
> même pas faire apparaître les skills. Ce n'est pas un écart, c'est une absence totale de chemin.**

### 8.1 Le fait, d'abord : zéro occurrence dans tout le dépôt

`grep -rn -i "claude desktop|claude_desktop|desktop app"` sur l'ensemble de l'arbre (hors `node_modules`,
hors `.git`) ne renvoie **aucune ligne**. Les seules occurrences du mot « desktop » sont des largeurs de
viewport dans les notes de QA (`docs/splash/workflow-tests/ROUND8-RESULTS.md:19`,
`docs/splash/embeddable-module-best-practices.md:46`). Il n'existe :

- ni `install/runtimes/claude-desktop.{sh,ps1}` — et `install/read-runtime.ts:24-34` construit son allowlist
  **en lisant ce répertoire**, donc « claude-desktop » n'est même pas un nom de runtime prononçable ;
- ni entrée dans `RUNTIMES` (`configurator-core.ts:13-24`) — donc **aucun bouton radio** sur la page
  d'installation (`install/preflight/client.ts:380-388` boucle sur `model.runtimes`) ;
- ni manifeste de bundle desktop (`.mcpb`, `.dxt`), ni `claude_desktop_config.json`, ni serveur MCP :
  l'inventaire P1 le confirme de l'autre côté — `MCP servers (0)`.

**Cette absence est le constat.** Il n'y a rien à auditer ; il y a un chemin à construire.

### 8.2 Découverte — les trois mécanismes du dépôt sont tous inapplicables

Splash n'a que deux voies de surfaçage, et une troisième documentaire :

| Voie | Câblée par | Applicable à Claude Desktop ? |
|---|---|---|
| plugin Claude Code | `claude --plugin-dir .` (`claude.sh:15`) | **Non** — c'est un flag de la CLI ; Claude Desktop n'a pas de ligne de commande à laquelle le passer. |
| `~/.agents/skills/<name>/SKILL.md` | `link_agents_skills` (`bootstrap.sh:15-20`) | **Non établi** — c'est la convention des hôtes *agentiques CLI* (Codex, Gemini, Goose). Rien dans ce dépôt ne montre Claude Desktop la lisant, et je n'ai pas de moyen de le vérifier par lecture (§ 8.6). |
| `gemini-extension.json` | racine du dépôt | Non, spécifique Gemini. |

Il n'y a **aucun** troisième mécanisme dans le dépôt qu'un client desktop pourrait consommer.

### 8.3 Exécution — c'est là que ça cesse d'être un écart et devient un non-démarrage

Même en supposant la découverte résolue par magie, la prose que Claude Desktop lirait exige, dans l'ordre :

- `bun lib/host/cli.ts newsroom` puis `preflight.mjs` (`SKILL.md:99`, `:117`) ;
- `bun skills/splash/scripts/produce-all.mjs …` qui shelle vers un producteur, lequel lance
  **Playwright/Chromium** (`bootstrap.sh:91`) et **Remotion** pour la vidéo ;
- l'écriture d'un arbre `exports/<id>/` sur le disque, puis `bun lib/host/cli.ts present --path <artifact>`
  qui **ouvre le fichier avec l'ouvreur de la plateforme** (`preview.ts:58-61`) et écrit le reçu que
  `applyRenderGate` relit (`gate.ts:41-42`).

Ces trois choses sont **un shell, un système de fichiers local et un binaire navigateur**. C'est le socle
qu'une application de bureau conversationnelle ne fournit pas d'elle-même. Et l'ordre des conséquences
compte, pour reprendre le critère « conséquence journaliste » :

- **sans exécution, aucun artefact n'existe** — donc aucun fichier possédé, ce qui est la promesse centrale
  du projet (« tout = fichier que la rédaction possède ») ;
- **G3b devient inatteignable** : la seule chose qui écrit `renderApproved` est
  `shownCovers(artifactPath, approvedHash)` (`gate.ts:41-42`), qui **relit les octets depuis le chemin de
  l'artefact**. Pas de disque ⇒ pas de reçu ⇒ pas d'approbation. La gate la plus solide du parcours est aussi
  celle qui exclut le plus catégoriquement un hôte sans filesystem.
- **G3a devient inatteignable** de la même façon : `review-gate.mjs` **exécute lui-même** les sondes
  mécaniques (`SKILL.md:1028-1031`). Sans processus, il n'y a rien à exécuter — et un modèle qui s'auto-note
  est exactement ce que cette gate a été écrite pour empêcher.

**Un hôte qui lit la prose sans pouvoir exécuter ne dégrade pas Splash : il en retire les trois seules
gardes mécaniques du parcours, tout en laissant le modèle produire un dialogue parfaitement convaincant.**
C'est le pire des deux mondes, et c'est la raison pour laquelle « non » est ici une meilleure réponse qu'une
liste de manques.

### 8.4 Le pont évident — MCP — mène dans la chaîne où le journaliste n'entre pas

Le réflexe naturel est : « Claude Desktop consomme MCP, or `lib/host/cli.ts` est déjà un contrat de verbes,
donc enveloppons-le ». Le dépôt a **déjà écrit la réponse à ça**, et elle est négative dans les deux sens.

D'abord, `lib/host/README.md:1531-1546` — la section s'appelle « Why a CLI and not MCP » :

> « `verbs` is exactly the declaration an MCP wrapper would need … Today that declaration has no schema for
> `spec` (it is deliberately opaque …) and no human-readable description strings, so it is **a start for an
> MCP wrapper, not a finished tool manifest**. »

Ensuite — et c'est le point dur — **ce qu'on exposerait n'est pas le parcours du journaliste.** Le § 3.2 l'a
établi : les deux chaînes ne se touchent pas, aucun fichier de `skills/` n'importe ni ne lance `lib/host` ou
`lib/loop`, et le parcours prose **ne crée jamais de run**. Un serveur MCP bâti sur le contrat de verbes
brancherait donc Claude Desktop sur la **boucle V2**, celle où le journaliste n'entre jamais — et dont le
verbe `publish` est de toute façon refusé d'entrée (`capabilities.ts:31-38`, `cli.ts:456-468`). Le pont le
plus court mène au mauvais tuyau.

**Conséquence de séquencement, à dire clairement :** un adaptateur Claude Desktop crédible est **bloqué
derrière le pont entre les deux chaînes** (`docs/splash/two-chains-gap-2026-07-28.md`). Ce n'est pas un
chantier d'installeur, c'est un chantier d'architecture. Le chiffrer comme un adaptateur serait se tromper
d'un ordre de grandeur.

### 8.5 Ce qu'il faudrait, concrètement, si la décision est de le faire

Quatre briques, dans cet ordre, dont aucune n'existe :

1. **Un canal de découverte** — établir empiriquement si Claude Desktop lit `~/.agents/skills` (§ 8.6). Si
   oui, `link_agents_skills` suffit et la brique est gratuite. Si non, il faut un bundle d'extension desktop,
   c'est-à-dire un cinquième format de distribution à maintenir.
2. **Un pont d'exécution** — un serveur MCP local exposant *shell + filesystem restreints à `~/Splash`*, que
   le journaliste installe. C'est ce qui rend `bun …`, Playwright et `present --path` atteignables. Sans
   cette brique, les trois autres ne servent à rien.
3. **La résolution de la racine (F5)** — un `SPLASH_ROOT` est ici **obligatoire**, pas souhaitable : un hôte
   desktop n'a pas de « répertoire courant » que le journaliste puisse contrôler. C'est le seul hôte où le
   remède de F5 est une précondition et non une amélioration.
4. **Un budget de contexte** — ~52,7k tokens par invocation de `splash` (§ 7.1), à multiplier par la chaîne.
   À vérifier contre les limites de la surface desktop **avant** d'écrire une ligne d'adaptateur ; c'est ce
   qui a tué Gemini.

**Recommandation :** ne pas ouvrir ce chantier tant que le pont entre les deux chaînes n'existe pas, et ne
pas ajouter `claude-desktop` à `RUNTIMES` — un bouton radio sélectionnable sur la page d'installation pour un
hôte qui ne peut rien produire serait la version aggravée de F13.

### 8.6 Ce que je ne peux pas trancher par lecture, et l'expérience exacte qui le tranche

Je n'ai **aucune** source dans ce dépôt sur le comportement de Claude Desktop, et je ne suppose rien. Trois
inconnues, chacune avec sa manip :

| Inconnu | Expérience | Coût |
|---|---|---|
| Claude Desktop lit-il `~/.agents/skills/<name>/SKILL.md` ? | Sur une machine avec Claude Desktop : lancer `link_agents_skills`, redémarrer l'app, chercher `splash` dans sa surface de skills/capacités. | 5 min, gratuit |
| Peut-il exécuter un processus local (`bun --version`) ? | Installer un serveur MCP de shell/filesystem portant sur `~/Splash`, puis demander à Claude Desktop d'exécuter `bun lib/host/cli.ts newsroom` et regarder si un JSON revient. | 30 min, gratuit |
| Sa fenêtre encaisse-t-elle la chaîne ? | Ne se pose que si les deux précédents passent. | — |

**La première expérience est la seule qui compte pour la décision** : si Claude Desktop ne voit pas les
skills, les deux autres sont sans objet et la réponse « non » est définitive jusqu'à ce qu'un bundle
d'extension soit écrit.

---

## 9. Codex — le témoin, et ce que la comparaison avec lui révèle

Codex est le seul des trois adaptateurs non-Claude prouvé de bout en bout. Sa valeur ici est
**différentielle** : chaque chose que Codex a dû faire et que les autres n'ont pas faite est une hypothèse
que les autres portent sans le savoir.

### 9.1 Découverte — mesurée, 11/11, namespacée, zéro parasite

P4 rend le bloc réellement injecté dans le prompt de Codex. Les 11 skills y sont, **préfixés `splash:`** —
`splash:splash`, `splash:suggest-article`, `splash:suggest-chart`, `splash:chart-native`, `splash:dw-chart`,
`splash:map-dw`, `splash:map-native`, `splash:newsroom-charter`, `splash:scrolly`, `splash:suggest-image`,
`splash:using-splash` — aux côtés de 5 skills système de Codex (`imagegen`, `openai-docs`, `plugin-creator`,
`skill-creator`, `skill-installer`). **Aucun `playwright-*`.** Deux détails notables :

- les locators pointent vers les **chemins réels résolus** (`/Users/…/splash-merge/skills/…`), pas vers les
  liens symboliques — Codex résout avant d'annoncer ;
- seules les **descriptions** sont injectées, pas les corps (divulgation progressive) : le prompt entier fait
  ~17,8 ko. Le coût de ~52,7k tokens de `splash` n'est payé qu'à l'invocation, comme sur Claude Code.

### 9.2 Invocation imbriquée — prouvée, et ce qui ne l'a pas été

`codex-proof.md:127-134` (2026-07-13) : « a full `codex exec` run of the `splash` skill invoked
`splash:suggest-article` → `splash:suggest-chart` → `splash:dw-chart` as real nested skill calls and wrote a
correct `accepted.json` (right producer/format/channel/confirmedTakeaway/spec) ». `codex-proof.md:147-149`
déclare le risque **RETIRED** et note que le repli de reformulage prose (`:66-71`) n'a pas été nécessaire.

**Ce qui n'a PAS été prouvé, et le document le dit lui-même** (`:136-143`) : la production **ne finit pas**
sous un run non-attendu. Playwright/Chromium écrit hors de `[workdir, /tmp, $TMPDIR]` ; sous
`codex exec --sandbox workspace-write -c approval_policy=never`, ces écritures sont refusées. Le lanceur livré
contourne le problème en lançant **`codex` interactif** avec `approval_policy = "on-request"`, où le
journaliste approuve. Autrement dit : **la preuve de bout en bout de Codex est une preuve de la couche
décision (`accepted.json` correct), pas une preuve d'artefact rendu en mode non-attendu.** Layer C
(`codex-proof.md:92-101`, « the artifact is real ») n'a pas de résultat consigné.

Et cela a un prix pour le journaliste : `approval_policy = "on-request"` signifie **une approbation par
action réseau ou hors-workspace**. Le produce d'une carte ou d'une vidéo en déclenche plusieurs. C'est
compatible avec le double-clic, mais ce n'est pas « zéro friction ».

### 9.3 Exécution — le seul adaptateur qui configure quelque chose, et pourquoi c'est le témoin

`codex.sh:31-52` (`seed_codex_config`) écrit `~/.codex/config.toml` avec `sandbox_mode = "workspace-write"`,
`approval_policy = "on-request"`, `[sandbox_workspace_write] network_access = true`. Le commentaire
`codex.sh:16-17` dit exactement pourquoi : « Splash's producers call provider APIs … and the runnable-source
export runs `bun install`, so the workspace-write sandbox needs outbound network access ». Le seed est
**non-clobbering** (`:43-51`) et gère même un `~/.codex` non-inscriptible (`:36-41`).

**C'est le témoin le plus utile de tout ce document.** Codex a découvert, en direct, que sans configuration
explicite le réseau est fermé et le producteur échoue. Cette découverte a coûté un run. `goose.sh` ne
configure rien (§ 2.9) et `gemini.sh` non plus — et Gemini a, lui aussi, un modèle d'approbation par défaut
(§ 10.3). **La question n'est pas « pourquoi Codex configure-t-il ? » mais « qu'est-ce que les deux autres
supposent sans l'avoir vérifié ? »**

### 9.4 Racine (F5) — le seul hôte où c'est documenté

`.codex/INSTALL.md:69` : « Launch Codex **from `~/Splash`** and list skills ». Et `codex-proof.md:25-26`
en donne la raison : « Launch from `~/Splash` so the shell tool's cwd sees the repo and inherits the `.env` ».
C'est la seule mention explicite de la précondition dans tout le dépôt hors du lanceur généré
(`bootstrap.sh:102`). Elle est dans un fichier d'installation manuelle que le journaliste du parcours
double-clic ne lira jamais — mais elle existe, ce qui est plus que Goose et Gemini.

### 9.5 Verdict Codex

**Oui, sous conditions nommées.** Un journaliste qui installe par le bootstrap, choisit Codex, se connecte
(`codex login`), lance par `Launch Splash.command` et approuve les invites en cours de route atteint un
artefact. Deux réserves honnêtes : Layer C n'a pas de résultat écrit, et la version épinglée
`CODEX_VERSION="0.144.1"` (`codex.sh:8`) est déjà dépassée sur cette machine (`codex doctor` : « 0.146.0
available »). Le pin est délibéré et justifié (`:6-7`, la feature skills bouge vite) ; il demande juste une
révision périodique, sans quoi il vieillira en silence.

---

## 10. Gemini CLI — la découverte est parfaite, tout le reste est supposé

### 10.1 Découverte — mesurée, 11/11, zéro parasite, `output_mode` toléré

P3 : `gemini skills list` affiche les **11** skills, tous `[Enabled]`, depuis `~/.agents/skills`, avec le
chemin de leur `SKILL.md`. **Aucune ligne `playwright-*`.** Cela **retire définitivement** le risque
`output_mode` du registre de `gemini-proof.md:133` (déjà retiré à 8 skills le 2026-07-13 ; re-confirmé à 11
aujourd'hui) : `dw-chart` et `map-dw`, qui portent cette clé de frontmatter non standard, sont bien listés.

Détail relevé par la même sonde, et qui n'est **pas** dans le dossier : Gemini a émis
`Skipping project agents due to untrusted folder. To enable, ensure that the project root is trusted.` et
`Project hooks disabled because the folder is not trusted.` Les skills utilisateur passent quand même, mais
Gemini applique une **notion de confiance de dossier** que rien dans l'adaptateur ni dans `gemini-proof.md`
ne mentionne (§ 10.3).

### 10.2 Invocation imbriquée — NON prouvée, et `verified: true` est une décision produit

`gemini-proof.md:164-168` : le run Layer B « died immediately with `TerminalQuotaError` — the free tier caps
at 20 requests/day and 250k input tokens … **It never reached nested skill invocation.** » Et le document est
d'une franchise totale sur le drapeau, `:175-179` :

> « `configurator-core.ts` sets `gemini.verified = true` **by product decision (2026-07-13)**, ahead of a
> Layer-B pass — **a deliberate override, NOT a claim that the orchestration is proven**. »

Le commentaire de `configurator-core.ts:16-18` répète la même chose. **Il y a donc deux drapeaux
`verified: true` qui sont des décisions produit et non des preuves** — `gemini` (Layer B jamais atteint) et
`goose` (Layer B coupé au quota, `:20-22`). Le § 4/F13 ne relevait que Goose ; **Gemini est dans le même cas,
et pour la même raison, depuis plus longtemps.** Le seul consommateur du drapeau reste l'attribut `disabled`
du bouton radio (`install/preflight/client.ts:387`) : sur la page d'installation, Gemini et Goose sont
sélectionnables *exactement* comme Codex, sans qu'aucune différence ne soit visible au journaliste.

Et le § 7.1 donne maintenant la **cause mécanique** de l'échec, pas seulement son symptôme : ~52,7k tokens
par invocation de `splash`, ~18,8k pour `suggest-chart`. Contre 250k tokens/jour et 20 requêtes/jour, la
chaîne ne rentre pas — **le quota n'est pas un accident de run, c'est une incompatibilité arithmétique.**
Rien ne dit qu'un palier payant la lève ; l'expérience du § 13 le mesurerait.

### 10.3 Exécution — trois obstacles, dont deux absents du dossier

1. **Node 20+ obligatoire** — documenté et assumé (`gemini-proof.md:140-146`, `gemini.sh:12-14`) : le bin de
   `gemini` a un shebang `node`, et `bootstrap.sh` n'installe **que Bun** sur macOS/Linux (Node n'est installé
   que par `bootstrap.ps1`, pour Playwright/Remotion). **Sur un mac sans Node, l'installeur Gemini réussit et
   le lanceur ne démarre pas.** Le mode de panne est un double-clic qui ne fait rien.
2. **Modèle d'approbation par défaut = « prompt for approval »** — `gemini --help` :
   `--approval-mode  default (prompt for approval) | auto_edit | yolo | plan`. Le lanceur lance `gemini` nu
   (`gemini.sh:25`, `gemini.ps1:23`), donc **le mode par défaut**. Chaque commande shell du parcours — et il y
   en a beaucoup (§ 2.3 en recense des dizaines) — demandera une confirmation. **Aucune ligne du dépôt ne le
   mentionne**, alors que `codex.sh` a jugé nécessaire de seeder son équivalent.
3. **Confiance de dossier** — mesurée en § 10.1. Non documentée, non configurée. Effet exact sur l'exécution
   des outils dans `~/Splash` : non tranché par lecture.

À cela s'ajoute le risque **consent-gated activation** que `gemini-proof.md:100-108` a identifié sans le
retirer : `activate_skill` tourne en `ASK_USER`, soit une approbation **par skill distinct** — `splash`, puis
`suggest-article`, puis `suggest-chart`. Le document demandait de « document the count of prompts the real
flow raises » ; ce comptage n'a jamais eu lieu, faute de Layer B.

### 10.4 Racine (F5) — rien, comme Goose

`gemini.sh:25` lance `gemini` nu. Aucun `INSTALL.md` Gemini, aucune phrase « launch from `~/Splash` », aucun
équivalent de `.codex/INSTALL.md:69`. Comme Goose, la découverte des skills passe par `~/.agents/skills`
(global, indépendant du cwd) : **la prose se charge où qu'on soit, et c'est précisément ce qui rend la panne
différée.** F5 s'applique identiquement à Goose et à Gemini, et sévèrement.

### 10.5 Verdict Gemini

**Inconnu, et faiblement probable.** La découverte est irréprochable ; tout ce qui suit est supposé, et trois
obstacles indépendants (Node, quota, approbations) se cumulent. `gemini-proof.md:170-173` conclut lui-même :
« For Splash's small-newsroom target, **Codex is the working free runtime**; Gemini needs Node + a painful
auth setup + a paid tier. » Rien de ce que j'ai mesuré ne contredit cette phrase ; le § 7.1 la renforce.

---

## 11. Constats classés — spécifiques aux hôtes

Même échelle qu'au § 4, par **conséquence journaliste**. Numérotés `H*` pour ne pas entrer en collision avec
`F1`-`F14`.

| # | Sév. | Hôte | Constat | Fichier:ligne / sonde | Ce que je changerais |
|---|---|---|---|---|---|
| **H1** | **S1** | Claude Desktop | **Aucun chemin n'existe** : ni découverte, ni exécution. Un journaliste qui a Claude Desktop et pas de terminal n'obtient rien — et si une découverte partielle était bricolée, il obtiendrait un **dialogue crédible sans artefact ni gates** (G3a et G3b sont inatteignables sans filesystem). | absence totale (`grep -i desktop` ⇒ 0) ; `gate.ts:41-42` ; `SKILL.md:1028-1031` ; `lib/host/README.md:1531-1546` | Ne rien promettre. Écrire la réponse quelque part de visible (README installeur), et **séquencer derrière le pont entre les deux chaînes** — pas derrière un adaptateur. Faire d'abord l'expérience § 8.6 n° 1 (5 min, gratuite) pour savoir si la brique 1 est gratuite ou si elle coûte un cinquième format de distribution. |
| **H2** | **S1** | Gemini, Goose | **Deux `verified: true` sur quatre sont des décisions produit, pas des preuves** — et sur la page d'installation rien ne les distingue de Codex. Le journaliste choisit un runtime dont l'orchestration n'a jamais tourné. | `configurator-core.ts:16-23` ; `gemini-proof.md:175-179` ; `install/preflight/client.ts:387` | Reprendre le remède de F13 en l'étendant à Gemini : un champ `proven: boolean` distinct de `verified`, et une mention à côté du radio (« découverte vérifiée · orchestration non vérifiée »). Le drapeau `verified` peut rester : c'est l'indistinction qui trompe, pas la décision. |
| **H3** | **S2** | Gemini | **Trois obstacles d'exécution non documentés se cumulent** : Node 20 absent du bootstrap macOS/Linux (double-clic sans effet), mode d'approbation par défaut = prompt à chaque commande, confiance de dossier non traitée. `codex.sh` a jugé nécessaire de seeder son équivalent ; `gemini.sh` ne seede rien. | `gemini.sh:12-14, 25` ; `gemini-proof.md:140-146` ; `gemini --help` (`--approval-mode`) ; sonde P3 (« untrusted folder ») | Symétriser avec `seed_codex_config` : soit installer Node quand le runtime choisi est `gemini`, soit refuser le choix à la configuration avec un message clair ; et décider explicitement du mode d'approbation livré (documenter, ou passer `--approval-mode auto_edit`). Une décision, pas un silence. |
| **H4** | **S2** | Gemini, Goose | **F5 (racine) frappe deux fois plus fort ici que sur Claude Code** : leur découverte passe par `~/.agents/skills`, un chemin global — la prose se charge parfaitement depuis n'importe où et la panne survient **en plein dialogue**. Claude Code, lui, refuse de démarrer (mesuré, P5). Codex documente la précondition (`.codex/INSTALL.md:69`) ; ces deux-là, non. | sonde P5 ; `bootstrap.sh:15-20, 102` ; `gemini.sh:25` ; `goose.sh:29` | Le `SPLASH_ROOT` de F5 reste le bon remède, mais **prioriser sur ces deux hôtes** : c'est là qu'il transforme une panne de milieu de parcours en refus net au premier geste. |
| **H5** | **S2** | Codex | La **preuve de bout en bout s'arrête à `accepted.json`** : sous run non-attendu, Playwright écrit hors sandbox et le produce ne finit pas ; Layer C n'a **aucun résultat consigné**. Le contournement livré (interactif + `on-request`) marche mais impose une approbation par action réseau/hors-workspace. | `codex-proof.md:136-143` vs `:92-101` | Exécuter Layer C une fois et consigner le résultat — c'est un run court sur un chart statique. Et décider si `approval_policy = "never"` + sandbox élargi doit devenir le défaut livré, plutôt que de laisser le journaliste cliquer. |
| **H6** | **S3** | tous | **Le poids de la prose est une contrainte d'hôte, jamais traitée comme telle** : ~52 700 tok à chaque invocation de `splash` (mesuré), ~18 800 pour `suggest-chart`, ~13 800 pour `map-native` ; ~2 213 tok toujours en contexte. C'est la cause arithmétique de l'échec Layer B de Gemini, pas un accident de quota. | sonde P1 ; `goose skills list` (33 389 content tokens) ; `gemini-proof.md:164-168` | Publier ce chiffre dans la doc d'installation comme un **prérequis d'hôte** (« Splash charge ~50k tokens par invocation ; un hôte à quota journalier serré ne peut pas le faire tourner »). Et le relire avant d'exécuter le découpage par phase (F14) : cinq skills de plus, c'est cinq invocations de plus à budgéter. |
| **H7** | **S3** | Goose | **Rectificatif à F9** : 8 manifestes parasites sur le disque, mais Goose déduplique par `name` ⇒ **2 lignes visibles**, pas 8. Et **les trois autres hôtes n'en montrent aucune** — la récursion `node_modules` est propre à Goose. | sonde P2 vs `find -L` ; sondes P1, P3, P4 | Garder le remède de F9 (ne pas symlinker le répertoire entier), mais le reclasser : c'est une correction d'hygiène **mono-hôte**, pas un défaut du dépôt. Corriger F10 d'abord, comme prévu. |
| **H8** | **S3** | Claude Code | **L'hôte le mieux prouvé est le seul sans preuve dans le dépôt** : pas de `claude-proof.md`, pas de `claude-runtime.test.ts`, `claude.verified: true` sans commentaire. Sa preuve réelle vit dans `../splash-harness`, dépôt privé que la release MIT ne publiera pas. | `configurator-core.ts:14` ; `ls docs/installer/` ; sonde P7 | Écrire `claude-proof.md` à partir des sondes P1/P6/P7, et **automatiser P1 et P6 dans un `claude-runtime.test.ts`** — elles n'appellent aucun modèle, elles sont donc éligibles au gate. C'est le seul constat de ce document qui se ferme entièrement sans dépense. |
| **H9** | **S3** | Claude Code | `commands/splash.md` et le skill `splash` **portent le même nom** dans l'inventaire du plugin (`Skills (12)` avec deux `splash`). Sans conséquence connue, mais gratuit à lever. | sonde P1 vs sonde P6 ; `commands/splash.md` ; `.claude-plugin/plugin.json` | Renommer la commande (`/splash-flow`) ou l'assumer explicitement. Accessoirement : F12 (le catalogue documente `/splash` comme LE point d'entrée) ne concerne toujours qu'un hôte sur quatre. |
| **H10** | **S3** | Codex, Gemini | Les documents de preuve annoncent **8 skills** ; le dépôt en a **11** (`newsroom-charter`, `suggest-image`, `using-splash` sont arrivés depuis). Les trois nouveaux surfacent correctement partout (mesuré) — c'est le **critère de PASS** des runbooks qui est périmé, pas le câblage. | `codex-proof.md:36-40` ; `gemini-proof.md:62-71` ; sondes P1-P4 | Remplacer le compte en dur par la règle qui est déjà écrite entre les lignes : « tout répertoire de `skills/` portant un `SKILL.md` », que `link_agents_skills` couvre par son glob. `image-native` reste hors-liste tant qu'il n'a pas de `SKILL.md`. |

---

## 12. Tableau comparatif — l'état réel, aujourd'hui

Légende : ✅ mesuré ou prouvé · ⚠️ partiel / conditionné · ❌ absent ou bloquant · ❓ non tranché.

| Hôte | Découverte | Invocation imbriquée | Exécution | Chemin racine (S2/F5) | Verdict |
|---|---|---|---|---|---|
| **Claude Code** | ✅ **11/11 mesuré** (P1). Pas de récursion `node_modules`. 12ᵉ entrée = `commands/splash.md`, collision de nom (H9). ~2 213 tok toujours en contexte | ✅ **PROUVÉE — 425 / 444 transcripts** portent un vrai `Skill(splash:suggest-chart)` (P7). Le seul hôte où F2 est retiré. Le saut moteur, lui, est un shell-out (4/444) | ✅ Outils natifs, aucun sandbox à ouvrir, aucune config posée par `claude.sh` — rien à ouvrir. Le seul hôte jamais bloqué par une politique de bac à sable | ⚠️ `--plugin-dir .` est relatif — mais **panne franche** : le plugin ne charge pas du tout (P5). Meilleur mode de panne des quatre | **Oui.** Le chemin réel, aujourd'hui. Réserve : sa preuve est hors dépôt (H8) |
| **Claude Desktop** | ❌ **Aucun mécanisme.** Zéro occurrence dans l'arbre ; pas de `install/runtimes/claude-desktop.*`, donc pas même un nom de runtime valide (`read-runtime.ts:24-34`) ; pas de bouton radio ; `MCP servers (0)` | ❌ Sans objet — rien à imbriquer tant que rien ne se charge | ❌ **Non-démarrage.** Pas de shell, pas de filesystem, pas de Chromium ⇒ pas d'artefact, **et G3a + G3b inatteignables** (les sondes ne s'exécutent pas, `shownCovers` ne relit rien) | ❌ Sans cwd contrôlable, `SPLASH_ROOT` passe de souhaitable à **obligatoire** | **Non — non-démarrage.** Le pont évident (MCP sur le contrat de verbes) mène dans la chaîne V2 où le journaliste n'entre jamais (§ 3.2) : chantier d'architecture, pas d'installeur |
| **Codex** | ✅ **11/11 mesuré** (P4), namespacé `splash:*`, locators résolus, zéro parasite | ✅ **Prouvée en direct le 2026-07-13** (`codex-proof.md:127-134`) : `suggest-article` → `suggest-chart` → producteur, `accepted.json` correct | ⚠️ Marche, **mais c'est le seul adaptateur qui doit configurer** (`seed_codex_config`, `codex.sh:31-52`). Produce non-attendu bloqué par le sandbox (Playwright hors workspace) ; interactif + `on-request` = approbations en cours de route. Layer C sans résultat écrit (H5) | ✅ **Documenté** — « Launch Codex from `~/Splash` » (`.codex/INSTALL.md:69`), seule mention explicite du dépôt hors du lanceur | **Oui, sous conditions nommées.** Le témoin, et le seul runtime gratuit qui marche. Pin `0.144.1` à réviser |
| **Gemini CLI** | ✅ **11/11 mesuré** (P3), tous `[Enabled]`, zéro parasite. Risque `output_mode` définitivement retiré | ❌ **Jamais atteinte.** `TerminalQuotaError` avant l'imbrication (`gemini-proof.md:164-168`) — et le § 7.1 en donne la cause arithmétique, pas seulement le symptôme. `activate_skill` en `ASK_USER` : nombre d'approbations jamais compté | ❌ Trois obstacles cumulés et non documentés : **Node 20 absent du bootstrap mac/Linux** (double-clic sans effet), approbation par défaut à chaque commande, confiance de dossier (H3) | ❌ **Rien.** `gemini` nu, découverte globale ⇒ panne **différée**, en plein dialogue (H4) | **Inconnu, faiblement probable.** `verified: true` = décision produit assumée (H2). Le dossier conclut lui-même : « Codex is the working free runtime » |
| *(rappel)* **Goose** | ✅ **11/11 mesuré** (P2) — mais **2** lignes parasites `playwright-*`, seul hôte à recurser (H7, rectifie F9) | ❌ Jamais atteinte (quota, `goose-proof.md:53-55`) | ❓ **Aucune config posée** (`goose.sh`), extensions/approbation/réseau par défaut inconnus (§ 2.9 / F8) | ❌ **Rien.** Même profil que Gemini (H4) | **Inconnu.** `verified: true` = décision produit (H2) |

**La lecture d'ensemble, en une phrase :** la ligne **Découverte** est verte partout — c'est la partie du
travail qui est faite, et bien faite. Tout ce qui est rouge est en aval : **imbriquer**, **exécuter**,
**savoir où l'on est**. Un journaliste non technique obtient un visuel fini **sur Claude Code aujourd'hui**,
**sur Codex à conditions nommées**, et **sur aucun des trois autres**.

---

## 13. Ce qui reste non prouvé, et les expériences les moins chères

Trois expériences, par rapport valeur/coût décroissant. La première ne coûte rien.

### 13.1 Gratuit, sans modèle — fermer H8 et geler la découverte

Les sondes P1 et P6 sont des commandes déterministes sans appel de modèle. Les câbler en test (le pendant
Claude Code de `codex-runtime.test.ts`) fige d'un coup : les 11 skills, l'absence de récursion
`node_modules`, la collision `commands/splash.md`, et le coût en tokens. C'est le seul point de tout ce
document qui se ferme **entièrement, aujourd'hui, sans dépense**.

```bash
cd ~/Splash && claude --plugin-dir . plugin details splash     # inventaire + coût
cd /tmp     && claude --plugin-dir . plugin details splash     # doit refuser (P5, garde F5)
```

### 13.2 5 minutes, gratuit — trancher la seule question qui décide de Claude Desktop

Sur une machine avec Claude Desktop installé : lancer `link_agents_skills` (`bootstrap.sh:15-20`), redémarrer
l'application, chercher `splash` dans sa surface de skills. **Si les skills n'apparaissent pas, la réponse
« non » du § 8 est définitive** jusqu'à ce qu'un bundle d'extension existe, et les deux autres inconnues du
§ 8.6 deviennent sans objet. Si elles apparaissent, la question suivante — un processus local peut-il
tourner ? — se pose avec un MCP shell/filesystem borné à `~/Splash`, et c'est un tout autre chantier.

C'est, de loin, le meilleur rapport information/coût de ce document : **cinq minutes qui décident d'un
chantier d'architecture.**

### 13.3 Payant, un run — Layer B Gemini, à faire **après** avoir mesuré le budget

Le protocole du § 5.2 (fixture `budget-commune-part`, `dw-chart` statique, six critères) se transpose tel quel
à `gemini -y -p …` sur une clé payante. Mais **le mesurer avant de le lancer** : ~52,7k tokens pour `splash`
+ ~5,7k pour `suggest-article` + ~18,8k pour `suggest-chart`, multipliés par les tours. Si le palier visé ne
porte pas cet ordre de grandeur, le run échouera pour la même raison que le précédent et n'apprendra rien.
**H6 avant H2.**

### 13.4 Ce que je ne prétendrai pas savoir, cette fois non plus

- **Je n'ai fait tourner aucun modèle.** Toutes les sondes sont des surfaces d'inventaire. Aucune ligne de ce
  document ne prouve qu'un *parcours* aboutit — sauf § 7.2, qui s'appuie sur 444 runs **déjà enregistrés**,
  pas sur un run que j'aurais lancé.
- **Sur Claude Desktop, je n'ai strictement aucune source dans ce dépôt.** Tout le § 8 est soit un fait
  d'absence (vérifiable par `grep`), soit un raisonnement sur ce que la prose exige (`SKILL.md`, `gate.ts`,
  `preview.ts`). Je n'affirme rien sur ce que Claude Desktop sait ou ne sait pas faire — je dis que **rien
  dans ce dépôt ne s'y branche**, et je nomme l'expérience qui tranche le reste (§ 13.2).
- **Le § 7.2 prouve l'invocation imbriquée, pas le *grounding*.** Que `suggest-chart` ait été invoqué ne dit
  pas que sa KB a été correctement appliquée. C'est une autre question, et elle n'est pas d'ordre multi-hôte.
- **La contrainte d'exécution de Gemini (approbations, confiance de dossier) est établie par son `--help` et
  par une sortie de sonde, pas par un parcours.** Son effet réel sur un produce n'a pas été observé.
- **Les chiffres de tokens sont des estimations de l'outil** (« Token counts are estimates and may differ from
  actual usage »). Leur ordre de grandeur est ce qui compte, et il est confirmé indépendamment par Goose.
