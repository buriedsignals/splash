# La page demande ses clés, montre le profil, et ouvre les apps de bureau

**Date** : 2026-08-06 · **Branche** : `feat/setup-page-keys-and-profile` · **Origine** : trois
retours de Rémy en regardant la page servie après la fusion du chantier « la page de réglages
cesse de mentir » (`docs/superpowers/specs/2026-08-05-setup-page-truth-design.md`).

Ce chantier est la **suite directe** du précédent, sur le même écran. Il ne rouvre aucune de ses
décisions ; il ferme trois manques que seul l'usage réel a montrés.

---

## 1. Les trois constats

### 1.1 Les deux runtimes de bureau ne sont pas sélectionnables

`install/configurator-core.ts` les déclare `verified: false`, donc la page les grise. Motif écrit
dans le code : la Couche A (l'hôte découvre les skills) est mesurée pour les deux, la Couche B
(**un visuel sort de l'app**) n'a jamais été observée.

**Le précédent qui tranche** : `install/configurator-core.test.ts:9-10` montre que `gemini` et
`goose` sont déjà ouverts **« by decision »**, Couche B en attente — pour gemini parce que le
quota gratuit a bloqué la preuve, pour goose parce que le même quota a coupé l'invocation
imbriquée. La règle appliquée par ce projet n'est donc pas « pas de preuve, pas d'accès », c'est
« pas de preuve, on l'écrit ». Les deux apps de bureau relèvent du même régime.

**Ce que le refus coûtait** : les deux seuls runtimes conçus pour le journaliste — installés une
fois, lancés depuis le Dock, plus jamais de terminal — étaient les deux que la page cachait,
pendant qu'elle proposait quatre CLI. La promesse « zéro terminal » de la page d'install n'était
atteignable par personne.

### 1.2 La page est aveugle au profil qu'elle possède déjà

`install/preflight/client.ts:313-316` : quand `NEWSROOM-PROFILE.md` existe, la section « Votre
rédaction » remplace **tout** son contenu par une phrase (« vous avez déjà un profil, il vous
appartient — ouvrez `NEWSROOM-PROFILE.md` pour le modifier ») et retourne.

Elle n'affiche donc jamais le nom de la rédaction, son crédit, sa couleur maison, sa langue de
publication ni son fond — alors que `loadDecor` (`install/preflight/server.ts`) a déjà parsé le
fichier pour en tirer la langue. Le journaliste doit ouvrir un éditeur de texte pour savoir ce que
Splash croit de lui : la même faute que le chantier précédent a corrigée ailleurs, un écran qui
renvoie à un terminal.

### 1.3 Une clé n'est demandée que si l'on coche d'abord

Aujourd'hui les champs de clés sont **imbriqués sous leur capacité** et n'apparaissent qu'avec
elle ; la phrase de la section le revendique : *« Cochez ce que votre rédaction utilisera. Ce que
vous laissez décoché n'est jamais signalé comme manquant »* (`install/preflight/copy.ts`,
`capabilitiesHint`).

**Décision de Rémy (2026-08-06)** : les clés de **production** — jeton Datawrapper, clé MapTiler —
sont demandées **d'emblée**, sans condition. Les destinations de **publication** (Cloudflare, S3,
We.Publish) restent demandées au moment où l'on choisit d'y publier : une rédaction qui livre un
fichier n'a pas de compte S3 à donner, et lui réclamer des identifiants qu'elle n'aura jamais est
la version symétrique du même défaut.

---

## 2. Décisions

| # | Décision | Écarté |
|---|---|---|
| D1 | Les deux runtimes de bureau passent `verified: true` **par décision**, avec le commentaire qui dit exactement ce qui est mesuré et ce qui ne l'est pas — le même idiome que `gemini` et `goose` portent déjà. | Attendre le run de preuve : le projet a déjà tranché deux fois dans l'autre sens, et l'attente prive le journaliste du seul parcours sans terminal. |
| D2 | Quand `NEWSROOM-PROFILE.md` existe, la section affiche **ses valeurs**, et dit qu'elles viennent de ce fichier. | Rendre le formulaire éditable sur un profil existant — la page réécrirait un fichier qui appartient à la rédaction (invariant du chantier 2026-07-24, décision 6). |
| D3 | Les clés de production sont demandées d'emblée, hors des cases ; les cases gouvernent seulement ce qui est **signalé comme manquant** ensuite. | Tout demander, publication comprise (Rémy : « toutes les clés de PRODUCTION ») ; et garder le conditionnement actuel. |

---

## 3. Ce que la page devient

### 3.1 Votre assistant

