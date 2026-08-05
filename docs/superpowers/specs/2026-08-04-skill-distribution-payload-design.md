# Séparer ce qu'on livre à un hôte de ce qui est le moteur (E10, option C)

**Date** : 2026-08-04 · **Backlog** : E10 (ferme B6 avec) · **Mesures** :
`docs/splash/skill-payload-2026-08-04.md`

## 1. Le problème, et pourquoi ce n'est pas un surcoût

`load_skill(splash)` renvoie **292 487 caractères**, au-dessus du seuil de débordement de Goose
(200 000, `large_response_handler.rs:5`). La réponse part dans un fichier temporaire et **`SKILL.md`
n'entre jamais dans le contexte**. Ce n'est pas une dépense évitable, c'est une panne, et elle s'est
produite : dans le run du 2026-08-04 le modèle l'a écrit lui-même — *« load_skill actually returns a
file listing, and not the skill's instructions… My current context is now misaligned »* — puis a
perdu quatre tours à s'en remettre.

La cause est mécanique. L'hôte **ne filtre rien** (`crates/goose/src/skills/mod.rs:456-466` : ni
extension, ni taille, ni profondeur ; seulement `.git`/`.hg`/`.svn`), et **`find` ne suit pas les
liens symboliques, l'hôte si** — c'est par là que `node_modules` entre. `.gooseignore` n'existe pas
en v1.45.0.

Ce que l'hôte reçoit aujourd'hui n'est pas un skill, c'est un checkout de moteur : **20 640 fichiers**
pour `map-native`, **12 191** pour `chart-native`.

## 2. La règle produit

**Ce qu'on livre à une rédaction n'est pas ce qu'on développe.** Le dépôt reste le moteur ; une étape
de packaging matérialise ce qu'un hôte reçoit. C'est une décision de distribution, pas une rustine
pour un hôte : la même chose vaut pour tout hôte qui énumère un répertoire de skill.

## 3. Trois décisions, prises et mesurées

### 3.1 Le livré est construit à l'installation, jamais committé

`bootstrap.sh` construit `$DEST/.dist/` puis lie **celui-là** dans `~/.agents/skills`
(ou `~/.claude/skills` selon le runtime). Rien de dupliqué dans git, donc **aucune dérive possible**
— la garde anti-dérive que le document E10 réclamait devient sans objet, ce qui est mieux que de
l'écrire.

### 3.2 Les dépendances vivent à `.dist/node_modules`, un cran au-dessus des skills

L'invariant qui rend ça possible, **mesuré** : l'hôte n'énumère que le répertoire du skill lié. Les
parasites Playwright remontaient parce qu'ils sont *dans* `dw-chart/node_modules`, sous le skill. Ce
qui est **au-dessus** — `.dist/node_modules`, `.dist/lib` — est invisible pour lui.

Et c'est résolvable : vérifié empiriquement, un script sous `.dist/skills/<moteur>/scripts/` résout
un paquet installé à `.dist/node_modules` (la résolution Bun remonte l'arborescence depuis le chemin
réel).

Une seule installation fusionnée suffit : sur l'ensemble des moteurs, la seule version divergente est
`@types/node` 26.1.0 (`map-native`) contre 26.1.1 (`dw-chart`) — un patch, sur un paquet de types
dont l'exécution n'a pas besoin.

**Conséquence sur l'installeur** : l'étape actuelle « dépendances par moteur » est **remplacée** par
cette installation unique, pas ajoutée. Le journaliste n'installe pas deux fois.

### 3.3 Périmètre par exclusion, inflation gardée par un budget

On copie tout **sauf** : `node_modules/`, `dist/`, `tests/`, `*.test.ts`, `output-proof/`,
`coverage/`. Rien ne peut donc manquer par oubli — le risque bascule sur l'inflation, qui est gardée
en § 5.

Une liste d'**inclusion** a été écartée : `map-native` porte un répertoire `remotion/` (3 Mo) hors du
quintuplet évident `SKILL.md`/`references`/`scripts`/`src`/`assets`, et une omission de ce genre ne
se voit qu'au premier rendu vidéo raté **chez le journaliste**.

## 4. Architecture

Le layout est préservé, et ce n'est pas décoratif : les moteurs s'importent entre eux
(`../../../lib/core/registry` ×8, `../../dw-chart/src/chart-spec` ×5,
`../../chart-native/src/chart-story` ×4, `../../splash/src/channel` ×3…). Un répertoire de
distribution **par skill** ne peut pas être autonome.

