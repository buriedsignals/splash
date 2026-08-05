# La page de réglages cesse de mentir (sous-projet #1)

**Date** : 2026-08-05 · **Branche** : `feat/setup-page-truth` · **Origine** : cinq retours de Rémy
sur la page de réglages, lus écran par écran le 2026-08-05.

Ce spec est le **premier de trois**. Les deux autres sont nommés au §7 : ils touchent le même
écran et le même fichier de profil, mais chacun a sa propre décision de fond, et les fondre
produirait un spec que personne ne peut relire.

---

## 1. Ce qui ne va pas, mesuré

Cinq constats. Trois sont des défauts, un est une décision assumée mal comprise, un est un
résidu.

### 1.1 ★ La page annonce « missing » sur ce que la machine vient d'installer — et sur une vraie install, pour toujours

C'est le défaut grave, et il est invisible depuis l'arbre de développement.

- `chart-native` et `image-native` déclarent `env: []` (`lib/newsroom/capabilities.ts:81-96`,
  `:126-134`) : il n'y a **rien à demander à un humain**. Leur statut vient du sondage
  `criticalDeps` (`lib/newsroom/readiness.ts:102-118`), qui cherche `react` / `vite` / `remotion` /
  `sharp` depuis `<skillsRoot>/<engine>`.
- `skillsRoot` n'est **jamais passé** en production : le champ existe (`install/preflight/model.ts:110`,
  `:234`) et personne ne le remplit, donc il retombe sur `DEFAULT_SKILLS_ROOT`, soit
  `<repo>/skills` (`lib/newsroom/readiness.ts:46`).
- Sur une install réelle, les dépendances des moteurs ne sont **pas** là : elles s'installent dans
  `~/Splash/.dist/node_modules` (`scripts/pack-skills.mjs:11-13`), et la racine `~/Splash/node_modules`
  ne contient que `zod`, `fflate`, `@noble/hashes` (racine `package.json`). `Bun.resolveSync("react",
  "~/Splash/skills/chart-native")` remonte l'arbre et ne trouve rien.
- S'ajoute un défaut d'ordre : la page est l'**étape 4** du bootstrap, l'installation des
  dépendances l'**étape 5** (`install/bootstrap.sh:104-107` puis `:115-140`). Même avec le bon
  chemin, la page mesure un arbre qui n'existe pas encore.

Conséquence : les quatre moteurs maison lisent **missing**, et la phrase émise ordonne
*« run `bun install` in skills/<engine> »* (`lib/newsroom/readiness.ts:113-116`) — un ordre de
terminal, dans une page dont la promesse est qu'il n'y en aura pas. Chez le développeur c'est vert
parce que `skills/chart-native/node_modules` existe dans l'arbre de dev : c'est pourquoi une suite
verte ne l'a jamais vu.

C'est la classe E17 (« une clé, deux domiciles ») à l'envers : le préflight **rouge** là où la
production marche. Le versant E17 lui-même est déjà fermé — le packer re-lie `.env`,
`newsroom.json` et `NEWSROOM-PROFILE.md` dans `.dist` (`scripts/pack-skills.mjs:173-198`), et le
préflight embarqué se résout par rapport à lui-même (`skills/splash/src/preflight.ts:22`), donc
il est juste. **Seule la page est fausse.**

### 1.2 La clé Anthropic est mal cadrée, dans les deux sens

`ANTHROPIC_API_KEY` est écrite en dur (`install/preflight/serialize.ts:97`) et le launcher source
`.env` avant de lancer le runtime (`install/bootstrap.sh:160-163`). Elle ne sert donc qu'à Claude
Code. Elle est demandée à qui a choisi Codex, Gemini ou Goose — et à qui a choisi une app de
bureau, qui possède son propre compte. Symétriquement, Codex, Gemini et Goose n'ont **aucun**
chemin pour leur propre clé.

Le commentaire du modèle a raison sur le principe — *« The runtime's own API key is not a
capability — it is the assistant's login »* (`install/preflight/model.ts:89`) — mais « du runtime »
est codé en dur sur un seul fournisseur.

### 1.3 Les capacités sont libellées par l'outil

