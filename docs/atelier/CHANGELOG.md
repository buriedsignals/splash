# Atelier — changelog (log historique daté)

> Extrait de CLAUDE.md le 2026-07-09 (fichier >40K, scission flaggée de longue date). L'état
> COURANT de `main` + la roadmap vivent dans `CLAUDE.md` ; ce fichier = le journal daté des sessions
> (des chiffres anciens sont périmés — c'est un log, pas l'état courant).

## Session 2026-07-12 — Wave 8 QA (9 cas, personas variés) → 5 chantiers de fixes + 3 systémiques pour classes répétées

Reprise de la boucle QA sur le main durci (mandat Rémy : boucler jusqu'à parfait, solutions concrètes
quand les erreurs se répètent). 9 cas neufs : dialogue 100% ALLEMAND (jamais testé) · vidéos carré+portrait
(premières productions sous le snap vidéo) · map+chart scrolly · interactif noms-longs mobile · map-dw
embed-only · slope print + persona girouette · piège stories-interactif. Personas : pressé, pointilleux,
sceptique, girouette, insistant. **8/9 livrés, 0 critical produit réel.**

**Passes remarquables (gardes des tranches 1-3 validées en vrai flow)** : le TRAP stories-interactif =
refus net avec explication technique + 2 alternatives honnêtes (2 pushbacks tenus, jamais cédé) · la
girouette re-pinne static proprement (re-route suggest-chart) · le snap vidéo tourne en production
(`video-verify.json` : portrait sparse line midVsEarly 0.276 — passe le seuil recalibré 0.15 que l'ancien
0.5 aurait bloqué à tort ; reveal 1.01 ; still-match 0.0003) · map-dw embed-only propre · sign-off coupé
par le driver.

