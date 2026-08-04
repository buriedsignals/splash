# Ce qu'un hôte reçoit vraiment quand il charge un skill Splash — mesure et options (E10 / B6)

> **Date :** 2026-08-04 · **Arbres :** `splash-merge` (`main`, `fe096baf`) et les liens réels de
> `~/.agents/skills` · **Hôte :** Goose Desktop 1.45.0 (`/Applications/Goose.app`) · **Source amont :**
> `aaif-goose/goose`, tag `v1.45.0` · **Lecture seule** — aucun fichier du produit modifié, aucun
> lien de `~/.agents/skills` touché.
>
> **Pourquoi ce document.** Le constat E10 (`docs/installer/goose-desktop-proof.md` § « What
> `load_skill` actually costs ») dit que charger `splash` livre au modèle « `SKILL.md` **plus une
> énumération de 50 ressources chargeables** », et en conclut que « *the host lists what it considers
> readable and skips the rest* ». **Les deux moitiés de cette phrase sont fausses**, et la vraie
> mesure est bien pire que le constat. Ce document remplace la déduction par la mesure, lit la règle
> dans la source amont, et pose la décision de distribution — qui appartient au porteur du projet.
>
> **Méthode.** Trois instruments indépendants, et ils convergent :
> 1. **L'hôte lui-même** — `goose skills list` dans un `HOME` isolé, qui donne des colonnes
>    « Description tokens » / « Content tokens » comptées par **le tokeniseur de Goose**.
> 2. **La source amont** — la règle d'énumération lue dans le Rust de `v1.45.0`, `fichier:ligne`.
> 3. **L'enregistrement de session réel** — la base SQLite de Goose
>    (`~/.local/share/goose/sessions/sessions.db`), qui contient les charges utiles **réellement
>    reçues par le modèle** lors des runs Layer B du 2026-08-04.
>
> Un simulateur de la règle amont (écrit pour ce document, jetable) a été **validé contre
> l'instrument 3** avant d'être utilisé pour chiffrer les options : il reproduit au fichier près le
> nombre d'offres de deux charges utiles réelles, et à 0,6 % près la taille d'une troisième.

---

## 0. Résumé — les six choses à retenir

| # | Constat | Classe |
|---|---|---|
| 1 | **Ce n'est pas 50 ressources, c'est 748.** L'énumération de `splash` liste **748** fichiers, pas 50. Le « 50 » du constat E10 était la **fenêtre tronquée d'un `cat`** dans le log — 50 lignes exactement, mesuré. | Chiffre faux, corrigé |
| 2 | **L'hôte ne filtre rien.** Aucun filtre d'extension, de taille, de profondeur, ni aucun fichier d'exclusion. Tout fichier sous le répertoire du skill est offert, sauf `.git`/`.hg`/`.svn` et les sous-arbres qui portent leur propre `SKILL.md`. Lu dans `mod.rs:383-388` + `mod.rs:456-466`. | Déduction fausse, corrigée |
| 3 | **L'énumération coûte plus cher que la prose.** Pour `splash` : **33 693** tokens de `SKILL.md` contre **42 634** tokens de listing. Mesuré avec le tokeniseur de Goose. Pour `map-native` le listing pèse **1 342 060** tokens. | Coût |
| 4 | **★ Ce n'est pas un coût, c'est une panne.** `load_skill(splash)` renvoie 292 487 caractères, au-dessus du seuil de 200 000 de Goose : la réponse est **déversée dans un fichier temporaire** et n'entre jamais en contexte. Le run réel du 2026-08-04 montre le modèle récupérer à la main, recevoir **50 lignes de chemins et zéro prose**, et écrire : *« load_skill actually returns a file listing, and not the skill's instructions »*. | **Perte silencieuse, prouvée en session** |
| 5 | **La cause dominante est `node_modules`, et ce sont des liens symboliques.** `find` ne les voit pas ; Goose les suit. Pour `splash`, 644 des 748 fichiers viennent d'un `node_modules` qui ne contient que **TypeScript et des `@types`** — une dépendance de typecheck, jamais utilisée par un journaliste. | Cause racine |
| 6 | **B6 reproduit, et c'est le même mécanisme.** `playwright-cli` et `playwright-trace` remontent comme skills de plein droit depuis `dw-chart/node_modules/playwright-core/…`, parce que la découverte cherche `SKILL.md` **à profondeur arbitraire**. Coût permanent : 39 tokens dans chaque prompt système. | Fuite |