`« Datawrapper charts »`, `« Charts built in-house (no account needed) »`
(`lib/newsroom/capabilities.ts:62-134`). Le journaliste doit traverser un nom de produit pour
trouver ce qu'il veut faire.

### 1.4 Fly.io est un résidu

`embed-fly`, `implemented: false` (`lib/newsroom/capabilities.ts:308-316`), rendu « Not available
yet ». Cloudflare Pages l'a remplacé ; la décision « self-host fly optionnel » (2026-06-23) est
morte.

### 1.5 Goose Desktop et Claude Desktop grisés — délibéré, hors spec

`verified: false` (`install/configurator-core.ts:28`, `:32`). Couche A (l'hôte découvre les
skills) mesurée pour les deux ; Couche B (**un visuel en sort**) jamais observée. Ce n'est pas un
défaut de code : c'est **un run de preuve** qui bascule deux drapeaux. Il ne rentre dans aucun
spec, et il est nommé ici pour qu'on cesse de le confondre avec un chantier.

À noter tout de même, parce que c'est le vrai coût : les deux runtimes conçus pour le journaliste
(depuis le Dock, sans terminal) sont les deux qu'on lui cache, pendant qu'on lui propose quatre
CLI.

---

## 2. Décisions

| # | Décision | Écarté |
|---|---|---|
| D1 | **La page est le dernier écran interactif** de l'install : on package et on installe AVANT de configurer. | Ne pas sonder avant l'install (la page resterait muette sur un état qu'elle peut mesurer) ; sonder `.dist` sans inverser (rouge légitime au pire moment). |
| D2 | Le sondage reçoit `skillsRoot = $DEST/.dist/skills`. | Laisser le défaut et « corriger le libellé » — le statut serait faux, pas seulement mal dit. |
| D3 | Le **login est déclaré par le runtime**, pas par la page. | Supprimer le champ (un journaliste avec une clé API n'aurait nulle part où la mettre) ; garder Anthropic sous condition (laisserait Codex/Gemini sans chemin). |
| D4 | **L'envie mène, l'outil reste cochable dessous.** | Une case par envie qui active les deux moteurs (retire au journaliste un choix qu'il veut garder) ; aucune case (perd « ce qui est décoché n'est jamais signalé manquant »). |
| D5 | `embed-fly` est supprimé du registre. | Le laisser en « pas encore disponible » — il annonce une capacité qui n'arrivera pas. |

---

## 3. L'ordre de l'install

`install/bootstrap.sh` passe de :

```
3 bun install (racine) → 4 page → 5 pack + .dist install + Chromium → 6 runtime → 7 launcher
```

à :

```
3 bun install (racine) → 5 pack + .dist install + Chromium → 4 page → 6 runtime → 7 launcher
```

Rien d'autre ne bouge :

- `runtime_install` reste **après** la page — c'est elle qui enregistre le runtime, lu par
  `install/read-runtime.ts` (`install/bootstrap.sh:141-153`) ;
- l'étape 5 ne dépend d'aucune valeur de la page (le packer lit l'arbre, pas la décor) ;
- le re-run avec un `.env` déjà présent saute toujours la page (`install/bootstrap.sh:107`), et
  `SPLASH_UPDATE=1` préserve toujours `.env` / profil / `exports` (`:53`, `:68-90`).

Le journaliste attend désormais **avant** d'agir plutôt qu'après. Le terminal nomme donc ce qu'il
fait, une ligne par phase : empaquetage des skills · dépendances de rendu · navigateur de rendu
(~93 Mo, une seule fois).

**Effet de bord assumé** : un échec de `bun install` dans `.dist` ou du téléchargement Chromium
sort déjà en erreur (`install/bootstrap.sh:128-140`) et le fait maintenant **avant** que le
journaliste ne configure quoi que ce soit — il ne remplit plus un formulaire pour un arbre
inutilisable.

---

## 4. Ce que la page dit

Les sections gardent leur ordre (`install/preflight/copy.ts:10-17`).

### 4.1 Votre rédaction · Langue

**Inchangées dans ce spec.** Le sous-projet #2 les refait (mesure du site, profil complet).

### 4.2 Votre assistant

`RUNTIMES` (`install/configurator-core.ts:13-33`) gagne un champ facultatif :

```ts
login?: { name: string; label: string; help: string; optional: boolean }
```

- `claude` → `ANTHROPIC_API_KEY`, `optional: true` (« laissez vide si vous avez un abonnement »)
- `codex`, `gemini` → leur propre clé, mêmes règles
- `goose`, `goose-desktop`, `claude-desktop` → **rien** (Goose porte sa propre configuration ; les
  apps possèdent le compte)

La page n'affiche que le champ du runtime sélectionné, et **rien** si le runtime n'en déclare pas.
`install/preflight/serialize.ts:97` cesse d'écrire `ANTHROPIC_API_KEY` en dur : il écrit le champ
déclaré par le runtime choisi.

Le champ reste dans le registre TS et **pas** dans le module `install/runtimes/<name>.sh` : celui-ci
est du shell sourcé par bash, la page est du TypeScript. Le contrat « ajouter un runtime = un
fichier » devient « un fichier `.sh` + une entrée dans le registre », ce qui est déjà le cas
(`RUNTIMES` gate déjà la sélectionnabilité — `install/runtimes/README.md`).

### 4.3 Ce que vous voulez pouvoir faire

Les capacités sont **groupées sous l'envie**, et chaque moteur reste une case :

| Envie | Cases | Ce qu'elle demande |
|---|---|---|
| Des graphiques | maison · Datawrapper | rien · un jeton Datawrapper |
| Des cartes | maison · Datawrapper | une clé MapTiler · un jeton Datawrapper |
| Des scrollys | scrolly | une clé MapTiler |
| Des récits photo | image-native | rien |

La vidéo n'est pas une envie séparée : c'est un format des moteurs maison, et son navigateur de
rendu fait partie de leur état (`lib/newsroom/readiness.ts:120-133`). Le dire dans le libellé de la
case maison, pas dans une ligne à part.

Le champ `label` de `NEWSROOM_CAPABILITIES` devient le **nom de la case** (l'outil), et un champ
`want` nouveau porte le titre de groupe. Deux capacités qui partagent un `want` s'affichent sous un
seul titre. Rien d'autre du registre ne change : `env`, `envHelp`, `settingsFields`, `criticalDeps`
sont déjà à la bonne granularité.

### 4.4 Publication

`embed-fly` supprimé. Restent : paquet téléchargeable (toujours prêt, sans compte) · lien
Datawrapper déjà en ligne · Cloudflare Pages · stockage S3 de la rédaction · CMS We.Publish.

### 4.5 Où vous en êtes

Ne parle plus que de ce qu'un **humain** doit fournir. Après D1, une dépendance absente n'est plus
un état normal mais un échec d'install — le sondage reste comme ceinture (il coûte trois `resolveSync`),
et sa phrase cesse d'ordonner un `bun install` : elle dit que l'installation n'a pas abouti et
qu'il faut relancer l'installeur.

---

## 5. La suppression de `embed-fly`

L'entrée sort de `lib/newsroom/capabilities.ts`. Quatre suites s'en servent comme **cobaye
« déclaré mais non construit »** :

- `lib/newsroom/readiness.test.ts:31-33` (`UNBUILT`)
- `lib/newsroom/capabilities.test.ts:57-58`
- `lib/core/verbs/publish.test.ts:100-103`
- `lib/newsroom/migrate-decor.test.ts:106`
- (+ `lib/core/publishers.test.ts:71-76`, `lib/delivery/routing.test.ts:57`, qui l'emploient comme
  simple identifiant d'éditeur stub)

Elles reçoivent un **stub défini dans le test**, jamais une capacité de production. La branche
`!implemented` de `capabilityReadiness` (`lib/newsroom/readiness.ts:54-59`) **reste** : le concept
resservira au prochain adaptateur déclaré avant d'être écrit. `capabilities.test.ts` bascule de
« la seule non construite est `embed-fly` » à « **aucune capacité livrée n'est non construite** »,
qui est l'invariant qu'on veut vraiment tenir.

---

## 6. Comment on prouve que c'est vrai

Le défaut du §1.1 est exactement celui qu'une suite verte n'a pas vu. Donc trois niveaux, et le
premier est non négociable.

1. **Test par mutation du sondage.** Monter un faux arbre d'install — `skills/<engine>/` sans
   `node_modules`, `.dist/node_modules` peuplé, `.dist/skills/<engine>/` — et asserter `ready`.
   Puis **vérifier que repointer `skillsRoot` sur `skills/` fait rougir le test**. Un test qui ne
   casse pas quand on remet le bug ne prouve rien (mémoire : « le chemin de vérification évite la
   casse »).
2. **Test d'ordre** dans `docs/installer/bootstrap-sh.test.ts`, qui lit déjà le script : le bloc
   pack + install précède le bloc configurateur, et `runtime_install` suit la page. Il doit
   échouer si on rétablit l'ordre actuel.
3. **Preuve live.** Une install réelle dans `~/Splash` depuis un arbre pré-posé (le dépôt est
   privé, donc le téléchargement de l'étape 2 n'est pas jouable — voir §8), page ouverte, les
   quatre moteurs maison affichés **prêts**. C'est la seule preuve qui compte ; les deux tests
   empêchent la régression. Le résultat est consigné dans `docs/installer/setup-page-proof.md`.

Les tests existants qui doivent rester verts : `install/configurator.test.ts`,
`install/configurator-core.test.ts`, `install/preflight/*.test.ts`, `lib/newsroom/*.test.ts`,
`docs/installer/*.test.ts`, et la porte `bun run check` (23 checks).

---

## 7. Ce que ce spec ne fait pas

- **Sous-projet #2 — la charte mesurée.** Bouton « lire mon site » dans la section *Votre
  rédaction* → `proposeCharter` (`lib/newsroom/charter.ts:829`) + `charter-fetch.ts`,
  déterministe, sans LLM ; chaque valeur montrée avec son reçu ; profil complet écrit après
  validation (palette ordonnée, crédit, fond `light`/`dark`/`#rrggbb`) ; et relance par
  l'assistant, au premier lancement, si le profil est resté sans couleur. Le formulaire actuel est
  plus pauvre que le fichier qu'il écrit — *« the single house colour of the setup page's
  one-colour form »* (`lib/newsroom/profile-write.ts:25`).
- **Sous-projet #3 — la typo maison de bout en bout.** Le mesureur lit déjà les familles du corps,
  des titres et les `@font-face` auto-hébergées (`lib/newsroom/charter.ts:588-670`) ; en aval, 35
  composants écrivent `fontFamily: FONT`, une pile système en dur
  (`skills/chart-native/src/core/tokens.ts:70`). Décision prise : **fonte embarquée** (HTML
  autonome et vidéo), donc le spec devra trancher la question de licence — n'embarquer qu'une
  fonte que le site de la rédaction héberge lui-même, jamais une fonte servie par un tiers, et le
  faire confirmer explicitement. Contrainte que le code s'impose déjà : *« a key the reader
  ignores would be a promise the pipeline does not keep »* (`lib/newsroom/profile-write.ts:15-17`)
  — donc pas de champ `fonts:` en frontmatter tant que rien ne l'applique.
- **La bascule des drapeaux `verified`** des deux runtimes de bureau (§1.5) : un run, pas un
  chantier.

---

## 8. Note d'exécution

Le dépôt `buriedsignals/splash` est **privé**, donc l'étape 2 du bootstrap
(`curl .../archive/main.zip`) échoue — c'est le `// confirm before public release` de
`docs/installer/commands.js:3`. La preuve live du §6 se joue en pré-posant l'arbre dans `~/Splash`
(l'étape 2 se saute quand `$DEST` existe, `install/bootstrap.sh:56`), ce qui laisse jouer pour de
vrai tout ce que ce spec touche.

Attention à un effet de bord de cette install de test : si le runtime choisi est `claude-desktop`
(ou Codex / Gemini / Goose), `link_agents_skills` fait `ln -sfn` **par nom**
(`install/bootstrap.sh:20-37`) et remplace les liens `~/.claude/skills/*` du poste de développement
par des liens vers `~/Splash/.dist/skills`. Choisir `claude` (Claude Code) ne touche aucune porte.
