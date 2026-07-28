# Spec — Préflight P2 : la page de setup brandée

> **Statut :** design (2026-07-26). Tranche **P2** du spec parent
> `docs/superpowers/specs/2026-07-24-preflight-setup-design.md` (§5 « La page brandée », §9 suites parkées).
> **Issues :** Tom **#5** (surface de setup unique et brandée pour les clés et la livraison) et **#6**
> (langue d'orchestration anglaise par défaut, préférence persistée).
> **Branche :** `feat/preflight-page` (worktree `splash-preflight-page`).
> **Langue :** prose FR, identifiants/fichiers/types en anglais (standard non-négociable).
> **Frontières de fichiers (imposées) :** ce chantier écrit dans `install/**`, `lib/newsroom/**`,
> `skills/splash/scripts/export-code.mjs`. Il ne touche pas `lib/loop`, `lib/brain`, `lib/delivery`,
> `lib/host`, `lib/core`, `skills/splash/SKILL.md`, `skills/splash/src/**`.

---

## 1. Ce que P1 a laissé ouvert (constaté dans le code)

P1 a livré le **décor** (`lib/newsroom/`) : un état typé, une readiness pure, un résolveur de langue,
une migration, et `splash newsroom`. Ce qu'il n'a pas livré, et que ce spec ferme :

| # | Trou | Preuve dans l'arbre |
|---|---|---|
| A | **Aucune surface de setup.** Le décor ne se remplit qu'à la main : `newsroom.json` n'a **aucun écrivain** en production. Le seul formulaire existant (`install/configurator-core.ts:57-123`) écrit `.env` + `.splash-runtime` et ignore le décor. | `grep writeNewsroomState` → un seul appelant, `migrate-decor.ts:94` |
| B | **`ready` veut dire « présent », jamais « valide ».** `lastVerified` n'est écrit que par la migration ponctuelle (`migrate-decor.ts:75`). Les 4 `verify*` vivent dans `install/configurator-core.ts:130-189` et n'ont qu'un appelant, le configurator legacy. | §« Ce que P1 a effectivement révélé » du spec parent |
| C | **`runtime` a deux domiciles.** `install/configurator.ts:89-92` écrit encore `.splash-runtime` pendant que `newsroom.json.runtime` rancit (la migration ne se rejoue jamais : `needsDecorMigration` est faux dès que `newsroom.json` existe). Obligation explicite du §5.1 parent, « pas optionnelle ». | `bootstrap.sh:55`, `bootstrap.ps1:79` lisent le fichier legacy |
| D | **Le chemin skill ne déclenche pas la migration.** `export-code.mjs:64` lit `readNewsroomState(root).uiLang` en direct : une install FR legacy (profil `lang: fr`, pas encore de `newsroom.json`) imprime **l'anglais**. Finding #3 parké de P1. | `skills/splash/scripts/export-code.mjs:62-66` |

---

## 2. Décisions verrouillées, et pourquoi

### 2.1 La page est pilotée par le registre, pas par une liste de champs écrite à la main

Le configurator actuel code en dur ses six champs (`maptiler`, `datawrapper`, `anthropic`,
`embedProject`, `cloudflareToken`, `cloudflareAccount`). Ajouter une capacité y demande d'éditer le
HTML, le sérialiseur et le vérificateur. La page dérive au contraire ses sections de
**`NEWSROOM_CAPABILITIES`** (`lib/newsroom/capabilities.ts`) : `label` (langage rédaction),
`settingsFields` (quoi demander, et quoi est secret), `envHelp` (où l'obtenir). **Ajouter une
capacité = une entrée du registre**, zéro ligne d'interface.

Conséquence mécanique voulue : `DATAWRAPPER_API_TOKEN` sert `dw-chart` **et** `map-dw`,
`VITE_MAPTILER_KEY` sert `map-native` **et** `scrolly`. Le modèle **déduplique par nom de variable**
et une seule case de saisie sert les deux capacités — un journaliste ne colle jamais deux fois le
même jeton. C'est testé (`credentialFields`), pas laissé à la vigilance du gabarit.

### 2.2 Le vocabulaire `.env` n'est jamais le libellé principal

#5 nomme ce grief. Le libellé visible est celui de la capacité (« Cartes Datawrapper »,
« Publier un lien intégrable ») ; le nom de variable apparaît en second rang, dans le `<details>`
« detail technique » de chaque champ, pour qui débogue. Testé sur le modèle : le libellé d'un champ
n'est jamais son `name`.

### 2.3 La page vérifie en direct, et **écrit ce verdict dans le décor**

C'est la réponse au trou **B**, et la raison d'être du déplacement des `verify*` vers
`lib/newsroom/verify.ts` (obligation §5.1 parent). Nouveau contrat, au grain de la **capacité** et
pas du provider :

```ts
export type VerifyOutcome = "ok" | "rejected" | "unreachable";
verifyCapability(id: string, values: Record<string, string>): Promise<VerifyOutcome | undefined>
```

`undefined` = cette capacité n'a rien à vérifier en réseau (`chart-native`, `zip`, `image-native`,
`scrolly`) — ce n'est pas un échec, c'est une absence de question. Le tri-état des `verify*` est
préservé tel quel : `true → "ok"`, `false → "rejected"`, `null → "unreachable"`. Le `null` reste
**jamais affiché comme invalide** (une clé valide derrière un proxy d'entreprise bloquerait la
rédaction à vie — `configurator-core.ts:125-129`). Le résultat atterrit dans
`state.capabilities[id].lastVerified`, que `capabilityReadiness` consomme déjà.

