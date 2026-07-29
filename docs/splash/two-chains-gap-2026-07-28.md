# Deux chaînes pour un même parcours — mesure de l'écart

Mesuré le 2026-07-28 sur `/Users/rmdms/Sites/Professional/splash-merge`, branche `main`, en
lecture seule. **Rien n'a été rendu, aucune suite de tests n'a été lancée, `bun run check` n'a
pas tourné** (une campagne QA de 163 cas tournait à 4 voies pendant la mesure). Tout ce qui
suit vient de la lecture du code et de scripts d'énumération. Chaque affirmation cite un
fichier et un symbole ; là où je ne peux pas trancher, je le dis.

Documents frères du même jour, qui mesurent autre chose et qu'il ne faut pas confondre avec
celui-ci : `docs/splash/capability-matrix-2026-07-28.md` (combien de formes la boucle sait
composer) et `docs/splash/what-splash-can-make-2026-07-28.md` (ce qui sort et qui est
défectueux). Le présent document ne compte pas des formes : il compare **deux couches de
décision et d'orchestration** sur le parcours d'un journaliste, geste par geste.

---

## 0. Ce que ce document mesure

Splash contient aujourd'hui **deux implémentations parallèles du même parcours**, qui partagent
les mêmes moteurs et la même base de connaissance, et qui ne diffèrent que par la couche de
décision et d'orchestration.

