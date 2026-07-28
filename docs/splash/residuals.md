# Registre des résidus — l'état consolidé, 2026-07-27

> **Construit le** 2026-07-27, contre `feat/residual-register` @ `943f4f41`.
> **Langue :** prose FR, identifiants/code/chemins en anglais (standard non-négociable).
> **Ce document est le seul endroit où « ce qui reste » se lit en entier.** Les sections
> `## Risques assumés` / `## Résidus` / `## Hors scope` des specs et plans restent la trace
> datée de la décision prise *par la tranche qui l'a prise* — elles ne bougent pas et ne se
> tiennent pas à jour. Chacune pointe désormais ici.

---

## 0. La règle

**Un résidu est soit fermé, soit porteur d'une raison.** Un résidu sans raison n'est pas un
résidu : c'est un bug non trié. Corollaire, et c'est tout l'objet du tri ci-dessous : **une
raison n'est pas de la dette.** Un refus mesuré, classé « à corriger », se fait défaire six
semaines plus tard par quelqu'un de serviable qui n'a pas lu la mesure.

La bonne manière de fermer un résidu de la pile B n'est jamais de le « corriger » : c'est de
**retirer la raison**. Le meilleur exemple du corpus vient de se produire — l'invariant « une
option choisie porte un `why` non vide » a été refusé par le premier balayage parce qu'aucune
commande de façade ne phrasait, ce qui rendait `choose-form` structurellement inatteignable pour
l'hôte non-JS ; ce balayage a écrit l'ordre contraint (« d'abord donner un appelant à
`applyPhrasing` sur le chemin hôte, ensuite seulement verrouiller l'invariant »). La tranche
`host-journey` a livré `phrase`, et l'invariant a été posé dans la foulée
(`lib/loop/manifest.ts:718-736`, qui garde tout le raisonnement en commentaire). L'ordre a été
respecté, et le résidu est mort sans que personne ait eu à « corriger » quoi que ce soit.

## 1. Ce qui a été balayé, et comment

**Corpus :** les sections de résidus de `docs/superpowers/specs/2026-07-2*.md`,
`docs/superpowers/plans/2026-07-2*.md`, `docs/splash/delivery-l1-followups.md`,
`docs/splash/delivery-l2-followups.md` — plus **`docs/splash/proposal-brain-followups.md`**, qui
est un ledger de résidus de la même classe et que le périmètre annoncé omettait.

**Volume brut :** ~250 entrées listées dans ~25 documents. Elles ne font **pas** ~250 résidus :
le corpus se répète beaucoup, parce que chaque tranche re-note le résidu voisin qu'elle a
rencontré et n'a pas eu le droit de fermer. `approved ⇒ preview` est écrit cinq fois,
`DestinationProfile` quatre, `interactionResults` quatre, le relecteur sémantique indépendant
quatre. Le registre déduplique : **une entrée = un résidu distinct**, avec tous ses sites de
citation.

**Vérification :** chaque entrée a été confrontée au code réel avant d'être classée. Plusieurs
avaient été notées contre un arbre mouvant et sont **périmées** — §5 les liste avec ce qui a été
trouvé à la place. Rien n'est classé sur la seule foi de la prose.

**Ce que ce slice ne fait pas :** aucun code de production. Il lit et il trie.

---

## 2. Pile A — dette fermable

Réels, et les fermer est une amélioration nette. Ordonnés par (valeur ÷ effort) au meilleur de
mon jugement — les cinq premiers sont ceux que je fermerais aujourd'hui.

| # | Quoi | Où | Taille | Ce que ça achète |
|---|---|---|---|---|
| ~~A1~~ **FERMÉ** | ~~Un crédit contenant `{name}` sans `source.name` **ship le littéral `{name}`** dans `metadata.json` du paquet livré. Rien en aval ne l'attrape : `metadata.ts` ne fait que `trim()`, et la garde d'accolades de `snippet.ts` s'applique au gabarit, jamais aux valeurs substituées.~~ **Fermé** : un crédit dont le gabarit n'a pas pu être rempli est **abandonné** (accolade survivante ⇒ `undefined`), ce qui retombe sur l'état documenté « crédit vide = dérivé de la langue par le producteur ». Test de régression `decor.test.ts` (les deux sens : rempli, et non-remplissable). | `lib/newsroom/decor.ts:134-150` | une ligne | La rédaction cesse de publier un gabarit non rempli. C'est un défaut visible du lecteur pour un `??` manquant. |
| ~~A2~~ **FERMÉ** | ~~**`install/preflight/client.ts:49` propose « Deutsch »** dans son sélecteur de langue alors que `install/preflight/copy.ts:203` ne connaît que `en`/`fr` et retombe sur l'anglais. Offrir un choix qu'on n'honore pas est pire que ne pas l'offrir.~~ **Fermé — mais PAS en retirant l'option** : la même liste servait les DEUX sélecteurs, et la langue de CONTENU (ce qu'une rédaction publie) n'a rien à voir avec la langue que la page sait parler — retirer « Deutsch » aurait supprimé une capacité de publication réelle pour réparer une page. Les deux listes sont séparées : `UI_LANGUAGES` est **dérivée** de la table de copie (donc jamais dérivable de nouveau), `CONTENT_LANGUAGES` reste le sur-ensemble. Test `install/preflight/copy.test.ts`. | `install/preflight/copy.ts:210-247` · `client.ts` | une ligne (retirer l'option) | Ferme le seul endroit du parcours d'install qui promet quelque chose de faux. La vraie fermeture (une entrée `de`) est en pile C : elle demande un locuteur. |
| A3 | **`.splash-preflight.json` garde deux écrivains** : le script legacy écrit le fichier pendant que la page écrit `lastVerified` dans le décor. « Un champ, un domicile » est la règle §3.1 du Préflight, et c'est la classe de défaut que ce dépôt a déjà payée. | `skills/splash/scripts/preflight.mjs:80` vs `install/preflight/serialize.ts:190-198` · note dans `lib/newsroom/migrate-decor.ts:12` | petit | Un fait, un domicile. Le geste est écrit depuis P1 : déplacer l'écrivain, puis supprimer le fichier. |
| ~~A4~~ **FERMÉ** | ~~**La docstring de `loadDecor` promet « NOTHING is written » et le loader écrit `brand.json`** à chaque appel, sans être gaté sur `mayWrite`.~~ **Fermé par l'écriture, pas par la doc** : `resolveProfile(root, mayWrite)` garde `loadNewsroomProfile` (avec son cache) sur la racine de l'install, et DÉRIVE le même profil (`parseNewsroomMarkdown` → repli `loadBrandProfile`) sous un `dir` explicite. La promesse I2 était fausse en fait, pas seulement en prose : un `splash newsroom --dir <n'importe quoi>` déposait un `brand.json` dans un chemin non fiable. Test de régression dans « an explicit directory is READ-ONLY ». | `lib/newsroom/decor.ts:123-145` | une ligne (docstring) ou petit (gater l'écriture) | Une fonction annoncée lecture-seule qui écrit est exactement le piège que `readOnlyUiLanguage` vient de fermer un cran plus haut. Aujourd'hui la doc ment ; demain quelqu'un s'y fie. |
| A5 | **`lib/core/publishers.test.ts` n'a pas d'`afterAll`.** `beforeEach(resetPublishersForTest)` protège les tests *de ce fichier*, mais le dernier laisse ses stubs — et un registry vidé — au fichier suivant du même process. | `lib/core/publishers.test.ts:34` · `lib/core/publishers.ts:135-137` | une ligne | Ferme la classe exacte du « défaut le plus instructif » de L1 : `bun run check` vert par chance d'ordonnancement de fichiers. |
| A6 | **`run.channel` a maintenant plusieurs lecteurs.** L'arbitrage qui l'a laissé vivre à côté de `elements[].deliverable` reposait sur « une seule LECTURE existe (`channelForElement`) » ; ce n'est plus vrai — deux résolveurs (`resolvedChannelForElement`, `channelForElement`) plus cinq lectures directes. **La garde nommée par la décision a cédé.** | `lib/loop/manifest.ts:216,283,297` · `migrate.ts:72-73` · `deliverables.ts:273,277` · `resume.ts:169,172` · `propose.ts:58` | petit (re-router tout sur le résolveur total) | Restaure la seule propriété qui rendait le doublon acceptable. Sans elle, la dérive redevient sémantique. |
| A7 | **`cloudflare-pages.ts` garde des défauts de paramètre `= process.env`.** Jamais exercés sur le chemin publish (I5 tient), mais ils sont le seul chemin par lequel l'ambiant peut rentrer. | `lib/delivery/adapters/cloudflare-pages.ts:140,150` | une ligne ×2 | Aligne l'adapter sur le principe que le contrat applique partout ailleurs : les credentials sont injectés, jamais lus de l'ambiant. |
| A8 | **`verify-embed-delivery.mjs` passe l'environnement entier comme `credentials`** — et c'est **pire qu'à la note** : il passe désormais `decorEnv()`, soit `process.env` **plus** le `.env` de l'install. | `skills/splash/scripts/verify-embed-delivery.mjs:51` · `lib/newsroom/decor.ts:80` | petit | Un script opt-in cesse de contredire le principe (I5) que le module qu'il vérifie applique. |
| A9 | **Aucun `RunEvent` n'est écrit quand une forme non constructible est refusée.** `chooseForm` refuse, la façade relaie, `advanceStep` ne touche rien — un manifeste relu montre `chosen → choose-form` sans trace du refus. | `lib/loop/choose.ts:70-78` · `lib/host/drive.ts:487` · `lib/loop/driver.ts:199-201` | petit | Un run qui stagne dit pourquoi. C'est la moitié manquante de la discipline « le refus est loud ». |
| A10 | **Hygiène KB — quatre fiches contredisent leur propre frontmatter.** `bar.md` énonce son plafond deux fois (`maxCategories: 25` vs « ~20–25 » en prose ×2) · `streamgraph.md` se contredit (`maxSeries: 7` vs « 5-10 » vs « ≤ ~7 ») · `chord.md` clé son plafond d'entités en `maxCategories` là où `radar.md` utilise `maxSeries` pour la même chose · `image-scrolly.md` sort de la convention de famille (`> Source:` / `## Correctness` au lieu de `> Sources:` / `## Correctness "de base"`). | `knowledge/references/chart/types/{bar,streamgraph,chord,radar}.md` · `knowledge/references/image/types/image-scrolly.md` | petit, doc seule | Le frontmatter EST la source du cerveau. Une prose qui le contredit finit par être crue par un humain pendant que le code lit l'autre chiffre. |
| A11 | **`propose` garde le repli `m.elements[0]`.** Le driver passe désormais l'élément vivant, mais le paramètre reste optionnel — deux sources pour « l'élément vivant », dont une atteignable. | `lib/loop/propose.ts:45-55` · `lib/loop/driver.ts:123` | une ligne (rendre le paramètre requis) | Une seule définition de l'élément vivant. Le fallback ne sert plus personne depuis que le seul appelant le passe. |
| A12 | **`chooseFormIn` n'avertit pas** que re-choisir une forme périme un artefact fini, alors que `confirmAngleIn` le fait (`staled: true`) pour exactement la même raison — les deux déplacent `provenanceHash`. | `lib/host/drive.ts:419-430` vs `:255-268` · `lib/loop/choose.ts:78-81` | petit | Symétrie. Une décision qui annule du travail fini le dit, quelle que soit la commande. |
| A13 | **Re-planifier un élément SUPPRIME son offre** quand la nouvelle destination ne peut pas porter le format épinglé. Gardé mécaniquement et testé — mais **rien ne le dit au desk**. | `lib/loop/deliverables.ts:187-196` | petit (une phrase dans la réponse) | La perte de travail est annoncée au lieu d'être constatée. Le comportement est voulu ; le silence ne l'est pas. |
| A14 | **`state` n'expose toujours pas le takeaway confirmé.** Un hôte qui reprend un run à froid lit `gateState: "angled"` sans pouvoir relire l'angle sans ouvrir `run.json`. | `lib/loop/resume.ts:38-93,174-186` · `lib/host/state.ts:127-137` | petit | La façade cesse d'obliger un hôte non-JS à lire le manifeste à la main — ce que toute la couche existe pour éviter. |
| A15 | **`run.route` n'a aucun lecteur de production.** Schématisé, écrit par `init` et par la migration, lu par personne ; `propose.ts:59` refuse explicitement de le threader. | `lib/loop/manifest.ts:210` · `init.ts:158` · `migrate.ts:90` · `propose.ts:59` | petit (câbler ou retirer) | Un champ écrit que rien ne lit finit par être lu comme une configuration vivante qui ne change rien. |
| A16 | **Le couplage `limits` ↔ `limitFailure` n'est tenu que par un commentaire.** Une clé ajoutée au `z.strictObject` sans l'être au vérificateur dégrade en silence (le sens inverse est fermé et testé). | `lib/brain/typology.ts:36-42,54-62` · `lib/brain/eligibility.ts:219` | petit (un test de dérive) | La promesse écrite dans le commentaire (« adding a key here is a promise that limitFailure() checks it ») devient mécanique. |
| A17 | **`facts.series === rowCount`**, donc `maxSeries` et `maxCategories` comparent le même nombre à des plafonds différents. La raison d'exclusion peut être trompeuse sur un CSV long/tidy. | `lib/brain/facts.ts:18-19` · `lib/brain/eligibility.ts:227,229` | moyen | Deux plafonds distincts cessent d'être un seul test déguisé. |
| A18 | **`figuresIn` / `numbersIn` : trois copies**, pas deux comme la note l'annonçait — `verify-beats.ts` en a ajouté une depuis. Trois endroits où corriger un bug de tokenisation. | `lib/source/prose.ts:29` · `lib/brain/verify-offer.ts:99` · `lib/brain/verify-beats.ts:104` | moyen (extraction vers `lib/core`) | Une seule définition de « ce qu'est un nombre » pour les trois gardes qui en dépendent. Le follow-up est déjà nommé dans `prose.ts:18-20`. |
| A19 | **`assertProseGrounded` et `assertNoPrivateLeak` n'ont toujours aucun appelant de production.** (L'autre moitié de ce résidu est fermée : `validateSourcePolicy` et `publicSourceView` en ont désormais.) | `lib/source/prose.ts` · `lib/source/redact.ts` | moyen | Deux gardes construites, testées et dormantes deviennent vivantes. Tant qu'elles dorment, la policy est enregistrée mais pas appliquée. |
| A20 | **`sourceQuestion()` n'a aucun appelant.** Le journaliste rencontre donc le refus avant de rencontrer la question. Le message du refus porte la question — mais sa place propre est le CADRAGE. | `lib/source/policy.ts:124` (seules références : `ledger.test.ts`) | moyen (CADRAGE + `lib/newsroom/ui-copy.ts`) | Le coût du refus se déplace de l'auteur du run vers le bon moment du parcours. |
| A21 | **`sourceKind` n'est pas threadé jusqu'à `conformanceL0`.** Le champ existe côté `lib/core`, il n'a **aucune occurrence sous `skills/`** ; chart-native appelle toujours la branche historique. L'interface exacte est écrite dans la spec source-wiring R1. | `lib/core/conformance-l0.ts:58` · à threader : `skills/chart-native/src/spec-to-config.ts` → `ChartConfig` → `skills/chart-native/src/core/conformance.ts:345` | moyen | Arme la ceinture kind-aware. La bretelle (refus au produce d'un `public` sans URL) tient déjà — c'est pour ça que c'est A et pas urgent. |
| A22 | **`suggestBeats` réimplémente les sélecteurs d'ancres du moteur** au lieu de les importer (frontière `lib/brain` ⇏ `skills/*/src`). Un test de dérive les épingle, ce qui est un intérim, pas une fermeture. | `lib/brain/beats.ts` vs `skills/chart-native/src/chart-story` · pin : `lib/brain/beats-drift.test.ts` | moyen (déplacer vers `lib/core`, comme `claim-arc.ts`) | Une seule définition de la salience. Le test de dérive peut alors disparaître au lieu d'être maintenu. |
| A23 | **La readiness ne compte pas les `settingsFields` non-secrets.** Une rédaction qui pose ses deux clés S3 dans `.env` obtient une destination *activée et prête* sans `endpoint`/`bucket`. La conséquence la plus dure est fermée (le refus nomme désormais l'emplacement, et `deliver` transmet les settings), mais `ready` ment toujours. | `lib/newsroom/readiness.ts:64-77` · `lib/newsroom/state.ts:98-103` | moyen | `ready` cesse de vouloir dire deux choses selon la capacité. |
| A24 | **`nextActions` boucle indéfiniment sur une destination définitivement inconfigurable** : un runner autonome ré-appende le même événement d'échec à chaque tour. Le ledger est plafonné à 50 entrées, la boucle non. | `lib/loop/manifest.ts:544-552` · `lib/loop/driver.ts:189-197` | moyen | Un run autonome peut se terminer. Aujourd'hui il tourne. |
| A25 | **README.md / EMBED.txt du ZIP sont en anglais quelle que soit `metadata.lang`.** Le test que la spec §4.4 déclare requis n'existe pas — `zip.test.ts` passe `lang: "fr"` et asserte des chaînes anglaises. | `lib/delivery/adapters/zip.ts:49,81,166` · `lib/delivery/adapters/zip.test.ts:39,63,89-92` | moyen (la langue est disponible depuis le fix C2) | Le paquet possédé parle la langue de la rédaction. Et le test annoncé cesse d'être annoncé. |
| A26 | **Les planchers d'axes de `radar`/`parallel` (`≥ 3`) sont inexprimables** dans le vocabulaire fermé de `limits`, donc non gardés. *Correction au passage : `boxplot.md` n'omet pas son « n≈5 » — il n'a aucun bloc `limits:` du tout, donc son plancher est de la prose non appliquée.* | `knowledge/references/chart/types/{radar,parallel,boxplot}.md` · `lib/brain/typology.ts:54-62` | petit-moyen | Un plancher réel devient une garde au lieu d'une phrase. |
| A27 | **`skills/map-native` n'a pas son navigateur headless** dans un worktree neuf : le bootstrap ne lance `playwright install chromium` que dans `chart-native`. | `install/bootstrap.sh:86` | une ligne | Un worktree neuf peut rendre une carte sans que quelqu'un re-découvre le diagnostic. |
| A28 | **`schemaVersion` reste 4 alors que le schéma a grandi.** *La note disait « bloqué par 27 fichiers » ; mesuré : 81 occurrences dans 39 fichiers, dont **2 seulement en production** (`lib/loop/init.ts:157`, `lib/loop/migrate.ts:89`).* Le blocage est 37 fichiers de test, pas trois zones interdites. | `lib/loop/manifest.ts:208` (`z.literal(4)`), `:401` · `migrate.ts:21` · `lib/host/state.ts:74` | gros (mécanique) | Peu de valeur aujourd'hui — les champs neufs sont additifs et optionnels, un v4 signifie exactement la même chose. À faire quand un champ non-additif arrivera, pas avant. |

### Fan-out moteurs (résidus des tranches 2026-07-20 → 2026-07-22)

| # | Quoi | Où | Taille | Ce que ça achète |
|---|---|---|---|---|
| A29 | **L'overshoot séquentiel n'est pas clampé.** `fillOpacity` culmine à `target * 1.25` ; l'`extrapolate*: "clamp"` de `interpolate` borne l'ENTRÉE, pas la sortie — donc toute cible > 0,8 dépasse 1,0 sur un canal d'opacité. | `skills/map-native/src/core/staged-reveal.ts:63` (+ le miroir de parité `components/RouteReveal.parity.test.ts:23`) | une ligne, dans le helper partagé | Tous les composants qui passent par `stagedReveal` héritent du correctif — c'était déjà la consigne de la note (« apply the clamp fix in the shared helper »). |
| A30 | **`[data-splash-root]` et `[data-splash-title]` ne sont posés par AUCUN moteur.** Les deux premiers barreaux de l'échelle de capture sont morts ; la résolution de racine et la lecture du titre passent donc toujours par une heuristique. | à poser côté `skills/*` · consommé par `lib/verify/capture.ts:53,87` | petit (un attribut par moteur) | Le seul vrai correctif des deux résidus « c'est une heuristique » de la couche Verify, et il n'exige **aucune ligne** dans `lib/verify` : l'échelle est déjà écrite pour en profiter. |
| A31 | **Les renderers Locator sont restés en `text-variable-anchor`** — modèle de label différent du reste (declutter prioritaire + `text-allow-overlap`), donc une intégration distincte et non le swap trivial. | `skills/map-native/src/components/{LocatorReveal,LocatorStory,LocatorScrolly}.tsx` · `LocatorMap.tsx` · `symbol-labels.ts` | moyen | Un seul modèle de label sur toute la famille carto. Tant que deux coexistent, une correction de label doit être faite deux fois. |
| A32 | **Chorégraphie d'entrée A′-points non faite** (Symbol / Locator / DotDensity : circle-grow overshoot, stipple-in, et leur interaction avec le declutter de labels) — plus les trois voisins de la même tranche : ancre territoire → pôle de `RouteReveal`, context-bloom lightness-shift, et le mode cinématique plaque-fixe + basemap satellite *(celui-ci conditionnel, et render-prouvé à faible gain sur basemap vectoriel)*. | `skills/map-native/src/components/**` | gros (chantier moteur) | Parité de chorégraphie entre les familles carto. Aucun n'est un défaut — c'est du backlog moteur, et il est écrit ici pour ne pas être re-découvert. |
| A33 | **Le `baseColor` n'est pas threadé dans les ~26 sites `themeColors` restants** (30 fichiers de `skills/chart-native/src` l'appellent), et la furniture des charts de composition (stacked, pie) n'est pas teintée depuis une couleur maison de niveau récit — ces configs peuvent ne pas porter de `baseColor`, ce qui relève du levier « palette-story » encore non construit. | `skills/chart-native/src/**` | moyen à gros | Cohérence universelle de la furniture. Aujourd'hui la teinte maison s'applique là où un `baseColor` existe, et nulle part ailleurs. |

**33 entrées.**

---

## 3. Pile B — décisions déjà prises

Elles sont *écrites* comme des résidus parce que c'est la discipline du dépôt (« parké **avec sa
raison** »). Ce sont des refus, mesurés, souvent au prix d'une expérience. **Les « corriger »
serait une régression.** Chacune dit pourquoi elle doit rester, et ce qu'il faut lire avant de
la toucher.