**Recommandation (§5.5) : option C — séparer « ce qui est livré à un hôte » de « ce qui est le
moteur ».** Elle est la seule qui vaille pour tous les hôtes, qui ferme E10 *et* B6, et qui laisse une
marge durable. Chiffres : `chart-native` passe de 737 634 à **11 895** tokens d'énumération,
`map-native` de 1 342 060 à **6 104**.

---

## 1. Ce qui est mesuré, et par quelle commande

### 1.1 Le coût permanent — ce qui est dans le prompt système à chaque tour

Goose met le **nom + la description** de chaque skill découvert dans ses instructions système, sans
que rien ne soit chargé (`client.rs:259-265`). Commande — `HOME` isolé, liens vers `splash-merge`,
`~/.agents/skills` réel **jamais touché** :

```
$ env HOME=<isolé> /Applications/Goose.app/Contents/Resources/bin/goose skills list
```

| Skill | Description tokens | Content tokens (`SKILL.md`) |
|---|---|---|
| `splash` | 76 | **33 693** |
| `suggest-chart` | 98 | 12 411 |
| `map-native` | 226 | 9 438 |
| `chart-native` | 236 | 5 622 |
| `map-dw` | 121 | 4 639 |
| `dw-chart` | 67 | 4 149 |
| `suggest-article` | 65 | 3 683 |
| `scrolly` | 134 | 3 463 |
| `newsroom-charter` | 122 | 2 651 |
| `suggest-image` | 144 | 1 940 |
| `using-splash` | 17 | 851 |
| `playwright-cli` ⚠️ | 15 | 2 786 |
| `playwright-trace` ⚠️ | 24 | 1 040 |
| `goose-doc-guide` (builtin Goose) | 57 | 817 |

**Total des descriptions : 1 402 tokens**, présents dans **chaque** prompt système. Dont **39 tokens
de parasites** (B6) et 57 pour le builtin de Goose.

Deux relevés secondaires de cette même commande :

- **`image-native` n'apparaît pas.** Il est lié dans `~/.agents/skills` mais n'a pas de `SKILL.md` —
  ce que le proof Goose Desktop avait déjà trouvé, et qui se confirme ici : 12 répertoires liés,
  **11** skills Splash découverts.
- **Les deux parasites sont bien là**, avec leur chemin complet en clair :
  `…/skills/dw-chart/node_modules/playwright-core/lib/tools/cli-client/skill`.

### 1.2 Le coût par chargement — l'énumération

C'est la partie que personne n'avait comptée, et **la colonne « Content tokens » ne la contient
pas** : elle ne compte que le corps de `SKILL.md`. L'énumération s'ajoute par-dessus, à chaque
`load_skill`.

Mesure du nombre de fichiers : simulateur de la règle amont (§2) exécuté sur `~/.agents/skills` réel,
en lecture seule. Mesure des tokens : **le bloc d'énumération rendu est écrit comme corps d'un skill
sonde dans un `HOME` isolé, puis compté par `goose skills list`** — c'est donc le tokeniseur de Goose
qui compte, pas une estimation.

| Skill | Fichiers énumérés | Tokens d'énumération | Charge utile totale (car.) | > seuil 200 000 ? |
|---|---|---|---|---|
| `map-native` | **20 640** | **1 342 060** | 5 168 976 | **DÉVERSÉE** |
| `chart-native` | **12 191** | **737 634** | 3 009 640 | **DÉVERSÉE** |
| `scrolly` | 4 405 | 274 896 | 1 005 889 | **DÉVERSÉE** |
| `splash` | **748** | **42 634** | 294 111 | **DÉVERSÉE** |
| `dw-chart` | 700 | 41 951 | 172 020 | non |
| `suggest-chart` | 34 | 1 628 | 55 278 | non |
| `map-dw` | 34 | *(non sondé)* | 23 141 | non |
| `suggest-article` | 15 | 737 | 17 871 | non |
| `newsroom-charter` | 2 | *(non sondé)* | 11 773 | non |
| `suggest-image` | 0 | — | 8 799 | non |
| `using-splash` | 0 | — | 3 866 | non |

