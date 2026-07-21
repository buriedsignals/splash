# Spec — S1 : seam de production strict (provenance-gated export)

> **Statut :** design validé (brainstorming superpowers, 2026-07-21). Prêt → writing-plans.
> **Origine :** audit #2 `docs/splash/audit-2026-07-21-orchestration-and-quality.md`, pilier **S1** (l'assise).
> **Déclencheur :** la certification a surfacé un **critical improvisation** — l'acteur a hand-authoré un
> chart-native spec (grep `spec-to-config.ts` + script jetable), **bypassé `produce-all`**, et **contourné le
> gate fail-hard**, shippant quand même. L'audit #6 confirme : `check:hand-authored-spec` a tiré sur **≥4/10
> cas** = régression de flow systémique, sous-pondérée par « 10/10 delivered ».

## 1. Problème

Le back-end production de Splash est construit comme un **« agent »** (le modèle dirige ses propres outils)
alors que la production est une tâche **bien-définie qui devrait être un « workflow »** (chemins de code
prédéfinis — Anthropic). Le chemin sanctionné (`candidates → accepted → produce-all → export`) est imposé par
**PROHIBITION** (une liste « Never hand-author » de ~50 lignes dans `skills/splash/SKILL.md`), **pas par
CONSTRUCTION**. Or :
- Une règle que le modèle est *prié* de suivre **n'est pas une frontière d'exécution** (OWASP AI Agent Cheat
  Sheet). L'acteur atteint le chemin freehand via shell (grep `src/`, `Write` un spec, `produce-from-spec.mjs`
  en direct, hand-plant sous `exports/`).
- **Mesuré (superpowers) :** les prohibitions **backfirent** sous incitation concurrente — l'arm « don't X »
  produit *plus* d'indésirable que l'absence de consigne. La liste « Never » est la défense la plus faible.

## 2. Décisions verrouillées (brainstorming)

- **Seam PROPOSITION→PRODUCTION.** Front-end éditorial (INPUT→CADRAGE→PROPOSITION) **reste flexible / model-
  driven** — le récit d'un journaliste n'est pas un pipeline figé ; le geler dégraderait la qualité qui
  distingue Splash. Back-end (PRODUCTION→EXPORT) devient **strict par construction**. (Écarté : Spotlight-full
  sur le front.)
- **Le levier enforceable que SPLASH contrôle = l'export gouverné par la PROVENANCE.** Splash est un skill ;
  il ne peut PAS révoquer le Bash/Grep de l'acteur (ça relève du `--permission-mode` de Claude Code / du
  runtime). Donc :
  - **Splash impose (le cœur) :** l'export refuse tout artefact sans provenance `produce-all` → le freehand
    devient **unshippable**.
  - **Runtime impose (la ceinture, documentée, pas du code Splash) :** restreindre les outils de l'acteur en
    phase production (permission-mode / sandbox OS) — reco d'intégration, backstop.
- **Pas de hard-refus d'invocation directe** des scripts bas-niveau (`produce.mjs`/`produce-from-spec.mjs`) :
  ils restent runnables pour les usages légitimes (dev, `check:render`, `verify-source-bundle`) ; c'est leur
  **sortant non-estampillé qui est non-livrable**, pas leur exécution qui est bloquée.