**Ce que ça ferme :** après un passage par la page, `ready` veut dire « le fournisseur a répondu oui »,
plus « quelque chose est rempli ».

### 2.4 `.env` est **fusionné**, jamais réécrit

Le configurator actuel écrit `.env` en entier à chaque submit : un champ laissé vide écrase la clé
existante. Inacceptable pour une page qui s'ouvre en cours de route sur une section (`?section=`,
§5.3 parent) et qui n'a **pas le droit de réafficher un secret**. Donc `mergeEnvFile(existing, updates)` :

- une valeur soumise **vide** ne touche pas la ligne existante (« déjà configuré » reste configuré) ;
- une ligne inconnue de Splash (ajoutée à la main) est **préservée** ;
- une clé existante est mise à jour **en place**, jamais dupliquée ;
- le guillemetage `KEY="value"` de `serializeEnv` est repris **verbatim** (trim, suppression de `"` et
  `\n`), parce que les deux launchers en dépendent : POSIX `. ./.env` (une espace non quotée casse le
  sourcing) et `for /f … set "%%a=%%~b"` côté Windows. Le test qui *source réellement* le fichier en
  bash suit la fonction — le contrat n'est pas re-documenté, il est re-prouvé.

### 2.5 Un secret ne quitte jamais `.env` — prouvé à trois portes

`newsroom.json` ne reçoit **aucune** valeur de credential. Trois gardes, dont deux préexistantes :
`stripSecretSettings` au parse et à l'écriture (P1, `state.ts:122`), plus **un invariant testé sur le
modèle de page** : le modèle sérialisé ne contient jamais la valeur d'un secret présent dans l'env
injecté — seulement un booléen `configured`. Un champ secret déjà configuré est rendu avec un
placeholder « configuré — laisser vide pour conserver », jamais avec sa valeur.

Corollaire assumé : `CLOUDFLARE_ACCOUNT_ID` et `SPLASH_EMBED_PROJECT` (non-secrets) vont eux aussi
dans `.env`, pas dans `settings`. Raison inchangée depuis P1 (plan, décision 1) : `deploy-embed.mjs`
les lit dans l'environnement — les mettre dans `newsroom.json` donnerait deux domiciles à un champ.
`capabilities[].settings` reste donc vide en pratique ; le champ existe pour un publisher futur dont
un identifiant ne serait lu par personne d'autre que Splash.

### 2.6 Le runtime déménage dans `newsroom.json`, et le legacy devient lecture-seule (trou C)

- La page écrit `runtime` **uniquement** dans `newsroom.json` (via `writeNewsroomState`), et
  **supprime `.splash-runtime`** quand elle a écrit — un champ, un domicile, effectif dès le premier
  passage.
