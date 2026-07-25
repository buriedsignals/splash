# Spec — Préflight (parcours SETUP : le décor de la rédaction)

> **Statut :** design validé (brainstorming, 2026-07-24). Prêt pour → writing-plans (sur **P1** seulement).
> **Parent :** `docs/superpowers/specs/2026-07-24-shell-and-desk-journey-design.md` §2 (« SETUP newsroom — une fois, le décor ») et §4, ligne « Préflight (SETUP) ». Issues Tom **#5** (page de setup unique et brandée) et **#6** (langue par défaut anglaise, persistée).
> **Portée :** ce spec conçoit **tout le décor** (§3) — un modèle d'état ne se conçoit pas à moitié. Il se réalise en **deux tranches** : **P1** (§4, le cœur sans interface — le plan d'implémentation suit) et **P2** (§5, la page brandée — plan ultérieur, éclairé par les findings de P1).
> **Branche :** `feat/preflight-setup` off `feat/verb-host-cli` (worktree `splash-preflight`).
> **Langue :** prose FR, identifiants/fichiers/types en anglais (standard non-négociable).

---

## 1. Problème (constaté dans le code, pas déduit)

Le spec-parapluie pose deux parcours : **SETUP** (une fois — le décor : capacités + identité) et **DESK** (à chaque article, dans le décor). Aujourd'hui le décor n'existe pas comme objet : il est éparpillé sur quatre supports qui ne se parlent pas.

| Support | Contenu | Écrit par | Lu par |
|---|---|---|---|
| `.env` (chmod 600) | toutes les clés | `install/configurator.ts:81-92` | les moteurs, `preflight.ts:149-162`, `deploy-embed` |
| `.splash-runtime` | le runtime agentique choisi | `install/configurator.ts:89-92` | les launchers |
| `.splash-preflight.json` | statuts tri-état persistés | `skills/splash/scripts/preflight.mjs:80-83` | l'annotation de la liste rangée |
| `NEWSROOM-PROFILE.md` | palette, source, langue, crédit | **la rédaction, à la main** | `produce-all` via le loader de profil |

Conséquences, chacune vérifiée dans l'arbre :

- **La capacité se découvre trop tard.** `embedDeliveryStatus` (`skills/splash/src/preflight.ts:114-127`) n'est consulté qu'au moment de l'export : la rédaction apprend qu'il lui manque un compte Cloudflare **après** avoir validé un visuel. C'est le grief nommé d'#5.
- **La langue n'est pas une préférence, c'est une détection.** `skills/splash/scripts/export-code.mjs:538-565` imprime sa proposition de livraison **en français, en dur**. Aucune discipline d'agent ne corrige ça : c'est un script qui écrit. C'est le défaut observé par Tom dans #6 (conversation en anglais → menu d'export en français). `lib/core/locale.ts` existe, mais il localise les **nombres et la furniture d'un visuel**, pas la copie d'interface.
- **Il n'y a pas de notion de capacité *voulue*.** `ENGINE_REQUIREMENTS` (`skills/splash/src/preflight.ts:37-83`) décrit ce que chaque moteur *exige*, jamais ce que la rédaction *a choisi d'utiliser*. Une rédaction qui ne fera jamais de carte voit MapTiler manquant à vie.
- **Le décor est stubbé côté substrat.** La boucle passe `channel: "article-web"` en constante documentée, pointant explicitement vers ce sous-projet (`docs/superpowers/specs/2026-07-24-verb-contract-adapters-design.md` §3.4). Et le `propose` (`lib/loop/propose.ts:6-34`) offre des formes sans jamais savoir si elles sont réalisables ici.

**Donc Préflight n'est pas « une page de configuration ». C'est la 2ᵉ portée d'état promise au §3 du spec-parapluie — `newsroom`, persistante entre articles — plus la page qui la remplit.**

