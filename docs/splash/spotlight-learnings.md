# Spotlight → Splash : les pratiques d'orchestration à adopter

> Étude du 2026-07-16 (demande Rémy) : `github.com/buriedsignals/spotlight` — l'orchestrateur
> d'investigation OSINT de Tom (17 skills, 7 runtimes, MIT). Même philosophie que Splash
> (gates explicites, artefacts fichiers, garde mécanique), plus mûr sur plusieurs axes
> d'ingénierie d'orchestration. Anchors = fichiers du repo Spotlight au 2026-07-16.
> Priorisé : **A = adopter maintenant** (gravé dans les chantiers en cours) ·
> **B = adopter à la release MIT** · **C = backlog/idée**.

## A1 — Context Recovery : « all state lives in files » + table de reprise

**Ce que fait Spotlight** (`SKILL.md:809-834`, `docs/recovery.md`) : tout l'état vit dans
`{CASE_DIR}/` ; une table mappe la PRÉSENCE d'artefacts → la phase de reprise (« pas de
`methodology.json` → Phase 2 ; `findings.json` sans `summary.md` → Phase 3, évaluer le cycle
courant »). Un run tué à n'importe quel token se reconstitue avec un `ls`.

**Splash aujourd'hui** : l'état existe (`exports/<slug>/accepted.json`, `report.json`,
`<id>-export/`) mais AUCUNE table de reprise dans le SKILL.md — un run interrompu (compaction,
crash type Tom) repart de zéro ou improvise.

**Adoption** : section « Context recovery » dans `skills/splash/SKILL.md` — table
présence-d'artefact → étape du flow canonique (pas d'`accepted.json` → CADRAGE/PROPOSITION ;
`accepted.json` sans `report.json` → PRODUCTION ; `report.json` sans `*-export/` → EXPORT ;
`*-export/` présent → étape 12, offre re-format). Petit chantier, à exécuter avec C3+C4
(même fichier). Corollaire Spotlight : même les « non » sont des fichiers
(`report-declined.json` avec `input_sha256`) — un choix a/b/c décliné devrait laisser un
marqueur, pas juste un tour de conversation.

## A2 — Preflight : statuts tri-état PERSISTÉS, jamais des booléens

**Ce que fait Spotlight** (`SKILL.md:191-232`, `integrations/preflight.py`) : chaque
intégration = `{status: green|yellow|red, checked_at, source, reason}` écrit dans le config
file ; les exigences des phases aval sont CONDITIONNELLES au statut (« required_in_phase_2
only when status green ») ; les échecs optionnels n'aboutissent jamais à un blocage silencieux.

**Adoption → enrichit C2 (spec déjà amendée)** : `preflight.ts` retourne des status objects
tri-état persistés dans un `.splash-preflight.json` par projet (pas des findings jetables) ;
`yellow` = dégradé annoncé (ex. MapTiler absent → maps annotées dans les propositions),
`red` = bloquant au dispatch seulement pour le moteur concerné. Le CLI PROPOSITION lit le
fichier au lieu de re-sonder à chaque run.

## A3 — Discipline « validator errors as re-spawn prompts, shape-only, borné »

**Ce que fait Spotlight** (`SKILL.md:502-556`) : quand un validateur mécanique échoue, le
prompt de correction QUOTE les erreurs verbatim + directive « fix the shape only, don't change
your findings » + retry borné à UNE fois, sinon le gap est présenté comme non-vérifié. Ça
empêche les gardes déterministes de devenir des cibles de reward-hacking (« never change prose
merely to satisfy a language heuristic »).

**Splash aujourd'hui** : produce-all fail loud + garde anti-improvisation (Wave 11) — mais pas
de règle de RETRY écrite : l'orchestrateur improvise la correction (observé chez Tom : « a
produce call exited non-zero and was worked around »).

**Adoption** : règle SKILL.md dans PRODUCTION — « un produce/validate non-zéro se corrige en
citant l'erreur verbatim, UNE tentative, sinon STOP et présenter l'échec au journaliste tel
quel ; jamais de contournement ». S'aligne avec la Never-list existante.