- `install/read-runtime.ts` devient le **seul** résolveur : `newsroom.json.runtime` → sinon le
  `.splash-runtime` legacy (compat d'une install pas encore repassée par la page) → sinon `claude`.
  Il est **sans dépendance** (`node:fs` + `JSON.parse`) : il tourne dans le bootstrap, avant tout
  `bun install`, et un `newsroom.json` corrompu ne doit pas arrêter une installation — il retombe sur
  le défaut, comme `readNewsroomState`.
- `bootstrap.sh` appelle ce script ; `bootstrap.ps1` fait la même résolution en PowerShell natif
  (`ConvertFrom-Json`) avec le même ordre de repli. L'invocation du configurator **ne bouge pas**
  (`bun install/configurator.ts`) : `install/configurator.ts` reste et **délègue** à la page (§5.1
  parent), ce qui garde vrais les tests de bootstrap de `docs/installer/` et les scripts d'install
  déjà publiés.

**Le `.splash-preflight.json` reste ouvert** — voir §7, Risques assumés : son écrivain
(`skills/splash/scripts/preflight.mjs`) est hors des frontières de ce chantier.

### 2.7 Le bootstrap installe les dépendances racine **avant** d'ouvrir la page

La page importe `lib/newsroom/state.ts`, donc `zod`. Aujourd'hui le bootstrap ne fait `bun install`
que dans `skills/chart-native` et `skills/map-native` : la résolution reposerait sur l'auto-install
implicite de Bun, au moment le plus critique de l'installation, sans message si elle échoue. On rend
la dépendance **explicite et gardée** : un `bun install` à la racine de `$DEST`, avec le même patron
de message d'échec que les autres étapes. (Le chemin skill dépendait déjà de `zod` de façon
implicite — `export-code.mjs:48` ; cette étape l'assainit aussi.)

### 2.8 La logique n'est pas dans un `<script>` inline

Le configurator est un template literal de 140 lignes de HTML + 30 lignes de JS en chaîne : rien n'y
est typé ni testable. Découpage :

| Fichier | Rôle | Testé |
|---|---|---|
| `install/preflight/model.ts` | **pur** : registre + état + env + readiness → `PreflightModel` (sections, champs dédupliqués, statuts) | oui |
| `install/preflight/serialize.ts` | **pur** : soumission → mises à jour `.env` (fusion, miroir MapTiler, guillemetage) + `NewsroomState` + gabarit de profil | oui |
| `install/preflight/status-view.ts` | **pur** : statut → libellé + ton, partagé serveur/navigateur | oui |
| `install/preflight/page.html` + `page.css` | vrai fichier HTML, vraie CSS, aucune balise `<script>` d'application | rendu |
| `install/preflight/client.ts` | **DOM seulement** : rend le modèle, câble les boutons. Bundlé par `Bun.build` au démarrage — pas de CDN, pas d'étape de build | via le rendu |
| `install/preflight/server.ts` | Bun.serve mince : sert, vérifie, écrit | oui (intégration) |

Le navigateur reçoit le modèle en **JSON injecté** dans la page (`<script type="application/json"
id="preflight-model">`), pas en HTML pré-rendu : le client n'a alors aucune décision métier à
reprendre, il rend une donnée déjà décidée et testée côté serveur.

**Repris tels quels** du configurator, parce que ce sont des pièges déjà payés (§5.1 parent) :
`127.0.0.1` + port libre · ouverture navigateur avec repli silencieux (`SPLASH_NO_OPEN=1` reste la
couture de test) · timeout d'inactivité de 30 min qui ne laisse jamais pendre le bootstrap · échec
d'écriture qui rapporte la cause réelle et sort non-zéro.

### 2.9 Le profil de la rédaction est créé une fois, jamais round-trippé

Décision 6 du parent, tenue : la section « Votre rédaction » n'écrit `NEWSROOM-PROFILE.md` **que s'il
est absent**, depuis le gabarit `NEWSROOM-PROFILE.example.md`. S'il existe, la page l'annonce comme
appartenant à la rédaction et la langue **de contenu** s'affiche en lecture seule, avec le chemin du
fichier à éditer. Écrire un parseur/ré-écrivain préservant corps et commentaires serait de la
fragilité gratuite.

### 2.10 La langue : deux champs, un défaut anglais (issue #6)

`uiLang` (interface) va dans `newsroom.json` ; `lang` (contenu) va dans le profil. Défaut `en` pour
une install fraîche ; une install existante garde ce que la migration a amorcé depuis son profil.
La page est elle-même rendue dans `uiLang` **résolu** — l'anglais par défaut, y compris avant tout
choix, ce que #6 demande. La copie de la page vit dans `install/preflight/copy.ts` (en/fr), même
patron que `lib/newsroom/ui-copy.ts` ; une langue inconnue retombe en anglais.

### 2.11 Trou D : le chemin skill devient migration-aware **sans écrire**

`export-code.mjs` ne peut pas simplement appeler `loadDecor()` : ce chemin **écrit**
`newsroom.json` lors de la migration, et un script d'export ne doit pas créer de l'état comme effet
de bord (un test existant épingle d'ailleurs l'octet-identité du fichier après un run —
`skills/splash/tests/export-code-proposal-cli.test.ts`). On expose donc dans `lib/newsroom/decor.ts`
la dérivation **lecture-seule** que `loadDecor(dir)` utilise déjà en interne :

```ts
export function readDecorState(root: string, env?): NewsroomState
```

`readNewsroomState` s'il y a un `newsroom.json`, sinon l'état migré **dérivé sans être persisté**
(`migratedDecorState`), sinon les défauts d'une install fraîche. `export-code.mjs` s'en sert pour
résoudre `uiLang`. Une install FR legacy imprime donc le français, et le script continue à ne rien
écrire.

---

## 3. Les sections, dans l'ordre où une rédaction les vit

1. **Votre rédaction** — nom, source par défaut, couleur maison → crée `NEWSROOM-PROFILE.md` (une fois).
2. **Langue** — interface / visuels, défaut anglais.
3. **L'assistant** — le runtime agentique (`RUNTIMES`), + la clé Anthropic *optionnelle* (vide = login
   par abonnement, règle existante conservée).