**Lecture de la ligne `splash` :** un `load_skill(splash)` demande 33 693 tokens de prose **et
42 634 tokens de listing de chemins**. Le listing coûte **1,27 ×** la prose. La chaîne
`splash` → `suggest-chart` — que le constat E10 chiffrait à « plus de 45 000 tokens » sur la seule
prose (46 104, vérifié : 33 693 + 12 411) — pèse en réalité **90 366 tokens**.

**Lecture de la ligne `map-native` :** 1,34 million de tokens. Aucun modèle ne charge ça ; ce qui se
passe réellement est décrit au §3.

### 1.3 Le poids sur disque de ce qui est lié

`du -shL` (suit les liens), pour situer ce qu'on met dans `~/.agents/skills` :

```
 31M  splash        701M  chart-native      2.1G  map-native
 24M  dw-chart      171M  scrolly
```

**Ce n'est pas un dossier de skills, c'est 3 Go de checkout de moteur.**

### 1.4 Validation du simulateur contre les charges utiles réellement reçues

La base de sessions de Goose contient trois messages portant un bloc d'énumération, tous dans la
session `20260804_11` (`splash-lb2`, provider `openrouter`, le run Layer B qui a produit un vrai
PNG). Comparaison entre ce que le modèle a **reçu** et ce que le simulateur **prédit** :

| Charge utile réelle | Offres reçues | Offres prédites | Taille reçue | Taille prédite | Écart |
|---|---|---|---|---|---|
| `load_skill(suggest-article)` (msg 124) | **15** | **15** | 18 138 car. | 17 871 | −1,5 % |
| `load_skill(suggest-chart)` (msg 141) | **34** | **34** | 55 896 car. | 55 278 | −1,1 % |
| `load_skill(splash)` (msg 114) | *(déversée)* | 748 | **292 487 car.** | 294 111 | **+0,6 %** |

Les comptes d'offres sont **exacts**. Les écarts de taille s'expliquent par les éditions de `SKILL.md`
depuis le 4 août au matin. Le simulateur est donc un instrument valide pour chiffrer les options
du §5 — et il est le seul moyen de chiffrer `map-native`, dont la charge utile réelle n'entre dans
aucun contexte.

---

## 2. D'où vient la règle — lu dans la source amont

Tout ce qui suit est **lu**, pas déduit, dans `aaif-goose/goose` au tag `v1.45.0`.

### 2.1 La construction de l'inventaire

`crates/goose/src/skills/mod.rs:456-466` — pour chaque skill découvert, la liste des « supporting
files » est construite par un parcours récursif :

```rust
walk_files_recursively(
    skill_dir,
    &mut visited_support_dirs,
    &mut |path| !should_skip_dir(path) && !path.join("SKILL.md").is_file(),
    &mut |path| {
        if path.file_name().and_then(|n| n.to_str()) != Some("SKILL.md") {
            files.push(path.to_string_lossy().into_owned());
        }
    },
);
```

Trois faits en découlent, et ce sont les seuls :

1. **Le prédicat de descente n'exclut que trois répertoires.** `should_skip_dir`
   (`mod.rs:383-388`) :
   ```rust
   matches!(path.file_name().and_then(|name| name.to_str()),
            Some(".git") | Some(".hg") | Some(".svn"))
   ```
   **`node_modules` n'y est pas.** Aucun filtre d'extension, aucun filtre de taille, aucune borne de
   profondeur.
2. **Un sous-répertoire qui porte son propre `SKILL.md` n'est pas descendu** (`!path.join("SKILL.md").is_file()`).
   C'est pourquoi le contenu du skill Playwright n'est pas *dans* les fichiers de `dw-chart` — il
   devient un skill séparé (§4).
