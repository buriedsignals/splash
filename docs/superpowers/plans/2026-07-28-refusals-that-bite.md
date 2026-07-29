# Plan d'implémentation — Des refus qui mordent

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un refus de garde ARRÊTE la production, la validation ou la livraison — et nomme le pas
qui débloque — au lieu d'informer un orchestrateur libre de l'ignorer. Trois mécanismes : les
faits sur le disque comme pré-conditions dures, le partagé-et-ouvert comme pré-condition de la
validation avec liaison montré↔approuvé, et des probes dont la sortie est LUE par la porte
pendant qu'un relecteur distinct juge l'éditorial.

**Architecture:** Les trois mécanismes sont des modules purs de `lib/` — `lib/core/routed-refusal.ts`
(le vocabulaire commun : un refus qui porte sa déviation), `lib/loop/preconditions.ts` (①),
`lib/loop/presentation.ts` (②), `lib/loop/probe-run.ts` (③). Ils ont **deux lecteurs, jamais un** :
la CLI de `lib/host` (ce que la prose appelle par Bash) et les scripts de `skills/splash`
(`produce-all.mjs`, `gate-render.mjs`, `review-gate.mjs`, `export-code.mjs` via `export-guard.ts`),
qui les importent directement. `skills/` → `lib/` est la direction légale et déjà pratiquée
(`skills/splash/src/export-guard.ts:10` importe `lib/core/contract`) ; c'est ce qui fait de ce
sous-projet **le premier segment exécutable du pont**, celui des garanties. Aucun garde-fou nouveau :
chaque tâche change ce qui arrive quand un garde existant refuse.