## A4 — Stall protocol : borne + message scripté + options

**Ce que fait Spotlight** (`SKILL.md:607-611`) : cycles bornés (5), stall détecté
mécaniquement (borne atteinte + critères non remplis), message PRÉ-ÉCRIT : « Stalled after
{N} cycles. Missing: {gaps}. Options: continue / pivot / review as-is » puis STOP. Le modèle
n'invente jamais quand abandonner — il remplit `{gaps}`.

**Adoption** : Splash n'a pas d'équivalent produit (le turnCap est côté harness). Règle
SKILL.md : après 2 échecs de produce sur un même élément (ou 2 rejets Gate 3 successifs) →
message scripté : « Je bloque sur {élément} : {raison}. Options : (a) un autre type de la
sélection, (b) abandonner cet élément, (c) me donner une consigne précise. » STOP.

## A5 — Preuve mécanique d'invocation des sous-skills

**Ce que fait Spotlight** (`skills-manifest.json:125-156`, `SKILL.md:83-95`) : contrat
parent/enfant par phase avec colonne « Validation » — `methodology.json` DOIT contenir
`skills_invoked[]`, vérifié par un validateur. L'invocation des sous-skills n'est pas de la
confiance, c'est un champ vérifiable.

**Splash aujourd'hui** : « invoke suggest-chart as a real Skill call » = prose ; le harness le
vérifie au transcript (checkSuggesterInvoked) mais le produit ne le prouve pas.

**Adoption** : champ `skillsInvoked: string[]` sur `AcceptedProposal` (émis par l'orchestrateur
au §5b comme `channel`/`confirmedTakeaway`) ; `validate-gate` warn si absent, fail si la
proposition vient de la branche guidée sans `suggest-chart` dedans. Petit, mécanique.

## B1 — Contrat runtime : registre de verbes + manifestes d'agents (release MIT)

**Ce que fait Spotlight** (`AGENTS.md:14-33`, `docs/runtimes.md`) : 13 verbes abstraits
versionnés (`runtime_version`, breaking = bump), agents en manifestes (allowed/disallowed
verbs, iteration_limit, preferred_model par runtime + fallback_note) ; un runtime nouveau =
un doc adaptateur de 200-400 lignes, les skills ne sont JAMAIS réécrits par runtime.

**Splash aujourd'hui** : « agnostique runtime » = installeur multi-runtime + scripts bun
appelés au shell. Ça marche, mais le contrat est implicite.

