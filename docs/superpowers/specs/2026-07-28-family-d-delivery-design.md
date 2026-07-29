# Spec — La livraison dit OÙ (sous-projet D du registre de sweep)

> **Statut :** conçu, non implémenté.
> **Origine :** `docs/splash/sweep-2026-07-28-triage.md` — famille D du § 8 (D03, D09).
> **Langue :** prose FR, identifiants et code en anglais (standard non négociable).
> **Dépendance :** la famille A (`2026-07-28-refusals-that-bite-design.md`) rend les refus terminaux.
> Tant qu'elle n'est pas faite, **tout garde ajouté ici reste consultatif** — un contrôle de plus
> qu'un orchestrateur libre peut ignorer.

---

## 1. Deux défauts, une petite famille, un journaliste touché à chaque livraison

| | | |
|---|---|---|
| **D03** — la livraison ne dit jamais **où** placer l'élément dans l'article | **24 / 83** | mécanique, *nouveau* |
| **D09** — l'intro du scrolly est identique au takeaway | 1 / 83 | mécanique |

D03 est le **troisième défaut le plus prévalent du sweep**, et il est neuf. Il ne casse rien : le
fichier est bon, il arrive, il est publiable. Le journaliste reçoit simplement un visuel **sans
savoir où il va** — dans un article qu'il a lui-même écrit, et dont Splash a lu la structure.

D09 est un cas unique, mais son mécanisme est déterministe (§ 4) : il ne dépend pas d'une
formulation malheureuse, il tombe **par construction** dès qu'un scrolly n'a pas de phrase
d'ouverture distincte de sa chute.

---

## 2. Pourquoi la capacité existe par moments — et n'est jamais tenue

Lors d'un test manuel, splash a spontanément dit « autour du §5, près de tel passage ». Il ne
s'agit donc pas d'un savoir absent. La chaîne du placement existe **de bout en bout, en trois
maillons — et les trois sont en prose. Aucun n'est du code.**

**① L'ancre est calculée.** `skills/suggest-article/SKILL.md:124` (étape 6 de la procédure) :
`anchor = { paragraphIndex, quote }`, décrite comme *advisory — the journalist places the visual*.
La forme émise est à `:158`. **Il n'existe aucun symbole, aucune fonction, aucun script** qui la
produise : c'est une sortie de prompt. La seule déclaration typée dans le code livré est celle du
scoreur d'éval, `skills/suggest-article/eval/score.ts:5`.

**② L'ancre est recopiée.** `skills/splash/SKILL.md:737-740` demande à l'orchestrateur de la
copier au §5b dans `accepted.json`. Le champ **existe** :
`skills/splash/src/producer-spec.ts:61` — `AcceptedProposal.anchor?: { paragraphIndex?, quote? }`,
avec dans son propre commentaire (`:54-60`) la raison d'être : *« Carried here so EXPORT can tell
the journalist, at hand-over, where to place each delivered element »*, et l'aveu qui compte —
*« prose-enforced; no script transforms the in-context ProposalSet »*.

**③ Le placement est énoncé.** `skills/splash/SKILL.md:924-932` porte la règle, en toutes lettres,
avec la phrase-modèle et le cas multi-éléments. *(Le registre cite `SKILL.md:602` : cette ligne
correspond à la baseline du sweep, la règle a bougé depuis — non vérifié à quelle révision `602`
correspondait.)*

**Et personne ne lit jamais le champ.** C'est le fait central de cette spec, et il est mesuré :