4. **Ce que vous voulez pouvoir faire** — les capacités moteur, cochables, chacune dépliant ses champs
   et où obtenir la clé.
5. **Publier** — le publisher choisi parmi les capacités de livraison ; `zip` est toujours prêt (aucune
   clé) donc « pas d'hébergeur configuré » n'est jamais un cul-de-sac ; les adapters déclarés
   non-implémentés apparaissent grisés avec leur raison, **jamais en rouge**.
6. **Résumé de readiness** — un état par capacité activée, avec remédiation cliquable.

`?section=<id>` ouvre la page en focalisant la section concernée (mécanisme « reopen at the relevant
section » d'#5). La **reprise du run** legacy reste hors scope (décision 2 du parent : c'est l'issue #8,
et le substrat la fournit déjà).

## 4. La forme visuelle (c'est la première chose qu'un journaliste voit)

- **Hiérarchie typographique réelle** : un titre de page, des titres de section numérotés, un
  sous-texte de section en gris, des libellés de champ en demi-gras, un détail technique en petit.
  Pile système (`-apple-system`/`Segoe UI`/…) — **rien n'est chargé depuis un CDN** (contrainte dure :
  la page tourne parfois avant que le réseau soit fiable, et elle ne doit fuiter aucune requête).
- **Palette délibérée et CVD-safe**, alignée sur l'invariant projet (Okabe-Ito) et sur la page
  d'install existante : accent `#0072B2`, prêt `#009E73`, non vérifié `#E69F00`, manquant `#D55E00`.
  Le statut n'est **jamais porté par la couleur seule** : chaque pastille porte un glyphe et un mot
  (WCAG 1.4.1).
- **Trois états lisibles au premier coup d'œil** : *manquant* (ce qui bloque), *prêt*, *dégradé*
  (non vérifié / injoignable). Le résumé de readiness les compte en tête de page.
- **Deux thèmes** via `prefers-color-scheme` — un installeur ouvert le soir sur un macOS sombre ne
  doit pas éblouir.
- Formulaire **accessible** : `<label for>` réel partout, `aria-describedby` vers l'aide, focus visible,
  `<details>` natifs (pas de JS pour déplier), zone de statut en `aria-live="polite"`.

## 5. Ce qu'on ne fait pas