### 3.1 Les cinq à ne surtout pas défaire

- **Le seuil de goût reste à `TAKEAWAY_OVERLAP_FLOOR = 0.3`.**
  *Ce que ça donne à voir :* un cas de test explicitement marqué `fires: false` alors qu'il
  décrit une vraie inversion de sens (« Malta lags far behind » titré « Estonia leads »,
  score 0,33). Ça ressemble à un trou de rappel qu'il suffirait de reboucher en montant le seuil.
  *Pourquoi ça doit rester :* la reformulation allemande **légitime** score 0,33 elle aussi —
  monter le plancher à 0,5 échange un vrai rappel contre du bruit, et une voie qui se déclenche à
  chaque fois n'est plus lue par personne. Le même arbitrage a déjà été rendu une tranche plus tôt
  pour le détecteur de couleurs qui voyait les filets de grille.
  *À lire avant :* `lib/verify/taste.ts:26-30` et les deux cas voisins de
  `lib/verify/taste.test.ts:216-252`.

- **Le relecteur (`review`) ne voit jamais le run.** `ReviewRequest.source` est une string déjà
  résolue, dérivée en amont par `renderedSourceName`.
  *Ce que ça donne à voir :* un `sourceName` « composé par l'hôte », qui a l'air non câblé — la
  tentation est d'élargir `source` pour lui passer le ledger « proprement ».
  *Pourquoi ça doit rester :* l'aveuglement du relecteur **est** l'indépendance de l'issue #9. Lui
  donner le run, c'est lui donner de quoi noter le processus plutôt que l'artefact, et rouvrir
  exactement ce que la whitelist de `redact.ts` existe pour fermer. Le compromis demandé est déjà
  en place : la source est lue honnêtement **sans** élargir ce que le relecteur reçoit.
  *À lire avant :* `lib/verify/review.ts:53-60` (le commentaire prévient nommément contre ce
  « correctif ») · `lib/loop/verify.ts:42`.

