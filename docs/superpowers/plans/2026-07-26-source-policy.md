# Plan — Source policy (`lib/source/`)

> **Spec :** `docs/superpowers/specs/2026-07-26-source-policy-design.md`
> **Branche :** `feat/source-policy` · **Baseline :** `cd lib && bun test` → 660 pass / 3 skip / 0 fail.
> **Discipline :** TDD strict — écrire le test, le LANCER, le voir échouer, puis implémenter.
> Un commit par tâche, message minuscule qui énonce le comportement.
> **Périmètre fichiers :** `lib/source/**` (à moi) + `lib/loop/manifest.ts` (partagé — ADD only,
> additions groupées, aucun déplacement de code existant).

---

## T1 — vocabulaire, schémas, résultat typé

**Fichiers :** `lib/source/kinds.ts`, `lib/source/result.ts`, `lib/source/kinds.test.ts`,
`lib/source/result.test.ts`.

Tests d'abord :
- `should list exactly the six source kinds of issue #7`
- `should parse a minimal declaration` / `should reject an unknown field on a declaration`
  (`strictObject` — le critère « migrate without silently widening »)
- `should default a ledger mode to real`
- `should reject an unknown run mode`
- `should map every source policy code to invalid-request through toVerbResult`

Implémentation : `SOURCE_KINDS`, `SourceKind`, `RUN_MODES`, `RunMode`,
`SourceDeclarationSchema` (`z.strictObject`), `SourceLedgerSchema`, types inférés ;
`SourceResult<T>`, `sourceOk`, `sourceFail`, `SOURCE_POLICY_CODES`, `toVerbResult`.

---

## T2 — la table de conséquences

**Fichiers :** `lib/source/requirements.ts` (+ test).

Tests d'abord :
- `should require a specific url only for public`
- `should forbid an internal ref on public, local and prose`
- `should forbid a url on private and synthetic`
- `should refuse to ship synthetic in a real run`
- `should allow only verbatim figures for prose`
- `should say none carries no facts`
- `should cover every source kind` (drift-guard : la table itère `SOURCE_KINDS`)

Implémentation : `FieldRule`, `SourceRequirements`, `SOURCE_REQUIREMENTS`, `requirementsFor`.

---

## T3 — spécificité de l'URL publique

**Fichiers :** `lib/source/url.ts` (+ test).

Tests d'abord :
- `should accept a dataset page url`
- `should reject a bare homepage as not specific`
- `should accept a query-only url as specific`
- `should reject http, file:// and placeholder hosts as not a url`
- `should reject a trailing-slash root as not specific`

Implémentation : `sourceUrlVerdict`, `isSpecificSourceUrl`, au-dessus de `isHostedUrl`
(`lib/core/contract.ts`, import en lecture seule).

---

## T4 — furniture : la ligne de crédit publiable

**Fichiers :** `lib/source/furniture.ts` (+ test).

Tests d'abord :
- `should compose a localized credit line for a public source` (fr → « Source : … »)
- `should qualify a prose credit as figures quoted in the article` (fr/de/it/en)
- `should put the demonstration notice inside the credit of a synthetic source`
- `should return an empty credit for a none source`
- `should never carry an internal ref into the published source` (private → aucun champ
  ne contient l'`internalRef`)

Implémentation : `PublishedSource`, `publishedSourceFor(decl, lang)`, tables
`PROSE_QUALIFIER` / `SYNTHETIC_NOTICE` (fr/de/it/en, repli EN), prefix via `sourceLabel()`.

---

## T5 — `validateSourcePolicy` (le point d'entrée unique)

**Fichiers :** `lib/source/policy.ts` (+ test).

Tests d'abord (un par branche de refus, plus un heureux par classe) :
- `should refuse an undeclared source rather than assuming one`
- `should refuse a public source without a url` / `… with a homepage url`
- `should accept a local source with no url at all`
- `should accept a private source and publish only its display label`
- `should refuse synthetic in a real run` / `should accept synthetic in a test run`
- `should accept prose and mark its figures as verbatim only`
- `should refuse none when the visual carries factual data`
- `should accept none for a visual with no factual data`
- `should refuse a forbidden field even when everything else is valid`

Implémentation : `SourcePolicyContext`, `SourceVerdict`, `validateSourcePolicy`
(ordre de refus déterministe de la spec §3.3).

---

## T6 — prose : les chiffres ne sont que repris

**Fichiers :** `lib/source/prose.ts` (+ test).

Tests d'abord :
- `should ground a figure quoted verbatim in the article`
- `should refuse a figure derived from quoted figures` (12 + 30 → 42 absent du texte)
- `should read a french thousands-separated figure as one number` (« 17 600 »)
- `should treat a comma decimal and a period decimal as the same figure`
- `should throw naming the ungrounded figure`

Implémentation : `figuresIn`, `ungroundedFigures`, `assertProseGrounded`.

---

## T7 — non-fuite du privé

**Fichiers :** `lib/source/redact.ts` (+ test).

Tests d'abord :
- `should build a public view that omits every internal reference`
- `should throw when an export payload contains the internal reference`
- `should throw when only the file name of an internal path survives`
- `should throw on a file:// url in the payload`
- `should pass a payload that carries only the published credit`

Implémentation : `publicSourceView`, `assertNoPrivateLeak`.

---

## T8 — la question ciblée + l'invariant du ledger

**Fichiers :** `lib/source/policy.ts` (suite), `lib/source/index.ts` (+ tests).

Tests d'abord :
- `should ask for the source kind first when nothing is declared`
- `should ask only for the missing required field once the kind is known`
- `should ask nothing when the declaration is complete`
- `should refuse a ledger whose local input was never frozen`
- `should refuse a ledger that classes a frozen data input as none`
- `should refuse a synthetic ledger in a real run`
- `should accept a ledger with no declaration at all` (rien n'est encore déclaré ≠ invalide)

Implémentation : `sourceQuestion`, `assertSourceLedger`, barrel.

---

## T9 — enregistrement au manifest (fichier partagé, ADD only)

**Fichiers :** `lib/loop/manifest.ts` (3 additions groupées), `lib/source/manifest-wiring.test.ts`.

Tests d'abord :
- `should persist a declared source ledger through a write and read`
- `should refuse to write a manifest whose synthetic source claims a real run`
- `should keep writing a manifest that declares no source at all` (aucun run existant ne casse)
- `should never persist an internal reference into the public source view of a run`

Additions au manifest, groupées et signalées par un commentaire de bloc :
1. `import { SourceLedgerSchema } from "../source/kinds";` + `import { assertSourceLedger } from "../source/policy";`
2. `sources: SourceLedgerSchema.optional(),` dans `RunManifestSchema`
3. un bloc unique en **fin** de `assertInvariants` (après la boucle sur les éléments, pour ne
   pas entrer en conflit avec les invariants par élément que les autres chantiers ajoutent).

---

## T10 — acceptance transverse + self-review

**Fichiers :** `lib/source/acceptance.test.ts`.

- `should decide the same thing for every gate reading the same declaration` (une déclaration →
  `validateSourcePolicy` et `requirementsFor` d'accord sur l'exigence d'URL — la contradiction
  nommée en tête de #7)
- `should cover every source kind end to end` (table pilotée par `SOURCE_KINDS` : chaque classe a
  un cas valide et un cas refusé — le drift-guard qui échoue si une classe est ajoutée sans test)
- `should never leak a private reference through the public view of any kind`

Puis : relecture du diff, `cd lib && bun test` (≥ 660 + les neufs, 0 fail),
`cd skills/splash && bunx tsc --noEmit` propre, et rédaction de `## Risques assumés` dans la spec.