3. **Le visiteur pousse tout le reste.** Un `.png`, un `.mp4`, un `.test.ts`, un `bun.lock` : tout est
   offert.

**Les liens symboliques sont suivis.** `walk_files_recursively` (`mod.rs:399-421`) teste
`path.is_dir()` / `path.is_file()`, qui en Rust **résolvent** les liens, et se protège des cycles par
un `HashSet` de chemins canoniques (`mod.rs:399-406`). C'est le point aveugle qui a masqué le
problème : un `find` sans `-L` ne descend pas dans `skills/dw-chart/node_modules` parce que c'est un
**lien**, alors que Goose y descend. Les chiffres de fichiers du constat E10 (103 / 274 / 931) ont
été pris avec cet angle mort.

### 2.2 Le rendu — une ligne par fichier, sans plafond

`mod.rs:129-149`, dans `loaded_skill_context` :

```rust
for file in &skill.supporting_files {
    if let Ok(relative) = Path::new(file).strip_prefix(skill_dir) {
        output.push_str(&format!(
            "- {} → {} (load_skill(name: \"{}/{}\"))\n",
            rel_str, resolved_path, skill.name, rel_str));
    }
}
```

**Aucun `take(n)`, aucune troncature.** Chaque fichier produit une ligne portant le chemin relatif
*et* le chemin absolu. Le seul plafond de tout le module est ailleurs et sans effet ici : le message
d'erreur « fichier introuvable » liste au plus 10 candidats (`client.rs:199`, `.take(10)`).

**Le bloc est placé après la prose** (`mod.rs:124-149` : `## Content` d'abord, puis
`## Supporting Files`). Ce détail d'ordre est ce qui transforme le coût en panne, §3.

### 2.3 Le seuil qui fait basculer

`crates/goose/src/agents/large_response_handler.rs:5` :

```rust
const DEFAULT_LARGE_TEXT_THRESHOLD: usize = 200_000;
```

et `:26` — `if text_content.text.chars().count() > threshold` — remplace alors la réponse de l'outil
par une phrase pointant vers un fichier temporaire (`:32`, écriture `:68-77`). Le seuil est
surchargeable (`:7-11`) :

```rust
fn large_text_threshold() -> usize {
    Config::global()
        .get_param::<usize>("GOOSE_MAX_TOOL_RESPONSE_SIZE")
        .unwrap_or(DEFAULT_LARGE_TEXT_THRESHOLD)
}
```