- **`approved ⇒ preview` n'est pas un invariant du manifeste.** La porte vit à `approveElement`
  et à `deliver()`, pas dans `assertInvariants`.
  *Ce que ça donne à voir :* un invariant sémantiquement juste, qui tient en une ligne, refusé
  trois tranches de suite. Irrésistible.
  *Pourquoi ça doit rester :* il a été **mesuré**, pas estimé — l'ajouter fait tomber exactement
  2 tests, dont **un seul** fixture (`lib/loop/driver.test.ts:236`), hors frontière de fichiers de
  toutes les tranches qui l'ont voulu. Un invariant écrit contre un test qu'on n'a pas le droit de
  migrer est un faux vert. Ce n'est pas « jamais » : c'est « par la tranche qui possède ce
  fichier », et c'est **la seule chose à migrer**.
  *À lire avant :* `lib/verify/manifest-review.test.ts:254-274` (le verrou porte le chiffre mesuré
  et le nom du fichier) · `lib/loop/manifest.ts:789-792`.

- **Le ZIP archive `index.html` tel que les moteurs le produisent — inliné.** La lettre de #4
  (« clean separate files rather than one huge inlined HTML ») **n'est pas satisfaite**.
  *Ce que ça donne à voir :* une demande explicite du client, notée non satisfaite. On dirait un
  oubli.
  *Pourquoi ça doit rester :* un build non-inliné toucherait **tous** les producteurs et créerait
  une deuxième forme d'artefact à garder verte pour toujours — pour un paquet dont les 4 fichiers
  sont déjà propres. Assumé par écrit, et réouvrable le jour où une rédaction bute dessus : c'est
  un mode de build, pas une refonte.
  *À lire avant :* `lib/delivery/adapters/zip.ts:4` (la décision est dans l'en-tête du module) ·
  `docs/superpowers/specs/2026-07-25-delivery-publishers-design.md` décision 8.

- **Aucun relecteur sémantique indépendant n'est branché.** `independentSemanticReview` reste
  `"unavailable"` sur tout chemin de production, alors que le seam `ReviewerAdapter` existe et
  fonctionne.
  *Ce que ça donne à voir :* une prise construite, testée, et débranchée. Trois lignes pour la
  brancher.
  *Pourquoi ça doit rester :* envoyer une enquête Heidi.news **non publiée** à un service tiers est
  un arbitrage de rédaction, pas d'implémentation (#9 exige une politique de rétention *avant*). Et
  un second modèle sans mode d'isolement local serait précisément le « juge qui valide le juge »
  que S4c a démonté avec sa propre mesure de κ. Le record dit `unavailable` en attendant — c'est
  honnête, pas dormant.
  *À lire avant :* `lib/verify/taste.ts:1-14` · `lib/loop/verify.ts:127-133` (la décision de ne pas
  passer d'adapter est écrite là).

### 3.2 Vérification et goût

- **`interactionResults` part vide plutôt que faussement rempli** (`lib/loop/verify.ts:168`). Un
  tableau rempli par l'appelant serait un verdict d'interaction que personne n'a mesuré. La
  fermeture est de ré-héberger les scripts d'interaction des moteurs dans `lib/` — une tranche,
  pas une ligne.
- **La voie « needs-human-eye » ne bloque pas.** Bloquer sur un *risque* rendrait les runs
  autonomes impossibles et ferait du signal un bruit qu'on apprend à cliquer. Le durcir est une
  politique de rédaction (`requiredSigners`), pas un défaut de code.
- **Tout bloquant est overridable** (`lib/verify/approval.ts:112-119`). Une liste de
  non-overridables serait une politique de rédaction ; ce que le code garantit est la **trace**
  (id, raison, acteur, instant, octets, provenance), pas l'impossibilité.
- **`SPLASH_NO_VIEWER=1` rend `path-printed` atteignable partout** (`lib/loop/preview.ts:63-68`).
  Aucun contrat JSON ne peut prouver qu'un œil a regardé. La raison du repli est écrite par la
  colonne vertébrale, jamais fournie par l'hôte : c'est la dent qui reste.
- **`preview` lance un vrai visualiseur pendant `advance`.** C'est littéralement la demande de #3
  sur une machine de journaliste ; un hôte agentique pose `SPLASH_NO_VIEWER=1` et présente
  lui-même.
- **Le détecteur de palette ignore une série tracée en trait de 1 px**
  (`lib/verify/capture.ts:288-298`). Corrigé **à la source, pas au seuil** : une règle de grille
  n'est pas un encodage à décoder. Réintroduire les traits fins ferait feu sur quasiment tout
  chart — le défaut d'origine.
- **La liste de mots outils est une union figée de quatre langues**, pas une résolution par langue
  de contenu. `lib/verify` n'importe que `lib/core`, et la langue de contenu vit dans
  `lib/newsroom` ; l'union coûte peu (un mot outil français dans un titre anglais est un mot rare).
- **Un livrable `static` ne traverse jamais le détecteur de titre.** Un PNG n'a pas de DOM : ni
  OCR, ni recopie du titre commandé. `titleSource: "static-image"` **dit** l'absence au lieu de la
  taire.
- **Les préfixes des moteurs carto ne sont pas normalisés** (« Interactive map: … »). Mesuré
  inoffensif — la métrique compte la part des mots du *takeaway* dans le titre, des mots en plus
  côté titre ne diluent rien — et aucun de ces moteurs n'est `LOOP_BUILDABLE` : normaliser un
  préfixe qu'aucun run ne produit serait du code jamais exercé.
- **Une divergence produit deux signaux** (un `furniture-missing` bloquant et un risque de goût).
  Ils disent des choses différentes — « ce que vous avez commandé n'est pas là » et « voici ce qui
  est peint à la place » — et une seule barre la route. Affaiblir la porte pour faire de la place
  au signal serait le contraire du travail.
- **Le détecteur de titre ne rattrape aucun défaut vivant aujourd'hui** (`produce.ts` écrit le
  takeaway comme titre). C'est le point : la promesse « le titre EST le takeaway » cesse d'être une
  promesse que le code se fait à lui-même. Un détecteur muet parce que le système est sain est le
  bon état.
- **La chaîne de vérification ne se déclenche que sous une livraison demandée.** Éditorialement
  c'est le bon endroit — la vérification porte sur ce qui va sortir — et un test hors frontière
  l'asserte (`lib/source/wiring-proof.test.ts:128`).
- **Une vidéo ne peut sortir que par un override explicite** du finding `no-capture`. Les deux
  alternatives sont pires : bloquer pour toujours, ou publier sans porte. Le manque est **nommé**
  et il faut une phrase écrite par un humain pour passer outre.
- **Le document de sign-off est écrit AVANT que le manifeste soit persisté.** L'inverse —
  persister l'approbation puis échouer à écrire sa preuve — serait le mauvais sens. Un document
  orphelin n'est lu par personne.
- **La politique de signature est lue à la racine de l'INSTALL, pas du run.** Une seule source,
  sinon la porte qui écrit l'approbation et la porte qui publie pourraient exiger des signataires
  différents. Un install par rédaction est le modèle local-first du produit.
- **`lib/loop/approve.ts` et `lib/host/drive.ts` importent `skills/splash/src`** (vérificateur
  Ed25519, parseur de profil). L'alternative — réécrire la crypto et le format de payload dans
  `lib/` — serait un **second concept d'approbation**, exactement ce que la consigne interdit.
- **La vérification ne tourne pas sur le chemin `revise`.** Correct par construction : toute
  re-confirmation d'angle déplace `provenanceHash`, donc capture/review/approbation tombent
  ensemble et la cascade repart. Il n'y a rien à câbler.
- **La racine du composant reste une heuristique** (`[data-splash-root]` → `#root > div` → `#root`
  → `body`) et le sélecteur retenu est **enregistré** dans chaque `CaptureRecord` : une mauvaise
  racine est lisible dans la preuve au lieu d'être invisible. *(Le barreau mort côté moteurs est
  en pile A — c'est l'échelle qui est délibérée, pas l'absence d'attribut.)*