```
~/Splash/                        le moteur, inchangé
├── lib/  skills/  scripts/ …
└── .dist/                       construit à l'installation
    ├── package.json             dépendances fusionnées des moteurs
    ├── node_modules/            UNE installation — invisible pour l'hôte
    ├── lib/                     copié (les moteurs l'importent) — invisible
    └── skills/
        └── <moteur>/            ◄── SEUL ce sous-arbre est énuméré
            ├── SKILL.md  src/  scripts/  assets/  references/
            └── (ni node_modules, ni dist, ni tests, ni output-proof)

~/.agents/skills/<skill>  ──►  ~/Splash/.dist/skills/<skill>
```

**Composants**

| Unité | Rôle | Dépend de |
|---|---|---|
| `scripts/pack-skills.mjs` | lit l'arbre, écrit `.dist/`, fusionne les `package.json` | la liste d'exclusion |
| `bun run pack-skills` | l'entrée appelable | ci-dessus |
| **`lib/host/skill-payload.ts`** | **le simulateur** : pour un répertoire de skill, rend le compte de fichiers et la charge utile en caractères, selon la règle amont (§ 5.1) | — |
| `install/bootstrap.sh` | packager → installer dans `.dist/` → lier `.dist/skills/*/` | les deux premiers |
| `link_agents_skills` | inchangé sauf la racine qu'on lui donne | — |

Le simulateur est une **unité neuve** : celui qui a produit les chiffres d'E10 était jetable et n'est
pas dans le dépôt. C'est lui qui rend les budgets du § 5 mesurables sans Goose.

**Deux points de contrat du packageur**, pour qu'ils ne soient pas laissés à l'interprétation :

- **Il est idempotent** — `bootstrap.sh` est réexécutable, donc le packageur écrase un `.dist/`
  existant plutôt que de fusionner par-dessus. Un fichier supprimé de la source doit disparaître du
  livré, sans quoi le livré n'est plus dérivé mais accumulé.
- **Il ne packe que ce qui est un skill** — les répertoires de `skills/` qui portent un `SKILL.md`,
  exactement la règle qu'E9 a posée dans `link_agents_skills`. `lib/` est copié à part, comme
  dépendance interne, pas comme skill.

## 5. Les deux budgets

### 5.1 Comment on mesure — et pourquoi pas en tokens

Les chiffres d'E10 ont été comptés par **le tokeniseur de Goose**, via un skill sonde. C'est
injoignable depuis `bun test`, donc **les budgets du gate sont exprimés en fichiers et en
caractères**, tous deux déterministes.

Ce n'est pas une approximation de confort : le simulateur de charge utile a été **validé contre trois
charges réellement reçues** par un modèle (session `20260804_11`) — comptes d'offres **exacts** (15/15,
34/34), tailles à **−1,5 % / −1,1 % / +0,6 %**. Les tokens restent la référence documentaire du § 5.2 ;
le gate, lui, garde les caractères.

La règle amont que le simulateur reproduit (`crates/goose/src/skills/mod.rs:456-466`) : parcours à
profondeur arbitraire, **aucun filtre** d'extension, de taille ou de profondeur, **les liens
symboliques sont suivis**, sont sautés `.git`/`.hg`/`.svn` et tout sous-arbre portant son propre
`SKILL.md`.

### 5.2 Les deux plafonds

Ils gardent deux choses différentes, et c'est délibéré.

**Budget d'énumération — 400 fichiers par skill.** C'est ce que le packageur contrôle vraiment. Le
maximum après packaging est `chart-native` à 276 fichiers → 31 % de marge. (Référence en tokens
Goose, non gardée : 11 895 pour `chart-native`.)

**Budget de charge utile — 160 000 caractères par skill**, soit 80 % du seuil de débordement de
Goose. C'est le garde-fou contre la panne elle-même.

**Les colonnes « après » ont été RE-MESURÉES le 2026-08-04 avec le simulateur livré**
(`lib/host/skill-payload.ts`) sur l'arbre réellement packagé — le premier jet de ce tableau était
écrit avant que l'outil existe, et ses charges utiles étaient fausses d'un facteur allant jusqu'à
2,2 (`chart-native` annoncé 67 657, mesuré **30 243**). Les colonnes « avant » et la colonne
**tokens** restent les mesures d'origine d'E10, prises par le tokeniseur de Goose : elles ne sont
pas reproductibles depuis `bun test` et n'ont pas été re-mesurées.

| Skill | Fichiers | Tokens d'énumération | Charge utile (car.) | Marge au budget car. |
|---|---|---|---|---|
| `chart-native` | 12 191 → **276** | 737 634 → **11 895** | 3 009 640 → **30 243** | ×5,3 |
| `map-native` | 20 640 → **147** | 1 342 060 → **6 104** | 5 168 976 → **40 363** | ×4,0 |
| `scrolly` | 4 405 → **38** | 274 896 → **1 578** | 1 005 889 → **14 888** | ×10,7 |
| `splash` | 748 → **51** | 42 634 → **1 905** | 294 111 → **146 316** | **×1,1** |
| `dw-chart` | 700 → **21** | 41 951 → **869** | 172 020 → **16 757** | ×9,5 |