`GOOSE_MAX_TOOL_RESPONSE_SIZE`, en variable d'environnement ou en clé de
`~/.config/goose/config.yaml` (`config/base.rs:733-755` : l'environnement est lu en premier),
documenté à `documentation/docs/guides/environment-variables.md:283`. L'unique site d'appel en
production est `agents/agent.rs:650`, qui enveloppe **tout** résultat d'outil MCP — donc `load_skill`
y est soumis.

**Une charge utile `load_skill` de plus de 200 000 caractères n'entre pas en contexte.**

### 2.4 La découverte va à profondeur arbitraire

`mod.rs:425-438`, `scan_skills_from_dir` : le même `walk_files_recursively` est lancé sur
`~/.agents/skills` en collectant **tout fichier nommé `SKILL.md`**, sans borne de profondeur. Un
`SKILL.md` enfoui à sept niveaux dans un `node_modules` devient un skill de premier rang. C'est
exactement B6.

Répertoires balayés (`mod.rs:316-342`, `all_skill_dirs`) : `<wd>/.agents/skills`, `<wd>/.goose/skills`,
`<wd>/.claude/skills`, puis `~/.agents/skills`, `<config>/skills`, `~/.claude/skills`,
`~/.config/agents/skills`, puis les répertoires de plugins installés.

---

## 3. ★ Ce que ça a réellement coûté — la preuve dans la session du 2026-08-04

Ce n'est pas un raisonnement. C'est la trace, message par message, de la session `20260804_11`
(`splash-lb2`) — le run Layer B qui a fini par produire un vrai fichier.

| Msg | Rôle | Ce qui s'est passé |
|---|---|---|
| 113 | assistant | `load_skill(name: "splash")` — le modèle entre dans le flux correctement |
| 114 | outil | *« The response returned from the tool call was larger (**292 487 characters**) and is stored in the file … `goose_mcp_response_T1YuDw.txt` »* |
| 115 | assistant | se rabat sur `shell: cat /var/…/goose_mcp_response_T1YuDw.txt` |
| 116 | outil | **6 912 caractères rendus, 50 lignes, 50 offres `load_skill(name: "splash/…")` — 100 % des lignes sont des chemins.** Plus un avertissement : *« Output exceeded 2000 line limit (2161 lines total) »* |
| 117 | assistant | *« I've realized that the `splash` skill's `load_skill` function actually **returns a file listing, and not the skill's instructions** as I anticipated. My current context is now misaligned to the desired workflow. »* |
| 118-119 | | `tree` sur le répertoire, puis `cat /Users/rmdms/.agents/skills/splash/SKILL.md` — récupération à la main, hors du mécanisme de skill |

Quatre conclusions, toutes **mesurées** :

1. **`SKILL.md` n'est jamais entré en contexte par `load_skill`.** Le mécanisme d'invocation de skill
   a échoué en silence sur le skill d'entrée de Splash.
2. **Le « 50 » du constat E10 est cette fenêtre-là** — 50 lignes exactement, comptées dans le message
   116. Ce n'était pas l'hôte qui filtrait 103 fichiers en 50 ; c'était `cat` tronqué au milieu d'une
   énumération de 748. La déduction « *the host lists what it considers readable and skips the rest* »
   est infirmée par la source (§2.1) autant que par ce compte.
3. **L'ordre du bloc décide de ce qu'on perd.** L'énumération étant placée *après* la prose, la
   fenêtre rendue est tombée entièrement dedans : le modèle a reçu 0 % d'instructions et 100 % de
   chemins.
4. **Ça a coûté quatre tours** sur un run dont le proof établit qu'il était **borné par l'allocation
   de requêtes** du palier gratuit. E10 n'est donc pas un coût théorique en tokens : c'est une des
   raisons pour lesquelles Layer B a été si difficile à atteindre.

*(Une réserve de méthode : la fenêtre exacte de 6 912 caractères rendue par l'outil `shell` sur un
fichier de 2 161 lignes ne s'explique pas par une règle que j'aie lue dans la source — je n'ai pas
cherché le code de troncature de l'outil shell. Ce qui est établi, c'est le contenu rendu et la
conclusion qu'en a tirée le modèle, qui sont l'un et l'autre dans la base.)*

---

## 4. B6 — les skills parasites, même mécanisme

**Reproduit** dans le `HOME` isolé (§1.1) : `playwright-cli` et `playwright-trace` remontent depuis
`skills/dw-chart/node_modules/playwright-core/lib/tools/{cli-client/skill,trace}`.

La chaîne causale, entièrement lue dans la source :

1. `skills/dw-chart/node_modules` est un **lien symbolique** vers
   `…/splash/skills/dw-chart/node_modules` — vérifié par `ls -la`.
2. La découverte suit les liens et va à profondeur arbitraire (`mod.rs:425-438`, §2.4).
3. `playwright-core` embarque ses propres `SKILL.md`, qui sont donc découverts comme skills de
   premier rang.
4. Effet de bord : ces répertoires portant un `SKILL.md`, ils ne sont **pas** comptés dans les
   fichiers de `dw-chart` (`mod.rs:460`) — ce qui explique que `dw-chart` n'énumère « que » 700
   fichiers pour 24 Mo liés.

**Coût mesuré : 39 tokens de description dans chaque prompt système**, plus deux outils crédibles
offerts à un modèle qui cherche par quoi remplacer une pipeline qu'il n'arrive pas à charger — à
lire à côté de F6/E11 du proof Goose Desktop, où un modèle est allé activer `autovisualiser` tout
seul pour contourner Splash.

**Fragilité annexe, découverte en chemin et non chiffrée ici :** ces `node_modules` pointent vers
`/Users/rmdms/Sites/Professional/splash/skills/*/node_modules`, c'est-à-dire vers **le worktree
conteneur, qui est sur une autre branche**. Ce qu'un hôte énumère dépend donc de la branche
actuellement extraite dans un répertoire tiers. Signalé, pas traité.

---

## 5. Les options

Chaque option est chiffrée avec le simulateur validé au §1.4, et les tokens sont **mesurés** par le
tokeniseur de Goose sur le bloc rendu, sauf mention contraire.

### 5.1 Option A — un `.gooseignore`

**Verdict : `.gooseignore` n'existe pas dans Goose 1.45.** Vérifié sur un clone du dépôt au tag exact
(`v1.45.0`, commit `4dc0420f`) : un `grep -rni gooseignore` sur tout l'arbre — `crates/`, `ui/`,
`documentation/`, `vendor/`, `evals/`, `examples/` — retourne **une seule occurrence**, et c'est
`.gitignore:19`, une ligne vestigiale qui dit à git de ne pas committer un tel fichier. **Aucun code
ne le lit.** L'hypothèse « il existe peut-être et couvre peut-être ce chemin » est close.

Aucun `.gitignore` n'est consulté non plus sur le chemin skills : `skills/mod.rs` n'importe pas la
crate `ignore` (imports `mod.rs:11-22`), qui n'est employée que par l'outil `tree`, `summarize`,
`analyze` et le chargement des hints. Ça se vérifie aussi de l'extérieur — `skills/dw-chart/.gitignore`
existe et ignore `node_modules`, et les parasites remontent quand même.

**Le seul levier réel côté Goose est ailleurs, et c'est un faux remède :**
`GOOSE_MAX_TOOL_RESPONSE_SIZE` (§2.3). Le relever ferait disparaître le *déversement* — donc la panne
du §3 — mais **livrerait alors les 42 634 tokens d'énumération de `splash` en contexte**, et
1 342 060 pour `map-native`. On échangerait une panne visible contre une saignée invisible. Le
baisser ne ferait qu'étendre le déversement à plus de skills. À ne pas toucher.

Dans les deux cas l'option est **spécifique à Goose** : elle ne ferait rien pour Claude Code, Codex,
Gemini CLI ou We.Publish. À écarter.

### 5.2 Option B — sortir `node_modules` de l'arbre lié

Faire en sorte que les dépendances ne vivent plus **sous** `skills/<moteur>/`.

| Skill | Fichiers avant → après | Tokens avant → après |
|---|---|---|
| `splash` | 748 → **104** | 42 634 → **4 259** |
| `chart-native` | 12 191 → **970** | 737 634 → **46 265** |
| `map-native` | 20 640 → **761** | 1 342 060 → **48 162** |
| `scrolly` | 4 405 → **57** | 274 896 → **2 592** |
| `dw-chart` | 700 → **34** | 41 951 → *(non sondé)* |

**Ce que ça ferme :** B6 entièrement (les parasites vivent dans `node_modules`) ; le déversement de
`splash` (294 111 → 153 434 caractères, sous le seuil) et de `scrolly`.

**Ce que ça ne ferme pas — et c'est le point décisif :** `chart-native` (**203 438** car.) et
`map-native` (**214 544** car.) **restent au-dessus du seuil de 200 000** et continuent de se
déverser. L'option ne suffit pas.

**Ce que ça casse :** chaque moteur a son propre `package.json` avec des dépendances distinctes
(`chart-native` : remotion + d3 + vite ; `map-native` : maptiler + turf ; `dw-chart` : playwright) et
il n'y a **pas de `workspaces`** dans le `package.json` racine — vérifié. Il faut donc soit
introduire des workspaces Bun et remonter les `node_modules` à la racine du dépôt (la résolution
Bun/Node remonte l'arborescence depuis le chemin **réel**, donc ça fonctionnerait à travers les
liens), soit descendre d'un cran chaque moteur et ne lier que son sous-répertoire. Les deux sont des
chantiers réels touchant `bun run check`, les flux `export-source` / `bundle-source` qui recopient
`skills/<moteur>/src`, et l'installeur.

**Portée :** tous les hôtes. **Mais insuffisante seule.**

### 5.3 Option C — séparer « ce qui est livré à un hôte » de « ce qui est le moteur » ★

Le dépôt reste le moteur. Une étape de packaging matérialise un répertoire de **distribution** —
`SKILL.md`, `references/`, `scripts/`, `src/` (le runtime en a besoin), `assets/` — et **exclut** ce
qu'aucun hôte n'a de raison de charger : `node_modules/`, les fichiers `*.test.ts`, `tests/`,
`output-proof/`, `dist/`, `coverage/`. C'est ce répertoire qu'on lie dans `~/.agents/skills`.
(C'est le périmètre exact qui produit les chiffres ci-dessous.)

Mesuré :

| Skill | Fichiers | Tokens d'énumération | Charge utile (car.) | Déversement ? |
|---|---|---|---|---|
| `chart-native` | 12 191 → **275** | 737 634 → **11 895** | 3 009 640 → **67 657** (÷44) | résolu |
| `map-native` | 20 640 → **145** | 1 342 060 → **6 104** | 5 168 976 → **59 176** (÷87) | résolu |
| `scrolly` | 4 405 → **35** | 274 896 → **1 578** | 1 005 889 → **19 160** (÷52) | résolu |
| `splash` | 748 → **48** | 42 634 → **1 905** | 294 111 → **144 757** (÷2) | résolu |
| `dw-chart` | 700 → **20** | 41 951 → **869** | 172 020 → **19 263** (÷9) | déjà OK |

**Réduction : ×62 pour `chart-native`, ×220 pour `map-native`.** Chaîne `splash` → `suggest-chart` :
90 366 → **49 502** tokens.

Le gros contributeur retiré est celui qu'on n'attendait pas : **`output-proof/` pèse 465 des 747
fichiers non-test de `chart-native`** — des artefacts de preuve rendus, précieux dans le dépôt,
sans aucun usage pour un hôte.

**Ce que ça ferme :** E10 pour tous les moteurs, avec marge ; B6 (pas de `node_modules` dans le
livré) ; et la fuite de surface — un journaliste ne se voit plus offrir `format-pin.test.ts`.

**Ce que ça casse / ce que ça coûte :** une étape de build (`bun run pack-skills`) et une **source de
vérité dédoublée** — donc un risque de dérive entre le dépôt et le livré, qui demande sa propre garde
mécanique (par exemple : le gate échoue si le livré est plus vieux que la source). L'installeur
(`link_agents_skills`, qui globe aujourd'hui `"$DEST"/skills/*/`) doit pointer sur le répertoire de
distribution — au passage, cela réglerait aussi le fait qu'il lie `image-native`, qui n'est pas un
skill.

**Portée : tous les hôtes.** Ce n'est pas une rustine Goose : la même chose vaut pour tout hôte qui
énumère ou indexe un répertoire de skill.

**Marge :** c'est l'argument décisif contre B seule. `chart-native` retombe à **67 657** caractères
contre un seuil de 200 000 — un facteur 3 de marge, dans un moteur qui grossit à chaque nouveau type
de graphique. La même ligne sous « B seule » vaut **203 438**, c'est-à-dire **déjà au-dessus du
seuil**. Après C, le seul skill qui reste dans le même ordre de grandeur que le seuil est `splash`
(144 757), et pour une raison qui n'a plus rien à voir avec l'énumération : sa prose (§5.5).

### 5.4 Option D — le répertoire lié ne contient que la prose

Version maximale : `~/.agents/skills/<skill>/` ne contient que `SKILL.md` + `references/`, tout
l'exécutable vivant à un chemin absolu stable hors de l'arbre lié (p. ex. `~/.splash/engine/`),
adressé en absolu depuis la prose.

Mesuré : l'énumération tombe à **3 fichiers pour `splash`**, **1 pour `chart-native`**, **1 pour
`map-native`**, **0** pour six des onze skills. Le coût de `load_skill` redevient **exactement le coût
de la prose** — et c'est la seule option qui rende l'énumération *utile* : elle ne liste plus que les
fiches de référence, c'est-à-dire précisément ce que la divulgation progressive est censée offrir.

**Ce que ça casse :** beaucoup. Toute la prose qui résout des chemins relatifs depuis le répertoire du
skill doit passer en absolu résolu à l'installation ; `load_skill("splash/scripts/…")` — que le run
réel a utilisé (msg 93 de la session `20260804_10`) — disparaît ; le contrat « format skill-autonome »
canon Tom (`SKILL.md` + `references/` + `scripts/` + `assets/` dans un même dossier), qui est une
convention affichée du projet, est rompu.

**Portée :** tous les hôtes. **Verdict :** garder en réserve. C'est la bonne réponse si l'on découvre
un jour qu'un hôte indexe ou lit le contenu des fichiers offerts et pas seulement leurs noms ; c'est
trop cher aujourd'hui pour un gain marginal par rapport à C.

### 5.5 Recommandation

**Option C**, et B est incluse dedans (C exclut `node_modules`, donc ferme B6 par construction).

Trois raisons, dans l'ordre :

1. **B seule ne suffit pas, et c'est mesuré** : `chart-native` et `map-native` continuent de se
   déverser après suppression des `node_modules`. Or le déversement n'est pas un surcoût, c'est la
   panne du §3.
2. **C est la seule qui laisse de la marge** dans une codebase qui grossit à chaque type ajouté.
3. **C est une décision de distribution, pas une rustine d'hôte.** Elle répond à la vraie question que
   pose E10 — *qu'est-ce qu'on livre à une rédaction ?* — et la réponse « 3 Go de checkout de moteur,
   tests et proofs compris » n'est défendable devant aucun hôte, ni devant une sortie MIT.

**Non traité ici, volontairement :** la prose elle-même. `splash/SKILL.md` pèse 33 693 tokens et reste,
après C, le poste dominant d'un `load_skill(splash)` (1 905 tokens d'énumération contre 33 693 de
prose). Le découpage de `SKILL.md` par phase est déjà à l'agenda du projet ; C ne le remplace pas, elle
le rend lisible.

---

## 6. Ce que je n'ai pas pu établir

- **Le tokeniseur exact de `goose skills list`.** Les chiffres de tokens sont ceux que **Goose
  rapporte**, comparables entre eux et à ceux du proof, mais je n'ai pas vérifié qu'ils
  correspondent au décompte du fournisseur de modèle utilisé.
- **La règle de troncature de l'outil `shell`** qui a produit la fenêtre de 6 912 caractères / 50
  lignes (§3). Le contenu rendu est mesuré ; le mécanisme ne l'est pas.
- **`map-dw` et `newsroom-charter`** n'ont pas eu de sonde de tokens sur leur énumération complète ;
  leurs charges utiles sont petites (23 141 et 11 773 caractères) et loin du seuil, l'enjeu est nul.
- **Le comportement des autres hôtes.** Tout ce document mesure Goose 1.45. Que Claude Code, Codex ou
  Gemini CLI énumèrent, indexent ou ignorent le répertoire d'un skill **n'est pas mesuré ici** — c'est
  précisément pourquoi la recommandation est une option de distribution valable indépendamment de la
  règle de chaque hôte, et non un contournement calé sur celle de Goose.
- **Le coût de mise en œuvre de C** n'est pas chiffré : ce document mesure le problème et dimensionne
  les remèdes, il ne planifie pas le chantier.
- **Ce que l'arbre contenait le 2026-08-03**, jour du constat E10. Les mesures ici datent du
  2026-08-04. La convergence à 0,6 % entre le simulateur d'aujourd'hui et la charge utile de 292 487
  caractères enregistrée ce jour-là indique que l'arbre a peu bougé, mais ce n'est pas une preuve.