- **Les deux preuves opt-in ne peuvent pas tourner dans le même process `bun test`.**
  Environnemental, reproduit deux fois, documenté dans l'en-tête du fichier — et `scripts/proofs.mjs`
  en a fait sa contrainte n°1 (un fichier par process, en série, « plus lent exprès »).

### 3.3 Boucle, façade, manifeste

- **`advance` n'a pas de sélecteur `--element`** (les cinq commandes de décision l'ont). `advance`
  exécute *le* pas que `nextActions` désigne ; lui donner un élément en ferait un **ordre** plutôt
  qu'une dérivation — le contraire de ce que la boucle garantit.
- **`verb publish` est refusé en exit 2 (`usage`), pas en exit 1.** La charge utile n'est pas en
  cause : aucune requête `publish`, même parfaite, ne passe par ce chemin.
- **`chooseForm` n'exige pas d'angle confirmé.** Ajouter un refus ici défendrait contre un état que
  la boucle ne produit pas, au prix d'un **troisième** endroit qui décide de l'ordre des beats.
- **Pas de verrou de run** (deux `advance` concurrents peuvent publier deux fois). Un verrou par run
  est une capacité entière — verrou périmé, timeout, un code d'erreur de plus — et l'inventer à la
  va-vite produirait des runs bloqués que rien ne nettoie. Le local-first mono-journaliste ne
  l'exige pas.
- **`advance` peut produire un artefact puis échouer à écrire le manifeste.** Réponse : le prochain
  `advance` re-produit. L'alternative est un journal en deux phases, hors de proportion avec un
  échec d'écriture disque.
- **`init` ne restreint pas quel fichier est gelé.** L'hôte nomme sa propre donnée et pouvait déjà
  passer n'importe quels octets par `spec.data` ; `init` **lit et copie** là où `outDir` **efface**,
  et c'est l'effacement que `path-safety.ts` garde.
- **`confirm-angle` avertit d'une péremption, il ne la refuse pas.** Un refus serait faux :
  re-confirmer est légitime.
- **`suggest-intent` n'apparaît pas dans `verbs`.** `verbs` énumère les **verbes du contrat**, pas
  les commandes de la façade — aucune n'y figure.
- **La règle « ne jamais montrer l'id d'intention » n'est mécanique que côté copie.** L'affichage
  est de la présentation, hors du process ; la garde couvre la seule partie que ce dépôt écrit.
- **Déclarer une intention périme un artefact déjà produit.** Direction sûre : le coût est un
  re-produce identique, jamais une livraison périmée annoncée fraîche.