| Non fait | Raison |
|---|---|
| Reopen-**and-resume** du run legacy | Décision 2 du parent : c'est l'issue #8 ; le substrat a déjà la reprise. La page s'ouvre bien à la bonne section. |
| Round-trip de `NEWSROOM-PROFILE.md` | Décision 6 du parent. |
| Adapters CMS / Fly | `implemented: false` ; sous-projet Livraison (#4). |
| Suppression de `.splash-preflight.json` | Son écrivain `skills/splash/scripts/preflight.mjs` est hors frontières de ce chantier (§7). |
| i18n de la prose agent du `SKILL.md` | Décision 3 du parent ; `skills/splash/SKILL.md` est hors frontières. |
| Sweep i18n de la page au-delà de en/fr | Le tableau de copie accepte une langue en une entrée ; en ajouter sans locuteur serait de la dette. |
| Logo / police dans le profil | Déféré depuis le design de profil (2026-07-13). |

## 6. Critères de succès

1. Une install fraîche ouvre la page **en anglais**, sans rien demander de plus (#6).
2. Une capacité non activée n'apparaît **jamais** comme un échec (#5).
3. Aucun secret n'atteint `newsroom.json` **ni le modèle envoyé au navigateur** — prouvé par test.
4. Une soumission avec un champ vide **ne perd pas** la clé déjà configurée — prouvé par test.
5. Après un passage par la page, `lastVerified` reflète un vrai verdict fournisseur.
6. `runtime` n'a plus qu'un écrivain (`newsroom.json`) et un résolveur (`read-runtime.ts`).
7. Une install FR legacy pilotée par le skill imprime le **français** (trou D).
8. `cd lib && bun test` et `cd install && bun test` verts ; `skills/splash` typecheck propre.
9. La page est **vérifiée au rendu** (capture headless regardée), pas par relecture du balisage.

---

## 7. Risques assumés

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

Chaque résidu réel constaté à la fin du chantier, avec son ruling. Aucun n'est un oubli.

| # | Résidu | Ruling |
|---|---|---|
| 1 | **`.splash-preflight.json` garde deux écrivains.** L'obligation §5.1 parente en nommait deux : `runtime` (fermé ici) et les tampons de vérification. `skills/splash/scripts/preflight.mjs` écrit encore le fichier legacy pendant que la page écrit `lastVerified` dans le décor. | **Hors frontières de fichiers de ce sous-projet** (`skills/splash/scripts/` n'est à moi que pour `export-code.mjs`). Non fait plutôt que fait à moitié ou fait hors périmètre. Le geste est le même que pour le runtime : déplacer l'écrivain, puis supprimer le fichier. |
| 2 | **`loadDecor(dir)` documente « rien n'est écrit » et écrit quand même `brand.json`** — `loadNewsroomProfile` rafraîchit ce cache à chaque appel (`skills/splash/src/brand-profile.ts:378`). Découvert ici en écrivant le test « n'écrit rien » de `readDecorState`. | **Fermé sur le chemin qui comptait, laissé ailleurs.** La migration (`migrate-decor.ts`) lit désormais la langue sans réécrire le cache, donc `readDecorState` — le chemin du script d'export — n'écrit vraiment rien. `loadDecor` continue de charger le profil via le loader avec cache : c'est le comportement en place depuis P1, ses autres appelants en dépendent peut-être, et le corriger sans appelant demandeur serait du remue-ménage. **La docstring de `loadDecor` reste donc inexacte sur ce point précis.** |
| 3 | **La page juge « déjà configuré » sur le FICHIER `.env`, pas sur `process.env`.** Une clé exportée dans le shell qui a lancé l'installeur s'affiche comme absente. | **Voulu.** La page existe pour remplir ce fichier ; « configuré » doit vouloir dire « écrit », sinon elle afficherait vert une clé qui aura disparu au run suivant. Divergence assumée avec `decorEnv`, qui lui superpose `process.env` parce qu'il juge une exécution, pas une configuration. |
| 4 | **Sur une install fraîche, « Photo narratives » (image-native) s'affiche `Missing`** — le bootstrap n'installe les dépendances que de `chart-native` et `map-native`, et `sharp` manque donc réellement. | **Vrai, donc affiché.** La readiness ne ment pas et la remédiation est imprimée (`bun install` dans `skills/image-native`). Élargir la liste des skills que le bootstrap installe est une décision de coût d'installation, pas une décision de page. |
| 5 | **La page ne parle que `en` et `fr`.** Une rédaction qui choisit `de` enregistre bien `uiLang: "de"` mais lit une page anglaise. | **Assumé et borné.** Même règle que `lib/newsroom/ui-copy.ts` (défaut anglais, langue inconnue → anglais) ; ajouter une langue est une entrée de table. Traduire sans locuteur produirait pire qu'un repli. |
| 6 | **Rien dans le gate ne pilote le DOM du client.** `client.ts` est typé et ses décisions sont dans des modules testés, mais son câblage n'est prouvé que par le rendu inspecté (§ ci-dessous), pas par un test de navigateur qui tourne en CI. | **Cohérent avec le dépôt** : `bun run check` est un gate typecheck + `bun:test`, et le rendu réel vit dans une voie séparée (`check:render`) parce qu'il traîne un navigateur headless. Les trois bugs trouvés au rendu (statut figé au clic, publisher non activé, message périmé après vérification) l'ont été à l'œil, ce qui est exactement ce que ce chantier devait faire — mais une régression future ne sera pas attrapée mécaniquement. |
| 7 | **`embed-s3` n'a pas de vérificateur live.** Pour ce publisher, `ready` continue de vouloir dire « rempli », pas « accepté ». | **Délibéré.** Un HEAD sur un endpoint S3 arbitraire n'est pas un contrôle d'identifiants ; en inventer un donnerait un verdict que l'adapter ne partage pas. `capabilityVerifiable` répond `false`, et une absence de question n'est jamais un échec. |
| 8 | **`install/bootstrap.ps1` n'a pas été EXÉCUTÉ** (pas de machine Windows). Sa modification (deps racine + résolution du runtime) est un miroir relu, couvert seulement par les tests textuels de `docs/installer/`. | **Déclaré tel quel.** Le fumigène Windows du README (« clean Windows VM ») reste le seul contrôle réel, comme pour tout changement de ce fichier depuis l'origine. |
| 9 | **La page supprime `.splash-runtime` au premier enregistrement.** Une install qui reviendrait ensuite à une version de Splash antérieure à ce chantier ne trouverait plus son runtime et retomberait sur `claude`. | **Accepté** : c'est le prix de « un champ, un domicile », et le sens du downgrade n'est pas un chemin supporté. Le sens qui compte — une vieille install lue par le nouveau code — est couvert par le repli legacy de `read-runtime.ts`. |
| 10 | **`install/configurator-core.ts` n'est plus qu'une coquille** (`RUNTIMES` + la ré-export des `verify*`). | **Gardé volontairement.** `install/configurator.ts` est un chemin publié (les commandes d'install déjà distribuées, les deux bootstraps, les tests de `docs/installer/`) ; casser son nom pour l'esthétique du module coûterait plus que la coquille. |
| 11 | **Les phrases de `readiness.ts` nomment encore les variables d'environnement** (« needs VITE_MAPTILER_KEY or REMOTION_MAPTILER_KEY »). | **Contourné à la source d'affichage, pas réécrit.** Le modèle expose `missingFields`, et la page dit « nécessite : clé MapTiler ». La phrase de `readiness` reste telle quelle pour ses autres appelants (le `propose`, `splash newsroom`), où nommer la variable est utile. |

## 8. Vérifié au rendu, pas à la relecture

Le balisage n'est pas une preuve (règle du dépôt). La page a été servie par son vrai serveur et
photographiée dans un navigateur headless, en six états : install fraîche · install partiellement
configurée ouverte sur `?section=embed-cloudflare` · la même en thème sombre · deux capacités
cochées en direct · après un **vrai** appel « Vérifier mes clés » (des identifiants bidons
réellement refusés par Datawrapper et MapTiler) · et après un enregistrement complet piloté depuis
l'interface (langue basculée en français, `.env` + `newsroom.json` + `NEWSROOM-PROFILE.md` relus
sur le disque).

**Trois défauts réels que seul le rendu a montrés**, tous corrigés puis re-photographiés :

1. Cocher une capacité laissait sa pastille de statut figée sur l'état enregistré — la page ne
   savait pas dire ce qu'une capacité deviendrait une fois activée. D'où `statusIfEnabled`,
   calculé au serveur (le client ne ré-implémente pas la readiness).
2. Choisir un hébergeur ne l'**activait** pas : il aurait été enregistré `enabled: false`, donc
   jamais vérifié ni jamais signalé.
3. Après une vérification live, le résumé affichait encore la raison enregistrée — une étiquette
   nue pour une clé que le fournisseur venait de refuser, ou un « injoignable » périmé.