Les 12 skills se re-mesurent en une commande avec le même simulateur. Le second poids lourd n'est
dans aucune ligne ci-dessus : `suggest-chart`, **32 fichiers / 50 111 caractères** — de la prose,
comme `splash`.

**L'arbitrage sur `splash`, décidé** : il passe de justesse, et son poids n'est plus de l'énumération
(1 905 tokens) mais **sa prose** (33 693 tokens). Le plafond reste à 160 000 **malgré** cette marge
étroite, parce que c'est le bon déclencheur : le jour où `SKILL.md` grossit encore, le gate rougit et
force le découpage par phase. L'exempter reviendrait à éteindre le seul capteur qu'on ait sur ce
sujet.

## 6. Ce qui prouve que ça marche

1. **Les deux budgets** du § 5.2, mécaniques, dans le gate, mesurés par le simulateur.
2. **Un test d'hygiène** : `.dist/` ne contient aucun `node_modules`, `dist/` ni `output-proof/` sous
   un répertoire de skill. Le jour où l'exclusion se fait contourner, il rougit.
3. **Produire un vrai visuel depuis `.dist/`.** C'est la garde qui tranche ce que le papier ne peut
   pas — et sur ce projet, seul le livré fait foi.

Deux questions **restent ouvertes et seront réglées par la preuve 3**, pas par le raisonnement :

- le `package.json` conservé dans `.dist/skills/<moteur>/` gêne-t-il la résolution depuis
  `.dist/node_modules` ? Si oui, le packageur le retire ou le réécrit.
- `map-native/remotion/` suffit-il au rendu vidéo depuis `.dist/` ?

Une garde de non-régression est également requise : la découverte doit rester à **12 liés / 12
découverts** après bascule sur `.dist/` (méthode : `goose skills list` avec un `HOME` isolé, jamais
le seul fait que les fichiers existent).

## 7. Hors périmètre

- **La prose elle-même.** Après packaging, `load_skill(splash)` reste dominé par ses 33 693 tokens de
  `SKILL.md`. Le découpage par phase est un chantier distinct, déjà à l'agenda ; celui-ci le rend
  seulement lisible.
- **Toute refonte du dépôt** : pas de workspaces Bun, pas de remontée des dépendances, pas de
  déplacement de moteur. Écarté au profit de § 3.2, qui obtient le même effet sans y toucher.
- **Le chemin développeur** : `claude --plugin-dir .` depuis le dépôt continue de voir l'arbre
  complet. Inchangé.
- **★ Le `dist/` que produit un rendu, dans l'installation vivante.** L'exclusion de `dist/` tient
  au packaging et **jusqu'au premier `produce`, pas au-delà** : les producteurs construisent dans
  `<skill>/dist/` (`chart-native/vite.config.ts` via `chartDistSub`, `map-native/scripts/produce.mjs`
  via `BUILD_OUT`, `scrolly/vite.config.ts` `outDir: "dist"`), c'est-à-dire dans
  `.dist/skills/<moteur>/dist/` — **à l'intérieur du seul répertoire que l'hôte énumère**. Rien ne
  l'élague, et les deux gardes mesurent un arbre **fraîchement packagé**, jamais une installation
  vivante : **les deux budgets sont une mesure du jour de l'installation.**
  Ordre de grandeur mesuré sur ce dépôt après un usage de développement ordinaire :
  `chart-native/dist` = 14 fichiers (~518 car. d'énumération), `map-native/dist` = 24 (~1 578),
  `scrolly/dist` = 1. La forme est `dist/<type>/<format>/` à ~1–2 fichiers par couple, donc une
  installation qui finirait par produire les **41** types de `chart-native` ajouterait de l'ordre de
  **120 fichiers** à un budget de 400 qui démarre à **276** — le plafond de FICHIERS est ce qui
  serrerait, pas celui de caractères (~4 500 car. face à 130 000 de marge).
  **Non corrigé ici, et délibérément** : rediriger les sorties de build hors de l'arbre du skill
  demande de câbler une racine de build à travers `chartDistSub` et ses 8 scripts de snap, les 2
  appels `BUILD_OUT` de `map-native` et le `vite.config.ts` de `scrolly` — un changement dont la
  seule preuve valable est un rendu réel, hors périmètre d'une passe de revue. La contrainte est
  écrite ici et dans le commentaire de `lib/host/skill-payload-budget.test.ts` plutôt que
  compensée par un correctif inventé.
- **`GOOSE_MAX_TOOL_RESPONSE_SIZE`** : le relever supprimerait le débordement mais livrerait
  l'énumération en contexte — une panne visible échangée contre une saignée invisible. À ne pas
  toucher.