- **`--unit` exigé non blanc est un jugement éditorial, pas une contrainte de schéma.** Si un type
  légitime apparaît sans unité dicible, c'est **ce refus-là** qui devra céder — pas le schéma.
- **Pas de commande `migrate`.** L'ajouter demande de décider ce qu'on écrit dans le run d'autrui.
- **`normalizeChannel("print")` a changé de réponse** (`article-web` → `print-page`). C'est le bug
  de l'issue, pas une régression : l'ancienne réponse répondait à une demande d'impression par un
  PNG écran 72 dpi.
- **Destination et aspect ne sont PAS hachés dans `provenanceHash`** — seul le channel effectif
  l'est. Un channel EST une paire (destination, aspect) et la bijection est tenue par le round-trip
  de `channel-policy.test.ts` ; les hacher n'ajouterait aucune discrimination et re-vaudrait tous
  les hachages que la migration doit laisser stables. **Dépendance nommée : ce test de round-trip
  doit rester.**
- **On hache le ledger de sources ENTIER**, y compris un `internalRef` qui ne sort jamais. Hacher
  une projection publique ferait dépendre la fraîcheur d'une **deuxième** définition de « ce qui
  compte ». Une re-production superflue coûte une minute ; une staleness qui rate un crédit change
  ce que le lecteur lit.

### 3.4 Source et policy

- **`assertNoPrivateLeak` ne redacte que ce qui est DÉCLARÉ privé.** Une heuristique large (« tout
  chemin absolu ») ferait échouer des exports légitimes — le run-dir en contient de parfaitement
  normaux — et cette classe de garde se désamorce dès qu'elle crie au loup. La non-fuite
  **structurelle** est la vraie défense ; ceci en est la ceinture. *(À ne pas confondre avec A19,
  qui est de lui donner un appelant — pas d'élargir son heuristique.)*
- **`MIN_SEGMENT = 5`.** En dessous, un segment de chemin est un mot courant et le garde devient
  bruyant ; la référence complète reste couverte.
- **Le grounding prose est purement lexical.** Vérifier la *référence* demanderait de comprendre la
  phrase — hors d'atteinte d'une garde mécanique, et une garde qui prétend le faire ment. Elle
  attrape ce qu'elle prétend attraper : le chiffre **dérivé** que l'article ne prononce jamais.
- **`local` interdit `internalRef`.** Lui ouvrir un champ rouvrirait exactement la surface de fuite
  que la classe `local` referme.
- **Le ledger est run-level : `mode` vaut pour tout le run.** Un run est une pièce, pas un bac à
  sable partagé — une seule colonne inventée oblige à déclarer tout le run en `test`. C'est le bon
  sens de la règle, et c'est aussi son coût.
- **`attribution` existe à côté de `credit`.** Les moteurs possèdent déjà leur furniture, les
  README/zip non ; un test verrouille `credit === sourceLabel(lang) + " " + attribution` pour toute
  classe créditée.
- **`deliveryMetadata` garde `profile.source` en repli quand aucun ledger n'est fourni.** Refuser
  sans ledger transformerait une fonction pure en fonction exigeant un contexte de run. Le chemin de
  production est couvert autrement : un artefact produit sans ledger est **stale** et la livraison
  le refuse avant d'atteindre la métadonnée.
- **`whySource.sheet` deviendrait ambigu avec une seconde racine KB.** Inerte tant qu'il n'y a qu'un
  hôte ; ajouter un identifiant de racine aujourd'hui serait un champ sans lecteur.

### 3.5 Cerveau, beats, offre

- **Le garde des beats refuse « près de 40 % » quand la donnée dit 38,6 %.** L'arrondi décimal
  passe (39), l'arrondi à un chiffre significatif non. **La fermeture est d'ÉMETTRE le fait arrondi
  dans le brouillon, jamais d'assouplir le garde** — un garde qui accepte 40 pour 38,6 accepte aussi
  40 pour 44. La politique est écrite dans `lib/brain/verify-beats.ts:114-131`.
- **`suggestBeats` ne pose jamais de `turn`.** Un pivot est un jugement éditorial ; le deviner est
  exactement ce que ce slice retire. Conséquence assumée : le plein bénéfice de l'arc demande une
  action du journaliste.
- **La marche d'un bar suit l'ordre des LIGNES, pas le classement.** Contrainte du moteur
  (`resolveBarSort` passe à `"none"` dès qu'un plan existe) portée honnêtement plutôt que
  contournée : une marche par rang ferait sauter le highlight, et `narrativeBeatWarnings` le
  signale.
- **Le garde des beats ne vérifie ni la langue ni la cross-attribution**, et un `text` réécrit peut
  contredire son ancre. Le garde protège les **faits**, pas le style — hérité de `verifyOffer`, qui
  documente longuement pourquoi il ne peut pas vérifier le sens à travers les langues.
- **`draftBeats` ne re-vérifie pas ses ancres contre une donnée qui a bougé.** Une ancre disparue
  échoue **fort** au produce, pas en silence.
- **`assembleNativeSpec` rend un `Record<string, unknown>`.** `render` prend un `spec: unknown` par
  contrat d'opacité ; typer ici recréerait la frontière que le contrat de verbe efface. Pas une
  régression, pas une amélioration.
- **Les cartes restent légales sur des données sans géographie.** `Facts` ne porte aucun signal
  géographique — inventer un prédicat qu'aucune donnée ne remplit serait un faux verrou. C'est ce
  qui rend la section « Map element type FIRST » de `suggest-chart/SKILL.md` porteuse, et elle a été
  délibérément conservée pour ça.
- **Une forme peut être offerte au rang 1 et refusée au rendu par une garde de conformance.** La
  promesse « rien d'offert que la production ne sache construire » tient au grain du **moteur**, pas
  de la **spec** ; la tenir au grain spec demanderait de rendre avant d'offrir.
- **Le scrolly reste en bas de l'offre.** Il est **légal et atteignable**, marqué inconstructible, et
  le tier readiness le fait perdre : mettre en avant l'inconstructible serait pire. Il devient
  visible le jour où la branche article le rend constructible, sans retoucher `lib/brain/`.
- **La ligne réservée coûte une troisième forme distincte** (3 formes dont une en mouvement au lieu
  de 3 embarquables), et une vidéo éditorialement faible peut l'occuper. C'est le prix du choix :
  l'outil propose, le journaliste décide. Si la classe se répète en QA, le levier est une facette KB
  (`notFor` en mouvement), pas une règle en dur.

### 3.6 Livraison

- **La précédence `snippetTemplate` : le transverse gagne sur le par-capacité.** C'est désormais un
  ruling écrit (`lib/loop/deliver.ts:263-268`) — un réglage posé délibérément à l'échelle de la
  rédaction ne doit pas être masqué en silence par les réglages propres d'une capacité. *(La note L2
  jugeait l'argument contraire « réel » ; le code a tranché depuis, avec sa raison.)*
- **`publishedAt` est l'instant de signature, pas l'instant vérifié.** Réel, inoffensif : il
  enregistre un moment antérieur à la preuve, et aucun consommateur ne le lit comme un horodatage de
  preuve.
- **`serves` est une déclaration, pas une mesure.** Cloudflare pourrait un jour résoudre autre chose
  qu'`index.html` ; le test verrouille le comportement, pas la vérité du provider. Mesurer à chaque
  publish coûterait un aller-retour pour une propriété qui ne change pas.
- **Une rédaction qui veut héberger ses PNG doit nommer `embed-s3` explicitement.** C'est le sens de
  la décision cadre — l'hébergement est une propriété du **format** — et le refus l'oriente.
- **L'adressage Cloudflare `${url}/${stagedName}` reste hors scope.** Le refus par genre le rend sans
  objet ; le câbler ré-ouvrirait un chemin que la décision genre a fermé **par construction** plutôt
  que par un `${url}/index.png`.
- **`skills/splash/scripts/deploy-embed.mjs` fuit son dossier de staging** (`:122`, aucun `finally`).
  Legacy : il meurt avec sa coquille (décision 1). Le réparer investit une ligne dans un chemin qu'on
  retire.
- **`PUBLISHERS_REGISTERED` veut dire « ces ids sont revendiqués par quelqu'un »**, pas « nos
  adapters sont enregistrés ». Premier arrivé gagne — intentionnel depuis que l'enregistrement est
  non-fatal.
- **Dépublier / rétention / rollback est déféré.** Mécaniquement possible (mesuré au spike
  Cloudflare) mais **aucun beat du parcours ne le demande**.
- **CMYK, fonds perdus, PDF vectoriel.** Un PNG 300 dpi est *print-safe*, pas *press-ready*, et la
  spec le dit au lieu de le laisser croire. Passer en CMYK/PDF est un travail de moteur, pas de
  modèle de livrable.
- **« Dériver » la vidéo de la version web est refusé.** Router chaque livrable indépendamment est
  **honnête** : « dériver » suppose un concept de transformation qui n'existe nulle part dans le
  code. Coût assumé : le journaliste choisit sa forme deux fois.
- **L'a11y vidéo complète (sous-titres, transcription) est un chantier éditorial distinct.**
  `altInsight` renseigne un nom accessible, pas une piste de sous-titres.

### 3.7 Préflight, install, temps borné

- **La page juge « déjà configuré » sur le FICHIER `.env`, pas sur `process.env`.** La page existe
  pour remplir ce fichier ; juger sur l'environnement afficherait vert une clé qui aura disparu au
  run suivant. Divergence assumée avec `decorEnv`, qui juge une exécution et pas une configuration.
- **`embed-s3` n'a pas de vérificateur live.** Un HEAD sur un endpoint S3 arbitraire n'est pas un
  contrôle d'identifiants ; en inventer un donnerait un verdict que l'adapter ne partage pas.
  `capabilityVerifiable` répond `false`, et **une absence de question n'est jamais un échec**.
- **image-native s'affiche `Missing` sur une install fraîche** (le bootstrap n'installe que
  chart-native et map-native, donc `sharp` manque réellement). Vrai, donc affiché — la readiness ne
  ment pas et la remédiation est imprimée. Élargir le bootstrap est une décision de **coût
  d'installation**, pas une décision de page.
- **`install/configurator-core.ts` n'est plus qu'une coquille** (`RUNTIMES` + ré-export des
  `verify*`). `configurator.ts` est un chemin **publié** — commandes d'install déjà distribuées, deux
  bootstraps, tests de `docs/installer/` ; casser son nom pour l'esthétique du module coûterait plus
  que la coquille.
- **Les phrases de `readiness.ts` nomment encore les variables d'environnement.** Contourné à la
  source d'affichage (la page lit `missingFields` et dit « nécessite : clé MapTiler »), pas réécrit :
  pour les autres appelants (`propose`, `splash newsroom`) nommer la variable est utile.
- **Rien dans le gate ne pilote le DOM du client de la page d'install.** Cohérent avec le dépôt :
  `bun run check` est un gate typecheck + `bun:test`, et le rendu réel vit dans une voie séparée
  (`check:render`) parce qu'il traîne un navigateur. Assumé avec sa conséquence : une régression
  future ne sera pas attrapée mécaniquement.
- **Pas de timeout d'inactivité (suivi d'octets) — `fetchBounded` est un mur-à-mur.** Fermer la
  classe « aucun budget du tout » prime sur l'affiner en timeout glissant, qui demanderait un suivi de
  flux. *(La moitié « pas de budget d'upload séparé » est fermée : `DEFAULT_UPLOAD_TIMEOUT_MS` existe.)*
- **Pas de configuration de timeout par rédaction dans `newsroom.json`.**
  `capabilities[id].settings.timeoutMs` / `uploadTimeoutMs` couvrent le besoin sans ouvrir une
  nouvelle surface de setup — c'est déjà le canal de `snippetTemplate`/`prefix`.
- **`cf()` est exporté avec un 5ᵉ paramètre `base` réservé aux tests.** C'était le seul moyen de
  prouver le timeout contre un vrai serveur accroché plutôt qu'un mock. Défaut `= API` : zéro
  changement pour tout appelant de production.
- **`resolveAliasUrl` n'a pas de preuve live dédiée.** Code identique ligne pour ligne à
  `verifyServed`, qui l'a ; dupliquer le test n'aurait prouvé que la même formule deux fois.
- **`bun run check` ne lance aucune preuve complète**, et **le runner de preuves ne monte pas MinIO
  à la place de l'opérateur**. Chaque preuve monte une vraie infrastructure — minutes, pas secondes ;
  et un runner qui démarre et détruit des conteneurs est un runner qui peut détruire le mauvais. La
  moitié « on s'en aperçoit sans les lancer » est le garde de fixture toujours-actif dans chaque
  preuve, plus `tsc`.
- **La reprise d'un run legacy (#5) n'est pas rebâtie dans la coquille legacy.** Elle est livrée
  dans le substrat (`lib/loop/resume.ts`, `splash state`/`next`) ; la rebâtir dans une coquille qu'on
  remplace serait du travail jeté deux fois.

### 3.8 Certification (S4)

- **A1/A6 ne deviennent pas des checks déterministes.** Ce sont des axes sémantiques ; forcer un
  verdict mécanique est du théâtre.
- **κ n'est pas un gate, et ne le devient pas.** κ mesure la **self-consistance** d'un juge, pas sa
  justesse, tant que des labels humains n'existent pas — le pondérer ou re-scorer l'outil dessus
  fabriquerait de la confiance au lieu de la vérification. C'est le raisonnement que
  `lib/verify/taste.ts:1-14` reprend pour refuser un second modèle.
- **Le sign-off éditorial n'est pas un système de PKI** (clés enregistrées à la main dans le
  profil), pas de seuils multi-signatures au-delà de « chaque `requiredSigner` déclaré », pas d'UI
  de signature. Additif au-dessus de l'approbation LLM, jamais son remplaçant.