**Tech Stack:** Bun · TypeScript · `bun:test` · `node:fs`/`node:path` (les faits sur le disque) ·
`Bun.spawnSync` en **argv, jamais en chaîne shell** (les probes et l'ouverture) ·
`@noble/hashes/sha2.js` (la liaison montré↔approuvé, le même hash que `lib/loop/preview.ts`).

**Spec:** `docs/superpowers/specs/2026-07-28-refusals-that-bite-design.md`
**Matière mesurée:** `docs/splash/sweep-2026-07-28-triage.md` §§ 8-9 ·
`docs/splash/two-chains-gap-2026-07-28.md` §§ 1.3, 3.6

## Global Constraints

- **Runtime is Bun.** Never `npm`, never `node`. Tests are `bun:test`.
- **Code, comments, identifiers, commit messages: English.** Non-negotiable, whatever the
  language of the conversation. Ce plan est en français ; ce qu'il fait écrire ne l'est pas.
- **No mention of Claude / Anthropic** in any commit, doc, or published artifact.
- **TDD.** The failing test is written and *run* before the implementation, every task.
- **Invariant I1 — a verb never throws.** Every new module in `lib/` returns a value. The three
  `skills/splash/src/*.ts` gates keep their existing `throw` contract (their callers are CLIs
  that catch and `process.exit(1)`); nothing in `lib/` inherits it.
- **Layering.** `lib/core` imports nothing. `lib/loop` may import `lib/core`. `skills/` imports
  `lib/`, never the reverse — `lib/core/channel-policy.ts:3-4` states the rule and
  `two-chains-gap-2026-07-28.md` §1.3 records the two modules that already break it; no task here
  adds a third.
- **Aucun garde nouveau** (spec §5). La détection fonctionne. Chaque tâche déplace ce qui arrive
  APRÈS un refus. Une tâche qui ajoute un contrôle est hors périmètre.
- **Un faux blocage tue un run de journaliste** — c'est le péché cardinal de ce dépôt
  (`skills/splash/src/candidate-provenance.ts:14`). Toute exemption est **mesurée**, jamais
  supposée, et son commentaire cite la ligne qui la justifie.
- **Vérifier au livré, jamais au grep d'un bundle construit.** Un bundle single-file inline toute
  la registry ; grepper n'est pas une preuve.
- **`message` est journaliste-facing, `route.command` ne l'est pas.** `SKILL.md` interdit d'émettre
  un nom interne au journaliste ; `SKILL.md:1178` exige qu'un refus soit remonté tel quel. Les deux
  tiennent parce que `journalistSentence()` et `refusalSentence()` sont deux rendus du même refus.
- **Vérification par tâche, scopée** : `cd <dir> && bunx tsc --noEmit` et `cd <dir> && bun test`.
  Le gate complet (`bun run check`, 22 checks : 9 `tsc` + 13 `bun test`) tourne une fois, en tâche 13.

---

## File Structure

**Créés**

| fichier | responsabilité |
|---|---|
| `lib/core/routed-refusal.ts` | `RefusalCode`, `Route`, `RoutedRefusal`, la table `REFUSAL_ROUTES`, `routed()`, `refusalSentence()`, `journalistSentence()`. Le vocabulaire que les trois mécanismes émettent. Types + une table, zéro I/O — `lib/core` continue de n'importer rien. |
| `lib/core/routed-refusal.test.ts` | tout code est routé ou déclaré sans issue ; les deux rendus disent ce qu'ils promettent. |
| `lib/loop/preconditions.ts` | ① `productionPrecondition(runDir)` et `exportPrecondition(files, {format, form})`. Deux `existsSync`/filtres de listing, aucun moteur, aucun manifeste. |
| `lib/loop/preconditions.test.ts` | les deux faits, plus l'exemption `code-source` mesurée. |
| `lib/loop/presentation.ts` | ② `presentArtifact()` (ouvre et écrit le reçu), `shownReceipt()`, `shownCovers()`. Construit sur `present()` de `lib/loop/preview.ts`. |
| `lib/loop/presentation.test.ts` | |
| `lib/loop/probe-run.ts` | ③ `runProbes(specs, opts)` — exécute chaque probe en **argv**, dérive l'issue du code de sortie. |
| `lib/loop/probe-run.test.ts` | |
| `lib/host/gates.ts` | la moitié de la façade qui sert les trois mécanismes : `describePrecheck`, `presentIn`, `describeProbeRun`. |
| `lib/host/gates.test.ts` | |
| `docs/splash/refusal-routes.md` | le registre que le risque §6 de la spec demande : chaque refus, sa route, et ceux qui n'ont pas de sortie. |

**Modifiés**

| fichier | changement |
|---|---|
| `lib/host/cli.ts` | trois commandes : `precheck`, `present`, `probe` — ce par quoi la prose appelle. |
| `lib/host/capabilities.ts` | les trois commandes entrent dans ce que la façade déclare savoir faire. |
| `skills/splash/scripts/produce-all.mjs` | le menu absent arrête le lot AVANT le premier moteur, avec sa route. |
| `skills/splash/src/export-guard.ts` | `DeliveryForm` devient un alias de `HandoverForm` ; `assertDelivered` refuse un dossier de production remis comme livraison. |
| `skills/splash/src/gate.ts` | `applyRenderGate` exige le reçu de présentation ; `approvedHash` cesse d'être un marqueur d'audit. |
| `skills/splash/scripts/gate-render.mjs` | lit le reçu et le passe. |
| `skills/splash/src/producer-spec.ts` | `ReviewProbe` devient une union mécanique/éditoriale ; `ProposalResult` gagne `reviewer` et `shownSha256`. |
| `skills/splash/src/review-gate.ts` | une probe mécanique porte sa commande et son code de sortie ; l'éditorial exige une attribution. |
| `skills/splash/scripts/review-gate.mjs` | lance les probes par `runProbes`, prend `--reviewer` / `--reviewer-output`. |
| `skills/splash/tests/gate.test.ts`, `tests/review-gate.test.ts` | les appels suivent les signatures. |
| `skills/splash/SKILL.md` (≈1166, ≈1178, §5, §6) | la règle en texte devient l'appel de la commande. |
| `skills/splash/tests/skill-doc-parity.test.ts` | la parité doc↔commande. |

---

## Ordre choisi, et pourquoi

**① d'abord, ② ensuite, ③ en dernier** — dans cet ordre parce que c'est celui du coût croissant et
de la dépendance décroissante : ① est deux `existsSync` qui ne dépendent de rien et couvrent la
plus grosse part mesurée (les 3 runs sans menu + les 17 `produce` contournés de D01, et les 16
non-livraisons prouvées de D11, toutes à l'intérieur des 36 cas qui ont remis le dossier de
production) ; ② a déjà sa moitié construite dans la boucle (`previewStep`, `previewCovers`,
`approvalSubjectOf`) et ne demande qu'exposition et liaison ; ③ coûte un aller-retour par visuel
et touche le seam du relecteur, donc il arrive quand les deux garanties gratuites tiennent déjà.

La tâche 1 précède les trois parce que **la déviation est la décision (a)** : les trois mécanismes
émettent le même type de refus, et un refus écrit avant que le catalogue existe est un refus qui
s'arrête au lieu de router.

---

## Task 1 : `RoutedRefusal` — un refus qui nomme le pas qui débloque

**Files:**
- Create: `lib/core/routed-refusal.ts`
- Create: `lib/core/routed-refusal.test.ts`

**Interfaces:**
- Consumes: rien. `lib/core` n'importe rien, et c'est ce qui rend ce module importable depuis
  `lib/loop`, `lib/host` ET `skills/splash/src` sans traîner la boucle.
- Produces: `REFUSAL_CODES`, `RefusalCode`, `Route`, `RoutedRefusal`, `REFUSAL_ROUTES`,
  `routed(code, message)`, `refusalSentence(r)`, `journalistSentence(r)`.

- [ ] **Step 1 : écrire le test qui échoue**

`lib/core/routed-refusal.test.ts` :

```ts
import { test, expect } from "bun:test";
import {
  REFUSAL_CODES,
  REFUSAL_ROUTES,
  journalistSentence,
  refusalSentence,
  routed,
  type RoutedRefusal,
} from "./routed-refusal";

test("every declared code has an entry in the catalogue, and the catalogue holds nothing else", () => {
  expect(Object.keys(REFUSAL_ROUTES).sort()).toEqual([...REFUSAL_CODES].sort());
});

test("a routed refusal names what is missing AND the act that resolves it", () => {
  const r = routed("render-not-shown", "nobody has been shown this visual yet");
  expect(r.code).toBe("render-not-shown");
  expect(r.route).not.toBeNull();
  const sentence = refusalSentence(r);
  expect(sentence).toContain("nobody has been shown this visual yet");
  expect(sentence).toContain("bun lib/host/cli.ts present");
});

test("the journalist's rendering carries the act but never the command", () => {
  const r = routed("render-not-shown", "nobody has been shown this visual yet");
  const said = journalistSentence(r);
  expect(said).toContain("nobody has been shown this visual yet");
  expect(said).toContain(REFUSAL_ROUTES["render-not-shown"]!.step);
  expect(said).not.toContain("bun ");
  expect(said).not.toContain("cli.ts");
});

test("a refusal with no way out SAYS it has none, instead of trailing off", () => {
  const dead: RoutedRefusal = { code: "no-candidates-menu", message: "x", route: null };
  expect(refusalSentence(dead)).toContain("nothing here unblocks it");
  expect(journalistSentence(dead)).toContain("nothing here unblocks it");
});

test("a route with a step and no command renders the step alone, never a dangling colon", () => {
  const r = routed("no-candidates-menu", "no ranked menu was written down");
  expect(REFUSAL_ROUTES["no-candidates-menu"]!.command).toBeUndefined();
  expect(refusalSentence(r)).not.toContain(": undefined");
  expect(refusalSentence(r).endsWith(REFUSAL_ROUTES["no-candidates-menu"]!.step)).toBe(true);
});

test("no route's command is a shell string — a route is run, not interpolated", () => {
  for (const route of Object.values(REFUSAL_ROUTES)) {
    if (!route?.command) continue;
    expect(route.command.startsWith("bun ")).toBe(true);
    expect(route.command).not.toContain("&&");
    expect(route.command).not.toContain("|");
  }
});
```

- [ ] **Step 2 : le lancer et constater l'échec**

```
cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/core/routed-refusal.test.ts
```
Attendu : FAIL — `Cannot find module './routed-refusal'`.

- [ ] **Step 3 : écrire le module**

`lib/core/routed-refusal.ts` :

```ts
// A REFUSAL THAT NAMES THE STEP WHICH UNBLOCKS IT.
//
// Decision (a) of the 2026-07-28 spec: a refusal DEVIATES, it does not merely stop. The
// journalist is never left in front of a wall — the refusal names what is missing AND routes to
// the act that resolves it. That routing already exists inside the loop
// (manifest.ts's nextActionsForElement); what did not exist is a way to carry it OUT of a gate
// and into a sentence a host can relay.
//
// In lib/core because all three mechanisms emit this type and half their readers live in
// skills/ (the prose chain's own scripts). lib/core imports nothing, so importing it from a
// skill drags in no loop, no zod, no engine registry.
//
// TWO RENDERINGS, on purpose. skills/splash/SKILL.md forbids emitting an internal name to the
// journalist (a script name, a file name, a gate id) and, three lines later, requires a refusal
// to be surfaced to him verbatim. Both hold here because they are rendered from the same record:
// `journalistSentence` carries what is missing and what has to happen, `refusalSentence` adds the
// command — and the command is for the orchestrator, which is the actor that runs it.

export const REFUSAL_CODES = [
  "no-candidates-menu",
  "production-folder-handed-over",
  "render-not-shown",
  "approval-subject-mismatch",
  "probe-not-run",
  "reviewer-not-attributed",
] as const;

export type RefusalCode = (typeof REFUSAL_CODES)[number];

export type Route = {
  /** What has to happen next, in the journalist's own words. Always present: a route with no
   *  step is not a route, it is a shrug. */
  step: string;
  /** The command that performs it, runnable as written. OPTIONAL because some acts are not a
   *  process — invoking the suggester is a skill call, and pretending otherwise would put a
   *  command in front of a reader that nothing can execute. Which routes have none is tracked
   *  in docs/splash/refusal-routes.md. */
  command?: string;
};

export type RoutedRefusal = {
  code: RefusalCode;
  /** WHAT is missing. Journalist-facing: no gate id, no script name, no internal file name. */
  message: string;
  /** `null` is an ADMISSION, written down rather than left for the reader to discover: this
   *  refusal is a hard stop with no known way out (spec §6). */
  route: Route | null;
};

// THE CATALOGUE. Spec §6: "Dévier demande un catalogue. Chaque refus doit savoir vers quel pas
// router. Un refus sans déviation écrite retombe sur un arrêt — acceptable, mais il faut le dire
// au journaliste plutôt que de le laisser deviner, et suivre lesquels restent sans sortie."
// This table IS that tracking, and routed-refusal.test.ts is what keeps it exhaustive.
export const REFUSAL_ROUTES: Record<RefusalCode, Route | null> = {
  // No command: the act is a skill invocation inside the session, not a process. Recorded as a
  // step-without-command rather than dressed up as one.
  "no-candidates-menu": {
    step: "ask the suggester for the ranked list of visuals and keep the list it returns, then choose from it",
  },
  "production-folder-handed-over": {
    step: "hand over the export, not the folder the build left behind",
    command:
      "bun skills/splash/scripts/export-code.mjs <report.json> <id> --form <html|code-source|embed>",
  },
  "render-not-shown": {
    step: "show the visual first, then ask what the journalist thinks of it",
    command: "bun lib/host/cli.ts present --path <artifact>",
  },
  "approval-subject-mismatch": {
    step: "show the visual as it is now — it has changed since it was last shown — and ask again",
    command: "bun lib/host/cli.ts present --path <artifact>",
  },
  "probe-not-run": {
    step: "give each mechanical check the command that runs it, and let the result decide",
    command: "bun lib/host/cli.ts probe --spec <probes.json>",
  },
  "reviewer-not-attributed": {
    step: "have the editorial pass done by someone who did not write this visual, and record who did it",
    command:
      "bun skills/splash/scripts/review-gate.mjs <report.json> <id> --probes <probes.json> --reviewer <name@version> --reviewer-output <findings.json>",
  },
};

/** Build a refusal with the route the catalogue holds for it. The one constructor, so a refusal
 *  can never be minted with a route somebody wrote at the call site. */
export function routed(code: RefusalCode, message: string): RoutedRefusal {
  return { code, message, route: REFUSAL_ROUTES[code] };
}

const NO_WAY_OUT =
  "nothing here unblocks it: stop and say so, rather than working around it";

/** For the ORCHESTRATOR and the ledger — carries the command. */
export function refusalSentence(r: RoutedRefusal): string {
  if (!r.route) return `${r.message} — ${NO_WAY_OUT}`;
  return r.route.command
    ? `${r.message} — ${r.route.step}: ${r.route.command}`
    : `${r.message} — ${r.route.step}`;
}

/** For the JOURNALIST — carries the act, never the command that performs it. */
export function journalistSentence(r: RoutedRefusal): string {
  if (!r.route) return `${r.message} — ${NO_WAY_OUT}`;
  return `${r.message} — ${r.route.step}`;
}
```

- [ ] **Step 4 : relancer**

```
cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/core/routed-refusal.test.ts && bunx tsc --noEmit
```
Attendu : PASS, et un typecheck propre de `lib`.

- [ ] **Step 5 : committer**

```bash
git add lib/core/routed-refusal.ts lib/core/routed-refusal.test.ts
git commit -m "feat(core): a refusal carries the step that unblocks it"
```

---

## Task 2 : ① les deux faits sur le disque, comme fonctions pures

**Files:**
- Create: `lib/loop/preconditions.ts`
- Create: `lib/loop/preconditions.test.ts`

**Interfaces:**
- Consumes: `routed`, `RoutedRefusal` (tâche 1) ; `VisualFormat` de `lib/core/vocabulary`.
- Produces: `CANDIDATES_FILE`, `productionPrecondition(runDir): RoutedRefusal | null`,
  `HandoverForm`, `PRODUCTION_MARKERS`,
  `exportPrecondition(files, { format, form }): RoutedRefusal | null`.

**L'exemption qui doit être mesurée.** `code-source` est exempté de la seconde règle : un bundle
runnable porte `config.json` **à sa racine par conception** —
`skills/splash/scripts/bundle-source.mjs:357` l'y écrit (`writeFileSync(join(abs, "config.json"), …)`)
et le README qu'il génère dit à la rédaction d'éditer ce fichier-là puis de rebuilder
(`bundle-source.mjs:269`). Refuser cette forme ferait échouer la seule livraison dont tout l'intérêt
est que la rédaction possède la source. C'est la seule exemption, et elle est citée dans le code.

- [ ] **Step 1 : écrire le test qui échoue**

`lib/loop/preconditions.test.ts` :

```ts
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CANDIDATES_FILE,
  exportPrecondition,
  productionPrecondition,
} from "./preconditions";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "splash-preconditions-"));
}

test("a directory with no ranked menu refuses production, and the refusal routes", () => {
  const dir = tmp();
  try {
    const r = productionPrecondition(dir);
    expect(r).not.toBeNull();
    expect(r!.code).toBe("no-candidates-menu");
    expect(r!.message).toContain(dir);
    expect(r!.route?.step).toContain("ranked list");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a directory that holds the menu passes — null, never an ok-shaped object", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, CANDIDATES_FILE), "[]");
    expect(productionPrecondition(dir)).toBeNull();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a folder still carrying the build's own files is not an export, and every one is named", () => {
  const r = exportPrecondition(
    ["interactive.html", "config.json", "native-source.json"],
    { format: "interactive", form: "html" },
  );
  expect(r).not.toBeNull();
  expect(r!.code).toBe("production-folder-handed-over");
  expect(r!.message).toContain("config.json");
  expect(r!.message).toContain("native-source.json");
  expect(r!.route?.command).toContain("export-code.mjs");
});

test("the sanctioned html export — exactly the html file — passes", () => {
  expect(
    exportPrecondition(["interactive.html"], { format: "interactive", form: "html" }),
  ).toBeNull();
  expect(
    exportPrecondition(["scrolly.html"], { format: "scrolly", form: "html" }),
  ).toBeNull();
});

test("a runnable source bundle keeps its config.json — the one exemption, and it is measured", () => {
  // bundle-source.mjs writes config.json at the bundle root on purpose, and the README it
  // generates tells the newsroom to edit that very file. Refusing it would fail the delivery
  // form whose whole point is that the newsroom owns the source.
  expect(
    exportPrecondition(
      ["package.json", "vite.config.ts", "config.json", "index.html", "README.md"],
      { format: "interactive", form: "code-source" },
    ),
  ).toBeNull();
});

test("a static hand-over carrying the report is refused too — the rule is not html-only", () => {
  const r = exportPrecondition(["static.png", "report.json"], {
    format: "static",
    form: null,
  });
  expect(r).not.toBeNull();
  expect(r!.message).toContain("report.json");
});

test("an embed hand-over of exactly the recorded URL passes", () => {
  expect(
    exportPrecondition(["EMBED_URL.txt"], { format: "interactive", form: "embed" }),
  ).toBeNull();
});

test("an empty listing is not a production folder — it is an empty folder, and a different problem", () => {
  expect(exportPrecondition([], { format: "video", form: null })).toBeNull();
});
```

- [ ] **Step 2 : le lancer et constater l'échec**

```
cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/loop/preconditions.test.ts
```
Attendu : FAIL — `Cannot find module './preconditions'`.

- [ ] **Step 3 : écrire le module**

`lib/loop/preconditions.ts` :

```ts
// ① THE FACTS ON DISK, TURNED INTO HARD PRECONDITIONS.
//
// Two of the rules the 2026-07-28 sweep found violated are checkable with no judge, no model and
// no text heuristic. They are an existsSync and a filter over a directory listing:
//
//   candidates.json absent          ⇒ the suggester never ran ⇒ production does not start.
//   config.json / native-source.json among the files handed over
//                                   ⇒ that is the build folder, not an export ⇒ not delivered.
//
// The second is a MEASUREMENT, not an intuition: the 16 proven non-deliveries of the sweep are
// all inside the 36 cases that handed that folder back, and none outside it. A three-line check
// replaces a judge's opinion there.
//
// PURE, and in the loop rather than in the skill, because both readers call the SAME function —
// the host façade (what the prose chain invokes) and the prose chain's own scripts. A rule
// enforced in one place and forgotten in the other is how the sweep's D01 happened in the first
// place. Nothing here spawns, reads an engine, or needs a manifest.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { routed, type RoutedRefusal } from "../core/routed-refusal";
import type { VisualFormat } from "../core/vocabulary";

/** The ranked menu the suggester persists beside the accepted proposal. Named here rather than
 *  spelled at each call site: three readers ask about this file. */
export const CANDIDATES_FILE = "candidates.json";

/**
 * MAY PRODUCTION START IN THIS DIRECTORY — or is there no menu anything could have been
 * chosen from?
 *
 * Honest about what it proves: the file is written by hand in the prose chain (nothing in the
 * repo generates it — two-chains-gap-2026-07-28.md §1.1), so its presence is cheap to fabricate.
 * What it stops is the ordinary case the sweep measured: a run that never made a menu at all and
 * produced anyway. Spec §6 states the same limit for the other two mechanisms — it makes the lie
 * expensive, not impossible.
 */
export function productionPrecondition(runDir: string): RoutedRefusal | null {
  if (existsSync(join(runDir, CANDIDATES_FILE))) return null;
  return routed(
    "no-candidates-menu",
    `no ranked list of visuals was ever written down for this story (${join(runDir, CANDIDATES_FILE)} does not exist), so nothing produced here was chosen from one`,
  );
}

/** The delivery FORM axis — orthogonal to VisualFormat. Structurally identical to
 *  skills/splash/src/export-guard.ts's DeliveryForm, which becomes an alias of this one: the lib
 *  half is the definition, because it is the half both sides may import. */
export type HandoverForm = "html" | "code-source" | "embed" | null;

// The files a PRODUCTION directory carries and an export never does. Not a guess: the first two
// are exactly what export-code.mjs:296-302 looks for to decide a build folder can yield a source
// bundle, and the last three are the spine's own bookkeeping.
export const PRODUCTION_MARKERS = [
  "config.json",
  "native-source.json",
  "source-manifest.json",
  "report.json",
  "accepted.json",
  "candidates.json",
] as const;

/**
 * IS THIS FOLDER AN EXPORT, or the directory the build worked in?
 *
 * THE ONE EXEMPTION, and it is measured rather than assumed: a runnable source bundle carries
 * config.json AT ITS ROOT by design — skills/splash/scripts/bundle-source.mjs:357 writes it
 * there, and the README it generates (:269) tells the newsroom to edit that very file and run
 * the build again. Refusing it would fail the one delivery form whose whole point is that the
 * newsroom owns the source, and a false block kills a real journalist's run.
 */
export function exportPrecondition(
  files: string[],
  opts: { format: VisualFormat; form: HandoverForm },
): RoutedRefusal | null {
  if (opts.form === "code-source") return null;
  const planted = files.filter((f) =>
    (PRODUCTION_MARKERS as readonly string[]).includes(f),
  );
  if (planted.length === 0) return null;
  return routed(
    "production-folder-handed-over",
    `the folder being handed over still holds ${planted.join(", ")} — those are files the build leaves behind, so this is the working directory and not the finished ${opts.format} the newsroom was promised`,
  );
}
```

- [ ] **Step 4 : relancer**

```
cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/loop/preconditions.test.ts && bunx tsc --noEmit
```
Attendu : PASS.

- [ ] **Step 5 : committer**

```bash
git add lib/loop/preconditions.ts lib/loop/preconditions.test.ts
git commit -m "feat(loop): the two disk facts that decide production and delivery"
```

---

## Task 3 : ①a mord — le menu absent arrête le lot avant le premier moteur

**Files:**
- Modify: `skills/splash/scripts/produce-all.mjs`
- Create: `skills/splash/tests/produce-all-menu-precondition.test.ts`

**Interfaces:**
- Consumes: `productionPrecondition` (tâche 2), `refusalSentence` (tâche 1), `isDirectBranch`
  (existant, `skills/splash/src/candidate-provenance.ts:74`).
- Produces: rien de nouveau. Le comportement de la CLI change : sortie non-zéro, message routé,
  **et aucun moteur lancé**.

**Ce qui change exactement, et ce qui ne change pas.** `produceAll` refuse déjà un run sans menu —
mais proposition par proposition, à l'INTÉRIEUR de la boucle, après que le préflight et la
validation de chaque proposition sont passés, et le lot sort 1 en ayant potentiellement écrit des
sorties partielles pour les propositions qui, elles, tracent. Ce qui change : le refus est
**terminal pour le lot et antérieur à toute production**, et il porte sa route. Aucun contrôle
nouveau — c'est littéralement la même condition (`candidateProvenance.present === false`), déplacée
et routée. La branche directe (`isDirectBranch`) reste l'exemption qu'elle est aujourd'hui ; la
resserrer serait un garde nouveau, hors périmètre (spec §5) — elle est inscrite au registre de la
tâche 13.

- [ ] **Step 1 : écrire le test qui échoue**

`skills/splash/tests/produce-all-menu-precondition.test.ts` :

```ts
import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, readdirSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CLI = resolve(import.meta.dir, "../scripts/produce-all.mjs");

function fixture(): { dir: string; outDir: string; accepted: string } {
  const dir = mkdtempSync(join(tmpdir(), "splash-menu-precondition-"));
  const outDir = join(dir, "out");
  mkdirSync(outDir, { recursive: true });
  const accepted = join(dir, "accepted.json");
  writeFileSync(
    accepted,
    JSON.stringify([
      {
        id: "p1",
        producer: "chart-native",
        format: "static",
        channel: "article-web",
        spec: { nativeType: "line", title: "t", altInsight: "a", unit: "u", data: "x,y\n1,2" },
      },
    ]),
  );
  return { dir, outDir, accepted };
}

describe("produce-all — the ranked menu is a precondition, not a per-proposal verdict", () => {
  it("refuses the whole batch when no menu was ever written, and names the act that resolves it", () => {
    const f = fixture();
    try {
      const p = Bun.spawnSync(["bun", CLI, f.accepted, f.outDir, f.dir]);
      expect(p.exitCode).toBe(1);
      const err = p.stderr.toString();
      expect(err).toContain("no ranked list of visuals");
      expect(err).toContain("ranked list");
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it("produces NOTHING when it refuses — no engine is reached, so there is no half-built artifact", () => {
    const f = fixture();
    try {
      Bun.spawnSync(["bun", CLI, f.accepted, f.outDir, f.dir]);
      expect(readdirSync(f.outDir)).toEqual([]);
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it("a proposal the journalist NAMED still runs with no menu — the direct branch is untouched", () => {
    const f = fixture();
    try {
      writeFileSync(
        f.accepted,
        JSON.stringify([
          {
            id: "p1",
            producer: "chart-native",
            format: "static",
            channel: "article-web",
            skillsInvoked: ["splash:cadrage-direct"],
            spec: { nativeType: "line", title: "t", altInsight: "a", unit: "u", data: "x,y\n1,2" },
          },
        ]),
      );
      const p = Bun.spawnSync(["bun", CLI, f.accepted, f.outDir, f.dir]);
      // It may still fail further down (no key, no engine in this sandbox) — what it must NOT do
      // is fail on the menu: the refusal this test guards is the one that must not fire.
      expect(p.stderr.toString()).not.toContain("no ranked list of visuals");
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2 : le lancer et constater l'échec**

```
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/produce-all-menu-precondition.test.ts
```
Attendu : FAIL — le premier cas sort bien 1, mais sur `candidate-provenance:` sans la route, et
`out/` n'est pas vide selon le moteur atteint.

- [ ] **Step 3 : câbler la pré-condition avant la production**

Dans `skills/splash/scripts/produce-all.mjs`, ajouter aux imports :

```js
import { productionPrecondition } from "../../../lib/loop/preconditions.ts";
import { refusalSentence } from "../../../lib/core/routed-refusal.ts";
import { isDirectBranch } from "../src/candidate-provenance.ts";
```

Puis, immédiatement APRÈS le bloc qui construit `candidateProvenance` (le `if (existsSync(candidatesPath)) { … }`, `produce-all.mjs:49-60`) et AVANT le gate `flow-decision` :

```js
// ① THE RANKED MENU IS A PRECONDITION OF PRODUCTION, and the refusal is terminal for the batch.
//
// The same condition produceAll already checked per proposal — moved here, ahead of every engine.
// Two things change, and neither is a new control:
//   1. nothing is produced, so a refused run leaves no half-built artifact for a later step to
//      hand-plant around (the sweep's most serious motif: the guard is not bypassed, it is FED);
//   2. the refusal names the act that resolves it instead of stopping at what is missing.
// A proposal the journalist NAMED (the direct branch) is exempt exactly as it was — this line
// asks the same isDirectBranch candidate-provenance.ts has always asked.
const missingMenu = productionPrecondition(dirname(acceptedPath));
if (missingMenu && accepted.some((p) => !isDirectBranch(p))) {
  console.error(`[produce] ${refusalSentence(missingMenu)}`);
  process.exit(1);
}
```

Ne rien changer dans `skills/splash/src/produce-all.ts` : son refus par proposition reste le
filet des appelants en-code (`candidateProvenance` non nul), et le supprimer serait retirer une
détection — ce que la spec interdit.

- [ ] **Step 4 : relancer**

```
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/produce-all-menu-precondition.test.ts && bun test && bunx tsc --noEmit
```
Attendu : PASS, y compris `tests/produce-all.test.ts:175` (« blocks every proposal when
candidates.json was never made ») qui appelle `produceAll` en-code et n'emprunte pas la CLI.

- [ ] **Step 5 : committer**

```bash
git add skills/splash/scripts/produce-all.mjs skills/splash/tests/produce-all-menu-precondition.test.ts
git commit -m "fix(splash): a missing menu stops the batch before any engine runs"
```

---

## Task 4 : ①b mord — un dossier de production n'est pas une livraison

**Files:**
- Modify: `skills/splash/src/export-guard.ts`
- Modify: `skills/splash/tests/export-guard.test.ts` *(si le fichier n'existe pas sous ce nom,
  créer `skills/splash/tests/export-guard-production-folder.test.ts` — vérifier d'abord avec
  `ls skills/splash/tests | grep export`)*

**Interfaces:**
- Consumes: `exportPrecondition`, `HandoverForm` (tâche 2), `refusalSentence` (tâche 1).
- Produces: `DeliveryForm` devient `export type DeliveryForm = HandoverForm;` ;
  `assertDelivered` lève désormais sur un dossier de production, pour toute forme sauf
  `code-source`.

- [ ] **Step 1 : écrire le test qui échoue**

Dans le fichier de test d'`export-guard` :

```ts
import { describe, it, expect } from "bun:test";
import { assertDelivered } from "../src/export-guard";

describe("assertDelivered — the build folder is not a delivery", () => {
  it("refuses an html hand-over that still carries the build's own files, naming every one", () => {
    expect(() =>
      assertDelivered(["interactive.html", "config.json", "native-source.json"], {
        format: "interactive",
        form: "html",
      }),
    ).toThrow(/config\.json/);
    expect(() =>
      assertDelivered(["interactive.html", "config.json", "native-source.json"], {
        format: "interactive",
        form: "html",
      }),
    ).toThrow(/hand(ed)? over/);
  });

  it("accepts the sanctioned html export — exactly the html file", () => {
    expect(() =>
      assertDelivered(["interactive.html"], { format: "interactive", form: "html" }),
    ).not.toThrow();
  });

  it("accepts a runnable source bundle with its config.json — the measured exemption", () => {
    expect(() =>
      assertDelivered(["package.json", "vite.config.ts", "config.json", "index.html"], {
        format: "scrolly",
        form: "code-source",
      }),
    ).not.toThrow();
  });

  it("keeps refusing a lone html copy as a code-source bundle — the older rule still stands", () => {
    expect(() =>
      assertDelivered(["interactive.html"], { format: "interactive", form: "code-source" }),
    ).toThrow(/package\.json/);
  });
});
```

- [ ] **Step 2 : le lancer et constater l'échec**

```
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/ -t "the build folder is not a delivery"
```
Attendu : FAIL — le premier cas ne lève pas : la branche `form === "html"` ne vérifie aujourd'hui
que `files.includes(htmlName)` (`export-guard.ts:146-153`).

- [ ] **Step 3 : câbler la pré-condition dans le garde d'export**

Dans `skills/splash/src/export-guard.ts`, ajouter aux imports du haut :

```ts
import {
  exportPrecondition,
  type HandoverForm,
} from "../../../lib/loop/preconditions";
import { refusalSentence } from "../../../lib/core/routed-refusal";
```

Remplacer la déclaration de `DeliveryForm` (`export-guard.ts:91`) par :

```ts
// The delivery FORM axis — orthogonal to `VisualFormat`. Only interactive/scrolly deliveries
// choose one; static/video have exactly one shape, so `form` is always null there.
//
// ALIASED rather than re-declared: lib/loop/preconditions.ts owns the union now, because the
// same rule is read by the host façade and by this guard, and two structurally identical unions
// in two layers is how the two readers start disagreeing about what "code-source" means.
export type DeliveryForm = HandoverForm;
```

Et, tout en haut du corps d'`assertDelivered`, avant le `if (format === "static")` :

```ts
  // ① A PRODUCTION FOLDER IS NOT A DELIVERY. The 16 proven non-deliveries of the 2026-07-28 sweep
  // are all inside the 36 cases that handed this folder back, and none outside it — so this is a
  // measured rule, not a tidiness preference. The one exemption (a runnable source bundle keeps
  // its config.json) lives in exportPrecondition, with the line of bundle-source.mjs that earns it.
  //
  // FIRST, before the per-format shapes: "this is the wrong folder entirely" is a more useful
  // thing to be told than "your static delivery has 4 files".
  const planted = exportPrecondition(files, { format, form });
  if (planted) throw new Error(refusalSentence(planted));
```

- [ ] **Step 4 : relancer**

```
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test && bunx tsc --noEmit
```
Attendu : PASS. Si `scripts/export-code.test.ts` échoue sur une fixture qui posait un
`report.json` dans le dossier d'export, LIRE la fixture avant de toucher au garde : le dossier
d'export sanctionné ne reçoit qu'un fichier par branche (`export-code.mjs:259, 273, 336`), donc
une fixture qui en pose plus décrit un dossier que la production n'écrit pas.

- [ ] **Step 5 : committer**

```bash
git add skills/splash/src/export-guard.ts skills/splash/tests/
git commit -m "fix(splash): the folder the build worked in is not a delivery"
```

---

## Task 5 : ① atteignable depuis la prose — la commande `precheck`

**Files:**
- Create: `lib/host/gates.ts`
- Create: `lib/host/gates.test.ts`
- Modify: `lib/host/cli.ts`

**Interfaces:**
- Consumes: `productionPrecondition`, `exportPrecondition`, `HandoverForm` (tâche 2),
  `refusalSentence` (tâche 1), `HostResponse` de `lib/host/state`,
  `VISUAL_FORMATS`/`isVisualFormat` de `lib/core/vocabulary`.
- Produces: `describePrecheck(args): HostResponse` ; la commande
  `bun lib/host/cli.ts precheck --stage <production|export> --dir <dir> [--format <f>] [--form <f>]`,
  sortie 0 quand la pré-condition passe, 1 quand elle refuse, 2 sur usage.

**Pourquoi une commande et pas seulement l'import.** La tâche 3 et la tâche 4 couvrent les chemins
qui PASSENT par un script. Le geste que le sweep a mesuré 36 fois — nommer au journaliste un
dossier qu'aucun script n'a produit — n'a pas de script à intercepter. Une commande est ce que la
prose peut appeler avant de nommer le dossier, et c'est le seul point d'entrée existant de la
boucle (`bun lib/host/cli.ts`, pas d'entrée `bin` dans `package.json`).

- [ ] **Step 1 : écrire le test qui échoue**

`lib/host/gates.test.ts` :

```ts
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describePrecheck } from "./gates";