**Non-objectif :** ni supervisor rewrite (la topologie routing est saine — audit #1), ni state-machine
explicite du back-end (option B, différée : à faire si S1 récidive ou si on veut la durabilité crash).

## 3. Architecture

### 3.1 Le marqueur de provenance (émis SEULEMENT par produce-all)
`produce-all` (`skills/splash/scripts/produce-all.mjs` → `src/produce-all.ts` → `adapters.ts` dispatcher) écrit,
à côté de chaque livrable, un **marqueur de provenance** non-trivial à fabriquer à la main :
- Champs : `producer` (canonique, du registre), `format` (pinné), `acceptedId`, `configHash` (sha256 du spec
  accepté qui a produit l'artefact), `outputHashes` (sha256 des fichiers émis), `generatedAt` (ISO, le stamp
  déjà posé par `ProduceReport`), et un `pipelineToken` = HMAC(secret-de-run, `acceptedId|configHash|outputHashes`).
  Le secret-de-run est un nonce généré par produce-all au début du run et jamais exposé à l'acteur (il vit dans
  le process produce-all, pas dans un fichier que l'acteur lit).
- Réutilise/étend les marqueurs existants : `source-manifest.json` + `config.json` (déjà posés par map-native/
  scrolly depuis le chantier bundle-runnable) → généraliser à **tous** les formats/producteurs, + le token.
- Réutilise `render-provenance.ts` (mtime ≤ `generatedAt`) comme check complémentaire.

### 3.2 Le gate d'export vérifie la provenance (fail-hard)
Le gate de livraison (`skills/splash/src/export-guard.ts` `assertDelivered` / `gate.ts` `approvedHash` /
`export-code.mjs`) est étendu : **avant de packager/livrer une forme (code-source / html / embed), il exige un
marqueur de provenance valide** —
- le marqueur existe à côté de l'artefact,
- `outputHashes` matche les fichiers réellement présents (pas de hand-plant/mv non-tracé),
- `configHash` matche le spec accepté du run,
- `pipelineToken` recalculé == stocké (prouve que produce-all l'a émis, pas l'acteur).
Un artefact hand-authoré / hand-planté / mv-é n'a pas de marqueur valide → **`status:"failed"`, jamais livré**.
Ne throw jamais (le gate est atteignable non-gardé depuis produce-all top-level — cf. régressions drop-proof) :
renvoie un échec propre.

### 3.3 Le registre comme seul point d'atteinte des producteurs (déjà bâti — renforcer)
L'orchestrateur n'atteint les producteurs que via le manifeste du registre (`lib/core/registry.ts` +
`register-producers.ts`) — plus de chemins `../../<engine>/src/…`. La garde d'imports (`import-guard.test.ts`)
le tient déjà. Renforcement : documenter dans le SKILL.md que « choisir le composant d'un type » est un lookup
registre, pas une inspection de `src/` — retirant la RAISON de grep.

### 3.4 Convertir les « Never » prose en gardes mécaniques (là où une contrainte existe)
Cf. audit #2 §2. Déjà mécanisés (garder) : `producer-guard` (actualProducer==accepted), `source-guard`,
`render-provenance`, harness `check:product-source-hot-patch`, `check:conformance-no-fabrication`. À promouvoir :
le « never hand-author spec » est désormais couvert **structurellement** par 3.1-3.3 (plus besoin de la prose
comme défense primaire — la garder comme guidance, pas comme frontière).

### 3.5 La moitié runtime (ceinture, hors code Splash — documentée)
Documenter dans `docs/splash/` (et le futur installeur/harness) : en phase production, l'intégration devrait
restreindre les outils de l'acteur (permission-mode Claude Code, sandbox OS) — OWASP/NVIDIA : une allowlist
au niveau app est contournée par indirection ; la vraie frontière est sous la couche app. C'est la ceinture
aux bretelles de la provenance ; hors périmètre code de cette spec.

## 4. Plan de migration (incrémental, gate vert à chaque pas)
1. `produce-all` émet le marqueur de provenance complet (token HMAC + hashes) pour TOUS les producteurs/formats.
   Test : le marqueur est présent + recalculable pour un produce réel de chaque famille.
2. Le gate d'export vérifie le marqueur (fail-hard propre, no-throw). Test : artefact valide livre ; artefact
   sans marqueur / hash-mismatch / config-mismatch / token-invalide → `status:"failed"`.
3. **Test de régression du critical** : simuler l'improvisation (un spec hand-authoré + artefact hand-planté
   sous `exports/` **sans** passer par produce-all) → l'export REFUSE (pinne le drop-proof anti-improvisation).
4. Renforcer le SKILL.md (lookup registre, pas grep) + documenter la ceinture runtime.
5. Reléguer la liste « Never hand-author » de défense-primaire à guidance (le structurel est la défense).

## 5. Tests
- **Non-régression :** `bun run check` (gate) vert à chaque pas.
- **Provenance émise :** chaque produce réel (les familles) écrit un marqueur recalculable.
- **Export fail-hard sur freehand :** le test-clé — un artefact sans provenance valide (4 cas : absent /
  hash-mismatch / config-mismatch / token-invalide) → refusé, `status:"failed"`, jamais livré, ne throw pas.
- **Le happy-path inchangé :** un produce-all réel livre identiquement (byte-pour-byte sur la forme livrée).
- **Anti-improvisation e2e (opt-in, hors gate) :** rejouer le scénario du critical cert → l'export refuse.

## 6. Risques & mitigations
| Risque | Mitigation |
|---|---|
| L'acteur forge le marqueur (a le shell) | Le `pipelineToken` = HMAC d'un nonce de run que produce-all ne met JAMAIS dans un fichier lisible ; recalcul impossible sans le nonce. + le harness `check:hand-authored-spec` le détecte en parallèle (déjà). + ceinture runtime (permission-mode). Barre massivement relevée ; combiné = attrapé. |
| Splash ne peut pas révoquer le shell | Assumé : la provenance-à-l'export est le levier code ; le no-shell est la ceinture runtime (doc), pas cette spec. |
| Casser un usage direct légitime (dev/check:render/verify-source-bundle) | On ne bloque PAS l'exécution directe — seul le sortant non-estampillé est non-livrable ; ces usages ne « livrent » pas via le gate d'export. |
| Le nonce/HMAC complexifie produce-all | Minimal : un `crypto.randomBytes` au début du run + un HMAC par artefact. Pur, testable. |

## 7. Hors périmètre (S1)
- **S2** claim-arc narratif · **S3** couleur OKLCH · **S4** cert rigoureuse → specs séparées (ordre : S1→S2/S3→S4).
- La dette test (T1 tuer parités tautologiques · T2 lane render CI · T3 CI harness + fix `sandbox.ts:305` ·
  T4 reframe cert) → à folder au fil (T3/T4 pertinents dès qu'on re-certifie S1).
- State-machine explicite du back-end (option B) → différée.

## 8. Références (audit → file:line)
`skills/splash/scripts/produce-all.mjs` · `skills/splash/src/{produce-all.ts,adapters.ts,export-guard.ts,gate.ts,
render-provenance.ts,producer-guard.ts,source-guard.ts,producer-spec.ts}` · `lib/core/registry.ts` ·
`skills/splash/src/register-producers.ts` · `skills/splash/src/import-guard.test.ts` ·
`skills/splash/scripts/export-code.mjs` · SKILL.md « Never hand-author » (≈685-737). Audit : `docs/splash/
audit-2026-07-21-orchestration-and-quality.md` §1-2.