### 3.9 Moteurs et couleur

- **L'override d'arc carto est câblé pour choroplèthe + symbole UNIQUEMENT** ; les quatre autres
  types carto n'ont que `Beat.role`. `SKILL.md` liste **exactement** ces deux-là — c'est la leçon
  de S2-slice-1 : promettre un override sur un type non câblé coûte plus qu'il ne rapporte. Étendre
  la liste veut dire câbler d'abord. *(`skills/splash/src/validate-gate.ts:142`.)*
- **Les couleurs de séries catégorielles ne dérivent PAS de la palette maison** — Okabe-Ito reste.
  Décision CVD : une rampe dérivée d'une teinte de marque ne garantit pas la distinguabilité entre
  séries, et c'est l'invariant global du projet.
- **Il n'existe pas de vérificateur de distinguabilité CVD pour un ENSEMBLE de couleurs** — seule
  la préoccupation par-couleur (la teinte de marque) est utilisée. Un vérificateur d'ensemble est un
  design à part, pas une extension du garde existant.
- **`scrolly` importe des composants concrets de chart-native / map-native** (et map-native importe
  en retour le vocabulaire de chapitres de scrolly). C'est de la **composition de rendu**, pas de la
  primitive dupliquée : `scrolly` est le mécanisme qui hérite de la furniture du moteur hôte. La
  garde d'imports l'allowliste nommément, avec sa raison — `skills/splash/src/import-guard.test.ts:19-38`.
  Une vraie frontière de composants est un follow-up séparé, pas un durcissement de cette garde.

**87 entrées distinctes** (dont les 5 de §3.1).

---

## 4. Pile C — bloqué

Chacun attend quelque chose que ce dépôt ne contient pas.