const CLI = resolve(import.meta.dir, "./cli.ts");

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "splash-host-gates-"));
}

test("production stage: a directory with no menu answers a refusal, with its route", () => {
  const dir = tmp();
  try {
    const r = describePrecheck({ stage: "production", dir });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("step-refused");
    expect(r.message).toContain("no ranked list of visuals");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("production stage: a directory with the menu answers ok, saying what it checked", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "candidates.json"), "[]");
    const r = describePrecheck({ stage: "production", dir });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({ stage: "production", dir, passed: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("export stage: the build folder is refused, and every planted file is named", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "interactive.html"), "<html></html>");
    writeFileSync(join(dir, "config.json"), "{}");
    const r = describePrecheck({
      stage: "export",
      dir,
      format: "interactive",
      form: "html",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("config.json");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("export stage needs a format, and says which ones exist rather than guessing one", () => {
  const dir = tmp();
  try {
    const r = describePrecheck({ stage: "export", dir });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("usage");
    expect(r.message).toContain("static");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unreadable directory is an input problem, never a silent pass", () => {
  const r = describePrecheck({ stage: "export", dir: "/nope/nowhere", format: "static", form: null });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("usage");
});

test("the CLI carries the refusal to an exit code a shell can read", async () => {
  const dir = tmp();
  try {
    const p = Bun.spawnSync(["bun", CLI, "precheck", "--stage", "production", "--dir", dir]);
    expect(p.exitCode).toBe(1);
    const body = JSON.parse(p.stdout.toString());
    expect(body.ok).toBe(false);
    expect(body.message).toContain("no ranked list of visuals");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2 : le lancer et constater l'échec**

```
cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/host/gates.test.ts
```
Attendu : FAIL — `Cannot find module './gates'`.

- [ ] **Step 3 : écrire la façade**

`lib/host/gates.ts` :

```ts
// The half of the façade that serves the three GUARANTEES (2026-07-28, "des refus qui mordent").
//
// Everything the prose chain does with its own hands rather than through a script goes past here:
// naming a folder to a journalist, showing him a file, deciding whether a check passed. The rules
// themselves live in lib/loop; this file only translates them into the façade's envelope
// (`ok` first, then `value` or `code`+`message`) and its exit codes.
//
// A refused precondition is `step-refused` — the code cli.ts already maps to exit 1 — because
// that is exactly what it is: a well-formed request the loop declined. An unreadable directory is
// `usage` (exit 2), the same split every other acting command draws.
import { readdirSync } from "node:fs";
import { refusalSentence } from "../core/routed-refusal";
import { VISUAL_FORMATS, isVisualFormat } from "../core/vocabulary";
import {
  exportPrecondition,
  productionPrecondition,
  type HandoverForm,
} from "../loop/preconditions";
import type { HostResponse } from "./state";

const HANDOVER_FORMS: readonly string[] = ["html", "code-source", "embed"];

export type PrecheckArgs = {
  stage: "production" | "export";
  dir: string;
  format?: string;
  form?: string;
};

/**
 * IS THIS DIRECTORY ALLOWED TO BE WHAT THE CALLER IS ABOUT TO CALL IT?
 *
 * `production` — may production start here (is there a ranked menu at all)?
 * `export`     — is this an export, or the folder the build worked in?
 *
 * Both answers are facts on disk. Neither reads a manifest, so a prose run with no run.json can
 * ask them — which is the whole point: the chain that actually runs is the prose one.
 */
export function describePrecheck(args: PrecheckArgs): HostResponse {
  if (args.stage === "production") {
    const refusal = productionPrecondition(args.dir);
    return refusal
      ? { ok: false, code: "step-refused", message: refusalSentence(refusal) }
      : { ok: true, value: { stage: "production", dir: args.dir, passed: true } };
  }

  if (!args.format || !isVisualFormat(args.format))
    return {
      ok: false,
      code: "usage",
      message:
        `precheck --stage export needs --format <${VISUAL_FORMATS.join("|")}> — ` +
        `what the folder is supposed to BE decides which shape it has to have`,
    };
  if (args.form !== undefined && !HANDOVER_FORMS.includes(args.form))
    return {
      ok: false,
      code: "usage",
      message: `precheck --form takes ${HANDOVER_FORMS.join(", ")} (omit it for a static or video hand-over)`,
    };

  let files: string[];
  try {
    files = readdirSync(args.dir);
  } catch (e) {
    return {
      ok: false,
      code: "usage",
      message: `precheck: ${args.dir} cannot be read: ${(e as Error)?.message ?? String(e)}`,
    };
  }

  const form = (args.form ?? null) as HandoverForm;
  const refusal = exportPrecondition(files, { format: args.format, form });
  return refusal
    ? { ok: false, code: "step-refused", message: refusalSentence(refusal) }
    : {
        ok: true,
        value: { stage: "export", dir: args.dir, format: args.format, form, passed: true },
      };
}
```

- [ ] **Step 4 : brancher la commande**

Dans `lib/host/cli.ts`, ajouter `describePrecheck` à l'import de `./gates` en haut du fichier :

```ts
import { describePrecheck } from "./gates";
```

Puis, juste avant le bloc `if (command === "verb")` :

```ts
  if (command === "precheck") {
    // READ-ONLY, and deliberately without --run: the chain that runs today has no run.json
    // (two-chains-gap-2026-07-28.md §1.1), and requiring one would make the check unaskable at
    // the only moment it is useful — the turn before a folder is named to a journalist.
    const parsed = parseFlags(rest, ["--stage", "--dir", "--format", "--form"]);
    if (!parsed.ok) usage(parsed.message);
    const stage = parsed.flags["--stage"];
    if (stage !== "production" && stage !== "export")
      usage("precheck needs --stage <production|export>");
    const dir = parsed.flags["--dir"];
    if (!dir) usage("precheck needs --dir <dir>");
    const r = describePrecheck({
      stage,
      dir,
      ...(parsed.flags["--format"] ? { format: parsed.flags["--format"] } : {}),
      ...(parsed.flags["--form"] ? { form: parsed.flags["--form"] } : {}),
    });
    emit(r, r.ok ? 0 : refusalExit(r.code));
  }
```

Et étendre la phrase d'usage finale (`cli.ts:453-457`) pour que `precheck` figure dans la liste des
commandes attendues.

- [ ] **Step 5 : relancer**

```
cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/host && bunx tsc --noEmit
```
Attendu : PASS. `lib/host/capabilities-parity.test.ts` et `readme-parity.test.ts` peuvent échouer
parce que la liste des commandes a changé — c'est leur travail. Ajouter `precheck` à
`lib/host/capabilities.ts` et à `lib/host/README.md` en suivant la forme des commandes voisines.

- [ ] **Step 6 : committer**

```bash
git add lib/host/gates.ts lib/host/gates.test.ts lib/host/cli.ts lib/host/capabilities.ts lib/host/README.md
git commit -m "feat(host): precheck — the disk facts, callable from outside JavaScript"
```

---

## Task 6 : ② partager-et-ouvrir, avec un reçu

**Files:**
- Create: `lib/loop/presentation.ts`
- Create: `lib/loop/presentation.test.ts`

**Interfaces:**
- Consumes: `present` (existant, `lib/loop/preview.ts:71` — il ouvre, et il écrit lui-même
  `presentedAs` et sa raison de repli, jamais fournie par l'appelant), `routed`/`RoutedRefusal`
  (tâche 1), `sha256` de `@noble/hashes/sha2.js`, `ok`/`fail`/`VerbResult` de `lib/core/verbs`.
- Produces: `SHOWN_DIR`, `ShownReceipt`, `presentArtifact(absolutePath, env?)`,
  `shownReceipt(absolutePath)`, `shownCovers(absolutePath, sha256)`.

**Fichiers seulement, et c'est délibéré.** Un embed hébergé n'a pas d'octets ; dans la chaîne prose
il est approuvé sur une capture fraîche déposée sous `exports/<slug>/_review-artifacts/<id>/`
(`skills/splash/src/render-provenance.ts:37`), donc le chemin qui arrive ici est toujours un
fichier. Ne pas inventer une branche URL : elle donnerait une garantie plus faible sous le même nom
(`lib/loop/preview.ts:147-162` documente exactement ce compromis pour la boucle, où il est
inévitable — ici il ne l'est pas).

- [ ] **Step 1 : écrire le test qui échoue**

`lib/loop/presentation.test.ts` :

```ts
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SHOWN_DIR, presentArtifact, shownCovers, shownReceipt } from "./presentation";
import { NO_VIEWER_VAR } from "./preview";

// SPLASH_NO_VIEWER keeps the tests from launching a browser on a developer's machine — and it is
// the honest path, not a stub: `present` records "path-printed" with the reason it fell back.
const ENV = { [NO_VIEWER_VAR]: "1" };

function withArtifact(bytes: string): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), "splash-presentation-"));
  const path = join(dir, "interactive.html");
  writeFileSync(path, bytes);
  return { dir, path };
}

test("presenting an artifact writes a receipt carrying its bytes and how it was shown", () => {
  const a = withArtifact("<html>one</html>");
  try {
    const r = presentArtifact(a.path, ENV);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.path).toBe(a.path);
    expect(r.value.sha256).toHaveLength(64);
    expect(r.value.presentedAs).toBe("path-printed");
    expect(r.value.fallbackReason).toContain(NO_VIEWER_VAR);
    expect(existsSync(join(a.dir, SHOWN_DIR, "interactive.html.json"))).toBe(true);
  } finally {
    rmSync(a.dir, { recursive: true, force: true });
  }
});

test("the receipt is read back, and it covers the bytes that were actually shown", () => {
  const a = withArtifact("<html>one</html>");
  try {
    const shown = presentArtifact(a.path, ENV);
    expect(shown.ok).toBe(true);
    if (!shown.ok) return;
    expect(shownReceipt(a.path)?.sha256).toBe(shown.value.sha256);
    expect(shownCovers(a.path, shown.value.sha256)).toBeNull();
  } finally {
    rmSync(a.dir, { recursive: true, force: true });
  }
});

test("bytes nobody was shown are refused, and the refusal routes to showing them", () => {
  const a = withArtifact("<html>one</html>");
  try {
    const r = shownCovers(a.path, "0".repeat(64));
    expect(r).not.toBeNull();
    expect(r!.code).toBe("render-not-shown");
    expect(r!.route?.command).toContain("present --path");
  } finally {
    rmSync(a.dir, { recursive: true, force: true });
  }
});

test("an artifact that CHANGED since it was shown is refused as a different subject", () => {
  const a = withArtifact("<html>one</html>");
  try {
    presentArtifact(a.path, ENV);
    writeFileSync(a.path, "<html>two</html>");
    const after = Bun.hash; // not used — recompute through the module under test
    const r = shownCovers(a.path, shownReceipt(a.path)!.sha256);
    // The receipt still covers the OLD bytes, so a caller asking about the OLD digest passes;
    // what must refuse is asking about the CURRENT ones.
    expect(r).toBeNull();
    const current = new Bun.CryptoHasher("sha256").update("<html>two</html>").digest("hex");
    const r2 = shownCovers(a.path, current);
    expect(r2).not.toBeNull();
    expect(r2!.code).toBe("approval-subject-mismatch");
    expect(r2!.message).toContain("changed");
    void after;
  } finally {
    rmSync(a.dir, { recursive: true, force: true });
  }
});

test("presenting a file that is not there is a refusal, never a receipt for nothing", () => {
  const r = presentArtifact("/nope/nowhere.html", ENV);
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("engine-failed");
});
```

- [ ] **Step 2 : le lancer et constater l'échec**

```
cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/loop/presentation.test.ts
```
Attendu : FAIL — `Cannot find module './presentation'`.

- [ ] **Step 3 : écrire le module**

`lib/loop/presentation.ts` :

```ts
// ② SHARED-AND-OPENED, AS A PRECONDITION OF ASKING FOR A VERDICT.
//
// Decision (b) of the spec: not "prove the journalist looked" — he looks, that is his job. Splash
// opens, that is Splash's. A medium is displayed or played; an HTML is LAUNCHED. Reading the
// source of an HTML shows nothing, which is the trap the first version of this rule contained.
//
// So what is recorded is an ACTION and its subject: something was opened, these were its bytes.
// The second half is what makes it worth anything — approval binds to the same digest, so
// "shown" and "approved" name the same bytes. Show one image and approve another, and the gate
// says so.
//
// THE OPENING ITSELF IS NOT REIMPLEMENTED: lib/loop/preview.ts's `present` already resolves the
// platform's viewer, honours SPLASH_NO_VIEWER and SPLASH_PREVIEW_OPENER, deduces a headless Linux
// session, and writes its own fallback reason — never one supplied by a caller (:67-70). What
// this module adds is the receipt, and a directory the prose chain can reach without a manifest.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { fail, ok, type VerbResult } from "../core/verbs";
import { routed, type RoutedRefusal } from "../core/routed-refusal";
import { present } from "./preview";

/** Where the receipts live: beside the artifact, in a directory whose name says what it holds. */
export const SHOWN_DIR = "_shown";

export type ShownReceipt = {
  /** The absolute path that was opened. */
  path: string;
  /** The bytes that were opened — re-read and re-hashed here, never taken from an argument. */
  sha256: string;
  presentedAs: "opened" | "path-printed";
  fallbackReason?: string;
  presentedAt: string;
};

function receiptPath(absolutePath: string): string {
  return join(dirname(absolutePath), SHOWN_DIR, `${basename(absolutePath)}.json`);
}

/**
 * OPEN THE ARTIFACT, AND RECORD THAT IT WAS OPENED.
 *
 * The digest is computed from the file on disk at the moment of showing, so the receipt cannot
 * describe bytes other than the ones a viewer was pointed at. Never throws (invariant I1): an
 * unreadable file, an unwritable directory and a viewer that exits non-zero are three different
 * values, not three exceptions.
 */
export function presentArtifact(
  absolutePath: string,
  env: Record<string, string | undefined> = process.env,
): VerbResult<ShownReceipt> {
  const path = resolve(absolutePath);
  let digest: string;
  try {
    digest = Buffer.from(sha256(readFileSync(path))).toString("hex");
  } catch (e) {
    return fail(
      "engine-failed",
      `present: cannot read ${path}: ${(e as Error)?.message ?? String(e)}`,
    );
  }
  const presentation = present(path, env);
  const receipt: ShownReceipt = {
    path,
    sha256: digest,
    presentedAt: new Date().toISOString(),
    ...presentation,
  };
  try {
    mkdirSync(dirname(receiptPath(path)), { recursive: true });
    writeFileSync(receiptPath(path), JSON.stringify(receipt, null, 2) + "\n");
  } catch (e) {
    return fail(
      "engine-failed",
      `present: the artifact was opened but the record could not be written beside it: ${(e as Error)?.message ?? String(e)}`,
    );
  }
  return ok(receipt);
}

/** The receipt for this artifact, or null when nothing has been shown. */
export function shownReceipt(absolutePath: string): ShownReceipt | null {
  const p = receiptPath(resolve(absolutePath));
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as ShownReceipt;
  } catch {
    // An unreadable receipt is not a presentation. Treated as absent rather than repaired:
    // the way out is to show the artifact again, which costs one command.
    return null;
  }
}

/**
 * WAS THIS EXACT SUBJECT SHOWN — the same bytes a verdict is about to be recorded over?
 *
 * Two different refusals, because they are two different situations for a journalist: nothing was
 * ever shown, and something else was. The second is the one worth a distinct sentence — the
 * visual moved under a verdict somebody already gave.
 */
export function shownCovers(
  absolutePath: string,
  sha256hex: string,
): RoutedRefusal | null {
  const receipt = shownReceipt(absolutePath);
  if (!receipt)
    return routed(
      "render-not-shown",
      "nobody has been shown this visual yet, so there is nothing to have an opinion about",
    );
  if (receipt.sha256 !== sha256hex)
    return routed(
      "approval-subject-mismatch",
      `the visual has changed since it was last shown (what was shown was ${receipt.sha256.slice(0, 12)}…, what is here now is ${sha256hex.slice(0, 12)}…)`,
    );
  return null;
}
```

- [ ] **Step 4 : relancer**

```
cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/loop/presentation.test.ts && bunx tsc --noEmit
```
Attendu : PASS.

- [ ] **Step 5 : committer**

```bash
git add lib/loop/presentation.ts lib/loop/presentation.test.ts
git commit -m "feat(loop): showing an artifact leaves a record of which bytes were shown"
```

---

## Task 7 : ② atteignable depuis la prose — la commande `present`

**Files:**
- Modify: `lib/host/gates.ts`, `lib/host/gates.test.ts`, `lib/host/cli.ts`,
  `lib/host/capabilities.ts`, `lib/host/README.md`

**Interfaces:**
- Consumes: `presentArtifact` (tâche 6).
- Produces: `presentIn(path): HostResponse` ; la commande `bun lib/host/cli.ts present --path <p>`.

- [ ] **Step 1 : écrire le test qui échoue**

Ajouter à `lib/host/gates.test.ts` :

```ts
import { presentIn } from "./gates";
import { NO_VIEWER_VAR } from "../loop/preview";

test("present answers with the receipt — what was opened, and which bytes", () => {
  const dir = tmp();
  try {
    const p = join(dir, "static.png");
    writeFileSync(p, "PNGDATA");
    const r = presentIn(p, { [NO_VIEWER_VAR]: "1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const v = r.value as { path: string; sha256: string; presentedAs: string };
    expect(v.path).toBe(p);
    expect(v.sha256).toHaveLength(64);
    expect(v.presentedAs).toBe("path-printed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("present refuses a path that is not a file, and writes no receipt for it", () => {
  const r = presentIn("/nope/nowhere.png", { [NO_VIEWER_VAR]: "1" });
  expect(r.ok).toBe(false);
});

test("the CLI opens the artifact and prints the receipt as its whole answer", () => {
  const dir = tmp();
  try {
    const p = join(dir, "static.png");
    writeFileSync(p, "PNGDATA");
    const proc = Bun.spawnSync(["bun", CLI, "present", "--path", p], {
      env: { ...process.env, [NO_VIEWER_VAR]: "1" },
    });
    expect(proc.exitCode).toBe(0);
    const body = JSON.parse(proc.stdout.toString());
    expect(body.ok).toBe(true);
    expect(body.value.sha256).toHaveLength(64);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2 : le lancer et constater l'échec**

```
cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/host/gates.test.ts
```
Attendu : FAIL — `presentIn` n'est pas exporté.

- [ ] **Step 3 : écrire la façade**

Ajouter à `lib/host/gates.ts` :

```ts
import { presentArtifact } from "../loop/presentation";

/**
 * SHOW THE ARTIFACT — the act, performed, with what it did reported back.
 *
 * The `env` parameter is threaded rather than read here so a test can suppress the viewer
 * honestly (SPLASH_NO_VIEWER makes `present` record a printed path and WHY), and so this file
 * stays the same shape as the rest of the façade: values in, values out.
 */
export function presentIn(
  path: string,
  env: Record<string, string | undefined> = process.env,
): HostResponse {
  const shown = presentArtifact(path, env);
  return shown.ok
    ? { ok: true, value: shown.value }
    : { ok: false, code: shown.code, message: shown.message };
}
```

Et à `lib/host/cli.ts`, à côté de `precheck` :

```ts
  if (command === "present") {
    // The one command on this surface whose POINT is a side effect outside the run directory: it
    // launches a viewer. It writes exactly one file — the receipt, beside the artifact it opened.
    const parsed = parseFlags(rest, ["--path"]);
    if (!parsed.ok) usage(parsed.message);
    const path = parsed.flags["--path"];
    if (!path)
      usage(
        "present needs --path <file> — the artifact to open. A described render is not a shown one",
      );
    const r = presentIn(path);
    emit(r, r.ok ? 0 : refusalExit(r.code));
  }
```

Mettre à jour l'import (`import { describePrecheck, presentIn } from "./gates";`), la phrase
d'usage finale, `capabilities.ts` et le README comme en tâche 5.

- [ ] **Step 4 : relancer**

```
cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/host && bunx tsc --noEmit
```
Attendu : PASS.

- [ ] **Step 5 : committer**

```bash
git add lib/host/gates.ts lib/host/gates.test.ts lib/host/cli.ts lib/host/capabilities.ts lib/host/README.md
git commit -m "feat(host): present — splash opens the artifact, and says which bytes it opened"
```

---

## Task 8 : ② mord — pas d'approbation sur des octets que personne n'a vus

**Files:**
- Modify: `skills/splash/src/gate.ts`
- Modify: `skills/splash/scripts/gate-render.mjs`
- Modify: `skills/splash/src/producer-spec.ts`
- Modify: `skills/splash/tests/gate.test.ts`

**Interfaces:**
- Consumes: `shownCovers` (tâche 6), `refusalSentence` (tâche 1).
- Produces: `applyRenderGate(report, id, artifactBytes, artifactPath)` — un quatrième paramètre,
  le chemin, à partir duquel le garde LIT lui-même le reçu ; `ProposalResult.shownSha256`.

**Pourquoi le chemin et pas le reçu.** Passer le reçu laisserait l'appelant choisir lequel. Le
garde reçoit le chemin qu'il approuve et va chercher le reçu de CE fichier : c'est la même
discipline que `lib/loop/preview.ts`, qui résout le livrable depuis le manifeste et refuse un
argument. Et c'est ce qui répare le trou nommé dans `two-chains-gap-2026-07-28.md` §3.6 —
`approvedHash` est aujourd'hui « audit seulement, pas enforcement » (`gate.ts:4-10`), c'est-à-dire
un champ que rien ne relit.

- [ ] **Step 1 : écrire le test qui échoue**

Ajouter à `skills/splash/tests/gate.test.ts` :

```ts
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { presentArtifact } from "../../../lib/loop/presentation";
import { NO_VIEWER_VAR } from "../../../lib/loop/preview";

const SHOWN_ENV = { [NO_VIEWER_VAR]: "1" };

function artifact(bytes: string): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), "splash-gate-shown-"));
  const path = join(dir, "static.png");
  writeFileSync(path, bytes);
  return { dir, path };
}

describe("applyRenderGate — approval binds to what was shown", () => {
  it("refuses to approve a render nobody has been shown, and routes to showing it", () => {
    const a = artifact("PNGDATA");
    try {
      const r = report();
      r.results[0]!.reviewed = true;
      expect(() =>
        applyRenderGate(r, "p1", new TextEncoder().encode("PNGDATA"), a.path),
      ).toThrow(/nobody has been shown/);
    } finally {
      rmSync(a.dir, { recursive: true, force: true });
    }
  });

  it("approves when the very bytes that were shown are the bytes being approved", () => {
    const a = artifact("PNGDATA");
    try {
      presentArtifact(a.path, SHOWN_ENV);
      const r = report();
      r.results[0]!.reviewed = true;
      const out = applyRenderGate(r, "p1", new TextEncoder().encode("PNGDATA"), a.path);
      expect(out.results[0]!.renderApproved).toBe(true);
      expect(out.results[0]!.shownSha256).toBe(out.results[0]!.approvedHash);
    } finally {
      rmSync(a.dir, { recursive: true, force: true });
    }
  });

  it("refuses when the visual moved between being shown and being approved", () => {
    const a = artifact("PNGDATA");
    try {
      presentArtifact(a.path, SHOWN_ENV);
      writeFileSync(a.path, "PNGDATA-v2");
      const r = report();
      r.results[0]!.reviewed = true;
      expect(() =>
        applyRenderGate(r, "p1", new TextEncoder().encode("PNGDATA-v2"), a.path),
      ).toThrow(/has changed since it was last shown/);
    } finally {
      rmSync(a.dir, { recursive: true, force: true });
    }
  });
});
```

Adapter aussi les quatre appels existants de `gate.test.ts` (:20, :31, :36, :43, :52) au nouveau
quatrième paramètre — ils testent les refus antérieurs (non produit, proposition inconnue, non
relu), qui doivent **rester atteignables avant** la nouvelle condition.

- [ ] **Step 2 : le lancer et constater l'échec**

```
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/gate.test.ts
```
Attendu : FAIL — `applyRenderGate` prend trois paramètres.

- [ ] **Step 3 : porter le champ**

Dans `skills/splash/src/producer-spec.ts`, sous `approvedHash` (`:98`) :

```ts
  /** sha256 of the artifact as it was SHOWN to the journalist, read from the presentation
   *  receipt beside it (lib/loop/presentation.ts) — never reported by the step asking for the
   *  approval. Equal to approvedHash on every approval this gate writes; recorded separately so
   *  a report says out loud that the two were compared rather than assumed. */
  shownSha256?: string;
```

- [ ] **Step 4 : écrire le garde**

Réécrire `skills/splash/src/gate.ts` :

```ts
import { createHash } from "node:crypto";
import { refusalSentence } from "../../../lib/core/routed-refusal";
import { shownCovers } from "../../../lib/loop/presentation";
import type { ProduceReport } from "./producer-spec";

// The ONLY writer of renderApproved.
//
// `approvedHash` used to be an audit marker with no reader — this file's own header said so, and
// two-chains-gap-2026-07-28.md §3.6 measured the consequence. It now has one, at the moment it
// is written: the bytes being approved must be the bytes a journalist was SHOWN, and the receipt
// that says so is READ HERE from the artifact's own path, never handed in by the caller asking
// for the approval. That is decision (b) of the 2026-07-28 spec — Splash opens, and "shown" and
// "approved" have to name the same bytes.
export function applyRenderGate(
  report: ProduceReport,
  id: string,
  artifactBytes: Uint8Array,
  artifactPath: string,
): ProduceReport {
  const results = report.results.map((r) => {
    if (r.id !== id) return r;
    if (r.status !== "produced")
      throw new Error(
        `cannot approve proposal ${id}: not produced (status=${r.status})`,
      );
    // Enforce 3a → 3b: the render-review must be recorded before an approval can be, so a
    // journalist never approves without the review's concerns having been surfaced.
    //
    // The message names the ACTION, not the gate ids. A refusal is surfaced to the journalist
    // VERBATIM (SKILL.md §5d), and this one fires on a routine live path.
    if (!r.reviewed)
      throw new Error(
        `cannot approve proposal ${id}: not render-reviewed — run the render review first`,
      );
    const approvedHash = createHash("sha256")
      .update(artifactBytes)
      .digest("hex");
    // ORDER: after the review check, before the write. A visual nobody has seen is not a visual
    // with a problem — it is a question nobody was in a position to answer.
    const unshown = shownCovers(artifactPath, approvedHash);
    if (unshown) throw new Error(refusalSentence(unshown));
    return { ...r, renderApproved: true, approvedHash, shownSha256: approvedHash };
  });
  if (!results.some((r) => r.id === id)) throw new Error(`unknown proposal ${id}`);
  // Spread the incoming report so top-level fields (generatedAt — the provenance anchor
  // gate-render checks artifacts against) survive the approval write.
  return { ...report, results };
}
```

Et dans `skills/splash/scripts/gate-render.mjs`, passer le chemin :

```js
  const next = applyRenderGate(report, id, readFileSync(artifactPath), artifactPath);
```

Ajouter au commentaire d'en-tête du script la ligne qui manque : le fichier approuvé doit avoir été
OUVERT (`bun lib/host/cli.ts present --path <artifact>`), et le garde lit ce reçu lui-même.

- [ ] **Step 5 : relancer**

```
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test && bunx tsc --noEmit
```
Attendu : PASS. Les suites qui approuvent un artefact de fixture (`scripts/export-code.test.ts`,
`tests/export-code-proposal-cli.test.ts`) devront présenter l'artefact avant d'appeler le garde —
c'est-à-dire faire ce qu'un run doit faire. Ajouter `presentArtifact(path, { SPLASH_NO_VIEWER: "1" })`
à leur montage, jamais un reçu écrit à la main : un reçu fabriqué dans une fixture est exactement
le geste que ce sous-projet existe pour rendre coûteux.

- [ ] **Step 6 : committer**

```bash
git add skills/splash/src/gate.ts skills/splash/scripts/gate-render.mjs skills/splash/src/producer-spec.ts skills/splash/tests/ skills/splash/scripts/export-code.test.ts
git commit -m "fix(splash): no approval over bytes nobody was shown"
```

---

## Task 9 : ③ les probes décident — la porte lit leur code de sortie

**Files:**
- Create: `lib/loop/probe-run.ts`
- Create: `lib/loop/probe-run.test.ts`

**Interfaces:**
- Consumes: rien de `lib/loop` ; `Bun.spawnSync` en **argv**.
- Produces: `ProbeSpec`, `ProbeResult`, `runProbes(specs, opts): ProbeResult[]`,
  `PROBE_TIMEOUT_MS`.

**Shell-safety, non négociable.** Une probe arrive d'une sortie de modèle. Elle est déclarée comme
un **tableau argv** et exécutée tel quel — jamais une chaîne passée à un shell, jamais interpolée
dans un `-c`. Une probe dont la commande n'est pas un tableau de chaînes non vides est refusée par
la forme, avant toute exécution.

- [ ] **Step 1 : écrire le test qui échoue**

`lib/loop/probe-run.test.ts` :

```ts
import { test, expect } from "bun:test";
import { runProbes } from "./probe-run";

test("a probe that exits zero passes, and the outcome comes from the exit code", () => {
  const [r] = runProbes(
    [{ check: "the file is there", command: ["true"] }],
    { cwd: process.cwd() },
  );
  expect(r!.outcome).toBe("pass");
  expect(r!.exitCode).toBe(0);
  expect(r!.check).toBe("the file is there");
});

test("a probe that exits non-zero is a concern, whatever anyone says about it", () => {
  const [r] = runProbes(
    [{ check: "the dataset answers", command: ["false"] }],
    { cwd: process.cwd() },
  );
  expect(r!.outcome).toBe("concern");
  expect(r!.exitCode).not.toBe(0);
  expect(r!.note).toContain("exited");
});

test("a probe's own output travels as its note — the evidence, not a summary of it", () => {
  const [r] = runProbes(
    [{ check: "the title is painted", command: ["sh", "-c", "echo NOPE >&2; exit 3"] }],
    { cwd: process.cwd() },
  );
  expect(r!.exitCode).toBe(3);
  expect(r!.note).toContain("NOPE");
});

test("a command that cannot be run at all is a concern, never a pass by omission", () => {
  const [r] = runProbes(
    [{ check: "the renderer answers", command: ["definitely-not-a-command-xyz"] }],
    { cwd: process.cwd() },
  );
  expect(r!.outcome).toBe("concern");
  expect(r!.note.length).toBeGreaterThan(0);
});

test("a malformed command is refused by SHAPE, before anything is executed", () => {
  const [r] = runProbes(
    [{ check: "x", command: [] as unknown as string[] }],
    { cwd: process.cwd() },
  );
  expect(r!.outcome).toBe("concern");
  expect(r!.note).toContain("argv");
  expect(r!.exitCode).toBeNull();
});

test("every probe runs — one failure does not cut the ledger short", () => {
  const out = runProbes(
    [
      { check: "a", command: ["false"] },
      { check: "b", command: ["true"] },
      { check: "c", command: ["false"] },
    ],
    { cwd: process.cwd() },
  );
  expect(out.map((p) => p.outcome)).toEqual(["concern", "pass", "concern"]);
});
```

- [ ] **Step 2 : le lancer et constater l'échec**

```
cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/loop/probe-run.test.ts
```
Attendu : FAIL — `Cannot find module './probe-run'`.

- [ ] **Step 3 : écrire le module**

`lib/loop/probe-run.ts` :

```ts
// ③ THE PROBES DECIDE. Their result is READ by the gate — never reported to it.
//
// The 2026-07-28 sweep found ten runs where the review gate graded itself, and two of them
// recorded a `pass` on a test that had crashed or had never run at all. That is possible for
// exactly one reason: the outcome was a field the reviewing step filled in. Here it is an exit
// code the gate observed. One cannot declare green a check one did not launch when the gate
// launches it.
//
// SHELL-SAFETY, and it is not decorative: a probe arrives from model output. A probe is an ARGV
// ARRAY, spawned as-is — never a string handed to a shell, never interpolated into a `-c`. A
// command that is not a non-empty array of non-empty strings is refused by shape, before
// anything is executed.
//
// NEVER THROWS. A probe that cannot even be spawned is a concern with the reason as its evidence,
// because "the check could not run" and "the check passed" must never be the same value.

/** How long one probe may take. A hung probe must not hang a review: the timeout is a concern
 *  with its own sentence, which is a true statement about the artifact under review. */
export const PROBE_TIMEOUT_MS = 120_000;

export type ProbeSpec = {
  /** What is being probed, in the reviewer's words. Travels into the record verbatim. */
  check: string;
  /** The command that answers it, as argv. */
  command: string[];
};

export type ProbeResult = {
  check: string;
  command: string[];
  outcome: "pass" | "concern";
  /** `null` when nothing ran (a malformed command, a binary that does not exist). */
  exitCode: number | null;
  /** The evidence: the probe's own tail output, or why it could not run. */
  note: string;
};

const TAIL_CHARS = 800;

function tail(text: string): string {
  const t = text.trim();
  return t.length <= TAIL_CHARS ? t : `…${t.slice(-TAIL_CHARS)}`;
}

function malformed(spec: ProbeSpec): string | null {
  if (!Array.isArray(spec.command) || spec.command.length === 0)
    return "a probe's command must be a non-empty argv array (e.g. [\"bun\", \"scripts/snap.mjs\"]) — a probe with no command is a claim, and a claim is what this gate stopped accepting";
  if (spec.command.some((a) => typeof a !== "string" || a.length === 0))
    return "every element of a probe's argv must be a non-empty string";
  return null;
}

/**
 * RUN EVERY PROBE, AND REPORT WHAT EACH ONE ANSWERED.
 *
 * Every probe runs, always: cutting the ledger short at the first failure would make the record
 * describe how far the review got rather than what the artifact is like.
 */
export function runProbes(
  specs: ProbeSpec[],
  opts: { cwd: string; timeoutMs?: number },
): ProbeResult[] {
  return specs.map((spec) => {
    const shapeError = malformed(spec);
    if (shapeError)
      return {
        check: spec.check,
        command: Array.isArray(spec.command) ? spec.command : [],
        outcome: "concern",
        exitCode: null,
        note: shapeError,
      };
    try {
      const run = Bun.spawnSync(spec.command, {
        cwd: opts.cwd,
        stdout: "pipe",
        stderr: "pipe",
        timeout: opts.timeoutMs ?? PROBE_TIMEOUT_MS,
      });
      const output = tail(
        `${run.stdout?.toString() ?? ""}\n${run.stderr?.toString() ?? ""}`,
      );
      if (run.exitCode === 0)
        return {
          check: spec.check,
          command: spec.command,
          outcome: "pass",
          exitCode: 0,
          note: output,
        };
      return {
        check: spec.check,
        command: spec.command,
        outcome: "concern",
        exitCode: run.exitCode,
        note: `the check exited ${run.exitCode}: ${output}`,
      };
    } catch (e) {
      return {
        check: spec.check,
        command: spec.command,
        outcome: "concern",
        exitCode: null,
        note: `the check could not be run: ${(e as Error)?.message ?? String(e)}`,
      };
    }
  });
}
```

- [ ] **Step 4 : relancer, et brancher la commande**

Ajouter à `lib/host/gates.ts` :

```ts
import { runProbes, type ProbeSpec } from "../loop/probe-run";

/**
 * RUN THE MECHANICAL CHECKS AND REPORT WHAT THEY ANSWERED.
 *
 * The façade's contribution is the shape gate: a caller that hands over anything other than a
 * list of {check, command:[…]} is refused here rather than having its prose executed.
 */
export function describeProbeRun(specs: unknown, cwd: string): HostResponse {
  if (
    !Array.isArray(specs) ||
    specs.some(
      (s) =>
        s == null ||
        typeof s !== "object" ||
        typeof (s as { check?: unknown }).check !== "string" ||
        !Array.isArray((s as { command?: unknown }).command),
    )
  )
    return {
      ok: false,
      code: "usage",
      message:
        'probe reads a LIST on stdin: [{"check": "<what is probed>", "command": ["bun", "<script>", "<arg>"]}] — ' +
        "the command is argv, never a shell line",
    };
  return { ok: true, value: runProbes(specs as ProbeSpec[], { cwd }) };
}
```

Et à `lib/host/cli.ts`, à côté de `present` :

```ts
  if (command === "probe") {
    // A DOCUMENT on stdin, like `phrase` and `author-beats`: a list whose length is the review's,
    // one command per check. And a document rather than flags for a second reason here — an argv
    // array has no shape in a flag, and flattening it into one would be exactly the string a
    // shell then re-splits.
    const parsed = parseFlags(rest, ["--cwd"]);
    if (!parsed.ok) usage(parsed.message);
    const specs = await readJsonRequest("probe", "probe < probes.json");
    const r = describeProbeRun(specs, parsed.flags["--cwd"] ?? process.cwd());
    emit(r, r.ok ? 0 : refusalExit(r.code));
  }
```

Mettre à jour l'import, la phrase d'usage, `capabilities.ts` et le README comme en tâche 5.
Ajouter à `lib/host/gates.test.ts` :

```ts
test("probe refuses a ledger whose commands are prose, before running any of it", () => {
  const r = describeProbeRun([{ check: "x", command: "rm -rf /" }], process.cwd());
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("usage");
});
```

```
cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/loop/probe-run.test.ts lib/host && bunx tsc --noEmit
```
Attendu : PASS.

- [ ] **Step 5 : committer**

```bash
git add lib/loop/probe-run.ts lib/loop/probe-run.test.ts lib/host/gates.ts lib/host/gates.test.ts lib/host/cli.ts lib/host/capabilities.ts lib/host/README.md
git commit -m "feat(loop): the gate runs the checks and reads their result"
```

---

## Task 10 : ③ mord — une issue de probe n'est plus déclarée, elle est lue

**Files:**
- Modify: `skills/splash/src/producer-spec.ts`
- Modify: `skills/splash/src/review-gate.ts`
- Modify: `skills/splash/scripts/review-gate.mjs`
- Modify: `skills/splash/tests/review-gate.test.ts`

**Interfaces:**
- Consumes: `runProbes`, `ProbeSpec`, `ProbeResult` (tâche 9), `refusalSentence` (tâche 1).
- Produces: `ReviewProbe` devient une union discriminée — `MechanicalProbe` (portée par sa
  commande, issue lue) et `EditorialProbe` (un jugement, porté par un relecteur) ;
  `applyReviewGate(report, id, concerns, probes)` refuse une probe mécanique sans commande.

**Pourquoi une union et pas une commande obligatoire partout.** Toutes les vérifications d'une
relecture ne sont pas exécutables : « le titre porte-t-il le takeaway confirmé » est un jugement,
et exiger une commande pour lui produirait une commande bidon — c'est-à-dire le mensonge qu'on
essaie de rendre coûteux. La spec §2(c) tranche exactement là : deux natures de vérification, un
fait et une opinion, et les mélanger est ce qui a permis à une opinion de passer pour un fait. La
partie mécanique décide ; la partie éditoriale s'attribue (tâche 11).

- [ ] **Step 1 : écrire le test qui échoue**

Ajouter à `skills/splash/tests/review-gate.test.ts` :

```ts
describe("applyReviewGate — a mechanical outcome is read, never reported", () => {
  it("refuses a mechanical probe that carries no command — a claim is not a result", () => {
    expect(() =>
      applyReviewGate(rep(), "p1", [], [
        { kind: "mechanical", check: "the dataset answers", outcome: "pass" } as never,
      ]),
    ).toThrow(/command/);
  });

  it("refuses an outcome that disagrees with the exit code it was recorded beside", () => {
    expect(() =>
      applyReviewGate(rep(), "p1", [], [
        {
          kind: "mechanical",
          check: "the dataset answers",
          command: ["bun", "-e", "process.exit(1)"],
          exitCode: 1,
          outcome: "pass",
          note: "looked fine",
        } as never,
      ]),
    ).toThrow(/exited 1/);
  });

  it("records a mechanical probe whose outcome matches what its command answered", () => {
    const out = applyReviewGate(rep(), "p1", [], [
      {
        kind: "mechanical",
        check: "the dataset answers",
        command: ["true"],
        exitCode: 0,
        outcome: "pass",
        note: "",
      } as never,
    ]);
    expect(out.results[0]!.reviewProbes).toHaveLength(1);
  });

  it("an editorial probe needs no command — it needs a verdict and a note", () => {
    const out = applyReviewGate(
      rep(),
      "p1",
      ['the title carries only half the confirmed takeaway'],
      [
        { kind: "mechanical", check: "the file renders", command: ["true"], exitCode: 0, outcome: "pass", note: "" },
        {
          kind: "editorial",
          check: "the title carries only half the confirmed takeaway",
          outcome: "concern",
          note: "the confirmed claim has two parts; the title states one",
        },
      ] as never,
    );
    expect(out.results[0]!.reviewProbes).toHaveLength(2);
  });
});
```

- [ ] **Step 2 : le lancer et constater l'échec**

```
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/review-gate.test.ts
```
Attendu : FAIL — `ReviewProbe` n'a pas de `kind`, et rien ne compare une issue à un code de sortie.

- [ ] **Step 3 : porter le type**

Dans `skills/splash/src/producer-spec.ts`, remplacer `ReviewProbe` (`:74-79`) :

```ts
export type ReviewProbeOutcome = "pass" | "concern" | "resolved";

/** A check the gate RAN and read. `outcome` is derived from `exitCode` and is re-derived at the
 *  gate — recording it is a convenience for readers of the report, never the source of truth. */
export interface MechanicalProbe {
  kind: "mechanical";
  check: string; // what was probed (e.g. "GET dataset.csv on the published chart")
  command: string[]; // argv, run by lib/loop/probe-run.ts — never a shell line
  exitCode: number | null; // null ⇒ nothing ran, which is a concern and never a pass
  outcome: ReviewProbeOutcome;
  note?: string; // required for concern (what failed) and resolved (how, with evidence)
}

/** A judgement — the half no exit code can answer. It carries no command on purpose: demanding
 *  one would produce a fake command, which is the lie this split exists to make expensive. Its
 *  credibility comes from WHO made it (ProposalResult.reviewer), not from a process. */
export interface EditorialProbe {
  kind: "editorial";
  check: string;
  outcome: ReviewProbeOutcome;
  note?: string;
}

export type ReviewProbe = MechanicalProbe | EditorialProbe;
```

- [ ] **Step 4 : écrire le garde**

Dans `skills/splash/src/review-gate.ts`, ajouter en tête de `validateProbes`, à l'intérieur de la
boucle `for (const p of probes)` et AVANT la vérification d'`outcome` existante :

```ts
    // ③ A MECHANICAL OUTCOME IS READ, NEVER REPORTED.
    //
    // The sweep recorded ten self-attested reviews, two of them a `pass` on a check that had
    // crashed or had never run. Both are unwritable from here on: a mechanical probe carries the
    // argv that answered it and the code that argv exited with, and the outcome has to agree
    // with the code. Nothing here re-runs the probe — lib/loop/probe-run.ts did, and
    // review-gate.mjs is what hands the results over.
    if (p.kind === "mechanical") {
      if (!Array.isArray(p.command) || p.command.length === 0)
        throw new Error(
          `review rejected: mechanical probe "${p.check}" carries no command — record the argv ` +
            `that answers it and let its result decide, or record it as an editorial judgement ` +
            `(kind: "editorial") attributed to the reviewer who made it`,
        );
      const answered = p.exitCode === 0 ? "pass" : "concern";
      if (p.outcome === "pass" && answered !== "pass")
        throw new Error(
          `review rejected: mechanical probe "${p.check}" is recorded as passing, but its ` +
            `command exited ${p.exitCode === null ? "nothing at all (it never ran)" : p.exitCode} — ` +
            `a check that did not answer clean is a concern, and a check that did not run is not a check`,
        );
    } else if (p.kind !== "editorial") {
      throw new Error(
        `review rejected: probe "${p.check}" declares no kind — every check is either ` +
          `"mechanical" (a command whose result decides) or "editorial" (a judgement, attributed)`,
      );
    }
```

Le reste de `validateProbes` (ledger vide, note obligatoire, comptabilité concern↔concern,
tripwire de mot-clé) est inchangé et continue de s'appliquer aux deux genres : ce sont des
détections existantes, et la spec interdit d'en retirer.

- [ ] **Step 5 : faire tourner les probes dans la CLI**

Dans `skills/splash/scripts/review-gate.mjs`, remplacer le bloc qui parse `--probes` par un bloc
qui LANCE les probes mécaniques :

```js
import { runProbes } from "../../../lib/loop/probe-run.ts";

// … after `probes` is parsed from the file / inline JSON:

// ③ THE GATE RUNS THE MECHANICAL HALF ITSELF. What arrives on --probes is a PLAN — each check
// with the argv that answers it — and what is recorded is what those commands answered. An
// outcome the caller wrote for a mechanical probe is overwritten by the one its command gave;
// editorial judgements pass through untouched, and are attributed instead (see --reviewer).
const mechanical = probes.filter((p) => p.kind === "mechanical");
const answered = runProbes(
  mechanical.map((p) => ({ check: p.check, command: p.command })),
  { cwd: process.cwd() },
);
let i = 0;
probes = probes.map((p) =>
  p.kind === "mechanical"
    ? {
        kind: "mechanical",
        check: p.check,
        command: p.command,
        exitCode: answered[i]!.exitCode,
        outcome: answered[i]!.outcome,
        note: answered[i++]!.note || p.note,
      }
    : p,
);
```

Mettre à jour l'`USAGE` du script : `--probes` décrit désormais un plan
(`[{kind:"mechanical", check, command:[…]}, {kind:"editorial", check, outcome, note}]`), et la
ligne finale imprimée compte les deux genres séparément.

- [ ] **Step 6 : relancer**

```
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test && bunx tsc --noEmit
```
Attendu : PASS. Les fixtures existantes de `tests/review-gate.test.ts` portent des probes sans
`kind` — les migrer vers `kind: "editorial"` quand elles décrivent un jugement, vers
`kind: "mechanical"` avec `command: ["true"]` et `exitCode: 0` quand elles décrivent un contrôle.
Ne PAS ajouter une branche de compatibilité pour une probe sans `kind` : c'est exactement le champ
absent qui permettait de ne rien lancer.

- [ ] **Step 7 : committer**

```bash
git add skills/splash/src/producer-spec.ts skills/splash/src/review-gate.ts skills/splash/scripts/review-gate.mjs skills/splash/tests/review-gate.test.ts
git commit -m "fix(splash): a mechanical check is decided by its exit code, not by its author"
```

---

## Task 11 : ③ le relecteur éditorial n'est pas l'auteur

**Files:**
- Modify: `skills/splash/src/producer-spec.ts`
- Modify: `skills/splash/src/review-gate.ts`
- Modify: `skills/splash/scripts/review-gate.mjs`
- Modify: `skills/splash/src/export-guard.ts`
- Modify: `skills/splash/tests/review-gate.test.ts`, `skills/splash/tests/export-guard*.test.ts`

**Interfaces:**
- Consumes: `hashReviewerOutput` de `lib/verify/redact` (déjà la définition unique de
  « l'empreinte de ce qu'un relecteur a rendu », utilisée par `lib/verify/review.ts:329`),
  `refusalSentence`/`routed` (tâche 1).
- Produces: `ProposalResult.reviewer: ReviewerAttribution` ; `applyReviewGate` prend un cinquième
  paramètre `reviewer` et refuse un jugement éditorial non attribué ; `assertShippable` refuse un
  export dont la relecture ne revendique aucune indépendance.

**Ce que ça garantit, et ce que ça ne garantit pas.** Spec §6 : « rien ne garantit qu'il juge
mieux. Ce qu'il garantit, c'est qu'il ne juge pas son propre travail. » Donc l'attribution est
**nommée et empreintée**, pas vérifiée : ce qui devient impossible, c'est de revendiquer une
relecture indépendante sans nommer qui l'a faite ni produire ce qu'elle a rendu. Le vocabulaire
est celui que `lib/verify` porte déjà (`independentSemanticReview: available | unavailable |
declined`), et non un second, pour que les deux chaînes disent la même chose du même fait.

- [ ] **Step 1 : écrire le test qui échoue**

Ajouter à `skills/splash/tests/review-gate.test.ts` :

```ts
describe("applyReviewGate — the editorial half is attributed", () => {
  const mech = [
    { kind: "mechanical", check: "the file renders", command: ["true"], exitCode: 0, outcome: "pass", note: "" },
  ] as never;

  it("refuses an editorial judgement with no reviewer named", () => {
    expect(() =>
      applyReviewGate(
        rep(),
        "p1",
        ["the title states one half of the confirmed claim"],
        [
          ...(mech as never[]),
          { kind: "editorial", check: "the title states one half of the confirmed claim", outcome: "concern", note: "two parts, one stated" },
        ] as never,
        undefined,
      ),
    ).toThrow(/who did it/);
  });

  it("records the reviewer, and the fingerprint of what it returned", () => {
    const out = applyReviewGate(
      rep(),
      "p1",
      ["the title states one half of the confirmed claim"],
      [
        ...(mech as never[]),
        { kind: "editorial", check: "the title states one half of the confirmed claim", outcome: "concern", note: "two parts, one stated" },
      ] as never,
      { name: "desk-reader", version: "1.0.0" },
    );
    const r = out.results[0]!;
    expect(r.reviewer?.name).toBe("desk-reader");
    expect(r.reviewer?.independentSemanticReview).toBe("available");
    expect(r.reviewer?.outputHash).toHaveLength(64);
  });

  it("a purely mechanical review needs no reviewer, and says so honestly", () => {
    const out = applyReviewGate(rep(), "p1", [], mech, undefined);
    expect(out.results[0]!.reviewer?.independentSemanticReview).toBe("unavailable");
  });
});

describe("assertShippable — an unattributed editorial verdict does not ship", () => {
  it("refuses to export a visual whose editorial verdicts nobody signed for", () => {
    const r = rep();
    r.results[0]!.reviewed = true;
    r.results[0]!.renderApproved = true;
    r.results[0]!.reviewProbes = [
      { kind: "editorial", check: "the colour serves the subject", outcome: "pass", note: "n/a" },
    ] as never;
    expect(() => assertShippable(r, "p1")).toThrow(/who did it/);
  });
});
```

- [ ] **Step 2 : le lancer et constater l'échec**

```
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/review-gate.test.ts
```
Attendu : FAIL — `applyReviewGate` prend quatre paramètres et `ProposalResult` n'a pas de
`reviewer`.

- [ ] **Step 3 : porter le champ**

Dans `skills/splash/src/producer-spec.ts`, sous `reviewProbes` :

```ts
/** WHO conducted the editorial half, and the fingerprint of what it returned. The same
 *  vocabulary lib/verify/review.ts records (`independentSemanticReview`), because it is the same
 *  fact: a review that claims independence must name the actor and produce its output, and the
 *  absence of one is RECORDED rather than converted into a pass. */
export interface ReviewerAttribution {
  name: string;
  version: string;
  outputHash: string;
  independentSemanticReview: "available" | "unavailable" | "declined";
}
```

et dans `ProposalResult`, sous `reviewProbes` :

```ts
  reviewer?: ReviewerAttribution; // set by review-gate; absent on reports written before this
```

- [ ] **Step 4 : écrire le garde**

Dans `skills/splash/src/review-gate.ts`, élargir la signature et ajouter la règle :

```ts
import { hashReviewerOutput } from "../../../lib/verify/redact";
import type { ReviewerAttribution } from "./producer-spec";

export function applyReviewGate(
  report: ProduceReport,
  id: string,
  concerns: string[],
  probes: ReviewProbe[],
  reviewer?: { name: string; version: string },
): ProduceReport {
  validateProbes(probes, concerns);
  // ③ NOBODY GRADES THEIR OWN WORK. An editorial judgement is an opinion, and an opinion whose
  // author is not named is indistinguishable from the authoring step's own. Requiring the name
  // does not make the judgement better (spec §6 says so plainly) — it makes it someone's.
  const hasEditorial = probes.some((p) => p.kind === "editorial");
  if (hasEditorial && !reviewer)
    throw new Error(
      "review rejected: this review carries editorial judgements and does not say who did it — " +
        "have the editorial pass done by someone who did not write this visual, and record who did it",
    );
  const attribution: ReviewerAttribution = reviewer
    ? {
        name: reviewer.name,
        version: reviewer.version,
        outputHash: hashReviewerOutput(probes.filter((p) => p.kind === "editorial")),
        independentSemanticReview: "available",
      }
    : {
        name: "",
        version: "",
        outputHash: "",
        // Honest, not a pass: the mechanical half ran and nothing judged the editorial one.
        independentSemanticReview: "unavailable",
      };
  // … existing map, adding `reviewer: attribution` beside reviewed/reviewConcerns/reviewProbes
```

Vérifier la signature réelle de `hashReviewerOutput` dans `lib/verify/redact.ts` avant d'écrire
cette ligne ; si elle attend des `Finding[]`, appeler `hashReviewerOutput` sur la projection
`{ id: check, summary: note ?? "" }` plutôt que d'ajouter une seconde fonction de hash — une
deuxième définition de « l'empreinte de ce qu'un relecteur a rendu » est précisément ce que
`lib/verify` a été écrit pour empêcher.

Dans `skills/splash/src/export-guard.ts`, ajouter à `assertShippable`, après le contrôle
`r.reviewed` :

```ts
  // An editorial verdict nobody signed for does not ship. The mechanical half needs no signature
  // (its commands answered); this is only ever about the half that is a judgement.
  const judged = (r.reviewProbes ?? []).some((p) => p.kind === "editorial");
  if (judged && r.reviewer?.independentSemanticReview !== "available")
    throw new Error(
      `refusing to export ${id}: the editorial read of this visual does not say who did it — ` +
        `have it done by someone who did not write this visual, and record who did it`,
    );
```

- [ ] **Step 5 : brancher la CLI**

Dans `skills/splash/scripts/review-gate.mjs`, parser `--reviewer <name@version>` à côté de
`--probes`, le découper sur le dernier `@`, et le passer en cinquième argument d'`applyReviewGate`.
Refuser un `--reviewer` mal formé par un `process.exit(1)` qui dit la forme attendue — jamais un
défaut silencieux.

- [ ] **Step 6 : relancer**

```
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test && bunx tsc --noEmit
```
Attendu : PASS.

- [ ] **Step 7 : committer**

```bash
git add skills/splash/src/producer-spec.ts skills/splash/src/review-gate.ts skills/splash/src/export-guard.ts skills/splash/scripts/review-gate.mjs skills/splash/tests/
git commit -m "fix(splash): an editorial verdict says who made it, or it does not ship"
```

---

## Task 12 : la prose appelle — `SKILL.md` nomme les commandes

**Files:**
- Modify: `skills/splash/SKILL.md` (≈1166, ≈1178, §5 PRODUCTION, §5d, §6)
- Modify: `skills/splash/tests/skill-doc-parity.test.ts`

**Interfaces:**
- Consumes: les commandes des tâches 5, 7, 9 et les gardes des tâches 3, 4, 8, 10, 11.
- Produces: aucune API. Ce que produit cette tâche, c'est que **la prose cesse de porter la
  garantie** : elle appelle, le code garde.

**Les deux lignes que la spec cite.** `SKILL.md:1166` porte la règle de D02 et **admet elle-même
qu'aucun signal mécanique n'existe** ; ce signal existe maintenant, donc l'aveu doit partir avec la
règle qu'il affaiblissait. `SKILL.md:1178` dit qu'une sortie non-zéro est un arrêt dur remonté tel
quel ; elle reste vraie, et gagne ce qu'elle n'avait pas : le refus arrive routé, et une des deux
sorties d'un refus est désormais impossible à emprunter en silence.

- [ ] **Step 1 : écrire le test qui échoue**

Ajouter à `skills/splash/tests/skill-doc-parity.test.ts` :

```ts
  it("the surfacing rule names the command that performs it, not just the duty", () => {
    expect(splash).toContain("bun lib/host/cli.ts present --path");
  });

  it("the surfacing rule no longer claims that no mechanical signal exists", () => {
    expect(splash).not.toContain('No live mechanical "the user saw it" signal exists');
    expect(splash).not.toContain("no live mechanical");
  });

  it("the hand-over step checks the folder before naming it to the journalist", () => {
    expect(splash).toContain("bun lib/host/cli.ts precheck --stage export");
  });

  it("the render-review hands over commands, and names who read the editorial half", () => {
    expect(splash).toContain("--reviewer");
    expect(splash).toContain('kind: "mechanical"');
  });
```

- [ ] **Step 2 : le lancer et constater l'échec**

```
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/skill-doc-parity.test.ts
```
Attendu : FAIL sur les quatre.

- [ ] **Step 3 : réécrire la ligne ≈1166 (montrer avant de demander)**

Remplacer la parenthèse finale (« No live mechanical "the user saw it" signal exists mid-session
— the QA harness `check:render-shown-before-validation` is the net… ») par :

```
  This is now MECHANICAL, and the duty is one command: `bun lib/host/cli.ts present --path
  <artifact>` opens the artifact and records which bytes were opened. The approval gate reads
  that record itself — `gate-render` refuses an artifact nobody has been shown, and refuses one
  that has CHANGED since it was shown, naming what to do about it. The QA check remains as the
  after-the-fact net; it is no longer the only thing standing between a described render and a
  journalist's "ship it".
```

- [ ] **Step 4 : réécrire la ligne ≈1178 (le refus est un arrêt dur)**

Conserver la règle mot pour mot et ajouter, en fin de puce :

```
  A refusal now arrives ROUTED: it names what is missing AND the act that resolves it, so
  "surface it as-is" and "tell the journalist what to do next" are the same sentence. Two of
  these refusals can no longer be walked past at all — production does not start without the
  ranked list of visuals (the batch stops before any engine runs), and the folder the build
  worked in is refused as a hand-over. Both answer to `bun lib/host/cli.ts precheck`.
```

- [ ] **Step 5 : réécrire les trois appels du chemin chaud**

- §5 PRODUCTION, avant `produce-all.mjs` : ajouter
  `bun lib/host/cli.ts precheck --stage production --dir <runDir>` — une sortie non-zéro veut dire
  que le menu n'existe pas, et la production ne commence pas.
- Gate 3a (`review-gate.mjs`) : la nouvelle forme de `--probes` (un PLAN de commandes, exécuté par
  la porte) et `--reviewer <name@version>`, avec la phrase qui dit pourquoi : les probes décident,
  un relecteur distinct juge l'éditorial.
- Gate 4 / remise : `bun lib/host/cli.ts precheck --stage export --dir <exportDir> --format <f>
  [--form <f>]` **avant** de nommer le dossier au journaliste.

Retirer partout la formulation qui présente la règle comme une consigne à suivre quand elle est
désormais gardée par le code — le §6 « Never … » garde ses puces (elles restent vraies), mais
chacune des cinq concernées gagne la mention de la porte qui la tient, comme la puce
« Framing » (`:1160`) le fait déjà pour `assertChainProvenance`.

- [ ] **Step 6 : relancer**

```
cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test && bunx tsc --noEmit
```
Attendu : PASS.

- [ ] **Step 7 : committer**

```bash
git add skills/splash/SKILL.md skills/splash/tests/skill-doc-parity.test.ts
git commit -m "docs(splash): the flow calls the gates instead of restating them"
```

---

## Task 13 : le registre des refus sans sortie, et le gate complet

**Files:**
- Create: `docs/splash/refusal-routes.md`
- Modify: `lib/core/routed-refusal.test.ts`

**Interfaces:**
- Consumes: `REFUSAL_ROUTES` (tâche 1).
- Produces: le document que le risque §6 de la spec demande, et le test qui l'empêche de mentir.

- [ ] **Step 1 : écrire le test qui échoue**

Ajouter à `lib/core/routed-refusal.test.ts` :

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("the register lists every refusal the code can emit — a route nobody wrote down is a route nobody maintains", () => {
  const register = readFileSync(
    join(import.meta.dir, "../../docs/splash/refusal-routes.md"),
    "utf8",
  );
  for (const code of REFUSAL_CODES) expect(register).toContain(code);
});

test("the register names, out loud, the routes that have no command", () => {
  const register = readFileSync(
    join(import.meta.dir, "../../docs/splash/refusal-routes.md"),
    "utf8",
  );
  for (const [code, route] of Object.entries(REFUSAL_ROUTES)) {
    if (route?.command) continue;
    expect(register).toMatch(new RegExp(`${code}[^\\n]*\\|[^\\n]*no command`));
  }
});
```

- [ ] **Step 2 : le lancer et constater l'échec**

```
cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/core/routed-refusal.test.ts
```
Attendu : FAIL — le fichier n'existe pas.

- [ ] **Step 3 : écrire le registre**

`docs/splash/refusal-routes.md` — un document court : le tableau `code | ce qui manque | le pas |
la commande (ou « no command », avec la raison) | ce qui l'émet`, précédé d'un paragraphe qui dit
ce que le registre est (le suivi que le risque §6 de la spec demande : quels refus restent sans
sortie) et suivi d'une section **« Sans sortie mécanique, et assumé »** qui inscrit ce que ce
sous-projet n'a délibérément pas fermé :

- **L'exemption de branche directe** (`isDirectBranch`, `candidate-provenance.ts:74`) — un run
  peut encore déclarer que le journaliste a nommé le visuel et sauter le menu. La resserrer serait
  un garde nouveau ; c'est un candidat de la famille C.
- **`candidates.json` est écrit à la main** (`two-chains-gap-2026-07-28.md` §1.1) — sa présence est
  fabricable. La pré-condition rend le mensonge visible, pas impossible.
- **Le reçu de présentation est fabricable** — un fichier JSON écrit à la main sous `_shown/`
  passe. Ce qu'il rend impossible, c'est le cas grave : approuver d'autres octets que ceux qui ont
  été montrés (spec §6).
- **L'attribution du relecteur est nommée, pas vérifiée** — rien ne prouve que le relecteur n'est
  pas le même acteur. Ce qui est garanti est plus mince et suffisant : il ne juge pas anonymement.

- [ ] **Step 4 : relancer, puis le gate complet**

```
cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/core/routed-refusal.test.ts
cd /Users/rmdms/Sites/Professional/splash-merge && bun run check
```
Attendu : 22/22. Les suites Datawrapper s'auto-sautent sans `DATAWRAPPER_API_TOKEN` ; le produce
map-native interactif peut expirer sous contention réseau et passe en isolation (état connu,
`CLAUDE.md` § État courant) — le relancer seul avant de conclure à une régression.

- [ ] **Step 5 : committer**

```bash
git add docs/splash/refusal-routes.md lib/core/routed-refusal.test.ts
git commit -m "docs(splash): the register of refusals, and the ones with no way out"
```

---

## Un candidat écarté, et pourquoi

**`skills/scrolly/scripts/produce.mjs` ne valide pas son config** — un `arcBeats` poussé dessus est
silencieusement abandonné et la page part avec une légende dérivée sous la signature du
journaliste. **Ce plan ne le traite pas.** Trois raisons, dans cet ordre :

1. **Le chemin journaliste est déjà validé.** `skills/scrolly/src/manifest.ts` enregistre le
   producteur avec `validate: scrollySpecErrors`, et `skills/splash/src/register-producers.ts:10`
   importe ce manifeste : un run qui passe par `produce-all` valide le config avant que
   `produce.mjs` ne soit lancé. L'entrée non validée est l'appel direct du script — une entrée de
   mainteneur, pas un parcours de journaliste.
2. **C'est un trou de détection, pas un refus qui ne mord pas.** La famille A se définit par « le
   garde détecte et refuse, et rien ne s'arrête ». Ici il n'y a pas de garde du tout. Le registre
   range ce cas ailleurs et le nomme : **D27, « Trous de validateur », famille C** (triage §8).
3. **La spec l'exclut explicitement.** §5 : « Tout nouveau garde-fou. On ne corrige pas la
   détection : elle fonctionne. » Ajouter une validation ici serait exactement le garde de plus
   que la matière de conception met en garde de ne pas ajouter (§9, contraintes).

Ce qu'il faut en faire : l'inscrire au sous-projet C avec la précision que la passe de grille a
apportée — et une note que ni `nativeSpecErrors` ni `mapNativeConfigErrors` ne connaissent
`arcBeats` sur la piste chart, donc l'abandon silencieux pourrait survivre au chemin registre
aussi. C'est une mesure à refaire avant d'écrire la spec C, pas une hypothèse à propager.

---

## Où la spec ne suffisait pas pour planifier

- **§3① ne dit pas OÙ le fait `config.json`/`native-source.json` est constaté.** Le geste mesuré
  (nommer au journaliste un dossier qu'aucun script n'a produit) n'a pas de script à intercepter.
  Le plan tranche : deux lecteurs de la même fonction — `assertDelivered` pour le chemin qui passe
  par l'export, et la commande `precheck --stage export` pour la remise faite à la main.
- **§3① ne mentionne pas l'exemption `code-source`.** `bundle-source.mjs:357` écrit `config.json`
  à la racine du bundle par conception. Sans exemption, la règle aurait cassé la seule forme de
  livraison dont l'objet est que la rédaction possède la source. Mesuré, écarté, écrit dans le code.
- **§3② ne dit pas comment traiter un embed hébergé**, qui n'a pas d'octets. Le plan restreint le
  reçu aux fichiers, en s'appuyant sur le fait que la chaîne prose approuve un embed via une
  capture fraîche sous `_review-artifacts/` — donc le chemin qui arrive au garde est toujours un
  fichier. Si cela change, la garantie devient plus faible sous le même nom, ce que
  `lib/loop/preview.ts:147-162` documente déjà pour la boucle.
- **§3③ ne dit pas ce que devient une vérification non exécutable** (« le titre porte-t-il le
  takeaway »). La spec sépare fait et opinion sans dire où va l'opinion dans le ledger existant.
  Le plan tranche par une union `mechanical | editorial` : exiger une commande pour un jugement
  aurait produit une commande bidon, c'est-à-dire le mensonge que ③ veut rendre coûteux.
- **§3③ ne dit pas ce qu'il advient d'un visuel sans relecteur.** Bloquer l'export change le
  comportement de tout run existant. Le plan applique le principe déjà écrit dans
  `lib/verify/review.ts` (« l'absence d'un relecteur indépendant est ENREGISTRÉE, jamais convertie
  en pass ») : `unavailable` est enregistré, et seul un run qui PORTE des jugements éditoriaux non
  attribués est refusé à l'export.
- **§4 dit « la prose appelle » sans dire par quoi, pour les gardes qui vivent déjà dans
  `skills/`.** Le plan distingue deux voies : la CLI de `lib/host` pour ce que la prose fait de ses
  propres mains, et l'import direct `skills/ → lib/` pour les scripts qu'elle lance déjà — la
  direction légale, précédée par `skills/splash/src/export-guard.ts:10`.