**Adoption (à la release)** : un `AGENTS.md` racine qui explicite le contrat minimal (« tout
runtime qui sait : lire SKILL.md, exécuter `bun <script>`, poser des questions single-select »)
+ la table des seams (produce-all, export-code, preflight) + `llms.txt` racine (résumé
machine-lisible du produit — Spotlight l'a, coût nul, découvrabilité agents).

## B2 — Schémas versionnés = API publique (release MIT)

**Ce que fait Spotlight** : `schema_version` const dans chaque JSON (`schemas/*.schema.json`),
CHANGELOG Keep-a-Changelog/SemVer où un changement de schéma de `findings.json` est annoncé
comme breaking (`CHANGELOG.md:32-36`). Les fichiers de sortie sont traités comme du contrat.

**Adoption (à la release)** : `schemaVersion` sur `accepted.json`/`report.json` +
`docs/splash/CHANGELOG-public.md` SemVer distinct du journal interne. Une rédaction qui parse
`report.json` mérite la même politesse.

## B3 — Installeur : pins exacts + « refuse d'installer le non-listé » (release MIT)

**Ce que fait Spotlight** (`VALIDATED_DEPENDENCIES.md`, `install-spotlight.sh:201-218,614`) :
politique de versions exactes avec un doc source-de-vérité humain, images pinnées par digest,
« No reviewed version pin for $package. Refusing to install. », drift-check en test, clés
jamais dans la ligne de commande/l'historique shell (configurateur local 127.0.0.1, écritures
0600 atomiques — Splash a déjà l'équivalent configurateur).

**Adoption (à la release)** : `VALIDATED-DEPENDENCIES.md` + refus d'installer hors-liste dans
le script `.command` + un `--dry-run`. Le configurateur local de Splash est déjà au niveau.

## B4 — DISCLAIMER qui définit ce que les gardes garantissent (release MIT)

**Ce que fait Spotlight** (`DISCLAIMER.md`) : « Treat `verified` as "our automated pass found
2+ independent sources", not as "this is true" » + notice IA répétée à chaque gate conséquent.

**Adoption (à la release)** : un `DISCLAIMER.md` Splash qui dit exactement ce que les gardes
mécaniques garantissent (contraste WCAG au rendu, claim-grounding sur le domaine des données,
tailles canal) et ce qu'elles ne garantissent PAS (la vérité éditoriale du takeaway). Pour la
notice IA aux gates : à doser avec Rémy (une fois à l'EXPORT, pas du nagging).

## C1 — Catégories de régression protégées dans le harness QA

**Ce que fait Spotlight** (`evals/README.md`, `evals/graders/_common.py`) : les non-négociables
produit (fausse haute confiance, source manquante, fuite sensitive-mode…) sont des catégories
PROTÉGÉES — une amélioration de prompt/skill est refusée si l'une régresse, « ties are
rejected », test/ jamais utilisé pour choisir les edits.

**Adoption (harness, quand on retouche les SKILL.md)** : déclarer les protégées de Splash —
fabrication de données · source droppée · format ≠ canal · claim non groundé · gate sauté —
et faire refuser tout lot de fixes où l'une régresse, même si le score global monte.

## C2 — review.html : le feedback comme artefact structuré

**Ce que fait Spotlight** (`skills/review/SKILL.md`) : artefact HTML auto-contenu de review
avec formulaire par finding → `review-feedback.json` déposé dans le case-dir → la reprise le
détecte (marqueur `-processed.json`), re-spawn ciblé, régénère. Gate 1 devient une boucle
éditoriale itérative qui survit aux sessions.

**Adoption (idée, pas tout de suite)** : le Gate 3 de Splash est conversationnel et ça marche ;
la version artefact vaudrait pour la review ASYNCHRONE (le journaliste regarde le rendu plus
tard, dépose son feedback en fichier). À considérer avec l'extension We.Publish.

## C3 — Manifeste de provenance des livrables

**Ce que fait Spotlight** (`scripts/build-provenance-manifest.py`) : hashes de tous les
artefacts + liens claim→verdict, C2PA optionnel, « signing failures do not block ».

**Adoption (idée post-MIT)** : un `provenance.json` par export (hash du visuel livré, de la
donnée source, du spec, `confirmedTakeaway`) — la story confiance/traçabilité pour les
rédactions, cohérente avec la promesse vitrine. C2PA = option lointaine.

## Ce que Splash a déjà au niveau (ne pas dupliquer)

Gates explicites + veto (équivalent) · gardes mécaniques au spine (validate-gate ≈
validate-case.py, souvent plus riches côté rendu : snaps WCAG/label-fit/vidéo) · séparation
producteur/juge (harness) ≈ investigator/fact-checker · dual artefacts humain+machine
(rendu + report.json) · configurateur local sécurisé · tests contrats (`bun run check`
20 checks ≈ leurs `tests/*-check.py`) · communication style (les deux SKILL.md se ressemblent
beaucoup — même école).

## Séquencement

| Item | Où | Quand |
|---|---|---|
| A1 context-recovery + marqueurs de déclin | SKILL.md | avec C3+C4 (même fichier) |
| A2 preflight tri-état persisté | `preflight.ts` | dans le chantier C2 (spec amendée) |
| A3 discipline retry-borné | SKILL.md PRODUCTION | avec C3+C4 |
| A4 stall protocol | SKILL.md | avec C3+C4 |
| A5 `skillsInvoked` mécanique | producer-spec + validate-gate | petit chantier indépendant |
| B1-B4 | release MIT | avec le chantier release existant |
| C1 protégées harness · C2 review-artefact · C3 provenance | backlog | sur décision |