| Quoi | Ce qui le débloque |
|---|---|
| **Le rendu final We.Publish dans un vrai navigateur** — le compose amont n'a pas de service website, et l'exécution d'un `srcdoc` de 500 Ko par `dangerously-set-html-content` est **lue** dans le code, pas exécutée | Monter `website-example` (Next.js, build nx complet sous émulation amd64 — jugé hors budget), ou une instance de rédaction réelle. **Reste à mesurer avant qu'une rédaction s'appuie dessus.** |
| **Une instance We.Publish de production** — versions réelles, rôles réels, permissions d'un compte non-admin. Mesuré sur `master` du 2026-07-24, compte `admin`, une seule version | Un accès fourni par une rédaction. |
| **Le credential We.Publish est un email + mot de passe**, pas un jeton scopé | Un jeton longue durée côté amont — W3 a **mesuré** qu'il est refusé aujourd'hui. En attendant, la doc d'install dit de créer un **utilisateur dédié à Splash**, jamais le compte admin d'un humain. |
| **Aucune preuve live Cloudflare** — `cloudflare-pages.test.ts` est intégralement hors-ligne (`Bun.serve` local), et le roster de `scripts/proofs.mjs` n'a pas d'entrée Cloudflare | Un compte / projet Cloudflare de test dédié. La preuve live du protocole a été faite une fois, le 2026-07-19, contre l'API réelle, et consignée dans la spec de l'époque — jamais rejouée. |
| **Les faits provider S3 non mesurés** — politique d'accès public par défaut d'AWS et de R2, style d'URL servi, `Content-Type` par défaut. MinIO est un vrai serveur S3, ce n'est ni AWS ni R2 | Un bucket AWS et un bucket R2 réels. **Doivent l'être avant qu'une rédaction s'appuie dessus en production.** Ils ne changent pas la forme de l'adapter — ils changent ce qu'une rédaction configure. |
| **`install/bootstrap.ps1` n'a jamais été exécuté** — seuls des tests textuels le couvrent, et la CI n'a que `ubuntu-latest` | Une machine ou un runner Windows. Le fumigène « clean Windows VM » du README reste le seul contrôle réel. |
| **La boîte print par défaut (A5 paysage 300 dpi) n'a jamais été validée avec un imprimeur** | Un retour d'imprimeur, et une décision de Rémy sur *press-ready* vs *print-safe*. |
| **`DestinationProfile` réel de la rédaction** — `resolveTargets` retombe toujours sur `CHANNEL_POLICY`, et le profil ne porte **aucune** boîte d'embed (mesuré : `palette`, `accent`, `source`, `lang`, `theme`, `signers`) | Une **décision produit** : « quel contrat d'embed une rédaction déclare-t-elle ? ». Ce n'est pas un champ à remplir — il faudrait l'inventer, décider ce que « narrow »/« wide » veulent dire pour un CMS, l'écrire dans le fichier que les journalistes remplissent, le documenter et le migrer. *(La formulation « un champ à remplir, pas un design à faire » de la tranche verify-in-journey est fausse et a été corrigée par la mesure.)* |
| **La carte-scrolly : offerte, inconstructible.** Six fiches KB carte déclarent `scrolly`, l'offre les porte marquées — mais `LOOP_BUILDABLE_ENGINES = ["chart-native"]` et le producteur `scrolly` n'enregistre aucun type. La page publique promet du map-scrolly live | Une décision produit (le modèle de facettes) **plus** `map-native`/`scrolly` dans `LOOP_BUILDABLE_ENGINES`. C'est le plus gros écart promesse-publique ↔ code du registre. |
| **`de` et `it` dans les copies éditoriales** — `lib/host/intent-copy.ts`, `lib/newsroom/ui-copy.ts:64`, `install/preflight/copy.ts:203` sont tous `{ en, fr }` | Un locuteur. « Traduire sans locuteur produirait pire qu'un repli. » Mécaniquement c'est une entrée de table par langue ; le contenu est le blocage. |
| **κ inter-juges réel sur les transcripts stockés du pilote** | Le feu vert de Rémy (petite dépense). Vit dans le harness, pas dans ce dépôt. |
| **Labels humains → κ de calibration** | Yvan et Rinny. La machinerie est construite pour les accepter ; les produire est hors périmètre. |
| **S4b-2b : faire tourner les cas matérialisés** (acteur + persona + juge par cas) | Une décision de dépense, précédée d'un **pilote 1-2 cellules** pour mesurer le coût/temps par cellule. |
| **Génération de paires de clés + enregistrement profil pour Yvan/Rinny** | Leur participation, sur le vrai run Heidi.news. |
| **`d3-bars-split` : distinction visuelle d'avec `d3-bars-grouped` non vérifiée** — la raison `deferred` est honnêtement hedgée dans le code | Un accès Datawrapper live. |
| **`bun run proofs` comme étape périodique** (avant un merge dans `main`, ou quotidienne) | Une décision de Rémy **et** une machine avec Docker, une clé MapTiler et un `.env` — ce qu'un runner CI public n'a pas. |
| **Le contrat du verbe `render` accepte un crédit arbitraire** (4ᵉ consommateur de la policy source, non couvert ; le marqueur `sourcePolicy` peut être retiré par l'hôte avant relais) | Une **décision de contrat**, pas un câblage : un `spec.source` sans ledger est-il une déclaration implicite (retour au devinage) ou un refus (rupture du contrat pour tous les hôtes existants) ? |
| **Logo et police dans le profil de rédaction** — et avec eux le threading « newsroom-profile → variable CSS de typographie », noté deux fois par les tranches carto de 2026-07-20. Vérifié : le profil ne porte **aucun** champ de typographie ; les tranches carto n'avaient retiré que le codage en dur | Une décision produit : compositing + typographie sur **tous** les producteurs. Déjà noté comme lot séparé par le design de profil de 2026-07-13. Même forme que `DestinationProfile` ci-dessus — il n'y a pas de champ à brancher, il faudrait l'inventer. |
| **La furniture `map-dw` n'est pas teintée** | Plan Datawrapper. Mesuré et consigné : `POST /v3/themes` répond `401 ADMIN_ROLE_REQUIRED`, et `metadata.publish.background` est accepté mais **ne se rend pas** (PNG render-prouvé blanc). Ce n'est pas un trou de code — l'option de fermeture par le code serait de router les rédactions à thème non-clair vers le natif au lieu de DW, ce qui est une décision produit. |

**19 entrées.**

---

## 5. Périmé — ce que la doc affirme, ce que le code dit

Ces entrées ont été écrites contre un arbre mouvant et sont **fermées ou fausses aujourd'hui**.
Elles restent dans leur document d'origine (c'est une trace datée) ; ne les rouvrez pas.

### 5.1 Fermé depuis