Six runtimes sélectionnables au lieu de quatre. Rien d'autre ne bouge : le champ de login reste
celui du runtime choisi (chantier précédent), et les deux apps de bureau n'en déclarent aucun —
elles possèdent leur compte.

`install/runtimes/README.md` porte aujourd'hui la phrase *« flip a runtime's `verified` to `true`
only once its module exists AND the end-to-end proof passes »*. Elle est fausse depuis gemini et
goose ; elle devient : le module doit exister, et le drapeau se lève soit sur une preuve, soit sur
une décision **écrite à côté du drapeau**.

### 3.2 Votre rédaction

Deux états, et le second est neuf :

- **Pas de profil** : le formulaire actuel (nom, site, couleur). Inchangé.
- **Profil existant** : ses valeurs, telles qu'elles sont écrites — nom et URL du crédit, palette
  (la primaire d'abord), langue de publication, fond maison s'il est déclaré — chacune présentée
  comme une lecture, pas comme un champ. Plus la phrase qui dit d'où elles viennent et que le
  fichier appartient à la rédaction.

Une valeur absente n'est pas une erreur : un profil sans `theme` est un profil clair, un profil
sans URL est un crédit sans lien. La section montre ce qui est déclaré et tait le reste.

### 3.3 Ce que vous voulez pouvoir faire

Les clés de production sortent des capacités et forment leur propre bloc, au-dessus des envies :
le jeton Datawrapper et la clé MapTiler, avec leur aide (« où l'obtenir ») et leur état
« déjà configuré » comme aujourd'hui.

Les cases restent, groupées par envie (chantier précédent), et gardent leur rôle : dire ce que la
rédaction utilisera, donc ce que « Où vous en êtes » signalera. La phrase de la section est
réécrite en conséquence — elle ne peut plus promettre qu'un décoché n'est jamais réclamé, puisque
sa clé est demandée d'emblée. Elle dira ce qui reste vrai : **ce que vous laissez décoché n'est
jamais signalé comme un blocage.**

`envUpdates` (`install/preflight/serialize.ts`) écrit déjà toute clé que le registre déclare, sans
regarder les cases ; **le miroir MapTiler** (une clé, deux noms — Vite et Remotion) continue de
s'appliquer. Rien à changer côté écriture : le changement est de savoir **quand on demande**.

---

## 4. Ce que ça ne fait pas

- **Aucun run de preuve n'est effectué ici.** D1 ouvre les deux apps sur une décision ; la Couche B
  reste non observée, et le dire dans le code fait partie du travail. Le jour où un visuel sort
  d'une app de bureau, c'est `docs/installer/*-proof.md` qui l'enregistre, pas ce spec.
- **La charte mesurée depuis le site de la rédaction** reste le sous-projet suivant : ici la page
  *affiche* un profil existant, elle n'en *propose* aucun. `lib/newsroom/charter.ts` n'est pas
  touché.
- **Les destinations de publication** gardent leur conditionnement au choix.
- **E26 du backlog** (`bun lib/host/cli.ts newsroom` sonde encore l'arbre source) n'est pas de ce
  chantier : il appartient à la boucle, pas à la page.

---

## 5. Comment on prouve

1. **Les six runtimes** : le test qui épingle les drapeaux (`install/configurator-core.test.ts:6`)
   couvre les six. Le motif se garde en **lisant le fichier source comme du texte** — le même
   procédé que `docs/installer/bootstrap-sh.test.ts` applique aux scripts d'install : pour chaque
   entrée `verified: true`, les lignes qui la précèdent doivent contenir soit une preuve datée,
   soit le mot « decision ». Un drapeau levé en silence fait alors rougir le test, et la règle ne
   peut plus redevenir tacite. À vérifier par mutation : retirer le commentaire d'une entrée doit
   suffire à faire échouer.
2. **Le profil affiché** : un test de modèle avec un `NEWSROOM-PROFILE.md` complet, un autre avec
   un profil minimal (nom seul), et la **vérification par mutation** — retirer la lecture du profil
   doit faire rougir le premier. Le second prouve qu'un champ absent ne casse rien.
3. **Les clés d'emblée** : un test qui construit le modèle **sans aucune capacité cochée** et
   asserte que les champs Datawrapper et MapTiler sont quand même présents, et qu'aucun champ de
   publication ne l'est. Mutation : re-conditionner les clés aux cases doit le faire rougir.
4. **La page servie** : le contrôle de bout en bout du chantier précédent (`server.test.ts`, qui
   monte le vrai serveur et lit le modèle servi) est étendu d'une assertion sur ces trois points.
5. `bun run check` reste vert — **23 checks**.