Le modèle déclaratif, lui, **existe déjà** : `ENGINE_REQUIREMENTS` (groupes d'alternatives env + `envHelp` + deps critiques) et `EMBED_DELIVERY_ENV(+_HELP)` (`:87-103`). Préflight ne l'invente pas : il le **hisse** hors du legacy et lui ajoute ce qui manque — l'activation, la langue, la livraison, la vérification.

---

## 2. Décisions verrouillées (brainstorming 2026-07-24)

1. **Consommateur de 1ʳᵉ classe = le substrat neuf** (`lib/loop`, `lib/host`). Le legacy hérite **par les fichiers qu'il lit déjà** (`.env`, `NEWSROOM-PROFILE.md`) plus le resolver de langue — sans câblage profond.
2. **Pas de reopen-and-resume dans le legacy.** #5 le demande (« reopens the relevant setup section and resumes the same run ») mais la reprise n'existe pas dans la coquille legacy — c'est littéralement l'issue #8. Elle existe déjà dans le substrat (`lib/loop/resume.ts`, `splash state|next`). On ne rebâtit pas la reprise dans la coquille qu'on remplace. **Réponse à Tom écrite au §8.**
3. **#6 est dans le scope, borné à la copie émise mécaniquement** (bloc a/b/c d'`export-code`, messages de readiness, instructions de livraison), résolue par une fonction unique partagée par les deux coquilles. **Pas** de sweep i18n de la prose agent du `SKILL.md` : là, le correctif est une ligne d'instruction, pas une couche locale.
4. **Préflight déclare la livraison, « Livraison » (#4) l'implémente.** Préflight possède le *modèle* (quels publishers, quels champs, configuré ou non, vérifié ou non) et ship **un seul** adapter réel : Cloudflare Pages, déjà écrit et vérifié (`install/configurator-core.ts:161-177`). CMS / S3 / Fly sont des entrées **déclarées non implémentées** — même pattern que les verbes `capture`/`review`/`publish`.
5. **Deux fichiers, deux propriétaires** (§3.1). Un champ a **un seul** domicile.
6. **`NEWSROOM-PROFILE.md` est créé une fois depuis un gabarit, jamais round-trippé.** Le parseur actuel est en lecture seule et tolérant ; lui ajouter une réécriture préservant corps et commentaires serait de la fragilité gratuite. Après création, le fichier appartient à la rédaction.
7. **Les 4 `verify*` existantes sont réutilisées telles quelles**, avec leur sémantique tri-état : `true` = valide · `false` = rejeté par le provider · `null` = **injoignable**, jamais affiché comme invalide (une clé valide derrière un proxy d'entreprise bloquerait la rédaction à vie — `configurator-core.ts:125-129`).
8. **Deux tranches : cœur d'abord (P1), page ensuite (P2)** — même dispositif que A / B1 / B2, et P1 révèle ce que P2 a réellement à montrer.

---

## 3. Le décor (conçu une fois, sert les deux tranches)

### 3.1 Les trois domiciles

| Fichier | Propriétaire | Contenu | Écrit par |
|---|---|---|---|
| `.env` (chmod 600) | machine | **secrets uniquement** | Préflight |
| `newsroom.json` | Préflight | capacités activées · publisher choisi + identifiants **non-secrets** · langue d'**interface** · runtime · horodatage de vérification | Préflight |
| `NEWSROOM-PROFILE.md` | la rédaction | palette · source par défaut · crédit · langue des **visuels** | créé 1× depuis un gabarit, puis édité à la main |

`newsroom.json` **absorbe** `.splash-runtime` et `.splash-preflight.json` en **P1** ; ces deux fichiers ne **disparaissent qu'en P2**, quand leurs écrivains déménagent avec la page (le configurator écrit encore `.splash-runtime`, `preflight.mjs` écrit encore `.splash-preflight.json`, et `bootstrap.sh` lit `.splash-runtime` à chaque lancement). Les supprimer en P1 casserait le chemin de reprise de l'installeur (migration au §4.5).

**Invariant mécaniquement testable : aucune valeur de `.env` n'atterrit dans `newsroom.json`.** Le test écrit un état complet à partir d'une configuration porteuse de secrets et vérifie qu'aucune de leurs valeurs n'apparaît dans le JSON sérialisé.

### 3.2 Le type

```ts
// lib/newsroom/state.ts
export type NewsroomState = {
  schemaVersion: 1;
  runtime: string;                       // ex-.splash-runtime
  uiLang: string;                        // langue d'INTERFACE (BCP-47) ; défaut "en"
  capabilities: Record<string, {
    enabled: boolean;                    // ce que la rédaction VEUT — la clé d'#5
    // Identifiants NON-SECRETS du provider (nom de projet Pages, account id…).
    // Un secret ici serait une faute : il vit dans .env.
    settings?: Record<string, string>;
    lastVerified?: { at: string; result: "ok" | "rejected" | "unreachable" };
  }>;
  publisher?: string;                    // l'id de la capacité de livraison choisie
};

// lib/newsroom/capabilities.ts — le modèle déclaratif, hissé du legacy
export type NewsroomCapability = {
  id: string;                            // "maps" | "datawrapper" | "embed-cloudflare" | …
  label: string;                         // libellé JOURNALISTE, jamais un nom de variable
  kind: "engine" | "delivery";
  env: string[][];                       // groupes d'ALTERNATIVES (la règle du miroir MapTiler)
  envHelp: Record<string, string>;       // où l'obtenir, avec le lien
  settingsFields?: { name: string; label: string; secret: boolean }[];
  criticalDeps: { fromSkillDir: string; packages: string[] } | null;
  implemented: boolean;                  // false = déclaré, rempli par son sous-projet (#4)
};

export type CapabilityReadiness = {
  id: string;
  status: "ready" | "missing" | "unverified" | "disabled";
  reason: string;                        // vide si ready ; sinon une phrase actionnable
  help: string[];                        // liens de remédiation
};
```

**Note de nommage.** `lib/host/capabilities.ts` existe déjà et décrit **ce que le contrat sait faire** (verbes, moteurs, formats) ; `lib/newsroom/capabilities.ts` décrit **ce que CETTE rédaction a configuré**. Deux axes distincts, le préfixe de dossier les sépare ; les types s'appellent `Capabilities` (contrat) et `NewsroomCapability` (décor).

### 3.3 La langue — deux champs distincts

#6 le demande explicitement (« distinguish the orchestration interface language from the default visual/content language ») :

- **`ui`** — interface, prompts, menus, messages de readiness. Domicile : `newsroom.json`. **Défaut `en`** quand rien n'est enregistré.
- **`content`** — langue par défaut des livrables (titres, furniture, « Source : »). Domicile : `NEWSROOM-PROFILE.md`, champ `lang:` **déjà existant** (`docs/superpowers/specs/2026-07-13-newsroom-profile-design.md`) — réutilisé, pas migré.

```ts
// lib/newsroom/language.ts
resolveLanguage({ override?, state, profile }) → { ui: string; content: string }
```

Un override (par run, par projet) résout **par-dessus** sans réécrire le défaut enregistré. Une valeur BCP-47 inconnue est acceptée telle quelle (les tables de `lib/core/locale.ts` retombent déjà en anglais pour une langue non couverte — comportement inchangé).

### 3.4 Où le décor mord

Le contrat de verbes interdit l'état ambiant (**I5** : ne lit jamais `process.env`). La capacité ne peut donc pas se vérifier *dans* le verbe : elle mord **chez l'appelant**, en trois points.

1. **Elle façonne l'OFFRE.** Le spec-parapluie §2 beat 5 fait travailler le `propose` sur `RAISON × SCOPE × **CAPACITÉ** × STYLE` : Préflight est le fournisseur de cet axe. Une forme dont la capacité manque est offerte **marquée** (« nécessite MapTiler — créer une clé gratuite ici »), jamais silencieusement retirée (P1 : l'outil offre, le journaliste décide) ni silencieusement offerte.
2. **Refus typé au point d'exécution**, avant d'engager le moindre travail, si la capacité a disparu entre l'offre et la production (clé révoquée, `.env` écrasé).
3. **Gate de premier run** (#5) : la page ne rend la main que lorsque les capacités **activées** sont prêtes.

Une capacité `enabled: false` n'est **ni verte ni rouge** : elle est absente du rapport et le `propose` ne l'offre pas. C'est la réponse mécanique à « intentionally unused providers do not appear as failures ».

---

## 4. P1 — le cœur *(la tranche actionnable)*

### 4.1 Objectif

Faire exister le décor comme **état typé, pur et consommé**, sans une ligne d'interface. Testable de bout en bout sans navigateur.

### 4.2 Scope

**DANS :** `lib/newsroom/` (5 unités, §4.3) · le hoist de `ENGINE_REQUIREMENTS`/`EMBED_DELIVERY_ENV` avec ré-export legacy · la migration des trois fichiers existants · l'axe CAPACITÉ dans `lib/loop/propose.ts` · le resolver de langue dans `skills/splash/scripts/export-code.mjs` · la commande `splash newsroom`.

**HORS :** la page (**P2**, §5) · le **déplacement des `verify*`** vers `lib/newsroom/` — P1 n'a aucun consommateur de la vérification réseau (il consomme `lastVerified`, un champ d'état) ; déplacer sans consommateur serait du remue-ménage. Le déplacement se fait en P2, avec sa page pour appelant · les adapters CMS/S3/Fly (déclarés `implemented: false`) · le reopen-and-resume legacy (décision 2) · l'i18n de la prose agent du `SKILL.md` (décision 3) · logo/police du profil.

### 4.3 Architecture

Nouveau dossier **`lib/newsroom/`**, hors moteurs et hors `skills/`, à côté de `lib/core` et `lib/loop`. Tests colocalisés (convention `lib/core`).

| Fichier | Responsabilité | État |
|---|---|---|
| `lib/newsroom/capabilities.ts` | le modèle déclaratif **hissé** de `skills/splash/src/preflight.ts` (moteurs) + `EMBED_DELIVERY_ENV(+_HELP)` (livraison), unifiés sous `NewsroomCapability` | créer |
| `skills/splash/src/preflight.ts` | **ré-exporte** depuis le nouvel emplacement — flèche de dépendance inversée, aucun importateur touché (geste de B1 avec `vocabulary.ts`) | modifier |
| `lib/newsroom/state.ts` | `NewsroomState` · lecture/écriture atomique de `newsroom.json` · migration · **ne throw jamais** (état illisible = état vide, pas un crash au démarrage) | créer |
| `lib/newsroom/language.ts` | `resolveLanguage` (§3.3) | créer |
| `lib/newsroom/readiness.ts` | `readiness(capabilities, state, env) → CapabilityReadiness[]` — **pur**, env injecté | créer |
| `lib/loop/propose.ts` | `FormOption` gagne `requires: string[]` ; l'offre porte l'état de readiness de chaque capacité requise | modifier |
| `lib/host/cli.ts` + `lib/host/newsroom.ts` | 5ᵉ commande `splash newsroom` : état + readiness en JSON, même enveloppe `HostResponse`, mêmes codes de sortie | créer/modifier |
| `skills/splash/scripts/export-code.mjs` | la copie émise (`:538-565`) passe par `resolveLanguage` | modifier |

### 4.4 Les consommateurs — et la morsure réelle, honnêtement

Sans consommateur, le cœur serait une abstraction non prouvée. Trois sont câblés en P1 :

1. **L'axe CAPACITÉ du `propose`.** *Honnêteté sur ce qui mord aujourd'hui :* la branche data→chart n'atteint que **chart-native**, qui n'exige **aucune clé**. Les deux morsures réellement testables sont donc ses **deps critiques** (le cas rouge : `react`/`vite` absents après un clone nu) et la **capacité de livraison embed**. MapTiler et Datawrapper deviennent vivants dès que la boucle atteint la carte ou DW ; le modèle les porte déjà, sans code neuf.
2. **La copie émise d'`export-code.mjs`** — le défaut de #6, mécaniquement fermé : langue résolue `en` ⇒ bloc a/b/c en anglais.
3. **`splash newsroom`** — le décor devient lisible par un hôte non-JS (Goose), et la page de P2 le **consommera** au lieu de recalculer. Leçon de B1 gravée : le câblage doit être prouvé dans un process qui n'importe **que** la façade.

### 4.5 Migration (critère d'acceptation d'#5)

Une install existante ne perd rien :

- `.env` : **inchangé**, jamais réécrit par la migration. C'est et ça reste le domicile des secrets.
- `.splash-runtime` → `newsroom.json.runtime`. **Absorbé en P1, supprimé en P2** : `install/bootstrap.sh` le lit à *chaque* lancement, y compris sur le chemin de reprise documenté (« re-run this installer ») — le supprimer en P1 réinstallerait silencieusement une rédaction `goose`/`codex`/`gemini` sous un autre runtime.
- `.splash-preflight.json` → `newsroom.json.capabilities[].lastVerified`. **Absorbé en P1, supprimé en P2**, pour la même raison : `skills/splash/scripts/preflight.mjs` l'écrit encore.
- La langue d'**interface** d'une install existante est amorcée depuis le `lang:` de son `NEWSROOM-PROFILE.md` : une rédaction francophone qui migre garde ses menus en français. Le défaut anglais du §3.3 vaut pour une install **fraîche** (#6 demande ça, et rien de plus).
- Aucun fichier présent : état par défaut — toutes capacités `enabled: false` sauf celles dont les clés sont **déjà** dans `.env` (une install existante est donc reconnue comme configurée, sans qu'on redemande quoi que ce soit). **Cette dérivation est la même fonction que celle de la migration** (`defaultCapabilities(env)`, `lib/newsroom/state.ts`) : un clone frais avec un `.env` écrit à la main est configuré exactement comme une install migrée, jamais « tout désactivé, sans raison ».
- Fichier corrompu : état vide, aucun throw, la page de P2 permet de reconfigurer.

### 4.6 Erreurs et off-ramps (first-class)

- **Injoignable ≠ rejeté.** Un `lastVerified.result: "unreachable"` (le `null` des `verify*`, enregistré par la page) produit `status: "unverified"`, jamais `"missing"`. Une capacité `unverified` n'empêche pas de proposer — elle annote.
- **Redaction.** Aucun secret dans `newsroom.json`, dans un message d'erreur, un rapport, un log ou un artefact. Les messages nomment la **variable**, jamais sa valeur.
- **Rien ne quitte la machine** sauf vers l'endpoint de vérification du provider concerné.
- **État illisible** : état vide + message actionnable, jamais un crash au démarrage d'un run.

### 4.7 Tests (`bun:test`, TDD — test rouge d'abord)

- **Le filet.** La suite existante de `skills/splash/src/preflight.ts` passe **inchangée** après le hoist. C'est la preuve que le déplacement n'a rien perdu (même dispositif qu'en B1 avec `adapters.ts`).
- `state` : round-trip · migration des trois fichiers · fichier corrompu → état vide sans throw · **l'invariant secret** (§3.1) · `.env` non réécrit par la migration.
- `language` : install fraîche → `en` · préférence sauvée réutilisée sans redemander · BCP-47 inconnu accepté · override par run qui **ne réécrit pas** le défaut · `ui` et `content` résolus indépendamment.
- `readiness` : les 4 statuts · une capacité **désactivée** n'apparaît ni verte ni rouge · **pureté** : env vide injecté alors que `process.env` est peuplé ⇒ le résultat suit l'env injecté.
- `propose` : une option dont la capacité manque est offerte **marquée** ; aucune option n'est retirée ni offerte en silence.
- `export-code` : langue résolue `en` ⇒ bloc a/b/c en anglais (le défaut observé par Tom).
- `splash newsroom` : câblage prouvé dans un process qui n'importe que la façade · codes de sortie conformes au contrat existant (`0` succès · `1` refus · `2` usage).
- **Pas de test réseau neuf en P1** : la vérification live n'a pas d'appelant avant P2. Les tests existants des `verify*` restent où ils sont et suivront leur module en P2 (vraies clés, vrais échecs — convention projet, pas de mock).

### 4.8 Critères de succès

1. Une install fraîche conduit tout en **anglais** sans qu'on demande rien.
2. Une capacité non activée n'apparaît **jamais** comme un échec.
3. Le `propose` ne peut plus offrir ce que le décor ne permet pas — il l'offre marqué, ou pas du tout.
4. `.env` reste le seul domicile des secrets, **prouvé par un test**, pas par relecture.
5. Une install existante ne perd aucune valeur et n'est pas re-interrogée.
6. `bun run check` vert.

### 4.9 Ce que P1 doit révéler avant qu'on écrive P2

Rôle de-risk de la tranche, à écrire dans ce spec après exécution (comme §4.4 du spec de contrat) :

- **Le modèle de capacité tient-il la livraison autant que les moteurs ?** Un moteur se satisfait de clés + deps ; un publisher a des identifiants non-secrets et une notion de projet. Si `settingsFields` ne suffit pas, c'est la forme de la page qui change.
- **La readiness pure suffit-elle sans vérification réseau ?** Si « la clé est présente » ne prédit pas « ça marchera », la page doit vérifier en direct à chaque ouverture, et ce n'est plus le même produit.

### Ce que P1 a effectivement révélé

**Le modèle de capacité a tenu la livraison, sans extension de forme.** `embed-cloudflare`
(`lib/newsroom/capabilities.ts`) est le seul publisher implémenté en P1, et sa forme est
exactement celle prévue pour un moteur : `env` reste des groupes d'alternatives — ici trois
groupes à un seul membre chacun, parce que Cloudflare exige les trois valeurs ensemble plutôt
qu'une clé parmi plusieurs — et `settingsFields` portait déjà `secret: boolean` par champ,
donc `CLOUDFLARE_ACCOUNT_ID` et `SPLASH_EMBED_PROJECT` (non-secrets, l'un un identifiant de
compte, l'autre un nom de projet choisi par la rédaction) se déclarent sans changer le type.
Aucun champ neuf n'a été nécessaire pour distinguer "identifiant à afficher en clair" de
"secret à masquer" — la forme le portait déjà. Les trois publishers restants
(`embed-cms`/`embed-s3`/`embed-fly`) sont déclarés `implemented: false` : la question reste
ouverte pour un publisher qui porterait une notion de *projet distant existant* (lister les
projets Fly d'un compte, par exemple) plutôt qu'un simple identifiant saisi — ce cas n'a pas
été rencontré en P1, donc pas prouvé.

**La readiness pure a montré ses limites, exactement comme la question l'anticipait.**
`lastVerified` (le seul canal par lequel un `missing`/`ready` peut se nuancer en `unverified`
ou capter un rejet du fournisseur) n'est écrit nulle part en P1 en dehors de la migration
ponctuelle des anciens tampons verts de `.splash-preflight.json`
(`lib/newsroom/migrate-decor.ts:79`) — aucun appelant neuf ne fait de vérification réseau ;
les quatre `verify*` restent dans `install/configurator-core.ts`, non déplacées, non
branchées sur le décor. Conséquence directe : sur une install fraîche, `capabilityReadiness`
répond `ready` dès que la clé est **présente**, jamais dès qu'elle est **valide** — une clé
révoquée ou mal collée lit `ready` jusqu'à ce que quelque chose déclenche un vrai appel
réseau et écrive `lastVerified`. C'est le comportement décrit au §3 (readiness volontairement
pure, injectée, jamais réseau) et il tient sa promesse ; mais il confirme que P2 ne peut pas
se contenter d'afficher le décor tel quel au chargement — la page doit appeler `verify*` au
moins une fois par ouverture pour que "prêt" affiché à la rédaction corresponde à "ça va
marcher", pas seulement à "quelque chose est rempli". C'est le même produit décrit en §5.1
(déplacement des `verify*` vers `lib/newsroom/verify.ts`, P2 leur premier appelant hors
configurator) — la réponse n'est donc pas "ce n'est plus le même produit", mais "P2 doit
faire ce que sa conception prévoyait déjà, et ne peut pas s'en dispenser en s'appuyant
seulement sur ce que P1 a livré".

---

## 5. P2 — la page brandée *(conçue ici, planifiée ensuite)*

### 5.1 La forme

**`install/preflight/`** : un cœur pur (composition des sections, sérialisation vers `.env` et `newsroom.json` depuis le formulaire), un serveur mince, et un **vrai fichier HTML + CSS** — fini le template literal de 140+189 lignes avec son JS inline en chaîne.

Les 4 `verify*` sont **déplacées ici** depuis `install/configurator-core.ts` vers `lib/newsroom/verify.ts` (tri-état intact), l'ancien module ré-exportant le temps de la bascule : P2 est leur premier appelant hors du configurator.

Repris tels quels de `install/configurator.ts`, parce que ce sont des pièges déjà payés : `127.0.0.1` + port libre (`:44-46`) · ouverture navigateur avec repli silencieux (`:19-31`) · timeout d'inactivité qui ne laisse jamais pendre le bootstrap (`:133-140`) · échec d'écriture qui rapporte la cause réelle et sort non-zéro (`:93-108`).

`install/configurator.ts` **reste et délègue** : `bootstrap.sh` ne bouge pas.

**Obligation P2 — fermer les deux domiciles de `runtime`.** P1 absorbe `.splash-runtime` sans le supprimer (§4.5), donc le champ a temporairement **deux écrivains** : `install/configurator.ts:89-92` écrit encore le fichier legacy, et la migration ne se rejoue jamais (`needsDecorMigration` est faux dès que `newsroom.json` existe) — une reconfiguration met donc à jour `.splash-runtime` pendant que `newsroom.json.runtime` rancit. C'est une entorse assumée et bornée à l'invariant « un champ, un seul domicile » (§3.1). P2 la ferme, et ce n'est pas optionnel : la page écrit `newsroom.json` (via `writeNewsroomState`) au lieu du fichier legacy, `install/bootstrap.sh` lit le runtime depuis `newsroom.json`, et les deux fichiers legacy sont alors supprimés — même geste pour `.splash-preflight.json` avec `skills/splash/scripts/preflight.mjs`. Tant que ce n'est pas fait, la suppression n'a pas le droit d'être faite ailleurs.

### 5.2 Les sections, dans l'ordre où une rédaction les vit

1. **Votre rédaction** — nom, source par défaut, couleur maison → **crée** `NEWSROOM-PROFILE.md` depuis le gabarit (décision 6).
2. **Langue** — interface / visuels, défaut anglais.
3. **Ce que vous voulez pouvoir faire** — les capacités en langage rédaction (« cartes », « graphiques Datawrapper », « publier un lien intégrable »), cochables ; chaque case dépliant ses champs et où obtenir la clé. Le vocabulaire env (`VITE_MAPTILER_KEY`) n'est **jamais** le libellé principal : il apparaît en second rang, pour qui débogue.
4. **Résumé de readiness** avec remédiation cliquable.

### 5.3 Ouverture ciblée et repli

- `?section=<id>` ouvre directement sur la capacité manquante — le mécanisme que #5 appelle « reopen at the relevant section ». Côté substrat, la reprise du run est **gratuite** (le manifest existe) ; côté legacy, elle n'est pas câblée (décision 2).
- **Repli headless** : pas de navigateur ⇒ on imprime l'URL locale et la commande exacte, et on n'échoue pas (`SPLASH_NO_OPEN` est déjà la couture de test).
- **Migration visible** : les valeurs `.env` existantes s'affichent comme **déjà configurées**, jamais réaffichées en clair.

---

## 6. Risques

| Risque | Réponse |
|---|---|
| Le hoist touche un legacy vivant | Sa suite de tests reste le filet, inchangée ; aucune politique ne bouge |
| L'axe CAPACITÉ mord peu aujourd'hui (chart-native n'exige aucune clé) | Câblé sur les deux morsures réellement testables (deps + livraison embed) et assumé par écrit ; MapTiler/DW deviennent vivants sans code neuf |
| `newsroom.json` divergeant de `NEWSROOM-PROFILE.md` | Un champ, un seul domicile (§3.1) — jamais dupliqué, donc jamais divergent |
| Un secret fuit dans l'état machine | Invariant testé (§3.1), pas une convention documentaire |
| Collision de nommage `capabilities` (contrat vs décor) | Préfixe de dossier + types distincts (`Capabilities` / `NewsroomCapability`), noté §3.2 |
| Une vérification réseau échoue en CI / hors-ligne | `null` = `unverified`, jamais bloquant ; les tests réseau suivent la convention projet existante |

---

## 7. Contraintes globales

- Runtime **Bun**. Tests `bun:test` (`describe`/`it`/`expect`). **TDD** : test qui échoue avant l'implémentation, chaque tâche.
- Code, commentaires, identifiants, noms de fichiers, commits, branches : **anglais**.
- **Aucune mention** vendor dans un artefact commité. Pas de `Co-Authored-By`.
- **Pas de nouveau `any`.** Pas de mock d'API externe (vraies clés, vrais échecs).
- Les invariants du contrat de verbes s'imposent à tout ce qui les touche — en particulier **I5** (le contrat ne lit jamais `process.env` : la capacité mord chez l'appelant, §3.4).
- Gate `bun run check` vert avant chaque commit.
- Branche `feat/preflight-setup` off `feat/verb-host-cli` (worktree `splash-preflight`).

---

## 8. Hors scope — et ce qu'on répond à Tom

| Demandé | Décision | Raison |
|---|---|---|
| #5 « reopens the relevant section and **resumes the same run** » côté legacy | **Non fait** | La reprise n'existe pas dans la coquille legacy — c'est l'issue #8 elle-même. Elle est livrée dans le substrat (`lib/loop/resume.ts`, `splash state`/`next`). La rebâtir dans une coquille qu'on remplace serait du travail jeté deux fois. La page **s'ouvre** bien à la bonne section (§5.3) ; c'est la reprise automatique du run legacy qui n'est pas câblée. |
| #6 « route **all** CLI/user-facing strings through the same locale layer » | **Borné** | Fait pour la copie **émise mécaniquement** (le bug observé : le bloc a/b/c d'`export-code`). La prose de conversation vient de l'agent, pas d'un script : le correctif y est une ligne d'instruction (« conduis dans la langue résolue »), pas une couche locale. |
| #5 « newsroom CMS integration, Fly, or another selected publisher adapter » | **Déclaré, pas implémenté** | Le modèle porte ces entrées avec `implemented: false` ; le sous-projet Livraison (#4) les remplit. Un seul adapter réel ship ici : Cloudflare Pages, déjà écrit et vérifié. |
| Logo et police dans le profil | **Déféré** | Compositing + typographie sur tous les producteurs — déjà noté comme lot séparé par le design de profil (2026-07-13). |

---

## 9. Suites parkées à la sortie de P1 (revue finale, 2026-07-25)

La revue de branche a rendu **« ready to merge »** ; ces trois points sont réels, non bloquants, et parkés
avec leur raison plutôt que corrigés dans une seconde vague.

| Point | Où | Ruling |
|---|---|---|
| `decor.test.ts` a perdu la moitié `ui: "en"` d'une assertion — la seule qui épinglait « une install fraîche avec un profil FR garde des menus anglais » | `lib/newsroom/decor.test.ts` (le cas « profil → langue de contenu ») | À restaurer : c'est exactement la frontière fraîche-vs-migrée que le fix I4 trace. Une ligne. |
| Deux tests atteignent le chemin d'écriture par défaut sur la **vraie** racine d'install (`advance(run, runDir)` sans décor, `tryLoadDecor()`) — sur une machine portant `.splash-runtime` sans `newsroom.json`, `bun test` exécute la vraie migration | `lib/loop/driver.test.ts`, `lib/newsroom/decor.test.ts` | Contenu inoffensif et gitignoré, mais ça inverse l'invariant posé en Task 6 (« `bun test` ne touche jamais l'arbre »). À trancher : soit ces deux cas passent une racine temporaire, soit l'invariant est explicitement assoupli. |
| Le correctif I4 (langue héritée du profil) n'est **pas atteignable par le chemin skill** : `export-code.mjs` lit `readNewsroomState(root).uiLang` en direct et ne déclenche jamais la migration | `skills/splash/scripts/export-code.mjs` | Une install FR legacy pilotée par le skill imprime donc l'anglais jusqu'à ce que quelque chose appelle `loadDecor`. À fermer en P2, avec l'obligation `runtime` du §5.1. |

**Report intégral de la vague de fix + verdicts par finding :** l'historique git de la branche (6 commits de fix, `680bf84`..`9afdcfa`).