| Le document affirme | Trouvé à la place |
|---|---|
| `{{width}}` dans un gabarit rend `{700}` *(L1)* | Fermé. Garde d'accolades orphelines sur le **gabarit**, avec son ruling en commentaire — `lib/delivery/snippet.ts:43-59,100`. |
| `assertInvariants` ne garde pas `delivery.delivered` sans artefact *(L1, proposal-brain)* | Fermé, et correctement scopé à `delivered`, jamais à `requested` — `lib/loop/manifest.ts:763`. |
| `deliver.ts:87` déréférence `profile` sans garde ; jumeau à `:185` *(L1, L2)* | Fermé — `lib/loop/deliver.ts:76` (`decor.profile ?? {}`). **Et le jumeau annoncé à `:185` n'existe pas** : cette ligne est `elementDeliveryDir`. |
| `driver.ts:83` tronque le message de refus à 200 caractères *(L1, L2 — « à relever ou supprimer, pas à parquer une seconde fois »)* | Fermé — `MAX_EVENT_MESSAGE_CHARS = 2000` et `boundEventMessage` garde la **fin** du message (le remède), `lib/loop/driver.ts:29-40`. |
| Deux sources de vérité pour « implémenté », sans test qui les verrouille *(L1, L2 → « à faire en L3 »)* | Fermé, dans les deux sens — `lib/delivery/index.test.ts:55-59` et `:128-133`. *(Pas dans `lib/core/publishers.test.ts` comme la note l'annonçait.)* |
| Aucun `fetch` de `s3.ts` n'a de timeout ; `cloudflare-pages.ts` est identique *(L2)* | Fermé pour les deux — `fetchBounded`, `lib/core/publishers.ts:192` ; sites : `s3.ts:271,319`, `cloudflare-pages.ts:202,416`. |
| Un re-produce efface le paquet déjà livré *(decision-surface R1)* | Fermé — `deliveries/<id>/` sibling de `elements/<id>/` (`lib/loop/produce.ts:39-41`), plus `dropLegacyElementsDelivery` (`lib/loop/migrate.ts:47-53`) pour les manifestes déjà écrits. |
| La preuve live L2 `delivery-genre-e2e.test.ts` échouerait aujourd'hui au gate d'approbation *(L3 R8)* | Fermé — `walkToApproval` (`:45-75`) traverse capture → review → preview → approve au lieu d'écrire `approved` à la main. |
| `lib/host/capabilities.ts` ment : `IMPLEMENTED` ne contient pas `capture`/`review` *(verify-layer R1)* | Fermé — les quatre verbes y sont, `lib/host/capabilities.ts:71-76`. |
| **`assertInvariants` n'exige pas un `why` non vide sur l'option choisie** *(proposal-brain ; refusé et mesuré par le balayage §3)* | **Fermé — et c'est l'entrée la plus instructive du registre.** Le refus tenait à « aucune commande de façade ne phrase » ; `phrase` existe (`lib/host/cli.ts:287` → `lib/host/drive.ts:323`), donc l'invariant a été posé, `lib/loop/manifest.ts:733`, avec le raisonnement complet en commentaire au-dessus. **La raison a été retirée, pas contournée.** |
| Le gate de sign-off est infranchissable depuis un hôte *(decision-surface §5 + R4, delivery-genre-routing §7, L1 §À corriger #4)* | Fermé — commande `approve` (`lib/host/cli.ts:320` → `lib/host/drive.ts:352-370`), qui lit `requiredSigners` du décor, une seule source. |
| `lib/host/drive.ts` vise toujours `elements[0]` pour `choose-form` et `request-delivery` — « première chose à faire dans la suite » *(cadrage plan #4, cadrage spec §5)* | Fermé — `selectElement` (`lib/host/drive.ts:52-78`) et `--element` sur `confirm-angle`, `phrase`, `choose-form`, `approve`, `request-delivery`. |
| Aucune commande de la façade n'enregistre l'angle *(facade-parity §4)* | Fermé — `confirm-angle`, `lib/host/cli.ts:224`. |
| `skills/splash/SKILL.md:493` documente `confirm-angle` sans `--intent` *(intent-declared)* | Fermé — la ligne porte `--intent <id>`, les refus, et « Five NAMED slots ». |
| `provenanceHash` n'inclut pas `sources` *(source-policy R1)* | Fermé — `lib/loop/manifest.ts:354`, exactement comme R1 l'exigeait : **dans le même commit que son premier consommateur**. |
| Le placeholder « Provided by the newsroom » est toujours dans `produce.ts:115` *(source-policy R2)* | Fermé — `produce.ts:236-245` prend le crédit de `validateSourcePolicy` et refuse un run non déclaré. *(La moitié « `assertProseGrounded` / `assertNoPrivateLeak` sans appelant » reste ouverte : A19.)* |
| L'exemple `verb render` de `lib/host/README.md:463` montre le placeholder *(source-wiring R7)* | Fermé — `README.md:940` porte un crédit réel, et `:259-266` déclare la limitation au lieu de la mimer. |
| La vidéo est structurellement inoffrable *(proposal-brain, « à trancher par Rémy »)* | Fermé — ligne réservée au meilleur candidat d'un **genre** non représenté, `lib/brain/offer.ts:65-79`. |
| Rien ne fait remonter une demande de format explicite du journaliste jusqu'à `buildOffer` *(proposal-brain)* | Fermé — `el.requestedFormat`, posé à `init`, threadé par `propose.ts:63`, consommé avec trois refus distincts par `eligibility.ts`. |
| `renderedTitle` n'est pas extrait du rendu, donc le détecteur ne se déclenche jamais *(verify-in-journey R6 + §7)* | Fermé — lu dans la page à la capture, avec son `titleSource` enregistré : `lib/verify/capture.ts:87,308-330`. |
| Le correctif I4 (langue héritée du profil) est inatteignable par le chemin skill *(preflight-setup §9)* | Fermé — `export-code.mjs:70` lit `readDecorState`, et l'en-tête nomme ce résidu. *(Nuance à connaître : `profileLang` n'est délibérément **pas** injecté dans `ui` — la langue de profil reste une langue de contenu.)* |
| La CLI de production ne reçoit pas le probe browser *(runtime-readiness §5)* | Fermé — `skills/splash/src/preflight.ts:150-166`, sous la même condition que `readiness.ts`. |
| Le `{signedBy, unsigned}` du manifeste d'export n'est pas câblé dans le stdout que le journaliste voit *(s4d follow-ups)* | Fermé — `skills/splash/scripts/deploy-embed.mjs:88` et `export-code.mjs:232` impriment `EDITORIAL: signed by …`. |
| La liste de commandes de `lib/host/README.md` est peut-être périmée *(sweep #2)* | Fermé **et gardé** — `lib/host/readme-parity.test.ts` compare le dispatch réel aux titres du README. |
| `intentsFromAngle` à renommer en `suggestIntents` | Fermé par la tranche qui l'a créé. |

### 5.2 Chiffres et affirmations à corriger

| Le document affirme | Mesuré |
|---|---|
| Le bump `schemaVersion` est « bloqué par 27 fichiers écrivant `schemaVersion: 4` en dur, dont trois zones interdites » | **81 occurrences dans 39 fichiers**, dont **2 en production** (`lib/loop/init.ts:157`, `lib/loop/migrate.ts:89`). Le blocage réel est 37 fichiers de test, pas des zones interdites. |
| « Trois tests de `lib/loop` posent `approved` à la main » *(verify-layer R9, verify-in-journey §7)* | **2 échecs, 1 seule fixture** — et la ligne est `lib/loop/driver.test.ts:236`, pas `:256` comme le verrou l'écrivait. `gate-state.test.ts`, `deliver.test.ts`, `acceptance-deliver.test.ts` ne tombent pas. |
| `figuresIn` duplique `numbersIn` — deux copies *(source-policy R5)* | **Trois** : `lib/source/prose.ts:29` (exportée, contrairement à la note), `lib/brain/verify-offer.ts:99`, `lib/brain/verify-beats.ts:104`. La duplication s'est aggravée depuis la note. |
| `boxplot.md` omet un « n≈5 » jugé illustratif *(proposal-brain)* | **Faux** : le n≈5 est présent deux fois (`:11`, `:30`). Ce qui manque est **tout** bloc `limits:` sur cette fiche, donc son plancher n'est appliqué nulle part. |
| « Une seule LECTURE de `run.channel` existe (`channelForElement`), donc la dérive est décorative » *(cadrage plan #2)* | **La garde a cédé** : deux résolveurs et cinq lectures directes. Voir A6 — l'arbitrage reposait précisément sur cette unicité. |
| `verify-embed-delivery.mjs:50` passe `process.env` comme credentials | Passe désormais `decorEnv()` — `process.env` **plus** le `.env` de l'install. **Strictement plus** qu'à la note. Voir A8. |
| La carte-scrolly est inoffrable **par construction** *(proposal-brain)* | Elle est désormais **offerte**, marquée inconstructible : `eligibility.ts:130-135` filtre sur `producerForFormat` pour ne pas laisser tomber une fiche déclarant `scrolly`. Le trou n'est plus « inoffrable » mais « offerte et non buildable » — pile C. |
| « `DestinationProfile` : c'est un champ à remplir, pas un design à faire » *(verify-in-journey §7)* | **Faux, mesuré** — le profil ne porte aucune boîte d'embed et son parseur est hors frontière. Requalifié en question de design produit par la tranche taste-fires §5.1. Pile C. |
| Aucun test ne conduit `video` de bout en bout à travers `produce()` *(proposal-brain)* | Moitié fermée — `lib/loop/video-e2e.test.ts:85-97` choisit la ligne `motion` d'une vraie offre et asserte un `.mp4` réel (opt-in, `SPLASH_VIDEO_E2E=1`). Le scrolly, lui, reste hors `produce()` par construction. |

---

## 6. Décompte

| Pile | Entrées distinctes |
|---|---|
| **A — dette fermable** | 33 |
| **B — décision déjà prise** | 87 |
| **C — bloqué** | 19 |
| **Périmé** (fermé depuis, ou faux) | 24 fermés + 8 corrections de fait |

≈ **250 entrées brutes** dans ~25 documents → **139 résidus distincts encore ouverts**, dont
**33 seulement sont de la dette à fermer**.

C'est le chiffre qui répond à la question posée. « Pas de résidus si possible » n'est pas
atteignable en fermant les 250 : **63 % de ce qui est écrit comme un résidu est une décision** qui
a coûté une mesure, et 19 de plus attendent une clé, une instance ou un arbitrage humain.
**Il reste 33 choses à faire** — dont 8 tiennent en une ligne et 11 de plus sont « petit ».

Et le sens de marche est bon : sur les ~250 entrées lues, **24 s'étaient fermées toutes seules**
entre leur écriture et aujourd'hui, parce que la tranche suivante a retiré la raison qui les
tenait ouvertes. C'est le mécanisme qui marche ; ce registre existe pour qu'on sache lesquelles.

---

## 7. Où vivent les sources

Les sections d'origine, avec leur date et leur raisonnement complet :

- `docs/splash/delivery-l1-followups.md` · `docs/splash/delivery-l2-followups.md` ·
  `docs/splash/proposal-brain-followups.md`
- `docs/superpowers/specs/2026-07-24-{preflight-setup,run-manifest-resume,verb-contract-adapters}-design.md`
- `docs/superpowers/specs/2026-07-25-delivery-publishers-design.md`
- `docs/superpowers/specs/2026-07-26-{bounded-time,cadrage-deliverables,decision-surface,delivery-genre-routing,format-reach,preflight-page,source-policy,source-wiring,verify-layer}-design.md`
  + `docs/superpowers/plans/2026-07-26-cadrage-deliverables.md`
- `docs/superpowers/specs/2026-07-27-{article-beats,facade-parity,host-journey,intent-declared,l3-wepublish,proofs-run,runtime-readiness,taste-fires,verify-in-journey}-design.md`
- Fan-out moteurs / couleur / certification :
  `docs/superpowers/specs/2026-07-20-{areal-reveal-choreography,map-story-choreography-fanout,shared-core-registry-contracts}-design.md` ·
  `2026-07-21-{claim-arc-narrative,map-claim-arc-parity,strict-production-seam,deferred-render-gates}-design.md` ·
  `2026-07-22-{map-tinted-neutrals,oklch-sequential-ramp,story-accent,tinted-neutrals,s4a-flow-rubric,s4b1-coverage-analyzer,s4b2a-case-materializer,t1-lib-core-golden-tests,t1-slice-2-golden-tests}-design.md` ·
  `2026-07-23-{s4c-dimension-judges-kappa,s4d-human-editorial-signoff}-design.md`
- Les deux balayages précédents, qui restent la trace de leurs propres arbitrages :
  `docs/superpowers/specs/2026-07-27-residual-sweep-design.md` ·
  `docs/superpowers/specs/2026-07-27-residuals-2-design.md`
</content>
</invoke>