- **La chaîne prose** — ce que `/splash` pilote aujourd'hui, et ce que la campagne QA exerce.
  `skills/splash/SKILL.md` (1197 lignes de script d'orchestration joué par le modèle) →
  `skills/suggest-article` + `skills/suggest-chart` (également en prose) →
  `skills/splash/scripts/produce-all.mjs`. Le modèle rédige lui-même la spec dans
  `accepted.json`.
- **La boucle V2** — `lib/loop` + `lib/brain` + `lib/core/verbs`, pilotée par la CLI JSON de
  `lib/host`. Les specs sont composées par une table d'assembleurs (`lib/loop/assemble/`), les
  refus sont des `VerbResult` typés, et les gates sont du code.

L'enjeu : la classe de défaut la plus fréquente de la campagne — l'orchestrateur qui rédige une
spec à la main, ignore le refus d'un garde, et annonce « Livré » par-dessus un export qui a
planté — paraît **structurellement impossible** dans la boucle et parfaitement possible dans la
chaîne prose. Ce qui n'a jamais été mesuré, c'est si la boucle sait porter un journaliste d'un
bout à l'autre.

---

## 1. Le graphe d'appel réel

### 1.1 La chaîne prose

`/splash` (`commands/splash.md:5-6`) n'invoque qu'une chose : le skill `splash`. Le catalogue du
plugin (`skills/using-splash/SKILL.md:22-56`) ne mentionne ni `lib/loop` ni `lib/host` — la
surface offerte au journaliste est **entièrement la chaîne prose**.

Le parcours réel :

1. `skills/splash/scripts/preflight.mjs` — annonce, jamais bloquante : « ALWAYS exits 0 » (son
   propre en-tête, `:2-3`), le vrai gate vit dans `produce-all`.
2. `suggest-article` — **prose pure, zéro script** : le dossier ne contient que `SKILL.md` et
   `eval/`. Il émet un `ProposalSet` *en contexte*, pas sur disque
   (`skills/suggest-article/SKILL.md:154-177`), et lit la KB en ouvrant les fichiers à la main
   (`:116-118`).
3. `suggest-chart` — même chose : `SKILL.md` + `references/` + `eval/`, aucun script. Deux
   étages (`skills/suggest-chart/SKILL.md:53-60`) ; les candidats portent bien un `why` réel
   (`:588-590`).
4. **Le modèle écrit `candidates.json` puis `accepted.json` à la main.** Aucun code ne les
   produit — la seule occurrence d'une écriture dans le dépôt est une fixture de test
   (`skills/splash/src/render-provenance.test.ts:70`). `skills/splash/SKILL.md:719-721` le dit
   en toutes lettres : « there is no script that transforms `suggest-article`'s in-context
   ProposalSet into `accepted.json` — YOU copy the hint across here, verbatim ».
5. `produce-all.mjs` → `produceAll` (`skills/splash/src/produce-all.ts:288 L`) → les moteurs.
6. `review-gate.mjs` (3a) → `gate-render.mjs` (3b) → `export-code.mjs` (Gate 4, deux phases).

La sécurité de cette chaîne est **rattrapée en aval** : `validateAccepted`
(`skills/splash/src/validate-gate.ts:605-662`) revalide tout au niveau de la colonne
vertébrale, et `guardrail-parity.ts:1-6` explique pourquoi — « There is NO trust boundary
between the orchestrator and suggest-chart: they are the same LLM… a HAND-AUTHORED spec that
skipped suggest-chart must clear the identical bar ». C'est un aveu de conception : la spec
*est* écrite à la main, et la parade est un filtre placé après.

### 1.2 La boucle V2

`lib/host/README.md:1-8` : « `lib/host/cli.ts` is a JSON-in/JSON-out CLI over the verb contract
in `lib/core/verbs`. It is the surface a host that is not JavaScript drives: a shell recipe, an
agent CLI, a script around a local model. »

**Treize commandes**, énumérées par l'usage de sortie lui-même (`lib/host/cli.ts:436-440`) :
`verbs · state · next · init · advance · suggest-intent · confirm-angle · phrase · choose-form ·
approve · request-delivery · verb · newsroom`. Une seule enveloppe pour toutes
(`HostResponse`, `lib/host/state.ts:21-23`), trois codes de sortie contractuels
(`cli.ts:447-454`).

`lib/host/drive.ts` n'est ni un exécuteur one-shot ni une boucle interactive : c'est **une
fonction de pas d'automate** sur un répertoire de run (`advanceRun`, `drive.ts:218`), plus six
enregistreurs de décision. Chaque commande qui agit renvoie les `nextActions` recalculés dans
le même souffle (`persist()`, `drive.ts:87-105`).

La machine à états est `nextActionsForElement` (`lib/loop/manifest.ts:602-680`), premier match
gagnant :

```
!angle                          → confirm-angle      :606
!proposal                       → propose            :607
un why encore vide              → phrase             :620-622
!chosenId                       → choose-form        :623
forme inconstructible choisie   → choose-form        :637
pas de canal résolu             → confirm-aspect     :647
scrolly sans plan               → draft-beats        :668-673
un beat non écrit               → author-beats       :674
pas d'artefact / périmé         → produce            :675
livraison demandée              → capture→review→preview→approve→deliver   :678, :712-718
sinon                           → show               :679
```

Les pas **déterministes** que `advance` sait exécuter sont exactement sept
(`lib/loop/driver.ts:142-253`) : `orient · propose · produce · capture · review · preview ·
deliver`. Tout le reste tombe dans `default:` et est traité comme un tour humain.

### 1.3 Ce qui les relie — rien d'exécutable

**Aucun pont.** Aucun fichier de `skills/` n'importe ni ne lance `lib/loop` ou `lib/host` ; les
22 occurrences de `lib/loop` sous `skills/` sont toutes des commentaires ou de la prose. Rien
dans le dépôt ne lance `lib/host/cli.ts` en dehors de `lib/host/*.test.ts` et de `docs/`.

Ce qui est partagé, c'est le **substrat**, pas l'orchestration : `lib/newsroom` (decor,
langue, ui-copy — lu par `export-code.mjs:48-53` et `deploy-embed.mjs:15-17`), `lib/core/registry`
et `lib/core/verbs` (`skills/splash/src/adapters.ts:34-45`, dont le commentaire `:8` nomme
l'intersection voulue : « ONE execution path to an engine, for two callers »), et
`lib/delivery/adapters`.

La flèche inverse existe et va dans le mauvais sens : `lib/host/drive.ts:14-17` et
`lib/newsroom/decor.ts:11-16` importent `skills/splash/src/brand-profile`, et
`lib/loop/engines.ts:24` importe `skills/splash/src/register-producers` — ce qui contredit la
règle écrite dans `lib/core/channel-policy.ts:3-4` (« `lib/` must not reach into `skills/` »).
La violation est confinée à ces deux modules.

**Le seul contact écrit** est documentaire : `skills/splash/SKILL.md:577-676` décrit le contrat
de phrasing du cerveau (`lib/brain`) et une table des décisions mécaniques nommant `initRun`,
`confirmAngle`, `applyPhrasing`, `chooseForm`, `requestDelivery`, `approve` et `advance`
(`:636-644`). Mais le chemin chaud du même document (§5 PRODUCTION, `:759-763`) appelle
`produce-all.mjs` sur `accepted.json`, et **rien dans la prose ne crée jamais un run**. Le
`SKILL.md` reconnaît d'ailleurs les deux pipelines dans la même phrase (`:586-588`) : « This
pipeline is the one with a run manifest to write it onto; Stage 2's `suggest-chart` above has
none ».

---

## 2. La boucle est-elle atteignable depuis une session Claude Code ?

**Oui, techniquement — par la CLI, pas par les verbes.**

- Il n'y a **pas d'entrée `bin`** dans `package.json`. La façade s'invoque
  `bun lib/host/cli.ts <commande>`, comme dans `lib/host/journey.test.ts:6-13`.
- Le README revendique exactement ce mode d'intégration (`lib/host/README.md:1238-1252`) :
  « A CLI façade works today in Goose, and in any other agentic host that can spawn a process
  and read stdout — no protocol dependency, no server lifecycle to manage. »
- Donc si `/splash` devait piloter la boucle, il **appellerait la CLI** via Bash, pas les verbes
  directement : `state --run <dir>` pour savoir de qui est le tour, puis la commande nommée.
  C'est aussi la seule option honnête, parce que trois mécanismes n'ont **aucune commande CLI**
  (§4.1) et qu'un appel direct aux fonctions TypeScript contournerait le contrat que la boucle
  existe pour tenir.

Deux réserves de conception, à connaître avant de s'y engager :

1. **Le `message` d'un refus n'est pas de la copie journaliste.** `lib/host/README.md:1234-1236` :
   « A host that relays messages to a third party should treat `message` as diagnostic output,
   **not as user-facing copy**. » Or plusieurs questions réelles sont transportées *dans* ce
   champ (§3.4).
2. **stdout ne porte que du JSON** (`README.md:12-14`) — « Anything humans need to read (**none
   today**) would go to stderr instead ». La boucle ne parle pas au journaliste ; elle répond à
   un hôte. C'est un choix, pas un manque, mais il déplace tout le travail de voix vers
   l'appelant.

---

## 3. La comparaison, phase par phase

### Tableau de synthèse

Verdict = *la boucle fait-elle ce que la phase prose fait pour le journaliste ?*
« Meilleur » = quelle chaîne tient le mieux la garantie, pas laquelle possède la ligne.

| Phase / geste | prose | boucle | verdict | meilleur |
|---|---|---|---|---|
| INPUT — préflight, clés, capacités | `preflight.mjs`, `save-key.mjs` | `newsroom` → `capabilityReadiness` | **oui** | **boucle** |
| INPUT — ingérer un article | URL/fichier/collé | `init` gèle un `article` mais rien ne le lit | **partiel** | prose |
| INPUT — collecter une clé manquante | oui, un prompt par clé | aucune commande | **non** | prose |
| ANALYSE — trouver les opportunités dans l'article | `suggest-article` | **rien** | **non** | prose |
| CADRAGE Q1 — branche DIRECT/GUIDED | tour explicite | absent | **non** | prose |
| CADRAGE Q2 — takeaway confirmé (Gate 1b) | prose + `validateAccepted` GUARD 3 | `confirmAngle` | **oui** | **boucle** |
| CADRAGE Q2b — arc narratif confirmé | prose, `arcErrors` | `draftBeats`/`applyBeats` **injoignables** | **partiel** | prose |
| CADRAGE Q3 — table de prose (Gate 2b) | tour de confirmation | garde `prose-figure-ungrounded`, sans tour | **partiel** | prose |
| CADRAGE Q4 — source (Gate 2c) | prose + 4 gardes | `init` écrit-une-fois + `sourceQuestion` | **oui** | **boucle** |
| CADRAGE Q5 — charte maison | question prose | `loadDecor` + `NEWSROOM-PROFILE.md` | **oui** | **boucle** |
| CADRAGE Q6 — canal / aspect | prose + `assertFormatAllowed` | `channel` + `confirm-aspect` + `assertInvariants` | **oui** | **boucle** |
| PROPOSITION — candidats avec `why` | prose, `why` rédigé librement | `buildOffer` + `whySource` + `verifyOffer` | **oui** | **boucle** |
| PROPOSITION — provenance KB du `why` | instruction d'ouvrir des fichiers | `whySource.sheet` = chemin de la fiche | **oui** | **boucle** |
| PROPOSITION — veto « aucun » | `no-chart` + raison | pas de refus global ; seul l'inconstructible bloque | **partiel** | prose |
| PROPOSITION — épinglage du format | `assertFormatAllowed` au produce | `requestedFormat` + refus du cerveau + invariant | **oui** | **boucle** |
| PRODUCTION — composer la spec | **le modèle l'écrit** | table d'assembleurs, spec non injectable | **oui** | **boucle** |
| PRODUCTION — lot indéboulonnable | `produceAll`, chaque échec enregistré | un élément par `advance`, ledger d'événements | **oui** | égalité |
| GATE 3a — relecture du rendu | `review-gate.mjs`, ledger de sondes | `captureStep` + `reviewStep` | **oui** | **boucle** |
| GATE 3b — montrer avant de demander | règle en prose | `previewStep`, état de la machine | **oui** | **boucle** |
| GATE 3b — approbation | `gate-render.mjs` + hash | `approveElement`, seul écrivain | **oui** | **boucle** |
| EXPORT — choix a/b/c de la forme | `export-code.mjs` deux phases | **destinations, pas formes** ; pas de bundle source | **non** | prose |
| EXPORT — attendre la réponse | règle « WAIT means WAIT » | `requestDelivery` calcule un défaut sans tour humain | **non** | prose |
| EXPORT — placement dans l'article | `anchor` relayé | pas d'`anchor` | **non** | prose |
| Langue du dialogue | détectée au 1er message, toutes langues | `en`/`fr` depuis le profil | **partiel** | prose |
| Langue du livrable | `spec.lang` posé par `suggest-chart` | **aucun champ `lang`** | **non** | prose |
| Étape 12 — un autre format | nouvelle entrée `accepted.json` | `planDeliverables` existe, sans commande | **partiel** | prose |
| Reprise après interruption | présence de fichiers | `resumeReport` + `provenanceHash` | **oui** | **boucle** |

### 3.1 INPUT

**Préflight et clés.** La prose lance `preflight.mjs` (annonce seulement) et collecte les clés
via `save-key.mjs`. La boucle répond `newsroom` → `describeNewsroom`
(`lib/host/newsroom.ts:13-28`) → `capabilityReadiness` (`lib/newsroom/readiness.ts:48-153`), qui
va **plus loin** que le préflight : groupes d'alternatives d'env (`:65-78`), réglages non
secrets depuis `newsroom.json` (`:82-100`), dépendances npm résolues (`:102-120`), sonde du
navigateur headless Remotion avec plancher à 1 Mo (`:123-134`, `probe.ts:110-121`), et dernière
vérification live (`:137-150`, un `unreachable` ne condamne jamais une clé valide derrière un
proxy). `deliver()` rejoue la même fonction avant de publier (`lib/loop/deliver.ts:266-272`).
**La boucle est meilleure sur le diagnostic. Elle n'a aucune commande pour poser une clé** —
c'est un script manquant, pas un verbe manquant.

**L'article.** `init` accepte et gèle `input.article` (`lib/loop/init.ts:206-207`), et refuse un
run sans rien (`:114-118`). Mais l'article n'est lu qu'à un seul endroit :
`lib/loop/produce.ts:283-295`, pour ancrer des chiffres extraits de la prose. **C'est un
matériau de vérification, pas un matériau d'analyse.** Et un run *article seul* est mort-né :
`nextActions` répond `orient` (`manifest.ts:840`), et `advance` refuse
« advance: no frozen data input to orient » (`driver.ts:269`). Un journaliste qui arrive avec un
papier et sans CSV ne peut pas commencer.

### 3.2 ANALYSE — la phase qui n'existe pas dans la boucle

`suggest-article` lit l'article, en tire les affirmations chiffrées, la structure narrative, et
**où** chaque visuel sert le récit — un `anchor { paragraphIndex, quote }` par opportunité
(`skills/suggest-article/SKILL.md:129-147`).

Dans `lib/`, il n'y a **rien de tel** : pas d'`anchor` éditorial, pas de `paragraphIndex`, pas
de notion d'opportunité (les seuls `anchor` de `lib/loop` sont les ancres de beats,
`manifest.ts:183`). `orient()` (`lib/loop/orient.ts:19`) ne profile que le CSV : colonnes,
colonnes numériques, nombre de lignes, plus un `geo` éventuel — et répond honnêtement
`supportsPoint: false` avec une note quand il n'y a rien à tracer (`:33`, `:40`).

**C'est le manque le plus large de la boucle, et ce n'est ni un verbe ni un champ : c'est un
étage entier.** La boucle part d'un jeu de données ; la chaîne prose part d'un article. Or la
promesse publique et la bourse partent d'un article.

### 3.3 CADRAGE

**Q2 — le takeaway (Gate 1b).** La prose l'obtient par discipline, puis le rattrape :
`validateAccepted` fait échouer une proposition sans `confirmedTakeaway` (GUARD 3,
`validate-gate.ts:611-612`) et deux propositions du même lot au takeaway identique au bit près
(GUARD 3b, `:613-614`). La boucle en fait une **écriture** : `confirmAngle`
(`lib/loop/angle.ts:73`) refuse un takeaway vide, un alt-text vide (WCAG 1.1.1), une unité
vide, un intent vide ou hors vocabulaire (`:78-110`), via un unique helper `required()`
(`:55-61`) pour que les quatre refus ne dérivent pas. Cinq emplacements NOMMÉS, jamais un champ
que l'appelant désigne — c'est ce qui empêche la commande d'être un « écris n'importe quelle
prose n'importe où ». **La boucle est meilleure : la prose peut oublier le gate, la boucle ne
peut pas écrire l'élément sans lui** (`nextActionsForElement:606`).

L'intent est en plus posé comme une question éditoriale, pas technique :
`lib/host/intent-copy.ts:6-7` — « A journalist is never asked "is your intent part-to-whole?" ».
`suggest-intent --takeaway <s>` renvoie un vrai objet question
(`lib/host/suggest-intent.ts:22-31`), le seul du système.

**Q2b — l'arc narratif.** La prose propose un plan `establish → build+ → [turn] → payoff`, le
journaliste confirme / retouche / oppose son veto, et la forme de l'arc est vérifiée fail-loud
(`arcErrors`, `skills/chart-native/src/chart-story.ts`). La boucle a le même dispositif, mieux
découpé : `draftBeats` (`lib/loop/beats.ts:45`) rédige le plan avec **chaque affirmation vide**
(`withPlan` écrit `text: ""`, `:118`, en gardant un `draftText` de départ), le journaliste
écrit, et `verifyBeats` (`lib/brain/verify-beats.ts:52`) vérifie les ids, le compte, l'ordre
exact, la forme de l'arc et **l'ancrage de chaque chiffre** dans les faits du beat. Le rôle
n'est jamais deviné (`beats.ts:157-160`). Et un beat non écrit bloque le produce
(`produce.ts:172-178`) *et* l'écriture du manifeste (`manifest.ts:1015-1019`).
**Sauf que rien ne peut l'appeler** — voir §4.1.

**Q3 — la table de prose (Gate 2b).** La prose en fait un tour de confirmation explicite. La
boucle a une garde plus forte sur le fond (`prose-figure-ungrounded`, `produce.ts:310-320`, plus
le refus d'un `prose` sans article gelé `:282-288`) mais **aucun tour où le journaliste voit et
valide la table reconstruite**. Champ manquant côté boucle : un équivalent de `confirmedTable`.

**Q4 — la source (Gate 2c).** La prose la traite par quatre gardes
(`placeholderSourceReason`, `sourceNamePreservedReason`, `sourceUrlFidelityReason`,
`droppedSourceHintWarning` — `skills/splash/src/source-guard.ts`), dont la dernière n'est
qu'un avertissement. La boucle en fait une **condition d'existence du run** : `sources.data`
s'écrit exactement une fois, à `init`, et aucun pas ultérieur ne peut l'ajouter
(`lib/loop/init.ts:144-161`) ; `assertSourceLedger` tourne avant qu'un octet soit écrit
(`:169-178`) ; et `produce` refuse une source non déclarée (`produce.ts:232-239`). Mieux : la
question est **posée**, dans la langue de la rédaction, et transportée comme message de refus
(`lib/host/drive.ts:175-197`, copie fr/de/it/en dans `lib/newsroom/ui-copy.ts:109-114`).
**La boucle est nettement meilleure.**

**Q5 — la charte maison.** Les deux lisent `NEWSROOM-PROFILE.md`. La boucle l'expose comme un
document unique au hôte (`describeNewsroom`) et sépare proprement lecture et écriture
(`decor.ts:104-105` : « Only the install's own root may be written to. An explicit dir is a
read. »). La génération de la charte depuis le site (`lib/newsroom/charter.ts`,
`charter-fetch.ts`, `profile-write.ts`) n'est **câblée que par la chaîne prose**
(`skills/splash/scripts/propose-charter.mjs:26-33`) — aucune sous-commande `charter` n'existe
dans `cli.ts`.

**Q6 — le canal.** La prose épingle le canal dans `accepted.json` et le revérifie au produce ;
un `channel` absent retombe sur le permissif `article-web`
(`skills/splash/src/producer-spec.ts:31-34`). La boucle porte le canal sur le manifeste
(`manifest.ts:346`), ajoute un tour `confirm-aspect` quand la destination a plusieurs formes
(`nextActionsForElement:647`, `confirmAspect`, `deliverables.ts:244-258`), et **refuse
l'écriture** d'un manifeste dont le format n'est pas légal au canal résolu
(`assertInvariants`, `manifest.ts:941-958`). Un canal absent n'y est pas permissif : il est un
tour dû.

### 3.4 PROPOSITION

**Les candidats et leur `why`.** C'est l'écart le plus net en faveur de la boucle, et il est
structurel. Le cerveau ne rédige pas : `buildOffer` (`lib/brain/offer.ts:42`) rend des
`OfferOption` dont le `why` est **délibérément vide** (`lib/loop/propose.ts:80-86`) et qui
portent un `whySource { sheet, fragments, facts }` (`offer.ts:19-33`) où

- `sheet` est le **chemin de la fiche KB** (`offer.ts:94`, depuis `TypeSheet.sheetPath`,
  `lib/brain/typology.ts:89-93` : « the path a journalist or reviewer follows to go read the
  source ») — c'est le seul pointeur de provenance KB de tout le système ;
- `fragments` sont les phrases `bestFor`/`notFor` de cette fiche, verbatim (`offer.ts:97`),
  « the ONLY prose the model may draw on » (`:95-96`) ;
- `facts` sont les quatre nombres calculés sur les données réelles (`:98-105`).

Ensuite `verifyOffer` (`lib/brain/verify-offer.ts:42`) **jette** sur un id non offert, un id
écarté présenté comme offert, tout changement de la liste ou de son ordre, et **tout chiffre du
`why` qui n'est pas dans `whySource`** (`:67-76`). Et l'invariant du manifeste refuse d'écrire
une option choisie dont le `why` est vide (`manifest.ts:983-986` — « an option nobody phrased
was never shown to anyone »).

Côté prose, `suggest-chart` exige aussi un `why` par candidat
(`skills/suggest-chart/SKILL.md:588-590`) et exige la lecture des fiches KB — mais **par
instruction**. Rien ne vérifie qu'un chiffre du `why` vient des données, ni que la fiche a été
ouverte. **La boucle est meilleure, et l'écart est celui entre une consigne et une preuve.**

**Le veto.** La prose autorise « aucun » par opportunité, ce qui émet un `no-chart` avec sa
raison (`skills/splash/SKILL.md:427-429`). La boucle n'a **pas** ce chemin : `chooseForm`
(`lib/loop/choose.ts:21`) exige un id de l'offre, et le seul refus dur est la forme que rien ne
sait construire (`:67-72`). Le choix explicite est assumé
(`choose.ts:60-63`) : une marque de disponibilité est un avertissement que le journaliste peut
outrepasser — « Refusing them would turn the mark into a veto and take the decision back from
the journalist ». Bon principe, mais il manque le **« aucune de ces formes »**, et la porte de
sortie (`revise`, `lib/loop/revise.ts:12`) n'a aucun appelant de production (§4.1).

**L'épinglage du format.** La prose épingle un `VisualFormat` unique et le revérifie
(`assertFormatAllowed`). La boucle enregistre le signal explicite du journaliste **avant** de
bâtir l'offre (`requestedFormat`, `manifest.ts:228`), le cerveau filtre l'offre entière dessus
et nomme un refus quand le canal ne le porte pas
(`lib/brain/eligibility.ts:94-101`, `:229-237`), et l'invariant du manifeste refuse le format
illégal à l'écriture. **La boucle est meilleure : le signal du journaliste est un état, pas une
consigne.**

### 3.5 PRODUCTION — l'écart qui motive la question

**C'est ici que la classe de défaut de la campagne disparaît.**

Le manifeste de run **n'a pas de champ `spec`**. La seule chose que le journaliste choisit est
une `FormOption` (`id`, `nativeType`, `engine`, `format`, …, `manifest.ts:142-161`), et
`produce.ts:265` lie la spec native exclusivement à `assembled.value`, c'est-à-dire à la sortie
de la table d'assembleurs (`assemblerFor`, `lib/loop/assemble/index.ts:241-259`). Un
`assemblerFor` qui rend `undefined` est un arrêt dur (`produce.ts:258-262`). Et ceinture et
bretelles : `assembleScrolly` revérifie lui-même sa liste de types
(`lib/loop/assemble/scrolly.ts:58-67`) parce qu'un slug Datawrapper `d3-bars` était déjà tombé
sur la piste chart, avait passé la validation et **avait planté au build**.

**Une nuance importante, en défaveur de la boucle : par la façade, une spec est parfaitement
rédigeable à la main.** `bun lib/host/cli.ts verb render` lit une charge utile JSON arbitraire
sur stdin, et `spec` y est **opaque par invariant I3** (`lib/core/verbs/types.ts:12`,
`lib/core/verbs/index.ts:16-18`). Trois choses limitent les dégâts : `publish` est refusé à la
façade (`HOST_ONLY_VERBS`, `lib/host/capabilities.ts:31`, `cli.ts:400-405`) ; un render nu ne
porte aucune provenance, donc `deliver()` ne peut pas le publier (`render.ts:60-63`) ; et la
réponse est **estampillée** `RENDER_SOURCE_POLICY_MARK` (`lib/host/source-mark.ts:25-34`,
`cli.ts:421-430`) donc elle ne peut pas passer pour vérifiée. C'est une porte assumée et
marquée, pas une fuite.

Le contrat des verbes lui-même est solide : `VerbResult<T>` est une union discriminée
(`types.ts:31-32`), invariant **I1** « a verb NEVER throws — a non-JS host has no catch »
(`:29-30`), appliqué par des try/catch de corps entier
(`index.ts:46-83`, `render.ts:39-224`, `publish.ts:55-85`). En TypeScript, lire `.value` sans
narrower ne compile pas. À la frontière JSON, rien n'oblige un hôte à lire `ok` — le refus est
une **donnée**, pas un flot de contrôle.

### 3.6 GATE 3 — capture, relecture, aperçu, approbation

La prose énonce la règle « on ne fait pas valider ce qu'on n'a pas montré » et la répète six
fois dans son `SKILL.md` ; le filet est une vérification a posteriori du harnais QA
(`check:render-shown-before-validation`, `SKILL.md:1162`).

La boucle en fait **quatre états de la machine** (`verificationChain`, `manifest.ts:712-718`) :

- `captureStep` (`lib/loop/verify.ts:81`) ouvre le vrai livrable à la boîte où il sera publié.
  Une capture impossible (aujourd'hui la vidéo) est enregistrée comme **manque déclaré**
  (`unsupported`, `:140-149`), jamais comme réussite.
- `reviewStep` (`:172`) refuse « nothing has been captured for this artifact yet — there is no
  rendered evidence to review » (`:180-183`), et code en dur son honnêteté :
  `independentSemanticReview` répond toujours `"unavailable"`, jamais `pass` (`:166-170`).
- `previewStep` (`lib/loop/preview.ts:130`) résout le livrable **depuis le manifeste**, le
  re-hash, refuse un PNG à la place d'un interactif (garde de genre, `:174-178`, `:200-204`),
  refuse des octets qui ont bougé sur disque (`:218-222`), et écrit lui-même
  `presentedAs: "opened" | "path-printed"` avec sa raison de repli — **jamais fournie par
  l'appelant** (`:67-70`).
- `approveElement` (`manifest.ts:1119`) est le **seul écrivain sanctionné** de `approved`, et il
  exige couverture de relecture, couverture d'aperçu, aucun finding bloquant ouvert et chaque
  avertissement acquitté.
- `deliver` **rejoue** l'approbation contre le sujet vivant (`deliver.ts:135-168`) : une
  approbation qui couvrait `X` alors que l'embed mesure maintenant `Y` est refusée.

Deux honnêtetés à noter. D'abord, sans `requiredSigners` déclarés, **un modèle peut fabriquer
l'approbation par nom** — `verifySignoff` rend `ok(null)` dès que la liste est vide
(`lib/loop/approve.ts:272-273`, « the gate is opt-in »). Ce qu'il ne peut pas fabriquer, c'est
la cérémonie. Ensuite, côté prose, `approvedHash` est explicitement **audit seulement, pas
enforcement** (`skills/splash/src/gate.ts:4-10`) — le même trou, sans la cérémonie autour.

**La boucle est meilleure, franchement.**

### 3.7 EXPORT — le second grand manque de la boucle

La prose propose trois formes et attend : `export-code.mjs` phase 1 n'émet que la proposition et
**ne construit rien** ; phase 2 (`--form <html|code-source|embed>`) construit la seule forme
choisie, sous `assertDelivered`. La règle « WAIT means WAIT » y est écrite et outillée
(`skills/splash/SKILL.md:981-992`).

La boucle **n'a pas de menu a/b/c**. Elle a un axe orthogonal, plus riche côté hébergement et
plus pauvre côté forme :

- `Publisher` porte `kind: "hosted" | "package"`, `serves: VisualFormat[]`, `sources:
  ("file"|"hosted")[]` (`lib/core/publishers.ts:136-149`) ;
- le journaliste choisit une **liste d'ids de destination** (`delivery.requested: string[]`,
  `manifest.ts:285`) parmi `zip`, `embed-hosted`, `embed-cloudflare`, `embed-s3`, `embed-cms`
  (We.Publish), `embed-fly` (`lib/newsroom/capabilities.ts`) ;
- le défaut est calculé par `defaultDestinationsFor` (`lib/delivery/routing.ts:42-47`).

Ce qui manque, précisément :

1. **La forme « code source »** — le bundle React/Vite reconstructible — **n'existe pas dans la
   boucle**. Le `zip` emballe l'artefact **tel que les moteurs le produisent**, self-contained,
   plus deux READMEs localisés (`lib/delivery/adapters/zip.ts:1-7`, `lib/delivery/readme-copy.ts`).
   Le générateur du bundle (`export-source.mjs`, `bundle-source.mjs`) n'est câblé que côté prose.
2. **Le tour d'attente n'existe pas.** `requestDelivery` calcule volontiers un défaut sans aucun
   tour humain (`lib/loop/request-delivery.ts:68-100`). La consigne « never choose for them —
   even when only one form is possible, the journalist confirms it » vit dans
   `lib/newsroom/ui-copy.ts:37-38`, dont **le seul consommateur de production est
   `skills/splash/scripts/export-code.mjs`** : aucun module de `lib/loop` ne la lit. C'est
   exactement la violation nommée de la campagne, et la boucle ne la garde pas.
3. **Le placement dans l'article** (« à placer autour du §2, près de … ») n'a pas d'équivalent :
   pas d'`anchor` dans le manifeste, corollaire du §3.2.

Ce que la boucle a en plus, et que la prose n'a pas : **S3 et We.Publish** comme destinations de
première classe, une vérification de compatibilité destination × genre × format
(`deliver.ts:293-313`), et un enregistrement de livraison portant son propre
`deliveredProvenanceHash` (`manifest.ts:298`).

### 3.8 Ce qui n'est pas une décision visuelle mais qui décide

**La langue du dialogue.** La prose la détecte au premier message et conduit **tout** dans cette
langue (`skills/splash/SKILL.md:12-13`, `commands/splash.md:13`), sans limite de langues. La
boucle la résout depuis la rédaction, pas depuis le journaliste : `resolveLanguage`
(`lib/newsroom/language.ts:23-33`) sépare proprement `ui` (interface, `newsroom.json`) et
`content` (livrable, `NEWSROOM-PROFILE.md`), et `readOnlyUiLanguage` (`lib/host/state.ts:113-119`)
la lit sans jamais écrire. Mais les tables de copie sont inégales : question d'intent
**en/fr seulement** (`lib/host/intent-copy.ts:151`, de/it explicitement différés `:20`),
question de source et sign-off en/fr/de/it (`lib/newsroom/ui-copy.ts:109-114`, `:189-194`),
proposition d'export en/fr (`:65`). Une rédaction italienne reçoit donc une question de source
en italien et une question d'intent en anglais.

**La langue du livrable.** C'est le manque le plus large, et il est structurel : `ProductionBrief`
(`lib/core/production-brief.ts:51-68`) — le contrat que reçoit *chaque* assembleur — **n'a pas de
champ `lang`**. `produce.ts:211-213` l'assume en toutes lettres : « the loop carries no language
axis yet… Inventing one here would put a French qualifier under an English "Source:" ». Et
`lib/loop/assemble/dw-chart.ts:53-55` répète l'absence. Le fil de langue existe pourtant
(`decor.ts:118` → `DeliveryProfile.lang` → `lib/delivery/metadata.ts:83`) mais **il s'arrête à
l'emballage de livraison**. La machinerie de localisation du mobilier existe aussi
(`lib/core/i18n-furniture.ts`, `lib/core/locale.ts`) — la boucle ne la nourrit pas.

Côté prose, `suggest-chart/SKILL.md:33-40` **exige** que le modèle pose `spec.lang` sur la spec
émise, ce qui déclenche le formatage locale des nombres et du mobilier (« Source : » / « Quelle: »
/ « Fonte: »). Ce n'est qu'une consigne, mais elle atteint le lecteur. **La prose gagne, et de loin.**

**La reprise.** La prose déduit sa position de la présence des fichiers
(`skills/splash/SKILL.md:1082-1088`). La boucle a `resumeReport` (`lib/loop/resume.ts:185`), en
lecture seule, qui revérifie les hashes des entrées gelées, l'état de chaque artefact
(`"none"|"ok"|"missing"|"tampered"|"stale"|"hosted"`) et rejoue **la même** `approvalDecision`
que le gate. Plus `provenanceHash` (`manifest.ts:504-547`) : changer l'angle, le canal, la
source ou le plan périme mécaniquement l'artefact. **La boucle est meilleure.**

---

## 4. Les trois blocages connus, et lequel mord le premier jour

### 4.1 Trois mécanismes complets et injoignables — dont un qui **bloque** un run

Ce n'est pas un manque de verbe : les verbes existent, testés. C'est un manque de câblage.

| Mécanisme | Existe | Appelants de production | Commande CLI |
|---|---|---|---|
| `draftBeats` (`lib/loop/beats.ts:45`) | oui | **aucun** | **aucune** |
| `applyBeats` (`lib/loop/beats.ts:130`) | oui | **aucun** | **aucune** |
| `revise` (`lib/loop/revise.ts:12`) | oui | **aucun** | **aucune** |

Et pour `draft-beats`, ce n'est pas seulement inatteignable : **c'est un blocage**.
`nextActionsForElement` répond `["draft-beats"]` pour un scrolly de piste chart sans plan
(`manifest.ts:668-673`) ; `advanceStep` **n'a pas de `case "draft-beats"`** — il tombe dans
`default:` et rend `{ ran: null }` (`driver.ts:232-252`) ; `cli.ts:436-440` n'expose aucune
commande. Un tel run répond éternellement « c'est au journaliste de jouer » sans qu'aucun geste
existe.

Le code documente lui-même la contradiction. `manifest.ts:391-393` affirme « `draft-beats` is
DETERMINISTIC — the driver runs it, like propose ». `driver.test.ts:1095-1100` explique
pourquoi il ne le fait pas — « scrolly is not in LOOP_BUILDABLE_ENGINES » — **et cette raison
est périmée** : les six moteurs sont aujourd'hui dans la table (`lib/loop/assemble/index.ts:46-131`,
`LOOP_BUILDABLE_ENGINES = Object.keys(ASSEMBLERS)`, `buildable.ts:61-62`), ce que
`manifest.ts:652-655` constate explicitement (« scrolly is now in LOOP_BUILDABLE_ENGINES… so
`draft-beats` IS reachable through this function »). Le bras du driver est devenu un blocage le
jour où le scrolly a atterri. `lib/loop/multi-deliverable-e2e.test.ts:112-113` classe encore les
deux actions `"unreachable"`.

### 4.2 `image-native` : le refus est inconditionnel

`imageWalkMark` (`lib/brain/eligibility.ts:413-418`) marque `image-native` `missing` **sans
regarder quoi que ce soit** — un `if (engine !== "image-native") return null;` puis la marque.
La cause est un champ absent : `EligibilityInput` (`:47-59`) ne comporte pas les photographies
déclarées du run, alors qu'elles existent sur le manifeste (`images`, `manifest.ts:350`) et sur
le brief (`ImageInput`, `production-brief.ts:42-49`) ; et `lib/loop/propose.ts:59-71`, unique
appelant de production de `buildOffer`, ne les passe pas.

Conséquence mesurée par le fichier lui-même (`:390-403`) : `missing` est le pire rang de
`SEVERITY` (`:302-307`), le tri le place sous tout candidat prêt (`rank.ts:52-55`), et l'offre est
plafonnée à 3 lignes (`offer.ts:40`) — donc « Marked, in practice, means UNREACHABLE here — not
merely flagged ». `image-native` ne déclare qu'un format (`scrolly`) : c'est **tout le moteur**.
Le suivi est écrit à la ligne suivante : « the day `eligible()` is given the run's declared
inputs, this mark should fire only for a run that has none ». **Champ manquant, pas verbe
manquant.**

### 4.3 La piste carte refuse un arc rédigé

`assembleScrolly` refuse un plan `beats` rédigé sur la piste carte
(`lib/loop/assemble/scrolly.ts:74`, `MAP_TRACK_BEATS_REFUSAL`), et `manifest.ts:663-664` en donne
la raison : « A MAP scrolly needs no plan at all (it derives its own walk from the data, and
assembleScrolly refuses an authored one) ». Côté boucle, c'est **un refus honnête** : le run
part directement au produce, sans feu vert menteur.

C'est la chaîne prose qui a le défaut correspondant, documenté ailleurs :
`what-splash-can-make-2026-07-28.md` §D1 (l'arc confirmé jeté sur les cartes, remplacé par un
classement inventé, correction sur `fix/scrolly-map-arc-beats` non fusionnée) et §D2 (cinq
familles où le plan est validé puis silencieusement ignoré). **Sur cet axe précis, la boucle
ment moins.** Ce qu'elle perd, c'est la capacité : `canDraftBeats` (`lib/brain/beats.ts:104`) ne
couvre que `line` et `bar` — 2 des 11 types hébergés par le scrolly
(`capability-matrix-2026-07-28.md` §5.1, « Hosted ≠ authorable: 11 vs 2 »).

### Lequel mord le premier jour ?

Dans cet ordre, et l'ordre compte.

1. **L'absence d'ANALYSE + le run article-seul mort-né (§3.2).** C'est le premier geste du
   parcours réel — un journaliste de Heidi.news arrive avec un papier. La boucle n'a pas d'étage
   qui lit un article, et un run sans CSV échoue au premier `advance`
   (`driver.ts:269`). Le journaliste ne franchit pas la porte.
2. **La langue du livrable (§3.8).** Elle touche **tout ce que le lecteur lit**, sur chaque
   artefact, pour chaque rédaction non anglophone — c'est-à-dire toutes celles du projet. Aucune
   correction en cours ; la rupture est un champ absent sur `ProductionBrief`.
3. **Le blocage `draft-beats` (§4.1).** Il ne mord qu'au moment où une forme narrative est
   choisie — mais le chart-scrolly est une **promesse publique** de la page Splash, et le run se
   fige sans message d'erreur exploitable, ce qui est le pire mode d'échec possible.

`image-native` (§4.2) et l'arc carte (§4.3) mordent plus tard et plus localement : le premier
seulement si le journaliste apporte des photographies, le second seulement s'il rédige un arc.
Le manque de menu a/b/c à l'export (§3.7) mord à la toute fin, et il est réel, mais un `zip`
localisé livré au bon endroit reste un livrable honnête — ce n'est pas un blocage.

---

## 5. Ce que ce document n'a pas pu mesurer

- **Le comportement à l'exécution.** Tout ci-dessus est statique : lecture de code, tables de
  dispatch, invariants. Rien n'a été rendu, aucun run n'a été créé, aucun test n'a tourné.
  Je n'ai pas *observé* le blocage `draft-beats` ; je l'ai déduit de trois lectures concordantes
  (`manifest.ts:668-673`, `driver.ts:232-252`, `cli.ts:436-440`) et de l'absence d'appelant hors
  tests. Un run réel de scrolly de piste chart le confirmerait en une minute.
- **Le contenu exact de `CaptureSlotSchema` / `ReviewSlotSchema`** (`lib/verify/schema.ts`) :
  lus par référence depuis le manifeste, pas énumérés.
- **Si un hôte externe (une recette Goose hors dépôt) pilote déjà la façade.** Rien dans ce
  dépôt ne le fait ; je ne peux pas voir au-delà.
- **La qualité éditoriale comparée des deux offres.** Je mesure ce que chaque chaîne *garantit*,
  pas laquelle propose le meilleur graphique.

---

## 6. Recommandation

La boucle gagne partout où la décision est **mécanisable** — le takeaway, la source, le canal,
la provenance KB du `why`, la composition de la spec, et surtout toute la chaîne
capture → relecture → aperçu → approbation → livraison, où elle transforme en états de machine
sept règles que la prose ne peut qu'énoncer et rattraper après coup ; c'est exactement la classe
de défaut la plus coûteuse de la campagne, et elle y est structurellement impossible. Mais elle
perd sur tout ce qui touche à la **rencontre avec le journaliste** : elle ne sait pas lire un
article (§3.2 — pas un verbe manquant, un étage entier), elle laisse partir chaque livrable en
anglais (§3.8 — un champ `lang` absent sur `ProductionBrief`), elle bloque net dès qu'un scrolly
narratif est choisi (§4.1 — un bras de `switch` et une commande CLI), elle n'offre pas le bundle
source ni le tour d'attente à l'export (§3.7), et son dialogue ne parle que deux langues quand
la prose les parle toutes. Aucun de ces manques n'est un problème de conception : trois sont du
câblage (un `case`, deux commandes CLI, un champ threadé de `resolveLanguage` jusqu'à
`ProductionBrief`), un est un champ à passer à `eligible()`, et un seul — l'ANALYSE d'article —
est un vrai chantier. **Ma recommandation est donc de ne pas choisir entre les deux chaînes
mais de choisir laquelle est la surface et laquelle est le socle : garder la chaîne prose comme
peau conversationnelle — c'est elle qui lit l'article, détecte la langue, mène le questionnaire
et rend la voix — et faire descendre sous elle, phase par phase, les gates de la boucle en
commençant par ceux qui n'ont besoin d'aucun article** (source, angle, canal, offre du cerveau,
puis toute la chaîne Gate 3), **plutôt que de tenter un basculement complet vers un hôte JSON
qui ne saurait pas encore accueillir un journaliste au premier message.** Le pont n'existe
aujourd'hui à aucun endroit du code (§1.3) alors que les deux chaînes partagent déjà le registre
des moteurs, le decor de rédaction et les adaptateurs de livraison : c'est ce pont, et non un
troisième parcours, qui est le prochain objet à construire.