**5 chantiers de fixes (workflow + review adversariale, 2 UNSAFE corrigés) :**
- **barColor jette baseColor sur highlight** (render-confirmé : pink #CC79A7 spec → orange hardcodé) :
  highlighted = primary (baseColor ?? défaut), contexte = muted ; sweep famille (seul BarChart avait le
  pattern — vérifié par grep reviewer) ; + value-labels scrolly embarqués suffixés unité courte
  (locale-aware, `SHORT_UNIT_MAX_CHARS`). Review SAFE, pixel-exact vérifié (#CC79A7, zéro orange).
- **dw-chart : validation STRICTE + vrai highlight** (systémique — l'orchestrateur avait halluciné
  `highlight`/`highlightColor`, avalés silencieusement → cycle de production gâché) : champs inconnus
  rejetés fail-loud (liste canonique compile-lockée, suggestion near-miss) + champ `highlight` RÉEL
  (par valeur de catégorie, DW custom-colors, e2e API+pixels). **La review a attrapé un important** :
  membership check en `split(",")` naïf → catégorie RFC4180 à virgule faussement rejetée (« Ministère de
  l'Économie, des Finances… ») → scanner RFC4180 porté dans dw-chart (convention sibling). Le fixer a
  révélé la classe entière : sortCsv/dataShape/numericValuesOf toujours naïfs → **migration systémique
  dispatchée** (branche `fix/dw-chart-csv-rfc4180-migration`).
- **Contrôle narratif scrolly** (répété 2× cette wave : plan 3-temps confirmé aplati en auto-pick ;
  Alpes-Maritimes résolu par cherry-picking) : `beats` explicites dans la spec (line : ancres x + textes ;
  bar-walk : liste ordonnée de catégories, longueur libre), validés contre les données (typo = fail loud),
  auto-pick par défaut byte-identique (diffé sur 8 fixtures par le reviewer) ; PROPOSITION annonce
  honnêtement contrôlable vs auto. Review SAFE.
- **Harness : registration hosted-embed** (3e occurrence du faux critical « deliverable not reached ») :
  `EMBED_URL.txt` frais + publicUrl matché = livrable réel ; + le driver RÉPOND au choix a/b/c (détection
  de la proposition + dérivation du choix depuis la persona). **La review a attrapé un important** : le
  détecteur ne connaissait que FR/EN — la proposition ALLEMANDE (« Welche Lieferform möchtest du? », run
  krankenhaus réel) passait au travers → bras STRUCTUREL langue-indépendant (3 kinds classifiés = signature)
  + vocabulaire de/it. 240/0.
- **Discipline de flow** (SAFE) : `confirmedTakeaway` REQUIS dans accepted.json (3e occurrence de la
  divergence titre↔takeaway — levier de présence mécanique + instruction review « citer et vérifier
  toutes les parties ») · Q3 couvre le print (→ article-web + format static) · règle d'incertitude de
  source (« de mémoire » ⇒ fallback prose honnête, jamais citation confiante).

**Backlog légué (mineurs reviews)** : valueUnit pas threadé au suffixe embarqué (forme canonique
long-unit+valueUnit) · `fmt()` chart-story vs `unitSuffix` divergent (fr sans espace vs U+202F) ·
séparateur unitSuffix hors table LOCALES · gutter vertical embedded non-géré · dw narrow-width review
(long labels sur dw interactif : seul le 1200px inspecté au Gate 3 — la classe label-safety à étendre) ·
vermillon sur sujet cyber (palette sémantique, connu) · 2-form proposal 4e langue (détecteur conservateur).

## Session 2026-07-11 (suite 3) — Tranche 3 : clôture de la P-list mécanique de l'audit (P3 + P5 + densité) — 4 clips produit réels débusqués et corrigés

Même dispositif (3 implémenteurs worktrees + reviewers qui **exécutent** les gardes). La review label-fit
est le sommet de la méthode : elle a couru la garde à 360px (largeur de livraison documentée que le 1er
jet ne mesurait pas) et découvert que **le bug stacked-area corrigé en début de session vivait encore sur
le chemin responsive narrow** (« 280 »→« 28| » à l'écran) — puis le fixer a invalidé l'hypothèse du
reviewer par la mesure (vrai root-cause : `padding` html+body empilé 48px affamait un téléphone 360px sous
le plancher `minWidth` 280px → le svg peignait hors carte).

- **P3 — snap label-fit générique (`feat/label-fit-snap`)** : Playwright, chaque nœud texte rendu doit
  tenir dans ses bornes de clip ±4px (tolérance calibrée : em-box ascent 3.00px mesuré zéro-encre-coupée ;
  vrais clips ≥5px, classe historique 15px+) · static@900 + **interactif@360 ET 1100** · résout les
  ancêtres `clipPath` (userSpaceOnUse/rect, boundary documentée fail-open) · gardes de vacuité · RED
  mécanique sur le bug historique (StackedAreaChart pré-fix → exit 1 à 15.4px). Câblé fail-hard dans
  produce (static+interactif) après snap-contrast. **4 clips produit RÉELS trouvés par la garde et
  corrigés au niveau layout** (jamais en élargissant la tolérance) : (1) inset de page responsive —
  body-only + contrat `minWidth` honnête sur le wrapper (synché dans le template `export-source`) ;
  (2) légende dumbbell « Men » coupée en bas à 360 (réserve `legendRowCount` partagée) ; (3) annotation
  « projection → » du FanChart coupée par son clipPath (36.92px, produce-reachable — flip côté historique
  quand la zone forecast est étroite) ; (4) légende dot-strip jamais wrappée (18.72px — `legendWrapsAt`
  unique pilote réserve ET wrap rendu). chart-native 1034/1034.
- **P5 — gate i18n furniture (`feat/i18n-furniture-gate`, SAFE)** : deliverable non-EN ⟹ vérifié localisé,
  aux bons seams — DOM furniture pour les natifs (dans les page-loads de snaps EXISTANTS, zéro session
  browser en plus : préfixe source == table locale importée single-source · blocklist EN scoped furniture,
  data-labels exclus — testé adversarial « Software Republic », catégories « Note: » · spot-check groupage
  nombres conservateur, patterns non-ambigus seuls) — et **assertion de métadonnées** pour les 2
  producteurs DW (invariant `annotate.notes`+champs-natifs-blanked assertés AVANT tout appel API : une
  régression future échoue au produce au lieu de shipper la caption anglaise). 4 suites vertes API réelle.
  Follow-ups loggés : chemin vidéo non-gaté (indirect) · `sourceLabel` map-native ne localise que le FR
  (gap de/it vs les 3 autres).
- **Densité dw-chart harmonisée (`fix/dw-chart-density-floor`, SAFE)** : **un canal = une taille livrée
  pour les 4 producteurs** — dw-chart static demandait la boîte pleine (DW rasterise à 2× → 2400×1350
  livrés, jamais assertés) ; requête halvée comme map-dw + plancher IHDR fail-hard (±2px ; jambe largeur
  seule pour les types row-driven à hauteur contenu). Vérifié live des deux côtés du fix (RED 2400 → GREEN
  1200×675 / 1080×1080). Le reviewer a re-prouvé live que le 2× DW tient pour les charts sur les 2 jambes.
  Follow-ups : `zoom` non-pinné dans la requête export (le plancher échoue fort si DW change le défaut) ·
  `output-proof` PNG à re-générer (densité pré-fix).

**★ P-list mécanique de l'audit 2026-07-11 : FERMÉE** (P1 vidéo · P2 channel · P3 label-fit · P4 map-dw ·
P5 i18n + alt-text + sign-off + source-i18n dw + densité). Restent les non-mécaniques (palette sémantique,
`confirmedTakeaway`, flags attestés-LLM/`approvedHash`) + les follow-ups ci-dessus — et les deux chantiers
à input Rémy : **dry-run Annemasse** (vrais brouillons) et **release MIT**.

## Session 2026-07-11 (suite 2) — Tranche 2 : les 2 gardes structurantes (P1 vidéo + P4 map-dw) mergées

Même dispositif que la Tranche 1 (workflow 2 implémenteurs worktrees + review adversariale par branche →
2 UNSAFE avec findings réels → agents correctifs → merge). Les reviews de cette tranche ont **exécuté les
gardes elles-mêmes contre des rendus réels** (pas lu le diff seulement) — les 2 findings majeurs viennent
de là.

- **P1 — snap vidéo + watchdog (`feat/video-snap-guard`)** — la promesse vitrine Splash (« motion graphics
  code-rendered ») passait de zéro garde à une vérification mécanique fail-hard du **mp4 réel** dans les
  2 producteurs natifs : sanité conteneur (ffmpeg bundlé Remotion, dims==canal, durée==comp ±1 frame) ·
  frames 2/50/98 % (reveal anime ≥0.5 mean-diff · progression mid ≥0.15 · jamais blank) · **frame du still
  ≈ mp4 à la même frame** (transfère l'approbation Gate 3 à l'artefact livré) · **vrai still FINAL**
  (`remotion still --frame=-1`, capacité neuve — l'ancienne « last-frame.png » des exports était un
  artefact ad-hoc circulaire tiré du mp4 ; le snap diffe maintenant la fin réelle → ferme la classe
  « end-labels n'apparaissent jamais ») · **watchdog** qui borne le rendu (ATELIER_VIDEO_TIMEOUT_MS,
  kill du process-group, SIGINT/SIGTERM forwardés) — le hang seismes devient un échec propre (root-cause
  du hang = ticket séparé, inchangé). **Le critical attrapé par la review** : le premier jet réutilisait le
  seuil 0.5 (calibré dense-BarReveal) pour les jambes mid → **bloquait des vidéos line saines au produce**
  (LinePortrait 0.383 mesuré, LineSquare 0.485 — les 2 canaux sociaux) ; fix = seuil séparé
  `PROGRESSION_MIN_MEAN_DIFF` 0.15 calibré des deux côtés (bruit frozen ≤0.04 ; mid sain le plus faible
  0.383), calibration gravée dans le commentaire du knob, RED→GREEN sur les 3 comps réels. chart-native
  988/988, map-native 622/622. Limites documentées : still final map-native déféré (chemin still =
  seismes-prone) ; troncature map story après frame 140 non-détectée sans EXPECTED_FRAMES.
- **P4 — plancher map-dw (`feat/map-dw-floor`)** — le producteur le plus faible : format pinné threadé
  (static→PNG seul, interactive→embed seul, video/scrolly→reject **avant tout appel API** — le seam
  anti-chart-orphelin de dw-chart mirroré + testé token-free) · taille d'export dérivée du canal
  (`mapExportSize`, moitié du mediaSize car DW rasterise à 2×) · **IHDR readback fail-hard** du PNG livré
  (±2px, pattern chart-native + signature PNG 8-octets ajoutée aux 3 twins). **L'important attrapé par la
  review** : sur le chemin routé, la spec émise par suggest-chart n'a **pas de champ channel** →
  produceMap validait contre le défaut article-web et passait (RED live : social-feed livré 1200px
  article-web) ; fix = `withProposalChannel` au dispatch (adapters) — le canal canonique de la PROPOSITION
  est injecté dans la spec des 2 producteurs cloud (dw-chart avait le même gap de classe), précédence
  proposal-first documentée (miroir `resolveGuardChannel`), template MapSpec suggest-chart complété.
  map-dw 120/120 (API réelle), atelier 262/262. **Follow-ups loggés** : dw-chart static ship du 2×-mediaSize
  sans assertion (incohérence de densité — décision à prendre) · judge.md:161-163 périmé (dw-chart
  « owned fallback » + map-dw catalogué symbol).

## Session 2026-07-11 (suite) — Tranche 1 post-audit : 4 fixes qualité mergés (workflow parallèle + review adversariale)

Suite directe de l'audit (`docs/atelier/audit-2026-07-11.md`, 71/100 B-) et du renommage public **Splash**
(`splash.buriedsignals.com` — vidéo/scrolly = promesses de vitrine). Rémy a donné mandat qualité large.
Exécution : workflow 4 implémenteurs parallèles en worktrees isolés + 1 reviewer adversarial par branche →
2 branches UNSAFE (findings réels attrapés) → agents correctifs → merges. Un agent (signoff) mort mi-course
(API) — travail repris et complété par un agent successeur. Gate final vert.

- **channel fail-closed de bout en bout** (P2 audit, était fail-OPEN) : `normalizeChannel` throw sur un
  canal inconnu non-vide (liste les canaux valides) ; absent/vide garde le défaut `article-web` documenté.
  **La review adversariale a attrapé une VRAIE régression dans le premier jet** : le gate acceptait les
  alias (« feed »→social-feed) mais le dispatch threadait le canal BRUT vers `ATELIER_CHANNEL`, que le
  parsing exact-match de chart-native re-défaultait silencieusement en article-web → **ship paysage
  1200×675 pour un carré résolu au gate, reproduit mécaniquement** (sur main ce chemin fail-hardait). Fix :
  normalisation UNIQUE au gate + dispatch reçoit `{...p, channel}` canonique + parsing `ATELIER_CHANNEL`
  fail-closed dans les producteurs (chart-native produce+vite, map-native — qui crashait aussi sur env
  VIDE, bug bonus corrigé) + dw-chart résout la taille d'export AVANT tout appel API (plus de chart DW
  orphelin publié sur canal invalide). RED proofs mécaniques, suites vertes (atelier 254, chart-native 920,
  dw-chart 169 API réelle, map-native), tsc ×3.
- **dw-chart « Source : » localisé** (gap i18n backlog, le défaut FR le plus visible à haute fréquence) :
  miroir octet-pour-octet du pattern map-dw (`annotate.notes`, champs natifs blanked hors-EN, comment
  cross-ref). Review SAFE — le reviewer a re-runné l'e2e API réelle lui-même et inspecté les rendus FR/EN
  (« Source : Insee », zéro doublon, EN inchangé). Trade-offs disclosed : URL non-cliquable hors-EN (même
  choix que map-dw) ; quirk espace ASCII vs fine insécable hérité volontairement (fix = ticket 2-skills).
- **altInsight enforced + émis partout (WCAG 1.1.1)** (audit R3 : « opt-in de fait OFF ») : threadé
  spec→config au mapper central (jamais fabriqué depuis le titre), gate produce **fail-hard** (exit 1 si
  absent — parité avec dw-chart/map-dw), émis via `AltInsightContext` (mount partagé → ChartFrame, nœud
  visually-hidden clip-pattern, jamais display:none). **La review a attrapé le trou du bundle React
  exporté** (form 1 « code source » : mount.tsx supprimé du bundle → aucun provider → l'interactif rebuilddé
  re-perdait l'alt) → `main.tsx` généré wrappe le render dans le Provider (lu défensivement), **prouvé sur
  bundle réel** : vite build vert + dist inspecté headless (1 nœud caché, clip rect, 1×1px). +5 samples
  backfill avec insights data-accurate, doc suggest-chart mise à jour. chart-native 930/0.
- **Discipline de clôture de session** (bruit « À bientôt ! » ×4, vu 2× en QA) : SKILL.md §6 EXPORT + liste
  Never — après handover + signal de complétion du journaliste (merci/au revoir PUR, sans requête), AU PLUS
  UN message de clôture puis session TERMINÉE. Côté harness (`23c7543`) : détecteur pure-close conservateur
  (`close-detection.ts`, whole-match normalisé, marqueurs de requête disqualifiants, ≤80 car.) câblé dans
  le driver avec gate situationnel (deliverable enregistré OU tour atelier lui-même une clôture, jamais en
  réponse à une question de gate) → coupe en `closed-early` + `personaSignoffClose:true` dans meta.json
  (pas de nouveau exitReason, métriques QA non-skewées). 214/0 harness.
- **Renommage public Splash gravé** (CLAUDE.md « Quoi/pourquoi ») + fixtures Wave 7 committées au harness.

## Session 2026-07-11 — Wave 7 « tour d'horizon » (7 cas) : 2 fixes produit, 1 faux positif démasqué, redesign validé

Sweep post-redesign sur 7 nouveaux sujets couvrant la matrice de formats (heatmap, slope, streamgraph,
dumbbell, dw-interactive, mapdw, line-video). **Flow solide** : 5/7 livrés en single-format propre
(static→media seul, interactif→html+still, vidéo→mp4+stills, dw-interactif→`EMBED_URL.txt`) ; les 2
closed-early : `gdp-growth-dw-interactive` = cutoff **harness a/b/c-capture** connu (l'`EMBED_URL.txt` a bien
été écrit — livraison réelle, juste non-enregistrée par le harness) ; `er-wait-heatmap` = **gap
heatmap-non-atteignable** reconfirmé (demande explicite de heatmap interactif → dégradé en `dw-chart
grouped-column`, car le composant heatmap chart-native n'est pas câblé dans les MAPPERS — le juge a
correctement noté le grouped-column comme vecteur plus faible). Aucun des deux = régression produit. **2 fixes produit** (branche
`fix/wave7-stacked-label-and-format-pin-doc`, chart-native 911/911, gate 17/18 — le 18e = flake réseau
map-native MapLibre, cf. ci-dessous) :

- **chart-native stacked-area : label de bande de droite tronqué.** La gouttière droite était un `right:
  116` en dur — OK pour l'échantillon, mais un nom+valeur long (« Renouvelables 280 », 17 car. ≈ 143px
  gras) débordait et rendait « Renouvelables 28 » (render-confirmé sur le mix électrique allemand). Fix :
  gouttière dimensionnée sur le label le PLUS LARGE via un helper partagé `endLabelGutterPx()`
  (`core/text.ts`), plancher à 116 pour ne pas changer les charts à labels courts. Couvre le static ET
  l'interactif (ce dernier réutilise `StackedAreaChart`). Render-vérifié : « Renouvelables 280 » complet.
- **atelier SKILL.md : contradiction interne PROPOSITION vs single-format.** Le redesign avait retiré le
  fallback no-JS `static.html` auto et mis à jour §6 + le garde-fou export, mais la section PROPOSITION
  (choix de format article/web) promettait encore le fallback « ALWAYS produced » — contradiction qui a
  causé un miss Wave 7 : un dumbbell dont le journaliste voulait EXPLICITEMENT du static a été pinné
  interactif, parce que le texte périmé disait « défaut interactif, ne jamais présenter interactif-seul »
  (sûr seulement quand un fallback static était garanti). Corrigé : le format pinné est le SEUL artefact,
  un signal de format explicite du journaliste (« image statique », « pour le print ») GAGNE sur
  `interactiveDefault`, et le format pinné est annoncé pour veto — plus de fallback fantôme.

**1 faux positif démasqué (corollaire « le juge peut mentir »)** : `unemployment-mapdw` — le juge a flaggé
`numberFormat: "0.0%"` sur des valeurs déjà en points de pourcentage (2,9…11,3) comme rendant « 290 % »
sous d3-format. **Faux** : Datawrapper APPEND le « % » sans multiplier (documenté `map-spec.ts:235`,
vérifié par export rendu) — le PNG livré affiche « 2,7 % » / « 11,3 % » correctement, avec groupage locale
FR et « Source : » i18n OK. Aucun fix.

**1 fix antérieur validé au rendu** : `temp-anomaly-line-video` — le point-label de fin du line chart vidéo
est EXACTEMENT au bout de la ligne (2023, +1,5 °C), sans décalage en avant. Le fix end-label mergé tient.

**Notes (non-fixes)** : `energy-mix` palette « pas subject-fit » = soft (renouvelables=vert déjà
subject-fit ; palette sémantique-carburant = décision design vs invariant CVD-safe global → backlog) ;
type stacked-area + format interactif = CORRECTS (persona demandait « stacked-area (ou streamgraph)…
interactif »). Le miss format (life-exp) reste attrapé par le filet QA (le finding l'a surfacé) —
discipline d'annonce-de-format doc-enforced (classe titre/takeaway, pas de levier mécanique propre).

## Session 2026-07-10 (nuit) — REDESIGN single-format produce→export (7 tâches) + 2 décisions renversées

Constat post-Wave 5 (cf. sessions ci-dessous) : le pipeline `produce → export` sur-produisait sur **deux
axes**, et la livraison était un tas plutôt que « l'export adapté ». Preuves relevées : `renouvelables`
(format vidéo) avait aussi buildé `interactive.html` + `interactive.png` + `static.png` en byproduct ;
`seismes` (format vidéo) n'avait **jamais** produit son `.mp4` mais avait quand même buildé `static.png` +
`interactive.html` + 4 `responsive-*.png` avant d'atteindre le turn-cap ; `langages` avait livré le bundle
React runnable **146-fichiers entier** sans attendre de choix ; `budget` avait livré `static.html` +
`EMBED.md` d'un chart Datawrapper sans choix non plus. Cause racine : rien ne *pinnait* l'unique
format/forme défini pour l'élément — le pipeline produisait/matérialisait *tout ce qui est possible* au
lieu de *ce qui est défini*. Spec `docs/superpowers/specs/2026-07-10-single-format-produce-export-design.md`,
plan `docs/superpowers/plans/2026-07-10-single-format-produce-export.md`, branche
`feat/single-format-produce-export`, gate **16/16** à la fin (7 tâches, review clean par tâche).

**Modèle cible : un élément = un format visuel, produit et livré seul.**

**Tâches livrées :**
1. **Pin du format** — `spec.format` (un `VisualFormat` unique) porté par la spec acceptée à la
   PROPOSITION (Gate 2 existant, vetoable — pas de nouveau gate) ; `assertFormatAllowed(channel, format)`
   ajouté à `skills/atelier/src/channel.ts` (throw si le format n'est pas dans `allowedFormats(channel)`).
2. **chart-native `produce.mjs` single-format** — le mode `formats="all"` par défaut disparaît ; le script
   ne build QUE le format demandé (`produce.mjs <type> <config> <outDir> <format>`), avec un still de
   revue éphémère pour interactif/scrolly (non livré).
3. **map-native + dw-chart single-format** — même dispatch strict ; dw-chart `interactive` produit
   l'embed hébergé (`publicUrl`) comme artefact, pas de build local additionnel.
4. **`produce-all.mjs` thread le format unique** — lit `spec.format`, `assertFormatAllowed`, invoque
   chaque producteur avec ce seul format au lieu de `"all"`.
5. **`assertDelivered` par forme** — n'exige plus `static.html` pour un interactif ; nouvelle règle
   `(format, form)` : `static`/`video` → un média seul ; `interactive`/`scrolly` → la forme choisie
   (`.html`, dossier bundle, ou URL hébergée enregistrée).
6. **`export-code.mjs` refonte + paresse** — `static` livre le média directement (pas de dossier, pas de
   `.html`) ; `video` livre le `.mp4` directement ; `interactive`/`scrolly` proposent a/b/c, **attendent**
   la réponse, puis matérialisent **uniquement** la forme choisie (bundle React construit à la demande via
   `export-source.mjs`, déploiement fly.io à la demande via `deploy-embed.mjs`, ou simple copie du `.html`).
   Plus de bundle ni de `static.html` ni d'`EMBED.md`-fourre-tout pré-construits d'office.
7. **Docs** (cette entrée) — `CLAUDE.md` + ce changelog mis à jour avec les 2 renversements. `judge.md`
   (harness, repo séparé `../atelier-harness`) doit être retourné au modèle single-format en cohérence
   (un format produit seul est attendu ; « plusieurs formats produits » ou « toutes les formes livrées
   d'office » devient un **défaut** à flagger, plus de `static.html` requis) — appliqué au merge pour
   que la rubrique harness atterrisse avec le comportement `main`, pas avant.

**★ Deux décisions verrouillées renversées (log, cf. `CLAUDE.md` § Décisions verrouillées) :**
- **Le fallback no-JS `static.html` (déc. 2026-06-23, mitigation a11y+souveraineté « Datawrapper reste la
  base ») n'est plus auto-produit.** L'accessibilité/le fichier possédé no-JS = **choisir le format
  `static`** — un interactif est juste l'interactif, plus de repli embarqué automatique.
- **La déc. 2026-07-10 « EXPORT : le journaliste CHOISIT la forme » (produire tous les artefacts d'office
  PUIS proposer a/b/c) devient PARESSEUSE.** Seule la forme choisie est construite/livrée. Le local-first
  reste préservé pour static/video/html autonome (un fichier possédé existe toujours) ; l'embed reste un
  choix explicite (hébergé, sans fichier possédé).

**Suivi (backlog, hors scope de ce plan à 7 tâches) :** **map-dw** (producteur carte Datawrapper, distinct
de map-native/dw-chart) sur-produit encore PNG+embed quel que soit le format — traitement single-format
analogue à dw-chart à donner · le snap WCAG statique (`snap-contrast.mjs`) ne tourne plus pour le format
`interactive` (le garde-fou config-level `produce-conformance` tourne toujours) — à trancher si un snap de
contraste rendu dédié à l'interactif est nécessaire · le format vidéo de map-native mappe toujours sur le
style « story » — « reveal » a perdu son accès CLI dans ce redesign, à faire un knob de config si voulu ·
items déjà hors-scope non traités par ce redesign : **hang du rendu vidéo symbole animé** (`seismes`,
Remotion+MapLibre par frame — le redesign réduit le déclencheur en coupant le sur-produit mais ne corrige
pas le hang lui-même, follow-up dédié) · **harness qui coupe avant la réponse a/b/c** (le driver marque
« delivered » à la proposition, le choix de forme n'est jamais capturé en test — nécessaire pour VOIR la
forme livrée en QA, mais séparé du produit).
## Session 2026-07-10 (suite) — audit installeur : 15 défauts confirmés → 15 fixes système + 11 tests

Branche `fix/installer-audit-15` (non mergée à l'écriture). Rémy : « teste le système d'installation ».
Méthode = **audit adverse fan-out** (workflow : 6 finders/composant × étage de vérification adverse ;
23 findings bruts → 21 confirmés/plausibles, 1 réfuté) **puis drive e2e du vrai configurateur** (principe
« vérifier le LIVRÉ, pas le proof » : ouvrir/piloter les vrais endpoints + `source` bash réel, pas lire le
code). Le système = page publique (`docs/installer/`) → bootstrap (`install/bootstrap.{sh,ps1}`) →
configurateur Bun local (`install/configurator.{ts,-core.ts}`). Gate `bun run check` **16/16** après fixes.

**🔴 Bloquants / hauts (5) :**
- **Clés requises vides acceptées** → install « réussie » mais `.env` à clés vides (les gates client
  `!==false` et serveur `some(===false)` laissent passer `null`=blank). Fix = **warn/confirm doux** :
  marqueurs `(required)`, `confirm()` avant Save, trim client. **Pas de hard-block** (chart-native = 0 clé
  légitime). `configurator-core.ts`.
- **Windows : PATH claude non préfixé en session** → `claude.ai/install.ps1` ne touche que le PATH
  persistant, le re-test `Get-Command claude` throw à tort « could not be installed » → abort avant le
  launcher. Fix = `$env:PATH = "$HOME\.local\bin;$env:PATH"` après install (miroir de `bootstrap.sh:45`).
  Vérifié *par mécanisme* (install.ps1 inspecté), non exécuté sur Windows.
- **`.env` non-quoté** → le launcher mac `. ./.env` word-splittait les tokens fly `FlyV1 fm2_…` (espace
  littéral) → `command not found` → claude ne démarrait jamais. Fix = `serializeEnv` **double-quote** +
  trim + strip `"`/newline ; launcher Windows `set "%%a=%%~b"` (retire les quotes). **Asymétrie .sh/.cmd
  gravée** : le format `.env` partagé doit être sûr pour `source` (bash) ET `for /f` (cmd). Prouvé e2e :
  vrai serveur → `.env` → `. ./.env` → token intact, chaîne n'abort plus.
- **Option B mac morte** (download `.command` sans bit `+x`, self-heal `chmod +x "$0"` inatteignable).
  Fix = workaround on-page `chmod +x`. `index.html`.
- **Release-gate aveugle** : `preflight-release.mjs` ne scannait que `commands.js` → un vert pouvait
  shipper des bootstraps pointant le repo placeholder (404 constaté aujourd'hui). Fix = scan des **2
  bootstraps** + gate du **REF non-pinné** (`main`) dans les 3 fichiers.

**🟠 Moyens (4) :** `bun install` garde stderr + guard (fini le dead-stop silencieux sous `set -e`) ·
winget gardé (`Get-Command winget` → fallback amical vivant sur LTSC/entreprise) · `writeFileSync`/
`req.json` gardés → **400/500 propres + exit(1) au lieu de hang infini** (`~/Atelier` read-only/disque
plein) · `verify*` renvoie **`null` (injoignable) ≠ `false` (invalide)** → clé valide derrière proxy/TLS-MITM
plus bloquée.

**🟡 Bas (6) :** configurateur derrière `[ ! -f .env ]` + `ATELIER_RECONFIGURE` (re-run n'exige plus la
re-saisie) · hint « Ctrl-C » + idle-timeout 30 min · trim des clés (espace collé → MapTiler 403) · toggle
OS `role=tablist`→`aria-pressed` (a11y : `aria-selected` inerte sur `<button>`) · Copy avec feedback +
fallback `execCommand` + `.catch` · download `revokeObjectURL` différé + anchor in-DOM (Safari).

**Tests (11 nouveaux) :** `configurator-core.test.ts` (format quoté, **preuve behaviorale bash-source**,
`verify*`→null réseau, marqueurs required) · `configurator.test.ts` (nouveau — serveur : malformé→400,
blank→`.env` quoté, 404) · `bootstrap-{sh,ps1}.test.ts` (stderr gardé, guard re-run, PATH claude, winget,
`%%~b`) · `page.test.ts` (chmod workaround, copy fallback, revoke différé, aria-pressed) ·
`preflight-release.test.ts` (nouveau — scan bootstraps + REF).

**★ Méta-leçons gravées :** (1) **le contrat `.env` du launcher est cross-platform** — un format sûr d'un
seul côté (`for /f` Windows tolérait l'espace, `source` bash non) est un demi-fix ; graver les deux. (2)
**un release-gate doit gater CHAQUE fichier qui hardcode le placeholder**, pas un seul — sinon un vert
faux-négatif shippe un install 404. (3) **le vérificateur d'un finding peut mourir** (1 agent en erreur
réseau a filtré le finding blocker Windows) → re-vérifier soi-même les findings orphelins critiques.

## Session 2026-07-10 — 3 cycles QA (waves 1-3, 16 cas) → 12 fixes, tous mergés vert

Boucle « fond de roulement » (`../atelier-harness/WORKFLOW.md`) : lancer des tests e2e en parallèle
(persona journaliste pilote le vrai atelier headless en sandbox worktree de `main`) → collecter les
findings → **inspecter le LIVRÉ réel + `deep-verify.mjs`** → fixes en worktrees isolés parallèles →
review-lot adversarial (1 agent/branche) → merge → gate. `main` : `c7d67bd` → **`661a928`**, gate
**16/16** à chaque merge, 0 mention vendor, 0 `any`.

**Waves :** W1 (matrice complète + 3 pièges nommés par Rémy) · W2 (waterfall/beeswarm/map-scrolly/
symbol-vidéo/choroplèthe) · W3 (validation e2e des fixes mergés). 1 timeout (`inflation`) = **transient,
non reproduit** (le repro a livré ; la vraie leçon = le *thrash-on-hang* d'atelier, pas le chemin produce).

**Fixes produit (9) :**
- **export dw-chart interactif** (le plus impactant) : `export-code.mjs` crashait (`embedSnippet(undefined)`)
  → `-export` VIDE pour un interactif Datawrapper (embed hébergé = pas de html local ; PNG nommé
  `<id>.png` ≠ `static.png`). Détecte la forme hébergée via le `report` (`publicUrl` + `outputs`
  déclarés, pas un match de nom) → `-export` complet (static.html a11y + EMBED.md → URL hébergée).
  Chemin courant (article-web + chart standard) qui dégradait **silencieusement**. Vérifié e2e API DW réelle.
- **chart-native** : tous les highlights scatter labellisés (plus le seul max-y) · value-labels
  survivent au reveal vidéo sur les petites barres (anti-pattern d'opacité tardive → knob partagé
  `core/math.ts:labelReveal`, propagé à **toute la famille barres** : Bar/Diverging/Waterfall/Lollipop/
  Bullet/Dumbbell) · titre d'axe X ne surimprime plus la source (`sourceFooterReserve`, réserve de
  bas de cadre partagée symétrique du header → 40 charts en héritent).
- **dw-chart** : annotations scatter résolvent la colonne **Y** (lisaient X/PIB → hors-canvas droppées) +
  domaine y de la seule colonne Y + tripwire (throw si y d'annotation hors-domaine — un rendu ne peut
  pas attraper une annotation *droppée*, ce check data si).
- **CADRAGE Gate 1b** : takeaway/insight = gate explicite **non-skippable**, confirm-back les 2 branches.
- **légendes carto** : nombres groupés locale (`17600`→`17 600 €`) — map-dw (metadata `labelFormat` +
  `column-format` + `lang`→locale) ET map-native symbol (seul sibling encore en `${value}` brut).
- **render-review** : toute affirmation d'interaction (tooltip in-viewport, hover, popup) doit **citer
  le run d'un snap-script d'interaction** (`snap-tooltip-viewport.mjs` etc., qui tournent déjà fail-hard
  dans `produce-all`), jamais déduite d'un PNG statique ; chaque critère taggé `[static]` vs `[interaction-tested]`.

**Fixes harness/rubrique (3) :** le driver juge le **vrai `-export`** (`canonicalizeDeliveryOutputs`,
plus le build-subdir) — a tué une **cascade de faux « export skipped / missing a11y »** · `judge.md`
aligné : source name-only prose = légitime · **scrolly exempt de static.html** (faux [major] récurrent) ·
sous-gates 1b/2c/3a réels (le modèle (1,2,2b,3,4) était périmé).

**★ Méta-leçon gravée : le JUGE peut mentir aussi.** Deux cascades de faux positifs (export-skipped,
scrolly-sans-static.html) démasquées en inspectant le filesystem/`-export` réel — pas en croyant le
finding. Corollaire de « vérifier le livré, pas le proof » : **vérifier le livré ET challenger le
finding** (les reviewers de merge l'ont aussi appliqué — ex. le premier a attrapé une propagation
incomplète de la famille barres, le finding « Gate 2c inventé » était lui-même stale).

**Backlog légué (mineur) :** dw-chart *statique* met l'embed hébergé en forme 1 (la forme possédée
devrait mener — souveraineté) · 6 charts self-clearing double-comptent `sourceFooterReserve`
(cosmétique) · légende map-dw *symbol* non vérifiée pour le groupement.

### Suite 2026-07-10 — EXPORT : le journaliste choisit la forme (feature, met à jour la déc. 2026-06-23)

Parti d'un retour Rémy sur 2 runs (« ça sort plus que le .html souhaité » + « atelier ne propose jamais code source / html / embed »). Diagnostic groundé : (a) le `-export` = les formes possédées + docs, PNG de build non livrés (par design) ; (b) **vrai bug** — l'offre des formes/embed était incohérente (~la moitié des livraisons interactives disaient juste « Livré. » sans rien proposer). Deux corrections de terminologie de Rémy en cours de route (vérifiées au fichier) : « HTML statique » = le fichier **autonome** `interactive.html` (JS inline dedans), PAS le no-JS ; « code source » = **le vrai code React**, pas les fichiers compilés.

Décision produit (Rémy, via petites questions) : le journaliste **choisit** une des 3 formes ; livraison façonnée ; **forme 1 = bundle React runnable**.

Livré (branche `fix/export-form-choice`, mergé, gate 16/16, adversarial-review SAFE avec **build indépendamment reproduit de zéro**) :
- **Flux** : `export-code.mjs` produit les artefacts d'office (local-first préservé) PUIS **émet** une proposition prête-à-relayer (`EXPORT_FORMS_JSON` + bloc `a/b/c`) → l'orchestrateur relaie un message fixe au lieu de se fier à sa mémoire (fin du « Livré. » nu). SKILL.md §6 : gate explicite non-skippable « propose 3 formes → le journaliste choisit → livre la forme choisie ».
- **Forme 1 = bundle React runnable** : nouveau générateur `skills/chart-native/scripts/export-source.mjs` assemble un projet Vite auto-contenu (`<id>-source/` : copie `chart-native/src` — clôture 0 import cross-skill — + `config.json` + entry `main.tsx` + `package.json` deps interactif seul (pas remotion) + vite/tsconfig + README). **Acceptation build-de-zéro prouvée** (2×, moi + le reviewer) : `bun install` (49 pkgs) → `bun run build` (369 modules → `dist` 480 KB auto-contenu) → rend 5 barres = les 5 lignes de données, 0 erreur. chart-native seulement ; map-native/scrolly/DW = dossier fichiers (leur src pas auto-contenu → follow-up).
- **Forme 2** = `interactive.html` autonome ; **Forme 3** = `deploy-embed` → fly.io (ou `publicUrl` DW live).
- `judge.md` **retourné** : proposer les formes = flow voulu ; « Livré. » nu = défaut (annule la règle « demander = ancien flow »).

Reste (backlog) : valider le flux conversationnel a/b/c par un run harness ; bundle runnable pour map-native/scrolly.

### Wave 4 2026-07-10 — 6 sujets neufs (climat/sport/café/cantons/connectivité/startups) → 2 fixes

Nouveaux cas (thèmes/lieux/données neufs + pièges) : `ocean-heat-video`, `record-marathon-slope`,
`cafe-production-symbol`, `deficit-cantons-diverging`, `internet-penetration-choropleth`,
`startup-funding-datapoor`. **Fixes des cycles précédents validés au rendu** (0 régression) : D (barre
Fribourg +8 gardée), I (légende `4 000 000 t`), C (3 coureurs marathon labellisés), flux export a/b/c
(proposé 4/5). Deux fixes mécaniques mergés (adversarial-review — les agents ont d'abord renvoyé des
stubs « test », **re-vérifié à la main** : seuil, tests, wiring) :
- **map-dw : join-key silencieux** — un `mapKeyAttr` erroné (`ISO_A3` vs vraie clé `DW_STATE_CODE` de
  `world-2019`, 0/10 lignes matchées) passait `validateMapSpec` sans warning → carte **grise sans
  données** publiée, marquée `produced`. Fix 2 leviers : registre `basemap-keys.ts` (clés réelles par
  basemap → `validateMapSpec` rejette une clé invalide) + garde produce `join-match.ts` (taux de match
  réel des LIGNES de données ; throw si < 50% → `status:failed`). **Subset-safe vérifié** (dénominateur =
  lignes de données, pas régions du basemap → une carte « 8 cantons » = 100% match, passe ; seule une
  jointure cassée = 0% échoue). 95 tests, API réelle correct-vs-cassé.
- **map-native : labels symboles coupés au bord** — « Indonésie » → « Indonés » au bord droit. Root :
  `text-variable-anchor` de MapLibre ne réancre que sur collision label-label, aveugle au bord canvas.
  Fix : primitive partagée `placeSymbolLabel` (miroir de `tooltip-clamp`) → flip right→left / clamp
  intra-viewport, ancre data-driven `text-anchor`, garde `changed` anti-boucle-idle. 553 tests,
  render-vérifié (avant/après).

Findings au backlog (bigger/flow/harness) : carte interactive choroplèthe dégrade en statique sur
données quasi-globales (clamp a11y bounded-nav) · titre qui revient au cadrage de l'article vs takeaway
confirmé (règle Gate 1b non obéie) · vidéo produite mais run closed-early sans registration de livraison ·
`suggest-chart` émet la clé `world`+`ISO_A3` cassée (attrapée au produce, à corriger à la source) ·
renderers symboles vidéo/scrolly encore en `text-variable-anchor` (même classe edge-clip).

### Passe backlog 2026-07-10 — 4 issues confirmées vérifiées puis corrigées

Sur demande Rémy (« remonte les bugs puis corrige-les ») : vérif de chaque item backlog **dans le code**
(réel vs bruit), puis fix des 4 confirmés mécaniques (parallèle, review **manuelle** — les agents de
review avaient renvoyé du stub au batch précédent). Mergés, gate 16/16 :
- **#3 `suggest-chart` clé de jointure world cassée** — émettait `world`+`ISO_A3` (0 région ; DW API live :
  `world-2019` n'a pas d'`ISO_A3`, la clé ISO-A3 est `DW_STATE_CODE`). Corrigé à la source (SKILL.md +
  fixtures eval → `world-2019`+`DW_STATE_CODE`, warn explicite). **map-native laissé intact** (il utilise
  son propre `world.geojson`, ISO-A3 en `regionKey`, correct). e2e API réelle 12/12 join, rendu coloré.
- **#4 labels symboles coupés au bord en vidéo/scrolly** — `SymbolReveal/Story/Scrolly` encore en
  `text-variable-anchor` (aveugle au bord). Primitive partagée `assignSymbolLabelAnchors` (SymbolMap la
  single-source aussi) ; Reveal = compute-once au load idle, Story/Scrolly = recompute par frame. Test de
  parité (aucun renderer symbole n'utilise plus `text-variable-anchor`). Locator déféré (modèle différent).
- **#5 map-dw symbole nombres bruts** — tooltip en `{{ col }}` brut (DW substitue verbatim → « 2100 »).
  Corrigé via l'expression DW `{{ FORMAT(col, "0,0.[00]") }}` + `legends.color.labelFormat`, locale threadée.
  Rendu API réelle : légende `4 000 000`, tooltip `Paris / 4 000 000 t`. (Chemin bas-trafic : `produceMap`
  route les symboles vers map-native — corrigé quand même.)
- **#7 réserve source double-comptée** — **23** charts (pas ~10) baquaient leur clearance dans `basePad`
  EN PLUS de la réserve partagée `sourceFooterReserve`. Chaque `basePad.bottom` = furniture seule ;
  Waterfall reste le seul opt-out. Audit **ALL GREEN 539 renders** (re-vérifié moi-même — garde anti-collision).

Différés avec raison (backlog) : dégradation interactif→statique quasi-global (arbitrage a11y) · titre vs
takeaway (pas de levier mécanique propre) · Locator edge-clamp · vidéo closed-early. #6 (embed en forme 1)
résolu par le flux export a/b/c.

## État 2026-06-23 (fin de session)
- **MERGÉ dans `main`** : Tranche 1 (boucle dw-chart) + Tranche 1.1 (22 types + garde-fous) + **② suggester runtime + harness d'éval**.
- ② : procédure runtime dans `suggest-chart/SKILL.md` ; éval `skills/suggest-chart/eval/` (scoreSpec pur + family-types + 8 cas + judge.md). Baseline auto-noté : 8/8 gate, 0.93/0.96 éditorial. **Lien ②→dw-chart prouvé live** (`eval/e2e-proof.md`, chart publié réel).
- **Caveat honnête** : baseline auto-noté (② = juge), à re-valider sur des cas non écrits-pour-réussir.
- **Prochains cuts** : ② `article → où/quel` (lecture d'article) ; puis le skill **map** (couche geo-prep commune + renderers static/interactif/vidéo) ; puis vidéo. Le seam `Spec→mapper→client→produce` est le template.

## Cadrage 2026-06-23 — ON CONÇOIT POUR TOUTE PETITE NEWSROOM (pas Annemasse)
**Décision Rémy, prioritaire :** Atelier se construit pour **toutes les petites rédactions, génériquement**. Annemasse = le livrable-pilote de la bourse, PAS une contrainte de design ni une dépendance de validation. **Ne PAS attendre de retours de Heidi/Annemasse.** Les corpus d'éval (ex. gold-standard du cut lecture-d'article) sont **rédigés par nous, sur des articles-types génériques, ancrés dans les best-practices (la KB)** — assumé auto-référentiel, mitigé par le grounding best-practice ; le harness est un instrument d'amélioration *relative*, pas de vérité absolue.

## Cut ② lecture d'article — SPEC MERGÉ (design only)
`docs/superpowers/specs/2026-06-23-suggester-article-reading-design.md`. Approche : ② lit `article+données` → `ProposalSet` de propositions vetoables (`claim + data + intent`, sans family) → chaque proposition acceptée alimente le runtime `data+intention→ChartSpec` déjà construit. ② **lie data↔claim lui-même**. Éval = `scoreProposalSet` (dataValid via validateChartSpec + provenanceOk + count + recall/precision lenients) + LLM-juge (rightPlace/rightDose/dataFit). **PROCHAIN : plan + build de la 1re tranche.**

## État (cut lecture-d'article MERGÉ)
- **MERGÉ dans `main`** : ② article-reading 1re tranche. `skills/suggest-article/` : SKILL.md (`article+données → ProposalSet`, ② lie data↔claim, propositions claim+data+intent vetoables sans family) + éval `scoreProposalSet` (dataValid + provenanceOk + recall/precision lenients, **6 tests**) + 4 cas génériques + judge + runner + baseline (auto-noté, instrument relatif) + e2e-proof.
- **Suite totale `main` : 46 tests** (6 suggest-article + 8 suggest-chart eval + 32 dw-chart vraie API). Vérifiés à la main.
- **Lien article→chart re-prouvé indépendamment** (cas festival-recap, chart réel produit puis supprimé) — pas seulement le rapport de l'agent.
- **Caveat assumé** : baseline auto-référentiel (on écrit cas+gold, ② et juge = agents). Instrument d'amélioration relative. Prochain renfort = diversifier le corpus sur des cas non écrits-pour-réussir.
- **Prochains cuts** : ② → CADRAGE (questionnaire d'intention) ou directement le skill **map** (geo-prep commun + renderers) ; puis vidéo Remotion.

## Boucle d'amélioration ② — exemple loggé (2026-06-23)
- Faire tourner la **vraie chaîne de skills** (suggest-article → suggest-chart → dw-chart) sur `town-growth` a révélé un **bug réel** : ② sortait un small-multiples (multiple-lines + transpose) au lieu d'une tendance multi-séries.
- Root cause = trou KB : `chart-selection.md` + le guardrail transpose de `suggest-chart/SKILL.md` étaient ambigus sur « tendance multi-séries dans le temps ».
- **Fix** (mergé) : `d3-lines` multi-colonnes SANS transpose pour les tendances temporelles ; transpose réservé aux stacked/grouped catégoriels. Re-vérifié via les skills → chart de tendance correct.
- **Leçon clé** : le gate déterministe (`validateChartSpec`/`scoreSpec`) NE PEUT PAS attraper « spec valide mais sémantiquement faux pour la donnée ». Seul l'œil / le LLM-juge sur le rendu l'attrape. → toujours re-vérifier via les vrais skills + le rendu, pas à la main.

## Backlog — petits fixes connus
- **Annotation parfois coupée (rognée)** : sur certains charts, le `text-annotation` est tronqué hors-cadre (vu sur `town-growth` : « France peak » coupé en bas-droite). Cause probable : `align:"bl"` par défaut + position (`x`,`y`) près d'un bord, sans clamp dans la zone visible. Piste : dans `skills/dw-chart/src/spec-to-metadata.ts` (mapping `text-annotations`), choisir l'`align` selon la position (éviter de pousser le texte hors-cadre près des bords) et/ou ajouter un offset. Petit fix, non bloquant. À éprouver visuellement via les skills.
- **Collision label de série ↔ annotation** : sur un d3-lines, l'annotation de fin (« 31 days ») chevauche le label direct de la série (« wait_days »). Lié au fix annotation ci-dessus (placement/align). Trouvé via vérif-rendu sur `clinic-waits`.
- **Unité non explicitée** : données en milliers/millions affichées brutes (« 1.8 » pour 1.8M, « 26 » pour 26k). Piste : ② devrait mettre l'unité dans `intro` (« en millions ») ou un suffixe de format. Trouvé sur `school-budget`/`town-growth`.
- **Note qualité ②** : titres parfois avec coquille (« this years » sans apostrophe) — artefact de génération, à surveiller via le LLM-juge, pas un fix code.
- **Gate de confirmation prose = contrat social, pas mécanique** : le SKILL.md exige de montrer la table reconstruite + OK humain avant `suggest-chart`, mais rien ne l'impose dans le code. Un vrai déploiement doit l'imposer côté UI/orchestration. Trouvé via test-système end-to-end (article VE).
- **② ne produit qu'UN visuel, les propositions secondaires tombent silencieusement** : sur l'article VE, la 2ᵉ histoire (tendance 2020→2023) a été abandonnée. Le SKILL.md autorise jusqu'à 3 propositions ; surfacer/produire les autres si le journaliste les accepte. Design, pas quick fix.

## Cut map (Datawrapper) — MERGÉ (choropleth)
- **MERGÉ dans `main`** : `skills/map-dw/` — choropleth DW, **réutilise le client `dw-chart/datawrapper.ts`** (pas réécrit) via le seam `MapSpec → spec-to-map-metadata → produceMap`. 26 tests. e2e live conservé : https://datawrapper.dwcdn.net/vZRmO/1/
- **Binding** : `visualize.basemap` + `visualize["map-key-attr"]` (clé de jointure du basemap) + `axes.keys`(colonne région)/`axes.values`(valeur). 4497 basemaps via `GET /v3/basemaps` ; clés via `GET /v3/basemaps/{id}` → `meta.keys[].value`.
- **Couleur** : `visualize.colorscale = {mode, interpolation, colors:[{color,position}]}` — **JAMAIS de champ `stops` string** (ça rendait tout noir). Light→#0072B2.
- **Règle basemap-fit** (trouvée au rendu, comme transpose) : le basemap doit **épouser l'étendue des données** (UE→`europe-sovereign-states`, US→`us-states`…), pas `world-2019` pour une histoire régionale. `validateMapSpec` ne l'attrape pas — **seul le rendu**.
- **Différé** : symbol map + locator map (bindings différents). Le natif geo-prep (MapTiler/Cesium, Tom) = cut lourd séparé plus tard.
- **Suite totale `main` : 72 tests** (32 dw-chart + 8 suggest-chart + 6 suggest-article + 26 map-dw).

## Map DW — symbol + locator MERGÉS (famille DW complète)
- **MERGÉ dans `main`** : `map-dw` couvre maintenant **choropleth + symbol + locator** (MapSpec = union discriminée). 54 tests map-dw, **100 au total**.
- **Symbol map** (`d3-maps-symbols`) — par coordonnées, PAS region-join : `axes.lat`/`axes.lon` + **`axes.area` = colonne taille** (le champ qui manquait) + `axes.values` = couleur. (Mon spike échouait car j'utilisais le binding choropleth.)
- **Locator map** (`locator-map`) — marqueurs dans `visualize.markers` (`{type:"point", coordinates:[lng,lat], title, markerColor, icon}`), pas de data table ; le mapper calcule `view.center`+`view.zoom` (`fit:false`) sinon ça cadre le monde entier (bug attrapé au rendu seulement).
- **Footgun basemap** : `us-states` valide mais **500 à la publication** → préférer `us-states-continental`. Noté dans SKILL.md.
- **Vérifié via le vrai skill + rendu** sur des cas neufs (France symbol, Arve locator, US-tech symbol). e2e live : symbol https://datawrapper.dwcdn.net/39yaG/1/ · locator https://datawrapper.dwcdn.net/Jb5NP/1/
- **Toute la famille map DW (light) est faite.** Reste différé : le natif geo-prep (MapTiler/Cesium — scrolly/3D/explorable, le chemin de Tom).

## Map DW — tooltips symbol + locator MERGÉS (+ leçon vérif interactive)
- **MERGÉ** : symbol + locator ont maintenant un hover tooltip. Symbol = `visualize.tooltip {enabled, title:"{{col}}", body:"{{col}}", fields:{...}}` — **chaque `{{token}}` DOIT être déclaré dans `tooltip.fields` sinon vide** (≠ choropleth qui utilise `%REGION_NAME%`). Locator = `tooltip:{enabled:true}` par marqueur (le title s'affiche).
- **LEÇON (4e du genre) : un PNG statique ne peut pas montrer un hover.** On avait validé les maps au rendu statique → angle mort sur l'interactif. Trouvé par Rémy en ouvrant les charts live. → Pour tout output **interactif**, vérifier le **comportement live au navigateur (Playwright hover + screenshot)**, pas juste le rendu ou les métadonnées.
- Vérifié live : symbol https://datawrapper.dwcdn.net/Ud7sZ/1/ · locator https://datawrapper.dwcdn.net/YqI3y/1/ · captures hover dans `output-proof/` + Desktop.

## map-native — proportional symbol = 2e type MapTiler MERGÉ ★ 1er de la série
- **MERGÉ dans `main`** (`f36a607`, 2026-06-29) : `map-native` couvre maintenant **choropleth + proportional symbol**. 2e type sur la recette (cœur géométrique pur → 1 composant piloté par `progress` → static/interactif/vidéo → garde de conformité), il a forcé l'extraction du **cœur point-based** (lat/lon, sans region-join) : `src/symbol-geo.ts` (sizing **aire-proportionnel** `r∝√value`, tri décroissant, légende à cercles emboîtés) + `src/symbol-labels.ts` (labeling direct). Discipline subagent-driven (6 tâches + addendum), 80 tests, 3 formats vérifiés à l'œil.
- **LEÇON (re-gravée) : regarder CHAQUE format ré-rendu.** Un fix attribution a fait disparaître les cercles en vidéo (retrait du gate `mapReady` → l'effet per-frame ne se re-déclenche pas dans le rendu Remotion frame-fixe). Attrapé au still, pas aux tests. Le gate `mapReady` est REQUIS pour le reveal vidéo.
- **LEÇON (retour Rémy) : la donnée doit être lisible SANS survol.** 1ère version = ronds non étiquetés (valeurs seulement au hover) → illisible en static/vidéo. Fix système : **labeling direct nom+ville+valeur** (couche GL `symbol`, halo blanc, anti-collision `text-allow-overlap:false`), câblé dans les 3 formats + **règle de conformité `labeled`** (ne pourra plus régresser) + référence `knowledge/references/map/types/proportional-symbol.md` rule 6. Vérifié à l'œil : London 296 / Paris 181 / Madrid 124 / Berlin 88 / Rome 67 / Amsterdam 52.
- **Conformité = garde test-only** (comme `checkChoroplethConformance`) : aucun call-site au rendu ; à câbler dans produce un jour (dette partagée, hors scope).
- **Différé (polish symbol)** : placement value-inside-gros-cercle (texte blanc) + nom au-dessus (champ `placement` retiré car non câblé v1) · légende de taille en vidéo · anti-collision cartes denses (>~30 pts) · geocoding noms→coords · bivarié taille+couleur · câblage `suggest-visual` ("comptages à des lieux → symbol") en passe groupée après 2-3 types points.
- **Prochains types MapTiler** (recette identique) : flow/route (spike RiverReveal à finir), dot-density, locator, hex/grid, cartogram, contour.

## map-native — lisibilité & navigation (slice A+B) MERGÉ ★ « c'est une carte, pas un chart »
- **MERGÉ dans `main`** (`2a30d78`, 2026-06-29). Retour Rémy : « pas lisible sur la map + il manque le côté navigation ; c'est une map pas un chart ». Fix système :
  - **Labels À CÔTÉ du symbole** (plus dessus) : `text-variable-anchor:["left","right","top","bottom"]` + `text-radial-offset` par-feature (`labelOffset = labelRadialOffset(radius, textSize)`, helper pur testé) → le moteur pose le label hors du cercle, choisit le côté libre (anti-collision + flip bords). Halo blanc. Câblé `SymbolMap` (static/interactif) + `SymbolStory` (vidéo).
  - **Taille label scalée par ratio vidéo** : `labelTextSize = width<=1080 ? 18 : 13` → portrait/carré lisibles (le « illisible en portrait »).
  - **Navigation interactive** : `makeResetControl` extrait dans `src/controls.ts` (partagé choropleth+symbol, DRY) + `NavigationControl` ; pan/zoom/reset vérifiés live (Playwright : pan, scroll, reset retourne à l'étendue).
- **Principe gravé (mémoire `feedback_capability_not_default`)** : quand un feature a plusieurs traitements valides (modes caméra vidéo : tour / zoom-out / pan / 3D), NE PAS coder un défaut — construire la capacité paramétrée, l'IA choisit par l'article. Vaut pour tous les types de map.
- **RESTE — slice C (designé, pas construit)** : **système de modes caméra vidéo** (tour guidé ville par ville / zoom-out depuis le leader / pan cinématique / survol 3D différé), choisi par l'intention de l'article, sur l'infra `map-story.ts`+`story-timeline.ts` existante (déjà beat-driven frame-déterministe). Spec à écrire quand on l'attaque. Note : `text-allow-overlap:false` peut masquer des labels sous une caméra zoom-out → à gérer dans la slice C.

## ★ PROGRAMME PARITÉ maps↔charts — « le même dispositif que les charts, pour les maps sous tous les formats »
- **Origine** : retour Rémy — « le titre est sur des valeurs et doit pas sortir de l'écran vidéo » puis « récupère le process/la recette des charts pour faire pareil pour les maps et tous leurs formats, on assurera un bon résultat en prod ». Cartographie du gap chart-native↔map-native faite (synthèse : core pur OK, mais manquaient frame partagé, scaling format, conformance format-aware+cadrage, harnais vérif multi-largeur+a11y, KB). Découpé en **4 slices**, séquence 1→2→3→4.
- **Slice 1 — MapFrame MERGÉ** (`745f31c`, 2026-06-29) : porté le triptyque chart `tokens`→`resolveFrame`→`ChartFrame` aux maps : `src/theme/map-tokens.ts` (FRAME_TYPE/FONT/COLORS) + `src/core/map-format.ts` `resolveMapFrame(w,h)` (pur, 9 tests : `scale` par canvas + `pad` safe-area asymétrique) + `src/core/MapFrame.tsx` (shell partagé : titre bande-haute + **source TOUJOURS rendue, vidéo incluse** — absente avant). Câblé aux 4 composants (ChoroplethMap/SymbolMap/ChoroplethStory/SymbolStory), `frame.pad`→`fitBounds` → titre-non-sur-donnée + rien-hors-cadre par construction. Vérifié à l'œil sur **les 2 types × tous formats**. LEÇON re-confirmée : un wrap conditionnel `if(title&&source)` = anti-pattern qui démonte le canvas MapTiler (blanc) → wrap inconditionnel ; et un artefact PNG périmé m'a fait croire à une régression → toujours re-render avant de juger.
- **Slice 2 — Conformance parité MERGÉ** (`8953326`, 2026-06-30) : `checkGlobalMapConformance` (L0 partagé extrait des 2 checks par-type — titre <12/year-range/**ALL-CAPS nouveau**/description/source name+url/contraste WCAG) + `checkMapFraming(format,title,…)` **format-aware** (via `resolveMapFrame` : titre tient dans la largeur scalée, bandes titre/source réservées, **source présente** — attrape le cas vidéo-sans-source au niveau format) + hook optionnel `format?:{width,height}` sur les 2 checks (back-compat). Pur, 107 tests. Garde reste test-only (câblage produce = dette partagée différée).
- **Slice 3 — Harnais de vérif MERGÉ** (`6e39fe9`, 2026-06-30) : `scripts/snap-responsive.mjs` (build interactif singlefile via file://, 4 largeurs 360/768/1100/1600, asserte no-overflow + titre/source/légende in-viewport via `data-testid` map-title/map-source/map-legend, exit≠0 si échec) + `scripts/snap-a11y.mjs` (role=region+aria-label, lien source href, ≥2 boutons contrôles clavier, popup au hover — layer-dispatched comme snap-proof), câblés dans `produce.mjs` (échec → produce échoue). Fix au passage : **SymbolMap n'avait pas `role=region`** (révélé par le harnais), ajouté. Vérifié en exécutant sur symbol ET choropleth + 360 à l'œil. A11y = niveau-conteneur (canvas GL, focus par-mark N/A).
- **Différé slice-3 (→ 1er commit slice 4)** : porter le grid-scan fallback de `snap-proof.mjs` dans le path symbol de `snap-a11y.mjs` (résilience, l'assertion marche déjà sur les samples).
- **Slice 4 — KB parité MERGÉ** (`846ebaa`, 2026-06-30) : `knowledge/references/map/design-conformance.md` (checklist globale map, 8 règles sourcées + cross-ref code réel) + `knowledge/references/map/types/choropleth.md` (ref type, miroir de proportional-symbol.md, cross-ref `checkChoroplethConformance`). Cross-refs vérifiés réels, URLs réelles seulement.
- **★ PARITÉ maps↔charts COMPLÈTE** (4/4 slices, 2026-06-30) : MapFrame (frame partagé titre-safe + source + scaling format) · Conformance (L0 partagé + format-aware + cadrage/lisibilité) · Harnais vérif (snap-responsive + snap-a11y câblés dans produce) · KB (global + choropleth). Les maps ont maintenant le même dispositif qualité que les charts, sur tous les formats. **Reste différé (hors parité)** : refs formats map (`map/formats/`), grid-scan fallback symbol dans snap-a11y, câblage conformance dans produce (dette partagée avec les charts).
- **Dette pré-existante notée** (hors scope, à ticketer) : `bunx tsc --noEmit` échoue dans map-native faute de `@types/react-dom` (`tsconfig types:["react","react-dom"]`) — empêche un gate tsc sur les futures slices.

## Module unifié chart-native — MERGÉ (un composant → 3 formats) ★ jalon archi
- **MERGÉ** : `skills/chart-native/` — **UN composant React+D3, piloté par `frame`** → **static + interactif + vidéo**. La vision « un module web → tous les formats » est prouvée.
- **D3 = maths** (`chart-geometry.ts` pur, framework-free, porté du pilote chart-annotated, + `revealLine(layout, progress)` déterministe). **React = DOM** (car **Remotion = React only, PAS Svelte**). 3 dérivations : static (Vite build + Playwright snapshot), interactif (`vite-plugin-singlefile` → 1 HTML + tooltip), vidéo (Remotion composition `frame→Easing.inOut(cubic)→progress→le même composant`).
- **Discipline Tom appliquée** : animation = fonction PURE de `frame` (pas d'horloge/random), valider 1 still avant le mp4, `--gl=angle`. Test-contrat `reveal-contract` : static(p=1) ≡ frame finale, repro par frame, pas de NaN sur 180 frames.
- **Vérifié à l'œil sur les 3 sorties** (static PNG, hover interactif live, 4 frames vidéo extraites du mp4). Best-practices conformes (Okabe-Ito, titre-insight, label direct, nombres abrégés, source, alt).
- **DW reste le fallback no-code rapide** (statique + interactif léger). chart-native = le chemin riche unifié.
- **Différé** : généraliser le patron (cœur pur → 1 composant → 3 renderers) aux autres types de charts (line seul pour l'instant) ; puis les maps web (MapLibre → 3 formats).
- Remotion : ~174 packages (node_modules gitignored), render via npx/node (la seule exception non-Bun acceptée).

## chart-native = moteur de charts natifs (3 types, core extrait) — MERGÉ ★ jalon
- **MERGÉ dans `main`** : `chart-native` n'est plus mono-type. **3 types** sur la recette prouvée (cœur géométrique pur → 1 composant React+D3 piloté par `progress` → static + interactif + vidéo + garde de conformité) :
  - **line** (tendance, la ligne se trace), **bar** (magnitude/ranking, baseline 0, les barres poussent), **scatter/bubble** (corrélation, axes non-zéro, bulle = aire via `scaleSqrt`, les points popent).
- **`src/core/` extrait** (le palier partagé, fait au 2e/3e type, pas deviné) : `math` (format/easings/stagger), `tokens` (Okabe-Ito), `conformance` (garde globale L0 + checks par-type composés), `InteractiveChart` (LE wrapper responsive+reveal, ResizeObserver+rAF+reduced-motion), `ChartFrame` (LA coquille titre/sous-titre/source). → **un nouveau type = géométrie + le SVG + 1 règle de conformité**, le reste hérité.
- **KB en couches réelle** (la vraie idée de Rémy, façon atomic-design) : `knowledge/references/` = global (`design-conformance.md`) → `chart/types/{line,bar,scatter}.md` → `formats/{video,interactive}.md`. Sourcée (FT Visual Vocabulary, data-to-viz, skills Remotion de Tom, WCAG). **Le code matérialise les couches au fur et à mesure ; la KB peut être complète.**
- **Modèle archi figé** : couches = ingrédients (KB + code), composées en silence. Skills = capacités au grain job (skill-group × format). On NE fait PAS un skill par couche. Un livrable = union(global ∩ famille ∩ type ∩ format).
- **Conformité gardée** (`conformance.ts` = l'équivalent natif de `validateChartSpec`) : Okabe-Ito, contraste WCAG réel ≥4.5:1, titre-insight, source nom+url, baseline-0 (bar), axes labellisés (scatter). Tests négatifs prouvent qu'elle attrape les violations. a11y : points focusables clavier (tooltip au focus, pas que hover) + source liée.
- **Best practice labels scatter** : `annotate` (② nomme les points de l'histoire) ; défaut = l'outlier ; placement anti-collision 4 positions + **leader lines** courtes pour un point de cluster, sinon skip (jamais de chevauchement, jamais dans la marge des axes). Le nuage parle par sa forme — pas besoin de tout labelliser.
- **69 tests**, tout **vérifié à l'œil sur les 3 formats à plusieurs largeurs** (static 360→1600 + vidéo).
- **LEÇON (répétée, gravée)** : « j'ai codé le fix » ≠ « le rendu est bon ». Il faut regarder **chaque format à chaque largeur** ET **la marge des axes** avant d'affirmer. Mes claims labels-scatter étaient faux 3× parce que je n'avais pas balayé responsive + vidéo + collision-axes. Rémy m'a fait re-vérifier à chaque fois.
- **Différé / prochains pas** : palier cartésien-axes (gridlines/ticks partagés = prochain L1) · 4e type FT (area, lollipop…) · maps web (MapLibre → 3 formats) · CADRAGE.
- **Vidéo multi-format — FAIT** : `core/format.ts` (`resolveFrame`) scale la typo/marges par `scale` et centre le plot à un ratio sain ; `scale` câblé dans les 3 composants + ChartFrame. Compositions Remotion paysage (840×480) + **carré 1080×1080** + **portrait 4:5 1080×1350** pour les 3 types (LineSquare/LinePortrait, Bar*, Scatter*). Paysage prouvé inchangé (le centrage ne se déclenche pas quand availH < idealH). Vérifié au rendu (portrait line/bar/scatter lisibles, titre 2 lignes sans chevauchement, bulles/texte scalés). 9:16 (1080×1920) rendable aussi via une compo si besoin.

## suggest-visual routing — COMPLET (4 formats routés depuis un article) ★ jalon
- **MERGÉ dans `main`** (`c1c6189`, 2026-06-29) : le routeur `suggest-chart`/`suggest-visual` choisit maintenant l'**élément** (chart vs map, Gate 5) + le **format** (statique / interactif / vidéo / scrolly) + un discriminant `producer`. Les 4 formats sont routés et prouvés live e2e :
  - **chart** → `dw-chart` (statique) / `chart-native` (interactif/vidéo) — ranking EV → barres.
  - **map statique** → `map-dw` (MapSpec) — gradient EU renouvelables → choropleth `2C3f2`.
  - **map native** → `map-native` (ChoroplethConfig, interactif Gate 2 / vidéo Gate 4) — "trouve ton pays" → carte explorable + 3 mp4.
  - **scrolly** → `scrolly` (réutilise ChoroplethConfig + `validateChoroplethConfig`, Gate 3 narratif séquentiel) — "nord→sud, un pays à la fois" → `scrolly.html` 5.5 MB vérifié à l'œil (establish full map → flyTo Norway "99%, the highest of the 8 shown").
- **Gate grounded, pas un knob** : la décision élément/format est le **jugement de l'IA**, ancré dans `knowledge/references/formats/format-selection.md` (Gate 0→5). Jamais une question à l'utilisateur. `scoreSpec` (`eval/score.ts`) est le gate déterministe : `isMap = producer ∈ {map-dw,map-native,scrolly}`, mismatch `expect.producer` → fail, `map-native|scrolly` → `validateChoroplethConfig`, `map-dw` → `validateMapSpec`.
- **scrolly v1 = map-based** ; le scrolly chart (histoire non-géo en scroll) est différé jusqu'à ce que chart-native se branche sur l'orchestrateur scrolly.
- **Prochaine phase (décidée Rémy)** : couvrir **tous les types de map MapTiler** dans `map-native` (proportional symbol, flow/route, dot-density, hex/grid, cartogram, contour, locator) un par un via la recette — comme les 41 types de chart-native.

## Backlog (suggest-visual map routing — deferred from slice-1 review)
- **`producer` discriminator is convention-only (TS-invisible)** : la SKILL.md fait émettre `producer:"map-dw"` et `score.ts` le lit, mais `ChoroplethMapSpec` n'a pas ce champ → un spec typé le perdrait à la compilation. Fix futur : ajouter `producer?:"map-dw"` au type (ou une union discriminée au niveau `MapSpec`). Marche au runtime (champs extra non rejetés).
- **Cas eval manquants** : "absolute counts (not rates) → bar" et "régions géo mais aucun basemap ne matche → bar fallback" (le cas `regions-no-basemap` teste 'pas de structure géo', pas 'géo sans basemap'). À ajouter pour couvrir Gate 5 à 100%.
- **Nettoyer les trailers `Claude-Session:` de l'historique avant la sortie MIT** : des commits de la session 2026-06-29 portent un trailer `Claude-Session: https://claude.ai/...` (mention Claude → viole la règle de publication). Décision : arrêté à partir de là, pas de réécriture immédiate ; scrubber les messages (filter sur `Claude-Session:`) avant le push public / la sortie MIT sept-oct 2026.

## scrolly — symbol scrolly MERGÉ (parité scrolly choropleth↔symbol)
- **MERGÉ dans `main`** (`d8eb8eb`, 2026-06-30) : le moteur `skills/scrolly` n'est plus choroplèthe-only. `map-native/src/symbol-story.ts` `deriveSymbolStory(points, meta)` produit la **même forme `Beat`** que `deriveMapStory` (camera=bbox ; title→establish→reveal chaque ville tri valeur-desc→takeaway) → `mapStoryToChapters` réutilisé tel quel. `scrolly/src/ScrollySymbolMap.tsx` rend cercles+labels (réutilise `symbolGeometry`/`symbolLabels`), caméra qui vole ville par ville au scroll (mirror `ScrollyMap`). `Scrolly.tsx` dispatch sur `config.type`, **back-compat choroplèthe** vérifié. Vérifié au rendu : establish 6 villes → vol vers Madrid « 124$bn ». Padding caméra 64 pour que le plus gros cercle ne clip pas.
- **Matrice type×format symbol désormais complète** : static · interactif nav-libre · vidéo L/C/P · **scrolly** ✅.
- **Différé** : tour-caméra vidéo symbol (réutiliser deriveSymbolStory), highlight/dim ville focus, routage suggest-visual du symbol scrolly, scrolly des futurs types (flow…).

## map-native — qualité de rendu (Group A, 7 fixes) MERGÉ + couche KB format créée
- **MERGÉ dans `main`** (`aefc003`, 2026-06-30). 7 retours Rémy traités, chacun = **code + conformité/harnais + KB à la bonne couche + vérif rendu sur les 2 types** :
  1. static sans controls : isolation des builds `produce` par run (`dist/<kind>-<tag>` via `BUILD_OUT`, snaps lisent `SERVE_DIR`) + garde `snap-static` (0 control nav) → la prod échoue si un static montre un control. *(le vrai bug était la contamination `dist/` partagé, pas le défaut mount)*
  2. donnée jamais sous titre/légende : `resolveMapFrame` réserve la vraie `legendHeight` dans `pad.bottom` + règle `checkMapFraming`.
  3. unité dans les labels valués (`labelText += valueUnit`) + règle `checkSymbolConformance` `labelHasUnit`.
  4. gutter titre static (`MapFrame` 16px×scale) + assertion `snap-responsive`.
  5. interactif tooltip XOR labels (couche `symbol-labels` seulement si `!interactive`).
  6. interactif nav bornée : `maxBounds` (bbox +15%) + `minZoom`(zoom de fit).
  7. interactif responsive : `ResizeObserver` → `map.resize()` + re-`fitBounds` (carte recentrée, zoom adapté).
  + **fix pré-existant** : `clampBounds` (lat ±85° mercator-safe) → le choroplèthe **charge enfin à 360px** (crash `Invalid LngLat` éliminé).
- **★ Couche KB par-format map créée** : `knowledge/references/map/formats/{static,interactive,video}.md` (miroir des charts ; manquait depuis slice 4). Le KB map a maintenant les 3 couches : global + par-type + par-format. `video.md` alimente le Group B.
- **Principe gravé (mémoire `feedback_system_improvement_loop` mise à jour)** : tout retour = 4 livrables couplés (code + conformité + KB **à la bonne couche** global/type/format + harnais), écrit/distribué au bon endroit, comme les charts.
- **RESTE — Group B** : vidéo storytellée (système de modes caméra `reveal-simple | guided-tour | …` choisi par l'IA selon l'article ; réutilise `deriveMapStory`/`deriveSymbolStory` ; intègre l'aesthetic `map-explainer` de Tom — tracé qui se dessine + régions/villes en séquence) **+ scrolly sortable en vidéo**. Spec à écrire.

## ★ État courant — 2026-07-06 (LIS CECI EN PREMIER pour l'état de `main`)

Grosse session **audit + refonte** (~40 commits, tout mergé dans `main`), gate `bun run check` **14/14 vert**. Commits sans attribution vendor — les seules occurrences « claude »/« CLAUDE.md » sont des références FONCTIONNELLES au runtime / au fichier (le repo EST un `.claude-plugin`), pas des attributions ; traitées par le scrub pré-release.

**Sol technique (le plancher qui manquait) :**
- **CI + `bun run check`** racine (`scripts/check.mjs` : tsc des 4 skills à tsconfig + les **10 suites de test**, dont `skills/atelier` entier ET `docs/installer`) ; `.github/workflows/ci.yml`.
- **tsc réparé** sur `map-native` + `scrolly` : 220 erreurs → **0** (dont un vrai bug latent camera `LngLatLike`), `@types/react-dom`/`@types/node` déclarés, zéro `any` introduit.
- **LICENSE (MIT)** + **README** racine (manquaient — bloquaient la sortie MIT).
- test rouge `map-dw` réparé ; tests API `dw-chart` self-skip sans token (clean checkout vert).
- **`docs/RELEASE.md`** = checklist pré-release + **`scripts/scrub-trailers.sh`** (scrub des trailers `<vendor>-Session` — préparé, PAS exécuté ; à lancer au pré-release).

**Correction :** `map-native produce.mjs` défaut `static` (fin du footgun 9-renders vidéo) ; **i18n** — le suggester émet les libellés dans la langue de l'article (règles dans les 3 SKILL.md + KB `design-conformance.md`). F-color vérifié déjà résolu (note d'audit périmée).

**★ Spine d'orchestration déterministe (le gros morceau) — `skills/atelier/src/` + `scripts/` :**
- Conçu (spec `docs/superpowers/specs/2026-07-06-deterministic-orchestration-design.md`, **validé au feu adverse** → design rendu plus lean/honnête), planifié (`docs/.../plans/2026-07-06-deterministic-orchestration.md`), **construit en 7 tâches TDD sous-agents, chacune reviewée** (ledger : `.superpowers/sdd/progress.md`).
- `produce-all.mjs`/`produce-all.ts` : **boucle in-code drop-proof** (chaque proposition acceptée → rapport structuré, jamais droppée). `adapters.ts` : dispatch par producteur (file/cloud), `FALLBACK_TO_DW` via exit-2, **stdout capturé → rapport JSON pur**. `gate.ts`/`gate-render.mjs` : seul écrivain de `renderApproved` (sha256, audit-marker). `export-guard.ts` **câblé DANS** `export-code.mjs`/`deploy-embed.mjs` (refuse avant tout write/upload sauf produced + render-approved). `map-data.ts` : round-trip CSV RFC4180 — **pas encore consommé** (réservé au futur format-escalation).
- **Câblé dans `atelier/SKILL.md`** (PRODUCTION/EXPORT pilotent le spine : `accepted.json` → `produce-all` → statut → `gate-render` → export gardé) + **prouvé e2e sur un vrai chart Datawrapper** (a attrapé un vrai bug de chemin, corrigé — les outputs sont dans `exports/<slug>/<id>/`).
- **Le review-loop a attrapé de VRAIS bugs** (3 corruptions CSV, le gate qui ne lançait pas les tests, la pollution stdout, une commande cassée dans EMBED.md).

**★ Recadrage archi (Rémy, prioritaire) :** atelier = **NOUVEAU projet nourri par l'expérience viznews**, PAS une absorption/consolidation. On ne porte rien depuis viznews, on ne le touche pas.

**PROCHAINS follow-ons (session fraîche recommandée) :**
1. **conformance-au-produce — FAIT pour chart-native** (commit `ef362f6`) : `resolveConformanceColors` partagé + les 7 types couleur (line/bar/scatter/histogram/beeswarm/connected-scatter/lollipop) câblés dans `produce.mjs` → une violation **échoue le run avant de builder** (garde-fous à l'exécution, plus test-only). **★ A trouvé un vrai bug a11y live** : `OKABE_ITO.vermillion` (#D55E00) en **TEXTE** = 3.87:1 sur blanc (< WCAG 4.5:1), sur histogram + lollipop → **FIXÉ** : les labels rendent en `COLORS.ink` (le vermillon reste sur le MARK — ligne médiane / stem+dot ; emphase via poids bold), vérifié **au rendu** (histogram + lollipop), produce **fail-hard** maintenant (plus de warn), règle KB gravée (design-conformance.md item 7 : « le label porte la valeur, le mark porte la teinte »). **RESTE conformance** : (a) les **~34 autres types** chart (palettes bespoke non modélisées dans le résolveur) ; (b) **parité map-native** (résolveur + câblage produce).
   **Autre design-bearing (→ brainstorming)** : **couture 4→41 types natifs** (table-driven `spec-to-config` + test de complétude : seuls bar/line/scatter/pie sont atteignables de bout en bout).
2. **Contenu** : export-time hash enforcement + `produce-all` qui clear `renderApproved` au re-produce ; produire/surfacer les propositions secondaires acceptées (② n'en produit qu'une).
3. **Release MIT — gate mécanique `bun run release:check`** (`scripts/preflight-release.mjs` : LICENSE / README / REPO_URL confirmé / trailers scrubés / `.env` untracked ; **PAS** dans le `bun run check` quotidien — échoue tant que pas prêt ; actuellement **3/5**). **FAIT** : la clé installeur ne va plus dans `~/.zshrc` (elle vit dans le `.env` gitignored, sourcée au lancement `set -a && . ./.env && set +a`). **RESTE** (les 2 blockers que le preflight signale) : (a) confirmer le vrai `REPO_URL` public dans `docs/installer/generate.js` + retirer le TODO ; (b) `scripts/scrub-trailers.sh --yes` (destructif, au pré-release).
4. **Doc** : scinder ce CLAUDE.md (état-courant vs changelog) — l'audit l'a flaggé.

**Caveat honnête maintenu :** l'éval du suggester reste **auto-référentielle** (on écrit cas+gold ; ② et le juge = agents) → instrument d'amélioration *relative*, pas de vérité absolue. Renfort futur = corpus tiers + juge sur le **rendu** (pas le JSON).

## ★ Moteur natif de bout en bout — Plan 1 MERGÉ (couture 4→41 + invariant, témoin grouped-bar) — 2026-07-06

Mergé dans `main` (`0075b67`, merge --no-ff), `bun run check` **14/14 vert**, 0 mention vendor, 0 nouveau `any`. Spec `docs/superpowers/specs/2026-07-06-native-engine-end-to-end-design.md` + plan `docs/.../plans/2026-07-06-native-engine-end-to-end.md` ; 11 tâches TDD sous-agents, review par-tâche + review whole-branch (opus) = **ready-to-merge, 0 Critical**.

- **Problème réglé** : chart-native *dessine* 41 types mais seuls **4 étaient atteignables** depuis un article (`spec-to-config.ts` = switch 4 cases → le reste dégradait en DW statique silencieusement) et **7 gardés** au produce.
- **Mécanisme** : liste canonique exportée **`NATIVE_TYPES`** (source unique ; tue la duplication PREFIX/registries ; test de dérive `NATIVE_TYPES ≡ REMOTION_PREFIX ≡ 2 registries`) · **`validateShape` fail-loud** + `csv.ts` partagé (conventions de forme single/wide/paired/distribution) · **table `MAPPERS`** (les 4 legacy migrés **byte-identique**).
- **★ Invariant machine-vérifié** (`chart-native/tests/completeness.test.ts`, dans `bun run check`) : **reachable ⟹ conformance-guarded** (HARD) + non-deferred/non-legacy ⟹ mapper ∧ garde ∧ ref KB (FULL). **Non-vacant : a attrapé un vrai trou pré-existant — `pie` était reachable-but-unguarded → maintenant gardé.** Partition `mapped | deferred(raison)` ; exemption legacy visible+shrinking `LEGACY_KB_FAMILY_BACKFILL` (honnête, ≤4).
- **grouped-bar productionisé E2E** (témoin) : mapper wide-CSV + garde produce `seriesColors` bespoke (couleurs vérifiées = ce que le composant peint) + validation `nativeType` dans l'éval (`score.ts` branche `producer:"chart-native"`, **rejette les types deferred**) + ref KB + **render-vérifié au PNG** (titre non-rogné, axe à 0, 2 séries lisibles, Okabe-Ito, source).
- **★ DÉCOUVERTE (corrige une hypothèse du plan)** : le **KB chart est déjà riche** — **34 refs sourcées** existent au **repo-root** `knowledge/references/chart/types/` (pas dans le skill), fichiers en **noms d'affichage** (`grouped-bar.md`…). → la ref KB de grouped **préexistait** (Task 9 = vérif) ; test de complétude corrigé (path repo-root + map id→nom-affichage). **Implication roadmap : les prochains lots de types sont moins chers (KB surtout déjà faite).** Note : `chart-native/SKILL.md:~20` dit « no chart/types dir » = périmé (dette doc).
- **Discipline review a attrapé de vrais défauts** (tous corrigés) : le bug de path KB (pointait un dir inexistant), un test false-green (`try/catch` sans assertion hors-catch), un trou de dérive (set LEGACY hardcodé au lieu d'importer l'exemption shrinking).

**PROCHAINS (mis à jour) :**
1. **Couture — lots suivants** (recette prouvée = mapper + garde + entrée famille ; KB souvent déjà là) : **Plan-2 immédiat** = câbler le routage éval de native `line/scatter/pie` (aujourd'hui producer-reachable+guarded mais **pas scorables** : `NATIVE_FAMILY_TYPES` n'a que `magnitude:[bar,grouped]`) + cas de corpus natifs + renforcer le `validates` natif (parité avec `validateChartSpec`). Puis les sous-familles Famille A par forme (wide : stacked/slope/stacked-area/bump/pyramid/diverging-stacked/fan ; paired : dumbbell/connected-scatter ; distribution : boxplot/violin/beeswarm ; single : lollipop/waffle/treemap/diverging/waterfall/dot-strip/radial-bar/bullet).
2. **Conformance restante** : les ~34 types au produce se réduisent à *câbler la garde par type au fur et à mesure qu'il devient mapped* (l'invariant l'exige déjà) ; **parité map-native** (résolveur + câblage produce) = satellite séparé.
3. **Backlog dette** (hors couture) : `produce-from-spec.mjs` double-nest la sortie avec des chemins relatifs-repo-root + exit 0 trompeur (robustesse CLI) ; `SKILL.md:~20` périmé ; hash-enforcement export-time ; propositions secondaires ; release MIT (REPO_URL + scrub) ; scinder ce CLAUDE.md.

## ★ Native Batch 1 MERGÉ — line/scatter/pie routés + 4 types de plus E2E (9 types natifs atteignables) — 2026-07-06

Mergé dans `main` (`cd1e766`, merge --no-ff), `bun run check` **14/14 vert**, 0 mention vendor, 0 nouveau `any`. Plan `docs/.../plans/2026-07-06-native-batch-1.md` ; 5 tâches TDD sous-agents, review par-tâche + review whole-branch (opus).

- **A** — routage éval de native `line/scatter/pie` (`NATIVE_FAMILY_TYPES` += change-over-time/correlation/part-to-whole) + **`validates` natif renforcé** à parité DW (title ∧ source ∧ forme-données via `validateShape` en try/catch).
- **4 types productionisés E2E** via la recette prouvée (garde + KB **préexistants** → juste **mapper + entrée famille + flip + render-verify**) : **histogram** (distribution, obs. brutes), **lollipop** (single, `highlightLabel` brut), **connected-scatter** (paired, clé-temps col0 exclue des mesures, non-triée), **beeswarm** (distribution, catégorie = colonne texte **basse-cardinalité** ≤5, sinon single-hue). **Chaque render vérifié au PNG par moi** (histogram médiane-en-ink, lollipop ranking + highlight-mark, connected-scatter trajectoire ordonnée + 2 axes titrés, beeswarm 3 cats Okabe-Ito + outlier isolé).
- **★ La review whole-branch a attrapé 2 vrais défauts que les reviews par-tâche + mon plan ont ratés** : (1) **`suggest-chart/SKILL.md` périmé** — les 4 types étaient câblés en *code* mais le SKILL.md que lit le suggesteur (LLM) ne listait que bar/line/scatter/pie/grouped → le suggesteur ne les **émettrait jamais** (atteignables aux tests, pas depuis un article). **Sur-promesse fixée** : SKILL.md liste les 9 familles + notes de forme CSV par type. **LEÇON : un lot de types DOIT mettre à jour le SKILL.md** (fait pour grouped en Plan 1, oublié dans le plan du lot). (2) **beeswarm** faisait toujours de la colonne texte unique une catégorie → un `company,revenue` (>5 distinct) **échouait le produce** (>5 couleurs) ; **fixé** = dégrade en single-hue (colonne → label par-point) au-delà de 5.
- **Modèle figé** : 9 types natifs atteignables de bout en bout (bar/line/scatter/pie/grouped + histogram/lollipop/connected-scatter/beeswarm) × la matrice de formats (static/interactif/vidéo) héritée.

**PROCHAINS (mis à jour) :**
1. **Couture — types restants qui ont besoin d'une NOUVELLE garde** (pas déjà-gardés, donc plus chers : mapper **+ garde groundée dans le composant** + famille + flip + render-verify) : wide (stacked/slope/stacked-area/bump/pyramid/diverging-stacked/fan) · paired (dumbbell) · distribution (boxplot/violin) · single (diverging/waterfall/treemap/waffle/dot-strip/radial-bar/bullet). Famille B (sankey/chord/heatmap/gantt/candlestick/calendar/marimekko/streamgraph/radar/parallel/lorenz/arc/pictogram) reste `deferred(raison)`.
2. **Parité conformance map-native** (résolveur + câblage produce) = satellite ; hash-enforcement export-time ; release MIT (REPO_URL + scrub) ; scinder ce CLAUDE.md.

## ★ Native Batch 2 MERGÉ — stacked-bar + stacked-area (nouvelle garde + fix a11y) — 2026-07-06

Mergé dans `main` (`c35382d`, merge --no-ff), `bun run check` **14/14 vert**, 0 mention vendor, 0 nouveau `any`. Plan `docs/.../plans/2026-07-06-native-batch-2-wide.md`. **11 types natifs atteignables** (les 9 + stacked, stacked-area). 1er lot « **nouvelle garde** » : ces types n'avaient PAS de garde produce câblée.

- **Recette nouvelle-garde** (plus chère que batch-1) : **extraire la palette de séries** module-private du composant vers `core/tokens.ts` (pour que la garde peigne **exactement** ce que le composant rend — 3 palettes **distinctes** : grouped `blue-first`, stacked `black-first`, stacked-area `skyblue-first` ; réutiliser la mauvaise passerait `isOkabeIto` en silence) + case garde miroir de `grouped` (`compute*Layout`→valueDomain + `checkXConformance(seriesColors, textColors)`) + mapper wide + famille + flip + SKILL.md + render-verify.
- **stacked** (part-to-whole) : propre, légende ink. **stacked-area** (change-over-time) : **+ un vrai FIX a11y** — ses labels directs de bord droit étaient peints **dans la couleur de série** (skyblue ~1.9:1 → échoue WCAG) ; déplacés vers **`COLORS.ink`** (règle « le label porte la valeur, le mark porte la teinte », précédent vermillon). La review whole-branch a **audité chaque nœud texte** des 2 composants → aucune couleur-série peinte en texte → `textColors=[ink,muted]` honnête. Les 2 rendus **vérifiés au PNG par moi** (stacked : bars empilées noir/orange/skyblue somment ; stacked-area : composition-dans-le-temps, labels « renewables 210/gas 55/coal 15 » en **ink lisible**).
- **SKILL.md mis à jour cette fois** (leçon batch-1 appliquée) → suggesteur peut émettre les 2.
- **Backlog** (whole-branch, non-bloquant) : les gardes produce **throw** (au lieu de retourner une violation) si `compute*Layout` échoue sa précondition (ex. stacked-area avec 1re colonne non-numérique) — bruyant, miroir du rendu, ne mis-produit rien ; fix une fois au boundary `runProduceConformance` (try/catch→violation) si ça mord. Fragilité système : `textColors` codé en dur par-case → un futur edit ré-introduisant un label couleur-série passerait la garde en silence (attrapé seulement au render-verify) — discipline suffisante, enhancement mécanique noté.

## ★ Native Batch 3 MERGÉ — dot-strip + waffle + radial-bar (types single « propres ») — 2026-07-06

Mergé dans `main` (`7afdfd0`, merge --no-ff), `bun run check` **14/14 vert**, 0 mention vendor, 0 nouveau `any`. Plan `docs/.../plans/2026-07-06-native-batch-3-single.md`. **14 types natifs atteignables**.

- **3 types single « propres »** (scoutés : réutilisent le check existant + palette Okabe-Ito + AUCUN fix a11y composant) : **dot-strip** (distribution — garde groupe les lignes→categoryCounts ; KB **auteurée**), **waffle** (part-to-whole — palette `WAFFLE_CATEGORY_COLORS` extraite ; le mapper construit `items[]`), **radial-bar** (magnitude **cyclique** — mapper NE trie PAS ; KB **auteurée** ; note SKILL.md « cyclique seulement, sinon `bar` »). Les 3 rendus **vérifiés au PNG par moi** (dot-strip : spread par clinique + mean ticks ; waffle : grille 10×10 Coal38→Nuclear2 ; radial-bar : 24h en horloge, 2 pics orange commute).
- **Recette pour un type déjà-gardé-en-check-mais-pas-câblé** = mapper + case garde inline (réutilise `checkXConformance`) + palette (extraire si array module-private, sinon alias OKABE_ITO direct) + famille + flip + SKILL.md + KB (auteurer si absente) + render-verify. La review whole-branch a confirmé les 3 gardes **honnêtes** (reproduisent ce que le composant peint) et les 2 KB **sourcées** (URLs réelles vérifiées).
- **★ Découverte systémique (→ lot a11y dédié, session fraîche)** : le scout des single/paired restants a trouvé que **`diverging`, `dumbbell`, `waterfall`, `bullet`, `treemap` peignent tous les labels de valeur dans la couleur du MARK** (vermillon/orange < 4.5:1 sur blanc) — **même classe de bug WCAG que stacked-area**, sur plusieurs types. Chacun a besoin d'un fix composant label→ink. C'est un **lot a11y** à faire avec soin (option : enhancement mécanique du check pour attraper les labels-couleur-mark, pas seulement au render-verify).
- **Backlog contenu** : `DotStripChart` code en dur « Individual pupil »/« pupil » (reste d'un échantillon écoles) → wording générique pour réutilisation rédaction ; `parseCsv` mange le zéro de tête (« 00 »→0).

**★ ÉTAT — 14 types natifs atteignables** (bar/line/scatter/pie/grouped + histogram/lollipop/connected-scatter/beeswarm + stacked/stacked-area + dot-strip/waffle/radial-bar). **PROCHAIN** = soit le **lot a11y** (diverging/dumbbell/waterfall — fix labels + garde, plus valeur), soit les **wide bespoke restants** (bump/slope/pyramid/diverging-stacked/fan), soit un satellite (parité map-native, hash, release).

## ★ Lot a11y — garde de contraste au render (systémique) + 6 fixes composant + 3 types productionisés — 2026-07-07

Mergé dans `main` (merge --no-ff, branche `feat/native-a11y-contrast-harness`), `bun run check` **14/14 vert**, 0 mention vendor attributive, 0 nouveau `any`. Spec `docs/superpowers/specs/2026-07-07-native-a11y-contrast-harness-design.md` + plan `docs/.../plans/2026-07-07-native-a11y-contrast-harness.md` ; 12 tâches TDD sous-agents (11 planifiées + 1 ajoutée quand la garde a attrapé un 6e bug), review par-tâche + **whole-branch opus = READY TO MERGE, 0 Critical/Important** (a audité CHAQUE nœud `<text>` des 6 composants → aucun label couleur-mark résiduel). **17 types natifs atteignables**.

- **★ Décision de conception tranchée (brainstorming) : enhancement MÉCANIQUE, pas discipline manuelle.** La classe de bug (labels de valeur peints en couleur-mark, vermillon 3.87 / orange 2.25 < 4.5:1) était invisible à la garde produce (qui recevait `textColors` codé à la main). Fix système = **`scripts/snap-contrast.mjs`** : Playwright sur le build static, pour chaque `<text>` → masque le glyphe → échantillonne le **fond RÉEL** derrière (`elementsFromPoint`, 3 points, worst-case) → assert WCAG **≥4.5:1 uniforme** (nécessaire, pas juste conservateur : les bugs tombent dans la bande 3–4.5 qu'un check large-text 3:1 raterait). Helper pur `src/core/contrast-scan.ts` (`worstContrast`/`isContrastViolation`) réutilise `contrastRatio` de `conformance.ts`. **Câblé dans `produce.mjs` après snap-proof → un label couleur-mark échoue le run avant export.** Attrape toute la classe pour les ~40 types, mécaniquement, pour toujours. Limitations documentées in-code (fill-attribut seulement ; halo-sur-mark = faux-positif latent).
- **6 fixes composant label→ink** (règle « le label porte la valeur, le mark porte la teinte ») : diverging (`:235`), dumbbell (`:297,308`), waterfall (label-au-dessus `:288` **ET** la branche narrow-bar), bullet (`:271`, halo blanc conservé), slope (`:345,365`). **Chaque rendu vérifié au PNG par moi** (RED→GREEN au harnais par type).
- **★ La garde a PROUVÉ sa valeur** : en productionisant waterfall, elle a attrapé un **6e bug WCAG réel non prévu** — la branche narrow-bar peignait le label DANS la barre en blanc (`fill="#fff"` = 3.87:1 sur decrease vermillon). Watch-item **rapporté, pas absorbé** → Task 12 ajoutée (décision Rémy : label ink au-dessus de la barre, vertical avec fallback horizontal pour barres hautes anti-clip). Après ça, waterfall n'a **zéro** label sur couleur-mark.
- **Palettes extraites vers `core/tokens.ts`** (`DIVERGING_SIGN_COLORS`, `WATERFALL_ROLE_COLORS`, `DUMBBELL_DOT_COLORS`) → la garde peint EXACTEMENT ce que le composant rend (single source, pas de dérive).
- **3 types productionisés E2E** via la recette prouvée (garde-avant-mapper + mapper + famille + flip + SKILL.md + KB + render-verify au **vrai `produce-from-spec.mjs`**) : **diverging** (deviation, données croisant zéro), **waterfall** (bridge ; mapper gère la colonne `total` optionnelle + l'exclut de la sélection de valeur), **dumbbell** (paired ; les en-têtes des 2 colonnes numériques deviennent les labels de série). Nouvelle clé d'intention `deviation:["diverging","waterfall"]` ; dumbbell → `magnitude`. **bullet + slope : fixés + couverts-harnais mais restent `deferred`** (mappers lourds : bullet synthétise target/max/bands, slope 2-points — lot ultérieur).
- **Backlog (whole-branch, non-bloquant)** : (1) harnais — faux-positif halo-sur-mark + faux-négatif fill-CSS (documentés in-code, latents : les labels atteignables sont sur papier) ; (2) **WaterfallChart labels de catégorie longs rotés -40 débordent la marge basse** (collision ligne Source / clip gauche) — trou de framing/padding, PAS un bug de contraste, ticket séparé ; (3) mapper waterfall `label,total`-seul dégénéré ; (4) `conformance.ts` inline le littéral 4.5 au lieu d'importer `MIN_CONTRAST` (2 seuils pourraient dériver) ; (5) bruit reformat `resolveFrameWithHeader` dans les 5 commits de fix.

**★ ÉTAT — 17 types natifs atteignables** (les 14 + diverging/waterfall/dumbbell) + **garde de contraste systémique au render** (toute la classe label-couleur-mark attrapée mécaniquement). **PROCHAIN** = soit les **wide/single bespoke restants** (bump/pyramid/diverging-stacked/fan/treemap ; bullet+slope à finir de productioniser), soit un **satellite** (parité conformance map-native — le résolveur + câblage produce ; parité harnais-contraste côté map ; hash export-time ; release MIT REPO_URL+scrub ; scinder ce CLAUDE.md), soit le **fix framing** des labels de catégorie longs.

## ★ Group A fini — bullet + slope productionisés (19 types natifs) — 2026-07-07

Mergé dans `main` (merge --no-ff, branche `feat/native-group-a-bullet-slope`), `bun run check` **14/14 vert**, 0 mention vendor, 0 nouveau `any`. Spec `docs/superpowers/specs/2026-07-07-native-group-a-bullet-slope-design.md` + plan `docs/.../plans/2026-07-07-native-group-a-bullet-slope.md` ; 2 tâches TDD sous-agents, review par-tâche + **whole-branch opus = READY TO MERGE, 0 Critical/Important**. **19 types natifs atteignables** (les 17 + slope + bullet). Group A (les types du lot a11y) est **fini** : ils étaient déjà fixés a11y + couverts-harnais ; ce lot = couture seule (recette « check-existe-mais-pas-câblé »).

- **slope** (change-over-time, 2 points temporels) : palette `SLOPE_LINE_COLORS=[muted, vermillon]` extraite → garde `checkSlopeConformance` (accentColor + lineColors ≤2, pas de layout) → mapper (labelField=col0, left/right = 1er/dernier numérique, **périodes = les en-têtes de colonnes**, highlight=spec.highlight) → famille `change-over-time` → flip → SKILL.md (« exactement 2 points, sinon line »). **Render-vérifié E2E par moi** (turnout 2019→2024, ligne accent orange qui contredit la tendance, labels ink). *A fixé au passage un test-témoin périmé (`produce-conformance.test.ts` utilisait `slope` comme type-non-câblé → swap vers `bump`, vérifié encore deferred → non-vacant).*
- **bullet** (magnitude, mesure vs target) : palette `BULLET_MEASURE_COLORS=[blue, vermillon]` → garde `checkBulletConformance` (measureColors + rows→{target}, pas de layout) → **mapper à SYNTHÈSE** (l'article ne donne que `category,value,target`) : `target`=colonne nommée target sinon dernier numérique, `value`=l'autre, **`max`=`ceil(max(value,target)×1.15)`** (marge pour le marqueur), **`bands=[]`** = piste neutre unique (`geometry` : `edges=[0,...bands,max]`) → **AUCUN seuil qualitatif inventé** (décision Rémy, respecte « on ne génère pas d'intention » ; multi-bandes = différé) → famille `magnitude` → flip → SKILL.md (« target requise ; ne jamais inventer les bandes »). **Render-vérifié E2E par moi** (KPI 4 régions, piste neutre, HIT bleu / MISS vermillon corrects, ticks target avec marge, labels ink).
- **Backlog (whole-branch, non-bloquant, tous fail-safe)** : (1) mapper bullet — `max≤0`/target non-numérique → `bullet-geometry` throw (fail-safe, bloque un mauvais rendu ; ajouter un précheck `validateShape` si ça mord) ; (2) slope/bullet prennent 1er/dernier numérique si >2 colonnes (silencieux — **même patron que dumbbell déjà en prod**, garde-fou = la note SKILL.md côté suggesteur) ; (3) cas dégénéré 1 seule colonne numérique → chart valide mais vide de sens (discipline suggesteur).

**★ ÉTAT — 19 types natifs atteignables** (les 17 + slope + bullet). **PROCHAIN** = soit les **bespoke restants Family A** (bump/pyramid/diverging-stacked/fan/treemap), soit un **satellite** (parité conformance + harnais-contraste map-native ; WaterfallChart labels de catégorie longs = framing ; hash export-time ; release MIT ; scinder ce CLAUDE.md).

## ★ Satellite — parité conformance-au-produce map-native (garde fail-hard, trou palette CVD fermé) — 2026-07-07

Mergé dans `main` (merge --no-ff, branche `feat/map-native-conformance-parity`), `bun run check` **14/14 vert**, 0 mention vendor, 0 nouveau `any`. Spec `docs/superpowers/specs/2026-07-07-map-native-conformance-parity-design.md` + plan `docs/.../plans/2026-07-07-map-native-conformance-parity.md` (les DEUX **révisés au feu adverse** — voir plus bas) ; 5 tâches TDD sous-agents, review par-tâche + **whole-branch opus = READY TO MERGE, 0 Critical/Important**. **Satellite, PAS un type de plus** : les 19 types natifs (charts) sont inchangés ; ce lot porte le plancher qualité `conformance-au-produce` des charts (`ef362f6`/`f5cb0d1`) vers le moteur **map-native** (les 7 types de carte : choropleth/symbol/route/locator/dot-density/hex-grid/cartogram).

- **Le vrai payoff — trou palette CVD fermé** : `checkPaletteConformance` (CVD-safety) n'était câblé que sur **choropleth** ; **hex-grid + cartogram** calculaient une ramp (`bins[].color`) mais ne la validaient jamais → une palette **custom-array** non-safe s'exportait. Poussé **dans les checks par-type** (`checkHexGridConformance` + `checkCartogramConformance`, feedback→système, règle durable du type) + parité validate-layer hex-grid (`palette` sur `HexGridConfigShape` + `paletteErrors`). Trigger = array custom (une palette nommée passe toujours par `VETTED_COLORS`).
- **Garde LEAN (décision Rémy) `runProduceMapConformance`** (`src/core/map-produce-conformance.ts`) : valide **furniture L0 sémantique (les 7) + palette CVD (les 3 ramp)** au **config-time**, **sans charger de GeoJSON** ni rejouer de geo-core lourd (les couleurs de ramp viennent de `resolvePalette(scaleType, palette).ramp` — fonction pure). Le structurel exigeant le basemap reste couvert par les snaps runtime. Normalisation `type ?? "choropleth"` (**fix CRITICAL** : choropleth = défaut mount sans champ `type` → sinon s'exportait non-gardé), type-inconnu→violation (pas de pass silencieux), `textColors` **light/dark** dérivés de `resolveMapStyle(mapStyle)` (`#ffffff`/`#18181b`), palette-arm en try/catch, **route récupère son L0 manquant** (son check par-type ne le composait pas).
- **Câblé fail-hard dans `produce.mjs`** avant le premier `vite build` → une violation `process.exit(1)` avant tout build/export. **Produce-vérifié par moi** : GREEN (choropleth propre → gate OK → build → **PNG conforme lu par moi** : titre-insight, source liée, légende 5 bins bleu CVD-safe) ; RED (source retirée → **vrai exit 1**, violation imprimée, aucun output). **`MAP_TYPES`** (registre canonique + drift-test ancré sur la reachability de `mount.tsx`, sans refacto) + **invariant de parité comportemental** (`map-completeness.test.ts` : reachable ⟹ genuinely-guarded via le vrai dispatch — pas une tautologie `A⊆A` ; + sibling `RAMP_TYPES` CVD-completeness). SKILL.md : ligne fail-hard + fix stale `defaults to all`→`static`.
- **★ Feu adverse (4 lentilles) a reshapé le design AVANT le build** : la v1 sur-vendait la portée et décrivait une garde « pure/config-only » **impossible** (les geo-cores exigent le GeoJSON du basemap). Corrigé → garde lean sans GeoJSON ; résolveur **fondu** dans la garde (pas de triple homogène côté map, contrairement aux 7 charts plats) ; **markColors + extraction de constantes supprimés** (dead work — aucun check ne consomme les fills) ; CRITICAL choropleth-default attrapé ; portée recadrée (valeur neuve = **palette-CVD + furniture sémantique + fail-fast** ; `source`/`titre-hors-cadre` déjà attrapés par les snaps). La review whole-branch a aussi attrapé un **test tautologique** dans l'invariant (corrigé mid-lot en assertion comportementale).
- **Portée honnête (backlog explicite, non-droppé)** : labels rendus en **GL** (canvas WebGL → `snap-contrast` ne se porte pas ; pixel-sampling GL = spike séparé) · framing vidéo · chemin **scrolly** (producteur séparé) · checks structurels complets exigeant le basemap.
- **Backlog tickets (whole-branch + par-tâche, non-bloquant)** : (1) **`ChoroplethMap`/`SymbolMap` ne passent pas `dark` à `MapFrame`** (contrairement aux 5 autres) → peignent le furniture light même en `mapStyle:dark` — trou de composant **pré-existant** révélé par la garde, viole design-conformance rule 9 (pill blanc sur basemap sombre), hors scope lean ; (2) branche `checked:false` non-atteignable (future-proofing documenté, `MAP_PRODUCE_GUARDED_TYPES = MAP_TYPES`) ; (3) `subject` pas threadé dans le propre appel palette de `checkHexGridConformance` (garde plus stricte, inoffensif) ; (4) message cartogram `bad-name`→`layout failed` (chemin test seulement ; la garde émet un `palette:` propre) ; (5) tsconfig omet `tests/` du tsc (repo-wide) ; (6) `mkdirSync` avant le gate → dir vide sur RED (inoffensif).

**★ ÉTAT — map-native a maintenant le même plancher `conformance-au-produce` que les charts** (garde fail-hard config-time : furniture L0 + palette CVD, les 7 types) ; 19 types natifs charts inchangés. **PROCHAIN** = soit **parité harnais-contraste côté map** (le pixel-sampling GL, spike différé de ce lot) ; soit les **bespoke restants Family A** charts (bump/pyramid/diverging-stacked/fan/treemap) ; soit un autre satellite (fix composant `dark`→MapFrame ; WaterfallChart framing ; hash export-time ; release MIT REPO_URL+scrub ; scinder ce CLAUDE.md).

## ★ Satellite — map-native render-quality (8 bugs dark/légende/label + garde render-time) — 2026-07-07

Mergé dans `main` (merge --no-ff, branche `feat/map-native-render-quality`), `bun run check` **14/14 vert**, 0 mention vendor, 0 nouveau `any`. Spec `docs/superpowers/specs/2026-07-07-map-native-render-quality-design.md` + plan `docs/.../plans/2026-07-07-map-native-render-quality.md` ; **8 tâches TDD sous-agents, chacune render-vérifiée au PNG par moi (dark ET light)** + review par-tâche + **whole-branch opus = READY TO MERGE, 0 Critical/Important**. Origine : retour Rémy « résous les bugs pour optimiser/améliorer en gardant la qualité ». **Un audit multi-agents** (4 lentilles → vérif adverse par finding) a confirmé **8 bugs réels au rendu** (4 faux-positifs rejetés) ; le bug anchor (choropleth dark rendait identique au light) render-prouvé par moi.

- **Thème dominant : le dark-mode était cassé pour choropleth/symbol** — `ChoroplethMap:195`/`SymbolMap:187` hardcodaient `DATAVIZ.LIGHT` et n'appelaient jamais `resolveMapStyle` → `mapStyle:dark` **silencieusement ignoré** (basemap+légende+labels+furniture restaient clairs). **Fixé sur les 7 `*Map.tsx`** (static/interactif) : basemap DATAVIZ.DARK + légende via `legendTheme(dark)` + labels light + MapFrame `dark` + contrôles/popup dark. **Render-vérifié par moi : choropleth/symbol/dot-density dark rendent enfin sombres.**
- **Racine commune = logique dupliquée qui a dérivé → helpers partagés extraits (single source, plus de drift)** : `legendTheme(dark)` (couleurs légende themed), `fmtBin` (labels décimaux — fixe la légende choropleth qui collapsait `0–0,0–1` en `Math.round`), `labelTextSize(width)` (labels 18px en portrait, plus le drift static↔vidéo), `HEX_GRID_SCALE_TYPE`/`univariateAccent` (guard=renderer). RouteMap migré aussi.
- **8 bugs** : #1 ChoroplethMap dark · #4 SymbolMap dark · #5 DotDensity dot univarié theme-aware + swatch==dot single-source (`#56B4E9` Okabe-Ito en dark) · #2 **légende de bins ajoutée aux 3 composants choropleth vidéo/scrolly** (étaient indécodables) · #3 **labels par-symbole ajoutés à SymbolStory/Scrolly** (cercles rangés 6..N étaient anonymes ; + fix collision label↔callout géant sur reveal-beat) · #6 hex-grid guard pinне sequential comme le renderer (plus de ramp diverging fantôme / greenlight-puis-crash) · #7 fmtBin décimal · #8 taille label cross-format.
- **★ Gardes render-time (feedback→système, attrape la classe pas l'instance)** : **`scripts/snap-theme.mjs`** — build à `mapStyle:dark`, échantillonne le **basemap RÉEL (screenshot→canvas median-luminance) + le furniture DOM**, asserte qu'ils sont **effectivement sombres**, câblé fail-hard dans `produce.mjs` (gated sur mapStyle:dark) → un type qui laisse tomber le dark échoue avant export. **J'ai vérifié qu'il ne false-fail PAS les cas denses** (dot-density-multi/symbol dark passent exit 0). + **3 tests de parité** (resolveMapStyle-consumption sur les 7 `*Map.tsx` ; `legendTheme`-consumption ; no-`Math.round` ; label-size), tous non-vacants (RED sur revert).
- **LEÇON re-gravée** : render-verify **une frame PAR TYPE DE BEAT**, pas juste la terminale — ma vérif terminale-only avait raté la collision reveal-beat de #3 ; la whole-branch a rendu un reveal-beat et l'a attrapée.
- **Hygiène** : dé-tracké `.superpowers/sdd/task-{6,7}-report.md` (scratch gitignored force-add historique, pré-MIT).

**★ MAJOR follow-up (lot dédié suivant) — le dark-mode a un facet VIDÉO/SCROLLY non couvert** : les composants `ChoroplethStory/Reveal/Scrolly`, `SymbolStory/Scrolly`, DotDensity vidéo hardcodent encore un basemap LIGHT → un dark exporté en **vidéo** reste clair (avertissement produce-time ajouté en attendant). Même recette que ce lot (dark par composant), par composant. **Backlog non-bloquant** : `checkDotDensityConformance` swatch==dot reste test-only (décision Rémy : respecte le lean-guard ; bug déjà mort par single-sourcing) ; GL-label contrast (pas de snap-contrast maps) ; les minors par-tâche.

**★ ÉTAT — dark-mode + lisibilité render corrects pour les 7 types map en static/interactif** ; garde render-time systémique (dark rend vraiment dark). map-native : 7 types, 467 tests. **PROCHAIN** = dark-vidéo (le facet ci-dessus) · Family A charts (7 types) · GL-contrast · release MIT.

## ★ Satellite — dark-vidéo map (le facet vidéo/scrolly du dark-mode) — 2026-07-07

Mergé dans `main` (merge --no-ff, branche `feat/map-dark-video`, worktree isolé), `bun run check` **14/14 vert**, 0 vendor, 0 nouveau `any`. Plan `docs/superpowers/plans/2026-07-07-map-dark-video.md` ; 3 tâches TDD sous-agents, review par-tâche + **whole-branch opus = READY TO MERGE, 0 Critical/Important**. **Ferme le facet vidéo laissé en follow-up par le lot render-quality** : les composants map vidéo/scrolly hardcodaient un basemap LIGHT et ignoraient `mapStyle:dark` — un dark exporté en vidéo restait clair. **6 composants corrigés** (ChoroplethStory/Reveal/Scrolly + SymbolStory/Scrolly/Reveal) en **mirrorant la référence déjà-wired `DotDensityStory/Reveal/Scrolly`** (l'analogue vidéo des Tasks 2-3 statiques). **Chaque composant render-vérifié dark ET light au still par moi** (basemap dark, légende/labels/panel dark, highlight visible). Helpers de thème déjà existants (`MapFrame`/`ScrollyPanel` dark prop, `legendTheme(dark)`) → consommés, pas réinventés ; déterminisme préservé (`dark` config-invariant, `theme` mémoïsé). **Garde** : `resolve-map-style-parity.test.ts` étendu aux 20 composants vidéo/scrolly (non-vacant). Découverte : Route/Locator/HexGrid/Cartogram vidéo étaient DÉJÀ dark-wired.

**★ Exécuté EN PARALLÈLE du lot Family A charts** (worktrees isolés `.atelier-wt/{darkvideo,familya}`, branches séparées, fichiers disjoints map-native vs chart-native, `bun run check` vert dans chaque). **Backlog (tickets)** : Route/Locator/HexGrid/Cartogram vidéo passent la parité mais pas render-vérifiés dark par moi ; pas de `RouteStory.tsx` (trou de couverture vidéo, hors dark) ; emphasis-ring dark symbol-scrolly un poil faible (polish). **map-native dark-mode COMPLET sur static/interactif/vidéo/scrolly, les 7 types.**

## ★ Native Family A couture — 7 types productionisés (19 → 26 atteignables) — 2026-07-07

Mergé dans `main` (merge --no-ff, branche `feat/native-family-a`, **worktree isolé, EN PARALLÈLE du lot dark-vidéo map**), `bun run check` **14/14 vert**, 0 vendor, 0 nouveau `any`. Plan `docs/superpowers/plans/2026-07-07-native-family-a.md` ; 5 tâches TDD sous-agents + fixes, review par-tâche + **whole-branch opus = READY TO MERGE, 0 Critical/Important NEW**. **chart-native : 19 → 26 types natifs atteignables** — les 7 Family A `deferred` productionisés via la recette prouvée (mapper + garde-câblée-au-produce + palette-extract + flip + famille + SKILL.md + KB) : **treemap** (part-to-whole), **boxplot**+**violin** (distribution), **diverging-stacked** (deviation, Likert), **pyramid** (distribution, population), **fan** (change-over-time, prévision), **bump** (ranking). **Chaque type render-vérifié au PNG par moi** (treemap nested+per-cell-contrast, boxplot IQR+outlier, diverging-stacked neutral-straddle+distinct, pyramid mirroré, fan bandes-confiance nichées, bump ranking+label-ink, violin densités distinctes). 26 confirmé au sol (MAPPERS ≡ non-deferred ≡ family ≡ SKILL ≡ guarded, zéro drift). **violin.md auteurée** (FT+data-to-viz sourcés live).

- **La discipline review + render-verify a attrapé/fixé plusieurs vrais bugs** : cap cardinalité treemap >5 (mirror beeswarm, sinon 2 groupes même couleur) ; **2 bugs WCAG label-couleur-mark** (treemap cellText + diverging-stacked in-segment → picker contraste-réel) ; diverging-stacked `neutralIndex` omis (cassait le straddle Likert + collision agree/stronglyAgree) **+** cap réponses >5 (la ramp 2-teintes/côté collisionne à 6+, un Likert 6-points forced-choice) ; fan CSV sparse rejeté par la shape-validation générique → branche isolée `id==="fan"` + shape ≥2 bandes + axe-temps numérique ; **bump label→ink a11y** (fix + snap-contrast RED→GREEN).
- **★ Palettes single-sourcées** (`TREEMAP_GROUP_COLORS`/`DIVERGING_STACKED_COLORS`/`PYRAMID_SIDE_COLORS`/`BUMP_ACCENT_COLORS` dans `core/tokens.ts`, lues par composant ET garde — pas de drift).
- **★ MAJOR follow-up (lot dédié) — a11y tooltip hover systémique** : le `<strong style={{color}}>` du Tooltip interactif peint le nom en couleur-de-ligne sur fond ink → **WCAG ~3.3:1**, **byte-identique dans Bump/Chord/Candlestick/Radar/Sunburst/Waffle (≥6 types)**, hors portée de `snap-contrast` (static-only ; c'est le path hover). Pré-existant (Waffle shippé avec en Batch 3), non introduit ici. **Le lot dédié doit inclure bump.** Autres tickets : smoke-test produce par type ; boxplot n-floor par catégorie ; commentaire `native-types.ts` périmé ; labels catégorie longs tronqués (framing).

**★ ÉTAT — 26 types natifs chart atteignables + map-native dark-mode complet 4 formats.** Reste Family A→B (15 types déférés par design), a11y-tooltip systémique (lot), release MIT (REPO_URL+scrub), scinder ce CLAUDE.md.

> **⚠ NOTE HYGIÈNE GIT (2026-07-07)** : pendant l'exécution parallèle, le worktree principal a été switché sur `feat/cross-platform-installer` (session parallèle installeur/Windows) à mon insu — **DEUX fois** (avant le merge Family A, puis avant le lot tooltip). Family A a d'abord atterri sur la branche installeur (refait proprement sur `main`) ; le lot tooltip s'est basé sur le tip installeur (rebasé proprement sur `main` via `git rebase --onto main`). La branche `feat/cross-platform-installer` porte 2 commits accidentels Family A (merge + CLAUDE.md) — à reset sur `7e088e0` par son propriétaire si besoin (non touché). **Leçon** : quand une session parallèle bouge le HEAD du worktree partagé, vérifier `git branch --show-current` avant chaque merge / `checkout -b`.

## ★ Tooltip a11y systémique — WCAG hover sur 10 charts + harnais hover-contrast — 2026-07-07

Mergé dans `main` (merge --no-ff, branche `feat/tooltip-a11y`, rebasée proprement sur main), `bun run check` **14/14 vert**, 0 vendor, 0 nouveau `any`. Plan `docs/superpowers/plans/2026-07-07-tooltip-a11y.md` ; 2 tâches TDD sous-agents + fixes, review par-tâche + **whole-branch opus** (qui a attrapé un **CRITICAL** raté par toutes les reviews par-tâche). Ferme le follow-up systémique surgi du lot Family A. **Bug** : 10 composants chart peignaient le NOM de série du tooltip hover en teinte-de-mark sur fond ink `#1A1A1A` → WCAG fail (blue #0072B2=3.36:1 = palette[0] partout ; black 1.21 Chord ; muted 3.27 Bump/Parallel). Hors portée de `snap-contrast` (static-SVG-only, pas de hover). **Scope (Rémy) : patch-en-place** (pas la migration Tooltip-partagé des 40 = follow-up DRY séparé).

- **Fix** = le pattern swatch de ComboChart : nom en `#fff` + glyphe `■` décoratif `aria-hidden` portant la teinte (exempt de la règle 4.5:1 car non-texte, garde l'association teinte↔série). Les 10 : Bump/Chord/Candlestick/Radar/Sunburst/Waffle + **4 non-listés par la review d'origine** (Beeswarm/DivergingStacked/Sankey/Parallel). **Render-vérifié par moi** (radar hover, série blue palette[0] : swatch bleu + nom blanc lisible).
- **★ Harnais `snap-tooltip-contrast.mjs`** : build interactif, focus chaque mark (sélecteur généralisé `[role="img"][tabindex="0"]` car le fallback tag-restreint matchait 0 sur Chord `<path>`), échantillonne le `.tooltip` via `getComputedStyle(color)`+opacité composite vs ancestor-walk bg (pas `elementsFromPoint` car pointer-events:none), **skip les swatches `aria-hidden`** (sinon false-fail), asserte ≥4.5:1 via `contrast-scan.ts`, câblé **fail-hard** dans produce. Garde `checked===0` (tooltip cassé entièrement → fail, pas pass silencieux).
- **★ La whole-branch opus a attrapé un CRITICAL** : le câblage produce appelait `snap(...)` (un helper qui n'existait que sur la branche installeur d'où le lot était parti ; mon rebase sur main l'a laissé non-défini) → `ReferenceError` sur CHAQUE produce, harnais jamais invoké — invisible à `bun run check` (produce.mjs = script runtime). **Fixé** (`snap`→`run`) + **vérifié end-to-end à travers produce par moi** (GREEN exit 0 harnais passe ; RED swatch-reverté → produce exit 1 depuis le harnais avec `"Hawks": #6b6b6b on #1a1a1a = 3.27:1`). LEÇON re-gravée : vérifier le câblage **à travers produce**, pas le harnais isolé (le RED→GREEN par-tâche « passait » alors que le câblage était cassé).
- **Backlog (tickets)** : extraire `core/Tooltip.tsx` partagé + migrer les 40 call-sites (tue la duplication 40× du shell ; le harnais garde déjà la non-régression) — y plier l'`aria-hidden` manquant sur les 2 swatches de ComboChart ; cap N=12 marks du harnais (documenté).

**★ ÉTAT — a11y tooltip hover corrigée + gardée mécaniquement sur les charts.** 26 types natifs chart + map-native dark 4 formats. Reste Family B (15 déférés design), release MIT (REPO_URL+scrub), scinder CLAUDE.md, + le follow-up DRY Tooltip partagé.

## ★ Installeur cross-platform (Mac+Win, 2 modes, clés en amont) + garde rendu natif Windows (tsx) — 2026-07-07

Mergé dans `main` (`d006f81`, merge --no-ff depuis `feat/cross-platform-installer`), `bun run check` 14/14 + produce chart-native re-vérifié end-to-end après merge (produce.mjs = script runtime, invisible au gate). Spec `docs/superpowers/specs/2026-07-07-cross-platform-installer-design.md` + plan `docs/.../plans/2026-07-07-cross-platform-installer.md` ; 8 tâches TDD sous-agents, review par-tâche + whole-branch opus = READY TO MERGE, 0 Critical.

- **Problème réglé** : l'installeur était **macOS-only, un seul mode** (`.command` double-clic, git clone, Homebrew). Retour Rémy : pour un journaliste non-tech, il faut **un exécutable OU un copier-coller terminal**, **les deux** portant les clés fournies en amont, **sur Mac ET Windows**.
- **Archi « une logique, 4 surfaces »** : séparer les **clés** (générées par-user) de la **logique d'install** (versionnée, hébergée). `install/bootstrap.{sh,ps1}` (sans clés, idempotents) installent Bun + Claude Code (+ **Node sur Win**), acquièrent Atelier par **zip** (pas de git — le plugin n'a aucun hook bash → Git Bash inutile), écrivent `.env`, créent un launcher local double-clic (créé localement → **pas de MOTW/quarantaine** → relance propre), scrubent les secrets. La page (`docs/installer/`) collecte les clés → émet **par OS** un **copier-coller** (`export…;curl|bash` / `$env:…;irm|iex`, contourne Gatekeeper/SmartScreen) **et** un **launcher mince** (`.command` auto-réparant / `.cmd` wrapper `powershell -ExecutionPolicy Bypass`, **jamais** de `.ps1`). Décisions verrouillées : **zéro signature** (notarisation refusée ; signer ne tue plus SmartScreen sur Win ~août 2024), clés inline, drop Homebrew. Grounding vérifié (workflow multi-agents + fact-check adverse) : Claude Code + Bun **natifs Windows** (pas de WSL).
- **★ Garde rendu natif Windows** (`chart-native` + `map-native`) : sous le runtime **Bun sur Windows, `chromium.launch()` de Playwright pendouille** (bug #15679). Les étapes qui lancent Chromium basculent sous **`tsx`** (`snapCommand(p)→["npx","tsx"]|["bun"]`), Remotion sous `npx`. **★ Découverte qui a invalidé le plan** : bare `node` ne suffit PAS — les snap scripts importent des `.ts` avec **imports sans extension** que node ne résout pas (bun/tsx si). `tsx` = runtime node (pas de hang) + résolution façon-bun. **Validé sur Mac** : snap sous tsx local → **PNG byte-identique** à bun ; chaîne `.ts` map-native résolue. `tsx@4.23.0` = devDep pinnée. Le `run` helper reçoit `shell:isWin` (résout les shims `.cmd`).
- **1 Important corrigé** (whole-branch) : `bootstrap.ps1` `Move-Item "atelier-$Ref"` cassait sur un tag `v`-préfixé/slashé (GitHub réécrit le dossier d'archive) → glob miroir du `.sh` (`cf8d153`). **Fix post-merge** : la garde tooltip-contrast du lot a11y parallèle (nouvelle étape Chromium mergée) routée via `snap()` pour couvrir Windows aussi.
- **★ INCIDENT concurrence (leçon opérationnelle)** : une **2e session SDD tournait dans le même working tree** (lot tooltip-a11y). Collisions répétées : merge family-a poussé sur mon tip + HEAD switché vers main ; edits étrangers flottants ; ledger `.superpowers/sdd/progress.md` écrasé ; mon `git worktree add main` a échoué (main déjà extrait) → le merge a tourné dans le tree principal (heureusement propre + gate 14/14 + produce re-vérifié). **Récupéré à chaque fois** (travail toujours committé sur la branche). **Règle** : une session SDD par **worktree/clone**, jamais deux dans le même working tree.
- **Backlog** : `chart-native` **vidéo** utilise `npx` (Node) mais `bootstrap.sh` n'installe pas Node sur Mac → vidéo chart-native casserait sur un Mac vierge (map-native vidéo via `bunx` OK). Fix : `render-video.mjs` → `bunx` Mac / `npx` Win (miroir map-native), à render-verifier. + release MIT : confirmer `REPO_URL` + pin `REF` sur un tag (le `.ps1` est déjà glob-safe). + les Minors déférés (voir plan §self-review).

**★ ÉTAT — installeur Mac+Win livré (2 modes, clés en amont) + rendu natif débloqué sur Windows (tsx).** Reste (backlog) : vidéo chart-native sans Node sur Mac ; release MIT (REPO_URL+scrub) ; scinder ce CLAUDE.md.

## ★ Installeur ré-aligné sur le canon Buried Signals — key-free + configurateur local 127.0.0.1 — 2026-07-08

Mergé dans `main` (`dcc6672`, merge --no-ff depuis `feat/installer-local-configurator`), fait **dans un worktree isolé** (`.claude/worktrees/`) pour échapper aux collisions multi-sessions du tree principal. `bun run check` **16/16** (14 + `tsc install` + `test install`). Spec `docs/superpowers/specs/2026-07-08-installer-local-configurator-design.md` + plan `docs/.../plans/2026-07-08-installer-local-configurator.md` ; 8 tâches TDD sous-agents, review par-tâche + whole-branch opus = READY TO MERGE, 0 Critical.

- **Origine (retour Rémy)** : on a comparé notre installeur (2-modes, clés bakées dans l'artefact) aux vraies pages de Mycroft/Spotlight (récupéré leur `install.sh` réel). Le canon-maison = **installeur SANS clés + configurateur local `127.0.0.1`** : les clés sont saisies **après** install, vérifiées en direct, écrites `.env` — *« never sit in Downloads »*. On divergeait sur ce seam.
- **Page publique dépouillée** : plus de formulaire de clés ni de radio runtime. Une **commande statique key-free par OS** (`curl …/bootstrap.sh | bash` / `irm …/bootstrap.ps1 | iex`, identique pour tous) + download `.command`/`.cmd` key-free + doc contournement. `generate.js`/`runtimes.js` (baking par-user) **supprimés** → mini `commands.js` pur.
- **Bootstrap ré-ordonné** (miroir Mycroft, config **avant** tooling) : Bun → repo (zip) → **`bun install/configurator.ts`** → abort gracieux si pas de `.env` → runtime (lu depuis `.atelier-runtime`) + Node sur Win → deps + Playwright → launcher local. Plus de `.env`-depuis-l'env, plus de scrub.
- **★ `install/configurator.ts`** = serveur **Bun** (`Bun.serve` 127.0.0.1:port-libre, zéro dep npm) : sert le formulaire, ouvre le navigateur, **vérifie chaque clé en direct** (vraies API GET MapTiler/Datawrapper/Anthropic, no-mock, self-skip), au `/submit` **re-vérifie côté serveur** puis écrit `~/Atelier/.env` **chmod 600** + `.atelier-runtime`, exit → le bootstrap reprend. Cœur pur `configurator-core.ts` (serializeEnv omit/include ANTHROPIC, RUNTIMES, HTML, verify*) testé ; `install/` = **nouvelle unité gardée** (tsconfig/package.json + ajout au gate `check.mjs` + `ci.yml`).
- **Auth flexible** (retour Rémy « tout abonnement OU clé API ») : clé Anthropic **optionnelle** — vide → `claude` fait son login OAuth au 1er lancement (abonnement) ; fournie → écrite dans `.env`. Les deux via le comportement natif de `claude`, sans branche.
- **Windows natif conservé** (Bun cross-platform — avantage sur Mycroft, POSIX/Python-only ; garde rendu tsx héritée intacte).
- **★ Reviews ont attrapé 4 vrais défauts, tous corrigés + re-vérifiés en live par moi** : (1) `/submit` response droppée avant flush → `setTimeout(250)` ; (2) abort bash « Configuration not completed » **mort sous `set -e`** (le sous-shell tuait le script avant le check) → garde l'appel `if ! (…) || [ ! -f .env ]` ; (3) ps1 avait **perdu le garde d'existence Claude** au réordonnancement → restauré ; (4) **`/submit` ne re-vérifiait pas côté serveur** (whole-branch) → la garantie « verified live » était contournable (vérifier une bonne clé, l'éditer en typo, save écrit la mauvaise) → re-vérif serveur + refus 400. Live-vérifié : mauvaise clé → 400 sans écriture ; vraie clé → 200 + `.env` 600.
- **Backlog (déféré, non-bloquant)** : `serializeEnv` écrit `KEY=value` non-quoté → un `FLY_API_TOKEN` (format `FlyV1 <macaroon>`, avec espace) casserait le sourcing du launcher (pré-existant, champ avancé optionnel — durcir en quotant) ; `configurator.ts` (serveur) sans test unitaire (live-vérifié) ; `docs/RELEASE.md` pointe encore `generate.js`+`git clone` (à MàJ avant release MIT) ; `REPO_URL`/`REF` placeholders (preflight repointé sur `commands.js`).

**★ ÉTAT — installeur key-free + configurateur local `127.0.0.1` livré** (vérif-live des clés, `.env` 600, abonnement OU clé API, Mac+Win natif). Aligné sur le canon Buried Signals. Reste (backlog) : quoting `.env`, `docs/RELEASE.md`, release MIT (REPO_URL+scrub), vidéo chart-native sans Node sur Mac.

## ★ Canal → format → taille → sous-format → export : Slice 1 (couche décision) MERGÉE — 2026-07-08

Mergé dans `main` (`8d46e16`, merge --no-ff depuis `feat/channel-driven-format-export`, worktree isolé), `bun run check` **16/16**, 0 mention vendor, 0 nouveau `any`. Spec `docs/superpowers/specs/2026-07-08-channel-driven-format-export-design.md` + plan `docs/.../plans/2026-07-08-channel-driven-format-slice-1.md` ; 6 tâches TDD sous-agents (2 rounds parallèles fichiers-disjoints, commits sérialisés par le coordinateur pour éviter les races d'index) + fix de review, review par-tâche + **whole-branch opus**.

- **Origine (retour Rémy, validé au feu adverse)** : « le canal & format de diffusion n'est jamais vraiment respecté car pas clair — on demande *où* puis pas le format (static/interactif/vidéo) ni la taille matchée au canal ni les sous-formats/l'export interactif ». Corroboré par le harness (recyclage : 9:16 promis, paysage livré ; geneve : vidéo voulue, interactif livré ; zurich/loyers : sur-escalade interactif).
- **Décision de conception (Rémy)** : canal = **choix structuré** qui pilote tout, déterministe. **(b) défaut interactif franc** pour article/web (contre le static-first, assumé) **mais invariant a11y** : quand interactif choisi, un **fallback static qui porte le message est TOUJOURS produit**. Pas de bucket print/email. Narration : GUIDED → l'AI tranche, DIRECT → le journaliste nomme.
- **Livré (couche décision)** : `skills/atelier/src/channel.ts` = **source unique** `Channel = social-vertical|social-feed|article-web` → `{aspect, mediaSize, allowedFormats, interactiveDefault}` (portrait 1080×1920 · carré 1080×1080 · paysage 1200×675 ; social ⇒ {static,video} ; article-web ⇒ les 4 + défaut interactif). Consommée par dw-chart (`export-aspect.ts` refactoré, plus de table dupliquée + drift-test), suggest-chart (routing SKILL.md + éval), produce-all. **Règle dure enforced fail-hard** `isFormatAllowed(channel, format)` dans `produce-all.ts` (format interdit → `status:"failed"`, jamais shippé). **Garde aspect↔type mécanique** (portrait/carré ∧ `isRowDriven(type)` → fail, attrape recyclage). CADRAGE **Q3 = pick structuré** · PROPOSITION **annonce `{format, taille, sous-format}`** vetoable · EXPORT branché (média direct / interactif = 3 livraisons). `format-selection.md` recadré (GATE -1 canal-first ; static-first = justification du fallback a11y).
- **★ La whole-branch opus a attrapé un CRITICAL** que les reviews par-tâche ont raté : le guard fail-hard était **inerte en vrai** — `channel` absent du schéma `accepted.json` §5b du SKILL.md → les propositions ne le portaient jamais → retombait sur le défaut permissif `article-web`. **La leçon re-gravée : vérifier le câblage À TRAVERS produce, pas le guard isolé.** Fixé (§5b requiert `channel` ; `produce-all.mjs` le passe déjà) + garde aspect↔type mécanisée (le commentaire prétendait à tort « pas dérivable ») + drift-test pixel. Re-vérifié à l'œil (câblage bout-en-bout réel).
- **★ Render-verify e2e (3 cas, main mergé) = Slice 1 marche là où ça compte** : **recyclage** (social-vertical) — les 2 MAJORS aspect-mismatch du batch pré-fix ont **disparu** (PNG static propre) ; **geneve** (social-vertical) — avant Slice 1 shippait un **interactif** (faux) ; maintenant choisit **`format:"video"`**, threade `channel:"social-vertical"`, guard passe la vidéo permise, `status:"produced"` → **not-embed⇒jamais-interactif respecté bout-en-bout** (confirmé via `accepted.json`/`report.json`) ; **zurich** (article-web) — PNG static, aucune violation.
- **Découpage assumé (writing-plans : 1 sous-système = 1 plan)** : **Slice 2 (à faire)** = rendu producteur — compos **9:16 natives** (chart-native + map-native ne font que du **4:5** aujourd'hui — vraie incohérence trouvée au grounding : « portrait » = 9:16 côté dw mais 4:5 côté natif) + threading `canal→taille` dans le rendu natif static/interactif/vidéo + ne rendre que l'aspect permis + conformance aspect==canal au pixel.

**Backlog issu de ce lot (tickets, non-bloquant)** : (1) **chart-native sur-produit** — il build `interactive.html` même quand le canal l'interdit (byproduct sur disque ; ne devrait pas être buildé pour un canal social) ; (2) M2 `VisualFormat` dupliqué channel.ts↔producer-spec.ts (import type = cycle, laissé en ticket) ; (3) **flow-adherence de l'orchestrateur** (majors récurrents e2e : specs hand-authored / no-op bash après suggest-article — bypasse parfois le chemin gardé ; plus large que ce lot) ; (4) capture source nom+URL (récurrent, lot bugs séparé).

**★ Lot bugs séparé (du batch de test 2026-07-08, PAS mélangé à ce lot)** : numberFormat « 0% » qui multiplie ×100 (« 4100% », referendum/eu-renewables) · capture source nom+URL faible (systémique) · **scrolly paris-metro** timeout + caméra pleine-France + fuite EN malgré lang:fr · crash annotation **d3-arrow-plot** (`ANNOTATION_UNMAPPED_BAR_TYPES` incomplet) · gate-render sans review-gate.

**Harness QA (privé, `../atelier-harness`)** : 18 cas éditoriaux (13 + 5 neufs : geneve-loyers-video/co2-secteurs-grouped/frontaliers-dots/zurich-rents-english/loyers-dispersion-beeswarm). Workflow parallèle test/fix/merge dans `WORKFLOW.md`. **★ ÉTAT — canal respecté + clair + enforced au niveau décision, prouvé e2e.** PROCHAIN = Slice 2 (rendu 9:16 natif) ou le lot bugs.

## ★ Lot bugs (2 retours Rémy + le batch de test) — 6 bugs corrigés en 2 vagues parallèles — 2026-07-08

Tous mergés dans `main` (`3c9afde`), `bun run check` 16/16, 0 mention vendor, 0 nouveau `any`. 6 fixes en worktrees isolés, root-cause + render-verify chacun, review par-fix, merge en 2 vagues (fichiers disjoints).

- **Vague 1** :
  - **interactif ⇒ pas d'export image** (`be6934b`, retour Rémy) : `export-code.mjs` ne copie plus de PNG dans une livraison interactive ; livraisons = code source · **HTML statique no-JS (= le fallback a11y)** · embed fly. A aussi fixé un **bug latent** : le mauvais screenshot (`interactive.png`) pouvait être inliné à la place de `static.png` (match par nom exact désormais). Render-vérifié (dossier livré = interactive.html + static.html + EMBED, aucun PNG).
  - **dw numberFormat % + crash arrow-plot** (`021dcf7`) : le « ×100 » du juge était **empiriquement FAUX** (41+"0%"→"41%" correct). **Vrai bug** : DW appose "%" sans multiplier → une **fraction** 0.41+"0%"→"0%" (précision détruite), et le guard `isPercentScaleMismatch` ne checkait que `numberFormat`, pas `valueFormat` (le token d'axe), et n'était qu'un warning que `produceChart` ignore → **fix : check les 2 champs + hard error** (bloque avant publish). + `d3-arrow-plot`/`d3-dot-plot`/`d3-range-plot` ajoutés à `ANNOTATION_UNMAPPED_BAR_TYPES` (annotation crashait au produce à toutes les largeurs ; groundé sur l'orientation value-x/category-y de `ROW_DRIVEN_TYPES`). Sondé à la vraie API, charts throwaway supprimés.
  - **scrolly caméra focus** (`96a3ded`) : **★ notre 1er fix scrolly ÉTAIT le bug.** Les beats reveal portent déjà des bbox serrées ; le problème est la TRANSITION — `peakFlightZoom = min(from,to) − 0.5` tirait l'arc flyTo EN ARRIÈRE vers l'étendue pleine sur un zoom-in, et comme le zoom est lu live en vol, un lecteur qui scrolle plus vite que le flight (1200 ms) faisait **ratcheter le plancher toujours plus large** step après step. Fix = `peakFlightZoom = min(from,to)` (sans margin) → le flight ne fait que zoomer IN, le plancher ne fait que monter, le ratchet est impossible. Knob `PEAK_ZOOM_MARGIN` retiré. Render-vérifié par-beat (Norway/Germany/Poland cadrés serrés).
- **Vague 2** :
  - **scrolly i18n** (`a77a03d`) : nombres FR `34 000 voyageurs/j` (root cause `symbol-story.ts` `Math.round` sans locale, contrairement au choroplèthe qui threadait déjà `lang` via `formatLocaleNumber` — helper réutilisé) + captions FR « le plus élevé des N » (root cause `chapters.ts` mots de rang hardcodés EN → tables FR/EN + `lang` threadé dans les **6** call-sites map-scrolly). Render-vérifié FR vs EN.
  - **baseColor subject-fit + altInsight** (`fdb4bf4`) : root cause = SKILL.md offrait le sky-blue sous « social/culture » ET le guard n'excluait que l'EXACT `#0072B2` (donc `#56B4E9` passait). Fix : règle Colour réécrite (housing→amber `#E69F00`, labour/transport-flow→vermillon `#D55E00`, « blue = toute la famille »), `baseColor` + `altInsight` **obligatoires** sur les NativeSpec, checks conformance (blue-family-sur-sujet-non-bleu + altInsight manquant). 10 tests négatifs.
  - **source + gate-render** (`3c9afde`) : **GATE 2c** — établir source nom + URL spécifique traçable AVANT la PRODUCTION (1 tour, rejette nom-seul/homepage, interdit le fallback prose comme échappatoire) ; suggest-article extrait un `sourceHint` verbatim + ne confond plus le nom de CSV avec une citation. + `produce-all` **reset** `reviewed`/`renderApproved`/`approvedHash` après le spread du dispatch (fail-safe contre une régression future ; test adverse qui smuggle une approbation stale → strippée) + règles SKILL.md (jamais gate-render après un re-produce sans re-review).

**★ Backlog issu de ce lot (tickets, honnêtement flaggés, non-bloquant)** : (1) **câbler les checks conformance `subject`/`altInsight` au produce** (opt-in/test-only pour l'instant — pattern accepté du repo ; le vrai levier est la guidance SKILL.md que le suggester lit) + threader `NativeSpec.subject`/`altInsight` dans le produce ; (2) le guard blue de **dw-chart** a le même trou exact-`#0072B2` (le fix couvre chart-native, pas dw) ; (3) levier déterministe `source.url` requis dans les 3 fichiers conformance (dw/chart-native/map-native) ; (4) les **sibling story files** (hex/dot/locator/cartogram/route) ont le même pattern nombre non-localisé latent ; (5) **chart-native sur-produit** (build encore static.png/interactive.png byproduct même en interactif) → **Slice 2** (rendu producteur). **paris-metro-scrolly timeout** = non re-observé après le fix caméra (à re-tester).

**★ ÉTAT global — canal (Slice 1) + 6 bugs corrigés, main `3c9afde`, gate 16/16.** PROCHAIN = **Slice 2** (rendu producteur : compos 9:16 natives + threading canal→taille + ne rendre que l'aspect permis + câbler les conformance au produce) ou un nouveau batch de tests.

## ★ Canal → format — Slice 2 (rendu producteur, vrai 9:16) MERGÉE — 2026-07-08

Mergé dans `main` (`24cf063`, merge --no-ff depuis `feat/channel-driven-format-slice-2`, worktree isolé), `bun run check` **16/16**, 0 mention vendor, 0 nouveau `any`. Spec `docs/superpowers/specs/2026-07-08-channel-driven-format-slice-2-design.md` + plan `docs/.../plans/2026-07-08-channel-driven-format-slice-2.md` ; 5 tâches TDD sous-agents + grounding, review par-tâche + **whole-branch opus = READY_TO_MERGE, 0 Critical/Important** (a re-rendu la chaîne live pour vérifier). **Ferme la demande canal de Rémy** : les producteurs rendent maintenant vraiment à la taille/aspect du canal.

- **★ Découverte de grounding** : « portrait » = **4:5 (1080×1350)** côté natif mais **9:16 (1080×1920)** dans la table canal — et **4:5 ne mappe à AUCUN canal**. Donc le fix le moins cher = **repoint** des comps Portrait 1350→1920 (41 chart + 14 map), PAS un 4e aspect. `resolveFrame`/`resolveMapFrame` centrent déjà le plot sur canvas haut → le contenu « marche » au 9:16 (juste un tuning `plotAspect`). Et **`channel` était DROP au boundary de l'adapter** — n'atteignait aucun producteur.
- **Livré** : `channel.ts` += `channelAspect`/`renderSize`/`assertRenderedSize(±2px)`. `adapters.ts` **thread `channel` via env `ATELIER_CHANNEL`** (survit le re-spawn `produce-from-spec.mjs` par héritage `process.env` — pas de plomberie en plus). Les 2 producteurs : lisent le channel → **ne rendent QUE l'aspect du canal** (1 mp4 au lieu de 3 — compense le canvas plus haut) + **taille static par canal** (chart: Vite define `__MEDIA_W/H__` lu à `mount.tsx` avec `/2` pour le deviceScaleFactor:2 ; map: viewport Playwright `snap-static` @1x) + **Portrait 1350→1920** + tuning `boostPlotAspectForTallCanvas` (chart). **Conformance fail-hard** : `produce.mjs` lit l'IHDR du `static.png` produit → `assertRenderedSize` → `process.exit(1)` avant export (câblé comme snap-contrast, sans re-render) ; comp vidéo portrait/square **hard-assertée** == mediaSize.
- **★ Render-verify (moi, à l'œil)** : **vraie vidéo chart 9:16 rendue** (`portrait.mp4`, 240 frames, `static.png`+still = **1080×1920**, **un seul aspect émis** — pas de square/landscape parasite ; conformance verte) + le still lu = barres lisibles, titre 2 lignes non-rogné, source ancrée bas, plot remplit le canvas haut. Map static 9:16 render-vérifié par T3 (choroplèthe+symbol 1080×1920). Conformance **GREEN+RED live** (mauvais canal → vrai exit 1). 138/700/517 tests.
- **★ Discipline anti-stall (leçon)** : 2 agents ont **calé** en lançant un render Remotion **vidéo** inline (bloque silencieux >600s → watchdog les tue). Parade : agents font le code + **render-verify STATIC only** (rapide, output qui coule) + timeouts bornés ; le render **vidéo** = moi, en background bordé. Gravé pour les futurs lots rendu.

**Backlog (whole-branch, non-bloquant)** : (1) **vidéo landscape article-web pas size-guardée** + dims incohérentes (comps landscape restent 840×480 chart / 1280×720 map, pas 1200×675) — scope « repoint only » assumé, ticket parité landscape ; (2) **rendu live map bloqué mi-session par un glitch réseau/cert** (`UNKNOWN_CERTIFICATE_VERIFICATION_ERROR` MapTiler, **reproduit sur `main`** = env, pas le code) → map vidéo live non re-rendu par moi (dims assertées) ; (3) prose : `map-native/SKILL.md` dit « landscape 1200×675 » mais le comp vidéo landscape est 1280×720 ; header Root.tsx map liste 5 comps portrait au lieu de 14 ; (4) l'échelle de layout chart (composé à demi-résolution via /2@2x) vs map (pleine @1x) = polish visuel ; (5) `produce-from-spec.mjs` non touché (déviation légitime — l'env-var suffit).

**★ ÉTAT global — chaîne canal→format→taille→sous-format→export COMPLÈTE (Slice 1 décision + Slice 2 rendu), main `24cf063`, gate 16/16.** social-vertical → vrai 9:16 static+vidéo, feed → carré, article-web → paysage/responsive ; hors-embed⇒jamais interactif enforced ; taille rendue == canal (fail-hard). PROCHAIN = lot a11y-tooltip / câblage conformance subject-altInsight au produce / parité vidéo landscape / nouveau batch de tests / release MIT.

## ★ Fix normalizeChannel — self-map canonique (social-feed ne se mis-size plus en landscape) — 2026-07-09

Mergé dans `main` (`c669368` + merge `36df43e` depuis `fix/normalize-channel-canonical`), `bun run check` **16/16**. **Vrai bug de sizing** attrapé après Slice 2 : `normalizeChannel(freeText)` (`skills/atelier/src/channel.ts`) mappe l'input libre du journaliste → enum canonique via une table d'alias (`CHANNEL_KEYWORDS`) + fallback `article-web`. **Trou** : la table d'alias ne contient PAS toutes les valeurs canoniques (`social-feed`/`article-web` n'y sont pas comme clés) → une valeur DÉJÀ canonique `social-feed` (que le suggester émet verbatim, SKILL.md §5b) tombait dans le fallback `article-web` → un post feed était sizé en **landscape** au lieu de carré. **Fix** : `if (ALL_CHANNELS.includes(key)) return key` avant la table d'alias — une valeur canonique se self-map. +9 tests. **Cohérence de toute la chaîne canal revérifiée à la reprise 2026-07-09** : ① channel.ts source unique → ② suggest-chart/eval/score.ts (channelOk `isFormatAllowed` + garde aspect↔type `isRowDriven` ligne 130-139) → ③ SKILL.md §5b (`channel` requis) → ④ produce-all.ts (gate fail-hard) → ⑤ adapters.ts (thread `ATELIER_CHANNEL`) → ⑥ chart-native/map-native produce.mjs (rend UN aspect + `assertRenderedSize` fail-hard). Câblage de bout en bout confirmé, aucun maillon pendouille. **PROCHAIN inchangé** = a11y-tooltip / conformance subject-altInsight au produce / parité vidéo landscape / batch tests / release MIT.

## ★ Batch QA 21 cas (18 régression + 3 sujets neufs) → 5 fixes mergés + follow-ups honnêtes — 2026-07-09

Boucle **feedback→système complète** via le harness privé (`../atelier-harness`, WORKFLOW.md), tout render-vérifié par moi. Mergé dans `main` (`64071ed`, 3 branches --no-ff), `bun run check` **16/16**, 0 mention vendor, 0 nouveau `any`. J'ai écrit 3 sujets neufs génériques (`parking-hausse-vertical` social-vertical/aspect-guard · `budget-ville-waterfall` deviation · `energie-region-allemand` i18n DE) — dans `cases/` du harness.

**Discipline « regarder les pixels » = a séparé le vrai du bruit** : **2 faux positifs juge écartés** (numberFormat « 9200%/7000% » — rendus corrects, le juge raisonne le token `0%` pas les pixels) ; **fixes-qui-tiennent confirmés** (Gate 5 ranking→bar ; chaîne canal **vrai 9:16** + garde aspect↔type → colonnes sur portrait ; waterfall E2E).

**5 fixes mergés (chacun render-vérifié par moi + garde/KB/SKILL au niveau système) :**
- **locale** `core/locale.ts` FR/EN binaire → **table-driven fr/de/it/en** (LineChart n'avait AUCUN `lang` → cause du hot-patch allemand). Threadé dans 40+ composants + `formatLocaleNumber` dans les value-labels qui le bypassaient (WaterfallChart « +2.4 »→« +2,4 »). Garde `locale-furniture-parity.test.ts`. **Render-vérifié : waterfall FR « +2,4/−0,5 », beeswarm « 4 300 », DE line « Quelle: ».**
- **beeswarm** honore `baseColor` (logement→ambre, plus le bleu défaut) + outliers agrandis+labellisés ink. Garde subject-fit. **Render-vérifié : ambre + Lutry 2 810/Pully 2 620.**
- **labels bar-H** non tronqués (gutter au plus long label + wrap ≤2 lignes).
- **map-dw symbol/dot** : DW ne peut **pas** labelliser en statique (groundé DW Academy) → `validateMapSpec` **erreur dure → route map-native**. map-dw = choropleth + locator désormais.
- **export hardening (décision Rémy B : garder défaut franc interactif + durcir export)** : `export-code.mjs` tourne **en 1er inconditionnellement** (static.html a11y toujours produit), seul l'embed fly.io reste opt-in ; garde mécanique **`assertDelivered`** (refuse une livraison sans EMBED.md/.html/static.html) câblée dans export-code → **« delivered » exige un artefact**. + règle encoding-drift (pas de highlight sur cadrage neutre).

**Re-verify des 7 cas affectés sur main mergé — les fixes TIENNENT :** tous livrés, **ZÉRO critical** (avant : 2 timeouts/turn-caps + criticals) ; **energie DE : 0 hot-patch** (1crit+9maj → 3maj) ; waterfall 0 major ; beeswarm ambre confirmé.

**★ Découverte stratégique (le vrai next) : le gros cluster orchestration = le LLM DÉSOBÉIT à des règles qui EXISTENT DÉJÀ et sont bien écrites** (hot-patch=règle SKILL.md:394 ; sub-agent parasite=397 ; source name+url=398-399 ; hand-authored spec au lieu d'invoquer suggest-chart=390 ; producer flip-flop). Ajouter de la prose ne le règlera pas → **il faut de l'enforcement MÉCANIQUE**. J'ai posé les 1res dents (`assertDelivered`). Prochain lot naturel = « rendre l'orchestrateur mécaniquement inévitable ».

**Follow-ups honnêtes surgis du re-verify (non-bloquants, non faits) :**
1. **a11y static fallback d'une carte symbol INTERACTIVE pas labellisé** (seul le point highlighté) — l'interactif supprime les labels directs (règle tooltip-XOR-labels) et le fallback a11y en hérite. Le fallback a11y (pas de hover) devrait porter les labels directs. **Vrai fix code.**
2. **Réconcilier le ROUTAGE avec la décision B** : la prose « escalade interactif seulement si conditions » de `suggest-chart/SKILL.md` **contredit** le défaut franc → le juge flag une sur-escalade qui est en fait le design voulu. Aligner la prose (+ le rubric `judge.md` du harness, périmé sur le flow export « demander les 3 formes »).
3. **Adhérence orchestrateur** = le lot mécanique ci-dessus.
4. `.example` TLD accepté comme source (partiellement artefact de mes personas ; atelier pourrait rejeter les TLD réservés). Watch-items agents : Swiss-German apostrophe `de-CH`, beeswarm `subject` opt-in au produce, bar wrap capé 2 lignes.

**PROCHAIN** = lot « enforcement mécanique orchestrateur » (le vrai levier) / a11y fallback labels interactif-symbol / réconcilier routage+judge avec B / a11y-tooltip / release MIT.

### Vérif des 4 formats non-statiques (retour Rémy : « pas vu de map interactive ni de vidéo ») — 2026-07-09
Le batch avait tout render-vérifié en **statique** → angle mort sur interactif/vidéo. Produit + vérifié **live sur main mergé** (Playwright hover/zoom + frames mp4 via ffmpeg) les 4 formats :
- **Chart interactif** ✅ hover tooltip OK + **locale FR dans le tooltip** (« +2,4 · running 2,4 »). *Minor : value-labels rotés vertical à 1200px de large — lisible, à surveiller.*
- **Map interactif** ✅ zoom control marche, choroplèthe CVD + légende, fit sur l'Europe.
- **Chart vidéo** ✅ barres qui s'animent, valeurs qui se révèlent (frame par beat vérifiée).
- **Map vidéo** ⚠️ **BUG cadrage** : le reveal choroplèthe rend en **vue-monde** (Europe petite, ~60% du cadre vide) au lieu de fit-données comme le statique/interactif. `reveal.ts revealCameraPlan(bounds)` = caméra FIXE au bounds passé → soit le bounds data-extent n'atteint pas le comp Remotion (`remotion/src/Root.tsx`), soit `fitBounds` n'est pas appliqué au render → défaut monde/zoom 0. Root-cause à finir dans Root.tsx ; lié au chantier caméra vidéo « Group B ». **Fix concret + visible à faire.**

**Leçon re-gravée** : pour interactif → vérif live navigateur (hover/pan/zoom Playwright) ; pour vidéo → frames par type de beat (early/mid/end), jamais juste le statique. Le statique cache les bugs de hover ET de cadrage-caméra vidéo.

### « Les deux » — Track 2 (enforcement mécanique slice 1) MERGÉ · Track 1 (map-vidéo) TENU — 2026-07-09
- **Track 2 MERGÉ** (`main`, gate 16/16) — 1res dents mécaniques sur l'orchestrateur (le LLM désobéit aux règles écrites → guards qui refusent) : **GUARD producer-match** (`src/producer-guard.ts` : l'exécuté == l'accepté, seul le fallback natif→dw sanctionné passe ; `actualProducer` enregistré ; attrape le flip budget-commune au niveau dispatch — caveat honnête : le flip LLM « dit dw, écrit chart-native dans accepted.json » reste invisible car les 2 champs lisent alors la même valeur → slice spec-provenance suivante) + **GUARD placeholder-source** (`src/source-guard.ts` : rejette `.example`/`.test`/`.invalid`/`.localhost` + `example.com/org/net`, câblé au point unique `validateAccepted` couvrant les 5 producteurs ; vérifié GREEN+RED par moi). Atelier 169 tests. Spec-provenance/gate-ordering = slice 2 (design-bearing).
- **★ Track 1 (cadrage map-vidéo) TENU, PAS mergé** (branche `fix/map-video-framing` gardée). L'agent a bien root-causé (l'Europe est un extent portrait → height-constrained en landscape 16:9 ; le statique landscape a le même cadrage — ma comparaison initiale était fausse) et fixé le padding (frame FINALE serrée, confirmée par moi). **MAIS ma vérif du vrai mp4 a attrapé que le fix est INSUFFISANT** : frames 60/120/180 (~75% du clip, dont `STILL_FRAME.reveal=120` que le pipeline vérifie) restent **lâches vue-monde** ; la caméra ne se serre qu'aux ~40 dernières frames. **L'agent a claim « Europe fills » en ne vérifiant QUE la frame finale** — la discipline « chaque frame par beat » a rattrapé le trou. **Root cause réelle (plus profonde que le padding)** : la caméra reveal ne tient PAS l'extent Europe dès frame 0 — `fitBounds(duration:0)` sur load n'est pas appliqué aux frames early du render Remotion (le map rend à son `center:[10,50] zoom:3` initial jusqu'à un settling très tardif). **Fix à faire** : la caméra doit montrer les bounds fittés dès frame 0 (fixer le center/zoom initial au fit calculé, ou corriger le timing fitBounds/delayRender), vérifié aux frames 60 ET 120, pas juste la finale. Probablement pré-existant sur `main` (bug caméra reveal de longue date, surfacé par la vérif-format).

**★ ÉTAT — main `4e9cf6a`, gate 16/16.** Track 2 mécanique mergé ; map-vidéo reveal a un vrai bug caméra-early tenu (branche `fix/map-video-framing` conserve le padding-fix partiel + tests).

### Track 1 v2 — ★ CORRECTION : le « bug de cadrage map-vidéo » N'EXISTAIT PAS (illusion couleur, erreur de vérif) — 2026-07-09
**Retour Rémy qui m'a rattrapé.** J'avais conclu que le reveal choroplèthe était « lâche 75% du clip » et j'ai (a) rejeté le fix padding de l'agent, (b) passé 3 « fixes » (jumpTo/redraw/areTilesLoaded, tous « échoués ») en débogage systématique, (c) conclu à tort à un « bug architectural Remotion+MapTiler ». **TOUT ça était faux.** Preuve : un **diff pixel frame120-vs-frame239** (ffmpeg `blend=difference`) montre que les SEULES différences sont les **pays de données** (gris→coloré) + le texte overlay ; **tout le basemap (côtes/Groenland/Russie/océan) est pixel-IDENTIQUE**. L'overlay que j'avais instrumenté le disait déjà (`z=2.54 c=10.9,60` identiques aux 2 frames) — même zoom+centre+canvas ⟹ projection identique ⟹ côtes aux mêmes pixels. **Ce que j'ai lu comme « dézoomé » à frame 120 = les pays GRIS non-colorés qui se fondent dans le fond gris, l'œil n'accroche pas l'Europe.** Le reveal cadre l'Europe de façon CONSTANTE ; seules les couleurs fadent in (comportement correct). **Un 2e diff (main-239 vs fix-239, colorées)** montre que `main` et le fix de l'agent sont quasi identiques → le reveal de `main` était déjà bon, le fix agent = tweak mineur. **★ LEÇON gravée : pour juger un CADRAGE, faire un diff pixel objectif — ne JAMAIS juger le cadrage à l'œil sur une frame où l'absence de couleur trompe la perception.** J'ai chassé un fantôme longtemps ; le diff tranche en 2s.

**Statut branche `fix/map-video-framing`** : le fix padding de l'agent est un tweak mineur (tests verts, gate 16/16), pas urgent — à merger comme petite amélioration OU dropper, au choix ; PAS de bug à corriger. Track 1 = **clos, faux problème**.

**PROCHAIN** = spec-provenance (enforcement slice 2) · réconcilier routage+judge avec B · a11y fallback labels symbol interactif · release MIT. (PAS de « fix caméra reveal » — il n'y a pas de bug.)

### 3 lots en parallèle MERGÉS (`fcd394c`, gate 16/16) — 2026-07-09
Lancés en parallèle (worktrees isolés), review + render-verify par moi, merge propre (dry-run clean, disjoints) :
1. **Réconcilier routage avec décision B** — `suggest-chart/SKILL.md` : article-web = **interactif par défaut** (les conditions AND large/multi-série/perso/web-only reframées en **signaux**, pas préconditions) ; le routage MAP aussi (article-web choroplèthe → map-native interactif par défaut, map-dw gardé pour static social + cas static justifié). `atelier/SKILL.md` déjà correct, aucun test d'éval n'encodait l'ancien gate. **+ harness `judge.md` aligné par moi** (`0ca06ae`, repo séparé) : ne flagge plus l'interactif-par-défaut ni l'export-first.
2. **Provenance = enforcement slice 2** (`src/guardrail-parity.ts`) — pas de preuve de provenance (impossible : orchestrateur ET suggest-chart = même LLM, pas de frontière de confiance) → **ré-applique au produce les garde-fous DÉTERMINISTES** de suggest-chart. Gaps câblés : **garde aspect↔type au produce** (était éval-only), furniture native (titre+source), subject-fit native (blue-family sur sujet non-eau) ; **ferme le bypass « channel porté seulement sur le spec »**. 25+7+1 tests, atelier 201. Hors-scope documenté (element/producer/family = besoin de gold ; qualité LLM-juge).
3. **a11y symbol interactif** — le proof `a11y.png` (build interactif pré-hover) est maintenant labellisé (flag `?staticLabels` sur la capture a11y seulement). **★ 2e faux-flag proof-artefact de la session (comme le map-vidéo)** : j'ai vérifié moi-même que le **fallback RÉELLEMENT livré** (`static.html` ← `static.png` du build statique) était **déjà pleinement labellisé** — pas de vrai trou a11y de livraison. Valeur réelle du fix = le proof `a11y.png` (ce que le QA/juge regarde) était trompeur → faux-flag récurrent ; le fix le rend honnête + verrouille l'invariant (conformance + KB WCAG). **LEÇON re-gravée : pour juger un artefact, vérifier ce qui est RÉELLEMENT LIVRÉ, pas le proof — 2 fois cette session j'ai flaggé un proof comme un bug (map-vidéo, a11y symbol).**

**★ ÉTAT — main `fcd394c`, gate 16/16.** Enforcement mécanique slice 1+2, routage aligné B (+ judge harness), a11y symbol proof honnête. **PROCHAIN** = release MIT (REPO_URL + scrub) · scinder ce CLAUDE.md (trop gros) · éventuel corpus QA tiers (le vrai renfort anti-auto-référentiel).

## ★ Batch QA2 (6 cas neufs diversifiés + pièges) + filet deep-verify mécanique + 2 fixes — 2026-07-09

Retour Rémy : « lance de nouveaux tests, couvre le matrix complet (vidéo/interactif/scrolly/image), tente des pièges, vérifie best-practices ET résultat final, remonte pour corriger ». 6 cas neufs écrits (thèmes/lieux variés : budget FR, démographie monde, mégapoles Chine, électrification Afrique de l'Est, médailles sprint, glaciers cantons suisses), 3 pièges tendus (labels diagonaux longs · tooltip hors-fenêtre · hover masqué). Mergé dans `main` (`d9584cc`), gate 16/16, 0 vendor.

**★ Directive Rémy la plus importante — « les judges + fixes doivent vérifier le LIVRÉ en profondeur, c'est pas normal qu'on loupe ça ».** Racine : `judge.md:14` = le juge LLM est **aveugle aux pixels** (raisonne sur le spec/metadata, ne voit pas le rendu ni n'interagit) → il rate tooltip-overflow, scrolly texte-répété, couleurs. Fix systémique = **`atelier-harness/scripts/deep-verify.mjs`** (filet MÉCANIQUE Playwright) : ouvre interactive.html/scrolly.html et teste ce que le juge ne peut pas — **tooltip reste in-viewport** (hover marks du bord), hover surface un tooltip (régression overlap), **scrolly intro ≠ takeaway** (pas de répétition), **pas de fuite langue** (noms anglais dans un livrable FR). **Validé** : il a attrapé le tooltip-overflow (glaciers) + scrolly intro=outro + fuite « Ethiopia/S. Sudan ». `judge.md` (mandat lire le contenu texte + déférer pixel/interaction au filet) + `WORKFLOW.md` (deep-verify câblé dans LOOK) mis à jour (harness `42628e5`). **Gravé aussi dans les prompts des agents de fix** (obligation d'ouvrir/hover/lire le livré, pas les tests).

**★ Pattern d'erreur de MA vérif reconnu (3× cette session)** : sur-flag map-vidéo (illusion couleur), sur-flag a11y-proof (proof ≠ livré), **sous-flag scrolly** (« ✓ livré » sans l'ouvrir — Rémy l'a ouvert et vu le texte répété/couleurs que j'avais ratés). Sur-flag ou sous-flag = même défaut : profondeur de vérif inconstante. Le filet mécanique + « toujours ouvrir/interagir le LIVRÉ » = la parade gravée.

**2 fixes mergés (chacun deep-verifié par l'agent PUIS par moi via `deep-verify.mjs` indépendant) :**
- **chart-native** : (1) **tooltip interactif déborde hors-fenêtre** (bord droit → coupé) — `core/tooltip-clamp.ts` `clampOffset` flip/clamp dans le plot box, partagé via `ChartFrame` (les ~40 types), + gate `snap-tooltip-viewport.mjs` fail-hard au produce (non-vacant). Vérifié : tooltips edge in-viewport. (2) **parser CSV ne gère pas les champs quotés** (virgules dans labels → shape cassée) — `csv.ts` réécrit quote-aware RFC4180. PNG noms de ministères quotés intacts.
- **map-native + scrolly + suggest-chart** : (1) **scrolly intro = takeaway** (identiques) — `deriveTakeawayCopy` (map-story.ts) génère un closer distinct data-tied (« écart de 1 à N ») + guard `auditDistinctBookends`. (2) **noms de pays en anglais dans scrolly FR** — `labelField` threadé (`computeChoropleth` → `layout.labels`) → Éthiopie/Soudan du Sud. (3) **ramp choroplèthe bleu générique** — subject→ramp câblé (energy→oranges), templates suggester émettent subject+palette, guard `checkPaletteConformance` fire au produce (refuse subject sans palette). Vérifié à mon œil : ramp chaud YlOrRd.

**★ Queués (relevés, PAS droppés)** : dense-symbol carte produce-échec (conformance + a11y-source + pas de re-route dw → turn-cap) · producer over-produce (`interactive.html` buildé pour canal social — l'export LIVRÉ reste propre, c'est le byproduct) · cas **portrait/colonne** à ajouter pour reproduire enfin les **labels diagonaux coupés** (ici ça a routé en barres H, pas de rotation) · piège hover-masqué non testable (carte dense blanche) · coquille source « Émité » · downgrade sans re-confirm (long-labels) · popup hover static/interactif choroplèthe montre encore le nom anglais du basemap (surface séparée, labelField non threadé) · DRY `core/Tooltip.tsx`.

**★ ÉTAT — main `d9584cc`, gate 16/16.** Batch QA2 : matrix couvert (vidéo 9:16 ✓, static ✓, scrolly ✓, interactif ✓), tooltip-overflow + CSV + scrolly-qualité + ramp subject-fit corrigés et deep-verifiés, **filet mécanique deep-verify** en place (le vrai antidote aux misses). PROCHAIN = le lot queué (dense-symbol/produce-gating/cas portrait-colonne) · release MIT · scinder ce CLAUDE.md.

## ★ Tes 2 bugs nommés reproduits + corrigés (labels rotés coupés · hover masqué) — 2026-07-09

Mergé dans `main` (`ed18929`), gate 16/16, deep-verify par les agents PUIS par moi.
- **#1 labels diagonaux coupés** (WaterfallChart) : labels rotés -40° end-anchored → début clippé au bord gauche + collision « Source ». **Reproduit par moi** (Read PNG). Fix (`core/text.ts` helpers partagés) : tronque la FIN (début lisible gardé), marge descente **bornée à une fraction du canvas** (grounding : article-web rend à 600×338 → grossir la marge collapse le plot ; le bon modèle = borner+tronquer), font un cran plus petit ; tooltip interactif porte le nom complet. Test render-géométrie non-vacant (ancien start x = -209px off-canvas). **Vérifié à mon rendu** : « Ministère de l'Édu… / …Éco… / …Tr… / …Int… / …Ju… », débuts lisibles, source dégagée, axe Y régulier.
- **#3 hover masqué** (carte symbol dense, cercles chevauchants) : seul le plus gros cercle atteignable (les autres derrière, bloqués). **Reproduit par moi** (sweep Playwright : 1/6 avant). Root cause : pas de `circle-sort-key` (l'ordre du tableau ne contrôle PAS le z des cercles MapLibre — la KB affirmait le contraire, corrigée) + hover `mouseenter`+`features[0]` fragile. Fix (`SymbolMap.tsx`) : `circle-sort-key` small-on-top + `mousemove` + `nearestSymbolIndex` (pick le centre le plus proche). Test régression non-vacant. **Vérifié** : agent 2/6→6/6, moi HK/Dongguan/Foshan désormais atteignables (étaient bloqués).

**★ ÉTAT — main `ed18929`, gate 16/16.** Tes 3 bugs nommés désormais TOUS traités : tooltip hors-fenêtre (lot précédent) · labels rotés coupés · hover masqué. Reste queué : dense-symbol produce-cluster (source non-capturée → a11y hard-fail → pas de re-route dw) · producer over-produce social · popup choroplèthe nom-anglais · release MIT · scinder CLAUDE.md.

## ★ Cluster dense-symbol — racine mécanique corrigée (snap-a11y acceptait pas une source prose) — 2026-07-09

Mergé/committé dans `main` (`f1c8cd1`), gate 16/16, vérifié au vrai produce. Le cas QA2 dense-symbol échouait le produce à `snap-a11y` (« source link missing href »). **Vrai bug** : `map-native/scripts/snap-a11y.mjs:306` exigeait un lien source (href) et **hard-failait le produce sans**, alors que `SKILL.md:190` dit explicitement « a name-only prose source with no URL **still passes** ». Une source prose légitime (« Chiffres tels que rapportés dans cet article ») tuait un interactif entièrement buildé. **Fix** : la source doit être PRÉSENTE (texte lisible) ; un lien rendu doit porter un href ; une prose nom-seul (texte, pas d'ancre) passe — la règle « dataset nommé → URL requise » reste au guard config-time, pas au snap render. chart-native snap-a11y durci pareil (son `getAttribute` sur `a[href]` zéro-match pouvait hang/throw sur une source prose). **Vérifié** : prose → « a11y: all checks pass », vraie URL → passe toujours. → le produce dense-symbol réussit maintenant même en source prose (plus de hard-fail + terminate).

**Reste du cluster = flow, pas mécaniquement fixable proprement** : la vraie source du persona tombait en prose (suggest-article ne l'a pas extraite / Gate 2c pas suivi) — c'est la faiblesse récurrente de capture source (contrat social au déploiement). Le no-re-route-dw devient moot (le produce réussit).

**★ ÉTAT — main `f1c8cd1`, gate 16/16.** Bugs restants majeurs traités. Queué : producer over-produce social (`interactive.html` buildé pour social) · popup choroplèthe nom-anglais basemap · capture source (flow) · release MIT · scinder CLAUDE.md.

## ★ Popup choroplèthe localisé (nom data, pas basemap anglais) + décision honnête sur l'over-produce — 2026-07-09

Mergé/committé dans `main` (`9a5abd5`), gate 16/16. **Popup choroplèthe** : le hover montrait `f.properties.name` = nom **basemap anglais** (« Ethiopia ») même en livrable FR. Fix : `config.labelField` threadé dans le `computeChoropleth` de `ChoroplethMap` (peuple `layout.labels`), `__label` localisé écrit sur chaque feature, préféré dans le popup (fallback nom basemap). **Vérifié par moi au Playwright hover** : « Éthiopie — 51% », « Soudan du Sud — 8% », « Ouganda — 45% » (était Ethiopia/S. Sudan/Uganda). (Champ `labelField?` ajouté au type `ChoroplethConfig`.)

**Over-produce (interactive.html buildé pour canal social) — DÉFÉRÉ honnêtement (pas droppé)** : le livré est **déjà correct** (l'export exclut l'interactif pour social — c'est un byproduct du outDir de produce, temps de build gaspillé seulement). Le fix propre (gater le build interactif + ses ~4 snaps interactifs par canal, sans casser article-web/static/vidéo) est un **refacto multi-branches** qui mérite sa passe dédiée avec régression complète — pas un changement à la va-vite en fin de session énorme. Faible sévérité, risque réel → passe dédiée.

**★ ÉTAT — main `9a5abd5`, gate 16/16.** Restants : over-produce social (refacto dédié) · capture source (flow) · release MIT · scinder CLAUDE.md.