| étape | l'ancre y est-elle ? | preuve |
|---|---|---|
| `AcceptedProposal` (`accepted.json`) | **déclarée seulement** | `skills/splash/src/producer-spec.ts:61` |
| `ProposalResult` / `ProduceReport` (`report.json`) | **non** | `producer-spec.ts:81-113` et `:115-129` — aucun champ |
| `export-code.mjs` | **jamais ouverte** | le script lit `accepted.json` uniquement pour le hash de provenance de chaîne (`:197`) |
| dossier livré | **absente** | aucun fichier écrit ne la mentionne |
| `ProductionBrief` (boucle V2) | **n'a jamais existé** | `lib/loop/assemble/brief.ts` — `briefFor()` ne rend ni ancre ni paragraphe |
| `DeliveryMetadata` (ce qu'un publisher voit) | **non** | `lib/core/publishers.ts:14-24` — `title, altText, source, credit, lang, width, height` |

Donc : **l'ancre n'est pas perdue par un bug de câblage — elle n'est câblée nulle part.** Elle
vit dans le contexte du modèle, et nulle part ailleurs. Elle survit quand la conversation est
courte et s'évapore quand elle ne l'est pas. **C'est un défaut de mémoire, pas de connaissance** —
ce qui explique exactement le motif observé : tenue spontanément dans un test manuel court,
manquée 24 fois sur 83 dans des parcours réels où la livraison arrive des dizaines de tours après
la lecture de l'article.

**Le dépôt nomme déjà cette classe.** `skills/splash/tests/skill-doc-parity.test.ts:227-240` :

> *« Survivor rules — the load-bearing prose that has NO mechanical backstop. Every guard
> documented in `docs/splash/guardrails.md` is enforced in code; these rules are NOT — only the
> SKILL.md prose stops the miss they guard. »*

et le test du placement y vérifie… **que la phrase est toujours dans le document**. C'est
l'intégralité de l'exécution. C'est le défaut de la famille A, sur un autre objet.

**Un précédent existe pourtant, sur un champ de la même nature.** `sourceHint` est recopié de la
même façon, prose-enforced, et il a un **filet d'observabilité** :
`skills/splash/src/source-guard.ts:175-193` (`droppedSourceHintWarning`) remonte au gate de rendu
le cas « la source livrée est le repli générique et aucun `sourceHint` n'a été threadé ». L'ancre
n'a pas d'équivalent : **rien ne remarque son absence.**

---

## 3. Le mécanisme : la livraison a déjà une bouche mécanique

La livraison **émet déjà** un bloc que l'orchestrateur relaie verbatim, et il est né exactement
de cette classe de défaut. `skills/splash/scripts/export-code.mjs:583-623` :

- `EXPORT_FORMS_JSON <json>` — la charge machine (`proposalId, format, scrolly, hosted, exportDir,
  forms`) ;
- `EXPORT_FORMS_PROPOSAL … END_EXPORT_FORMS_PROPOSAL` — le bloc humain, localisé par `uiCopy()`,
  incluant l'instruction d'attente (`copy.waitInstruction`) dont le commentaire à `:616-620` cite
  la violation observée qui l'a fait naître.

Le geste de cette spec tient en une phrase : **le placement rejoint cette émission.** L'ancre est
lue sur `accepted.json` — que le script résout déjà — et ressort comme une ligne du même bloc,
dans la même langue, relayée par le même canal verbatim que les formes a/b/c. Une règle
« survivor » devient le relais mécanique que le choix de forme a déjà.

Trois propriétés à ne pas perdre, toutes trois déjà écrites dans `SKILL.md:924-932` :

1. **Multi-éléments : une ligne par élément**, pas un fourre-tout.
2. **Absence d'ancre ⇒ « élément autonome », jamais un paragraphe inventé.** Le champ est
   optionnel par conception (parcours sur sujet nu, opportunité liée à aucun passage).
3. **Le placement reste consultatif** : le journaliste positionne. Ce qui devient mécanique, c'est
   **qu'il soit dit** — pas ce qu'il en fait.

Et un filet, calqué sur le précédent mesuré : un avertissement d'observabilité
« ancre non threadée » quand un parcours guidé issu d'un article livre sans ancre — le pendant
exact de `droppedSourceHintWarning`. Il **ne peut pas** prouver que l'article portait une ancre
(la sortie de `suggest-article` n'est pas un fichier, § 6 décision 4) ; il dit ce qu'il voit et
ce qu'il ne peut pas voir.

---

## 4. D09 — l'intro et la chute sont la même phrase, par construction

Le défaut n'est pas une rédaction paresseuse : **le pas d'ouverture est écrit par le code.**

- `skills/chart-native/src/chart-story.ts:345-348` (`deriveChartStory`, déclarée `:308`) — les deux
  premiers beats sont `{ kind: "title", copy: spec.title }` puis `{ kind: "establish", copy: "" }`.
- `chart-story.ts:516-524` — le beat de chute : `copy: insight && insight !== spec.title ? insight : ""`.
- `lib/loop/assemble/chart-native.ts:20` — l'assembleur pose `title: brief.angle.confirmedTakeaway`.
- `skills/scrolly/src/Scrolly.tsx:187` (et `:209`, `:270`, `:293`) — `insight: config.insight ?? config.title`.

Composés : quand aucun `insight` distinct n'est fourni, **le titre EST le takeaway confirmé**, donc
le beat d'ouverture porte le takeaway, et le garde en ligne de `:524` vide la chute. Le scrolly
**ouvre sur sa chute et ferme sur rien**. Le contrôle du harness qui l'attrape
(`deep-verify.mjs:231-260`, comparaison du premier et du dernier pas lus dans le DOM) mesure donc
un effet dont la cause est à trois modules de là.

Deux conséquences pour la conception :

- **Le seam « beats rédigés » ne le corrige pas** : la paire d'en-tête (`:345-348`) et le beat de
  chute (`:516`) sont émis inconditionnellement sur le chemin auto **et** sur le chemin rédigé.
- **La comparaison est mécanisable sans juge** : deux chaînes, une égalité. Ce qui n'est pas
  mécanisable, c'est de décider **quoi faire** de l'égalité (§ 6, décision 5).

---

## 5. Où ça vit — et pourquoi ça ne peut pas vivre dans la boucle

La boucle V2 **n'a aucune ancre d'article** : ni `ProductionBrief` (`lib/loop/assemble/brief.ts`),
ni l'état d'élément (`lib/loop/manifest.ts` — le seul `anchor` y est l'ancre de **donnée** d'un
beat, `:183`), ni `nextActionsForElement` (`manifest.ts:602`, dont le vocabulaire d'actions ne
porte aucun pas de placement), ni `DeliveryMetadata`. Et ce n'est pas un champ oublié :
`docs/splash/two-chains-gap-2026-07-28.md:236-241` mesure que **l'étage ANALYSE n'existe pas dans
la boucle** — elle part d'un jeu de données, la chaîne prose part d'un article.

Donc D03 se ferme **dans la chaîne prose**, à son étape d'export. C'est cohérent avec le modèle
« la peau et le socle » recommandé au § 6 de ce même document : la lecture de l'article reste dans
la peau ; ce qui descend, c'est la garantie que ce qu'elle a trouvé **arrive jusqu'au bout**.

---

## 6. Décisions qui appartiennent à Rémy

Aucune n'est tranchée ici. Chacune est posée avec ses options et ce qu'elles coûtent, mesuré.

**1. Le placement manquant BLOQUE-t-il la livraison, ou est-il seulement dit ?**
- *(a) Consultatif mécanisé* — la livraison porte toujours une ligne : le placement, ou
  explicitement « élément autonome ». Rien ne s'arrête. Ferme la classe « le journaliste ne sait
  pas où le mettre » sans jamais bloquer un parcours légitime sans ancre.
- *(b) Bloquant* — la livraison refuse tant qu'un parcours issu d'un article n'a pas d'ancre.
  Conséquence mesurée : l'ancre est **optionnelle par conception** aux deux bouts
  (`suggest-article/SKILL.md:124` la dit *advisory* ; `producer-spec.ts:54-60` dit
  « absent ⇒ no placement stated at delivery, **no error** ») — donc (b) transforme en arrêt des
  parcours que la conception déclare normaux (sujet nu, opportunité sans passage).
- Rappel de dépendance : sous famille A non faite, (b) est nominal — un refus n'arrête rien.

**2. Le placement voyage-t-il DANS ce que la rédaction possède, ou seulement dans le message ?**
- *(a) Message seul* — zéro changement de contrat, mais rien de durable : dans six mois, le
  dossier livré ne dit plus où l'élément allait.
- *(b) Un fichier de placement dans le dossier livré* — **coût mesuré, et ce n'est pas un détail :**
  `assertDelivered` refuse tout fichier en trop (`skills/splash/tests/export-guard.test.ts:76` —
  un `README.txt` à côté d'un `chart.png` **throw**). La forme de livraison est un contrat verrouillé
  (« static = exactement une image ») ; y ajouter un fichier, c'est **amender ce contrat**.
- *(c) Dans le README du zip de la boucle* (`lib/delivery/adapters/zip.ts:52-79`) — mais ce chemin
  ne dispose d'aucune ancre : `DeliveryMetadata` (`lib/core/publishers.ts:14-24`) n'a pas le champ,
  et l'ajouter revient à ouvrir le § 5.

**3. Quelle granularité d'ancre le produit promet-il ?** `{ paragraphIndex, quote }` aujourd'hui.
Le numéro de paragraphe **pourrit** si l'article est édité entre l'analyse et la livraison — ce qui
est le cas normal d'un article vivant ; la citation survit à une réorganisation mais casse à une
réécriture. Garder les deux (aujourd'hui), n'en promettre qu'un, ou dire au journaliste lequel fait
foi : c'est un arbitrage éditorial, pas un choix d'implémentation.

**4. L'ancre doit-elle devenir un FAIT SUR LE DISQUE ?** Aujourd'hui la recopie §5b est
prose-enforced parce qu'**aucun script ne transforme le `ProposalSet` en contexte**
(`producer-spec.ts:57-58`).
- *(a) Statu quo + filet d'observabilité* (§ 3) — bon marché, et honnête sur ce qu'il ne prouve pas.
- *(b) `suggest-article` écrit un fichier d'opportunités*, comme `suggest-chart` écrit
  `candidates.json` — l'ancre devient vérifiable sans juge, et le levier de la famille A
  (« les faits sur le disque sont des pré-conditions dures ») s'applique. Coût : un artefact neuf
  dans l'étape ANALYSE, qui n'en produit aucun aujourd'hui, et un contrat de plus à tenir.

**5. D09 : que fait-on d'un scrolly qui ouvre sur sa chute ?**
- *(a) Rien de mécanique* — l'égalité reste un constat de relecture éditoriale.
- *(b) Refus mécanique* de `intro === takeaway`. Conséquence mesurée, et elle n'est pas neutre :
  la boucle pose **par défaut** `title = confirmedTakeaway` (`lib/loop/assemble/chart-native.ts:20`)
  et `insight ?? title` (`Scrolly.tsx:187`) — un refus d'égalité **refuserait la composition par
  défaut** de tout scrolly sans `insight` distinct.
- *(c) Fermer la cause plutôt que l'effet* : demander au CADRAGE une phrase d'ouverture distincte
  de la chute (un pas éditorial de plus), **ou** cesser d'ouvrir un scrolly sur son titre. Les
  deux sont des décisions de produit sur ce qu'est un scrolly, pas des correctifs.

---

## 7. Hors périmètre, dit explicitement

- **Les familles A, B et C.** En particulier : la fidélité titre↔takeaway (D16) est de la famille B
  et n'est pas touchée ici, même si D09 la frôle.
- **L'étage ANALYSE de la boucle V2.** Cette spec ne l'ouvre pas ; elle constate qu'il manque et
  ferme D03 dans la chaîne prose.
- **La qualité de l'ancre.** Rien ici ne vérifie que le paragraphe désigné est le bon : c'est un
  jugement éditorial. Voir aussi le risque 2.
- **Le contrôle du harness.** `check:placement-told-at-delivery` est faible (§ 8) ; le durcir est
  du travail de harness, dans un autre dépôt, et n'appartient pas à cette spec.
- **Les autres formes de placement** (taille recommandée, légende de figure, position responsive) :
  la question posée est « où », pas « comment intégrer ».

---

## 8. Risques assumés

1. **Le 24/83 est une borne haute.** Le contrôle du harness
   (`../splash-harness/src/checks.ts:1321-1372`) décide qu'« une ancre existait » par un
   `/\bparagraphIndex\b|\banchor\b/` appliqué à **n'importe quelle** entrée d'outil sérialisée —
   donc l'ancre de **donnée** d'un beat (`{kind:"x"}`), ou un fichier lu qui contient le mot
   *anchor*, arment le contrôle. Le défaut est réel et sa cause est établie ci-dessus ; sa
   **prévalence** doit être ré-échantillonnée avant d'être citée comme un chiffre.
2. **Une ligne de placement émise mécaniquement peut être fausse** — si l'ancre a été mal recopiée,
   le code la relaiera fidèlement. Vérifier que la citation apparaît verbatim dans l'article serait
   tentant : c'est **exactement** le mécanisme qui a produit D17 (19/83 — le ledger de
   source-fidelity compare par sous-chaîne exacte et refuse dès que la forme diffère, puis se fait
   contourner en silence). On ne re-crée pas ce garde ici.
3. **Rendre l'ancre durable coûte un contrat.** L'option 2(b) amende `assertDelivered`, qui est
   aujourd'hui l'un des rares gardes qui mordent vraiment. Élargir une forme de livraison pour
   y loger un fichier de placement affaiblit une garantie qui marche.
4. **D09 corrigé côté effet peut masquer sa cause.** Refuser l'égalité sans trancher la décision 5
   pousserait à fabriquer une phrase d'ouverture différente **pour passer le contrôle** — un
   contournement cosmétique, et la classe de comportement que la famille A documente déjà.
5. **Dépendance A, redite parce qu'elle décide de la valeur de tout le reste :** un placement émis
   par le code peut encore être avalé par un orchestrateur qui ne relaie pas le bloc. Le mécanisme
   proposé rend l'omission **coûteuse et visible**, pas impossible.
