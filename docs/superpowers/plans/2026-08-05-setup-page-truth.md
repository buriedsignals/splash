# La page de réglages cesse de mentir — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** la page de réglages de l'install n'affiche plus un état faux, ne demande plus une clé qui ne sert pas au runtime choisi, mène par l'envie du journaliste, et n'annonce plus une capacité morte.

**Architecture:** trois leviers indépendants. (1) L'ordre du bootstrap — on package et on installe AVANT d'ouvrir la page, donc elle mesure un arbre réel. (2) Le sondage — il regarde l'arbre LIVRÉ (`.dist/skills`, dépendances hoistées un cran au-dessus) au lieu de l'arbre source, et le sondage du navigateur de rendu suit la même règle. (3) Le registre — le login appartient au runtime, les capacités portent l'envie qu'elles servent, et `embed-fly` disparaît.

**Tech Stack:** Bun, TypeScript, `bun:test`, bash (`install/bootstrap.sh`) + PowerShell (`install/bootstrap.ps1`), pas de framework côté page (DOM natif, `install/preflight/client.ts` bundlé par `Bun.build`).

**Spec:** `docs/superpowers/specs/2026-08-05-setup-page-truth-design.md`

## Global Constraints

- Runtime **Bun** exclusivement — jamais `npm`, jamais `node`.
- Code, commentaires, identifiants, messages de commit : **anglais**. Le contenu de la page a ses deux tables EN/FR (le type `PageCopy` force la parité à la compilation).
- **Aucune mention** de Claude/Anthropic/d'un vendeur comme auteur dans un artefact publié (commits, docs). Le NOM d'un produit dans un libellé de champ (« Anthropic API key ») est une donnée, pas une attribution : autorisé.
- **TDD** : le test qui échoue d'abord, et pour chaque garde neuve une **vérification par mutation** — remettre le défaut doit faire rougir le test. Un test vert qui ne rougit pas ne prouve rien.
- Aucun `any` introduit. `bun run check` doit rester à **23 checks verts** en fin de plan.
- Le fichier `install/bootstrap.ps1` est le miroir Windows de `install/bootstrap.sh` : toute modification d'ordre ou de message se fait dans les deux, sous peine de casser `docs/installer/bootstrap-ps1.test.ts`.
- Tout se fait dans le worktree `../splash-setup`, branche `feat/setup-page-truth`.

---

### Task 1: Le sondage regarde l'arbre livré

**Files:**
- Create: `install/preflight/skills-root.ts`
- Create: `install/preflight/skills-root.test.ts`
- Create: `install/preflight/model-install-tree.test.ts`
- Modify: `install/preflight/server.ts:76-86` (l'appel à `preflightModel`)

**Interfaces:**
- Consumes: `preflightModel(input: PreflightModelInput)` — `install/preflight/model.ts:220`, dont le champ `skillsRoot?: string` (`model.ts:110`) existe déjà et n'est jamais rempli.
- Produces: `resolveSkillsRoot(installRoot: string, exists?: (path: string) => boolean): string` — utilisé par la Task 2 et par `server.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// install/preflight/skills-root.test.ts
import { expect, test } from "bun:test";
import { resolveSkillsRoot } from "./skills-root.ts";

// The delivered tree is what a real install runs: pack-skills puts the engines in
// <root>/.dist/skills/ and their dependencies one level ABOVE them, in <root>/.dist/node_modules.
// Probing <root>/skills/ there finds nothing and reports four healthy engines as missing.
test("uses the delivered tree when the install has been packed", () => {
  const root = resolveSkillsRoot("/Users/j/Splash", (p) =>
    p === "/Users/j/Splash/.dist/skills",
  );
  expect(root).toBe("/Users/j/Splash/.dist/skills");
});

// A developer checkout has never been packed, and its dependencies live in skills/<engine>/
// node_modules. Same function, same rule: probe where the code that will run actually resolves.
test("falls back to the source tree in a checkout that was never packed", () => {
  expect(resolveSkillsRoot("/repo", () => false)).toBe("/repo/skills");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ../splash-setup && bun test install/preflight/skills-root.test.ts`
Expected: FAIL — `Cannot find module './skills-root.ts'`

- [ ] **Step 3: Write minimal implementation**

```ts
// install/preflight/skills-root.ts
// Which skills tree does the setup page MEASURE?
//
// A real install runs the delivered tree: scripts/pack-skills.mjs writes the engines to
// <root>/.dist/skills/ and installs their dependencies at <root>/.dist/node_modules — one level
// above them, where Bun resolves and no host walks. The source tree at <root>/skills/ keeps no
// node_modules of its own on such an install, so probing it reports every in-house engine as
// missing and tells the journalist to run `bun install` in a directory nothing will ever install
// into. A developer checkout is the mirror case: never packed, dependencies under
// skills/<engine>/node_modules.
//
// One rule covers both: probe the delivered tree when it exists, the source tree otherwise.
import { existsSync } from "node:fs";
import { join } from "node:path";

export function resolveSkillsRoot(
  installRoot: string,
  exists: (path: string) => boolean = existsSync,
): string {
  const delivered = join(installRoot, ".dist", "skills");
  return exists(delivered) ? delivered : join(installRoot, "skills");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test install/preflight/skills-root.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the integration test that would have caught the defect**

```ts
// install/preflight/model-install-tree.test.ts
import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { preflightModel } from "./model.ts";
import { resolveSkillsRoot } from "./skills-root.ts";
import { DEFAULT_NEWSROOM_STATE } from "../../lib/newsroom/state.ts";

// A packed install, reduced to what the probe reads: the engine directories under .dist/skills,
// and their dependencies at .dist/node_modules. Nothing is installed under skills/ — which is
// exactly the shape that made the page lie.
const root = mkdtempSync(join(tmpdir(), "splash-install-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function pkg(name: string): void {
  const dir = join(root, ".dist", "node_modules", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name, version: "0.0.0", main: "index.js" }),
  );
  writeFileSync(join(dir, "index.js"), "module.exports = {};\n");
}

for (const engine of ["chart-native", "image-native"])
  mkdirSync(join(root, ".dist", "skills", engine), { recursive: true });
mkdirSync(join(root, "skills", "chart-native"), { recursive: true });
for (const name of ["react", "vite", "remotion", "sharp"]) pkg(name);

test("an engine whose dependencies are installed reads ready on a packed install", () => {
  const model = preflightModel({
    state: {
      ...DEFAULT_NEWSROOM_STATE,
      capabilities: { "image-native": { enabled: true } },
    },
    env: {},
    skillsRoot: resolveSkillsRoot(root),
  });
  const photo = model.engines.find((e) => e.id === "image-native")!;
  expect(photo.status).toBe("ready");
});

// The mutation: point the probe back at the source tree — the state before this task — and the
// same install must report missing. A test that stays green with the defect restored proves
// nothing about the defect.
test("probing the source tree instead reports it missing (the defect this closes)", () => {
  const model = preflightModel({
    state: {
      ...DEFAULT_NEWSROOM_STATE,
      capabilities: { "image-native": { enabled: true } },
    },
    env: {},
    skillsRoot: join(root, "skills"),
  });
  expect(model.engines.find((e) => e.id === "image-native")!.status).toBe(
    "missing",
  );
});
```

- [ ] **Step 6: Run it**

Run: `bun test install/preflight/model-install-tree.test.ts`
Expected: PASS (2 tests). `image-native` est choisi ici parce que sa seule dépendance critique est `sharp` : il n'a pas de sonde navigateur, qui est le sujet de la Task 2.

- [ ] **Step 7: Wire the server to it**

Dans `install/preflight/server.ts`, importer le résolveur et le passer au modèle :

```ts
import { resolveSkillsRoot } from "./skills-root.ts";
```

puis, dans `renderPage`, ajouter une ligne à l'appel `preflightModel({ … })` :

```ts
  const model = preflightModel({
    state: decor.state,
    env,
    profileExists: existsSync(join(ROOT, PROFILE_FILE)),
    skillsRoot: resolveSkillsRoot(ROOT),
    ...(profileLang() ? { profileLang: profileLang()! } : {}),
    ...(focus ? { focus } : {}),
  });
```

- [ ] **Step 8: Run the install suites**

Run: `bun test install docs/installer`
Expected: PASS — aucune régression (`server.test.ts` monte un ROOT temporaire ; il n'a pas de `.dist`, donc le résolveur retombe sur `skills/`, comportement identique à aujourd'hui).

- [ ] **Step 9: Commit**

```bash
git add install/preflight/skills-root.ts install/preflight/skills-root.test.ts \
        install/preflight/model-install-tree.test.ts install/preflight/server.ts
git commit -m "fix(setup-page): probe the delivered skills tree, not the source one"
```

---

### Task 2: La sonde du navigateur de rendu cherche là où les dépendances vivent

> **★ RÉSOLUE AUTREMENT — la mesure de l'étape 1 a invalidé la prémisse de cette tâche (2026-08-05).**
> Remotion ne résout PAS son cache de navigateur par `node_modules` : `getDownloadsCacheDir()`
> remonte depuis `process.cwd()` jusqu'au premier répertoire ancêtre portant un `package.json`, et
> chaque skill packé garde le sien (`pack-skills.mjs` copie l'arbre du skill verbatim). Le cache
> atterrit donc dans `<dossier du skill>/node_modules/.remotion/…`, **exactement là où le code
> actuel le cherche** — vérifié par un `bunx remotion browser ensure` réel dans un `.dist` packé,
> puis par `probeRemotionBrowser(".dist/skills/chart-native")` → `ready`.
> **Les étapes 2 à 7 ci-dessous sont donc VOIDES : `lib/newsroom/probe.ts` n'est pas modifié.**
> Ce qui reste de la tâche : le document de mesure, et le correctif du test qui lisait l'état
> ambiant de la machine (`install/preflight/model.test.ts`). Mesure : `docs/installer/remotion-cache-measurement.md`.
>
> **Ce que la mesure a découvert à la place** — l'installeur exécute `bunx playwright install
> chromium`, qui remplit le cache Playwright, **pas** `.remotion` ; et le cache Remotion est
> **par dossier de skill** (`map-native` n'en avait aucun). Sur une install réelle, la page lisait
> donc « missing » pour les deux moteurs vidéo, sur toutes les plateformes. Décision de Rémy
> (2026-08-05) : **on ne réclame pas, on informe — et le journaliste coche s'il veut des vidéos.**
> C'est la Task 9.

**Files:**
- Create: `docs/installer/remotion-cache-measurement.md`
- Modify: `lib/newsroom/probe.ts:86-97` (`remotionExecutablePath`)
- Modify: `lib/newsroom/probe.test.ts`

**Interfaces:**
- Consumes: `resolveSkillsRoot` (Task 1).
- Produces: `remotionExecutablePath(fromDir: string): string | null` — signature inchangée, résolution corrigée. `probeRemotionBrowser` (`lib/newsroom/probe.ts:110`) l'appelle et ne change pas.

**Pourquoi cette tâche existe :** `remotionExecutablePath` compose `<fromDir>/node_modules/.remotion/…` (`lib/newsroom/probe.ts:86-97`). Sur l'arbre livré, `fromDir` vaut `.dist/skills/chart-native`, qui **n'a pas de `node_modules`** — ils sont hoistés à `.dist/node_modules`. La Task 1 seule laisserait donc `chart-native` et `map-native` (les deux moteurs à `remotion` dans `criticalDeps`) en `missing` sur une vraie install. On ne devine pas où Remotion pose son cache : on le mesure.

- [ ] **Step 1: Measure where Remotion actually caches the browser**

```bash
cd ../splash-setup
bun install
bun run pack-skills
cd .dist && bun install
cd skills/chart-native && bunx remotion browser ensure
cd ../../.. && find .dist -name 'chrome-headless-shell*' -maxdepth 8 | head
```

Consigner la sortie **verbatim** dans `docs/installer/remotion-cache-measurement.md` (date, commande, chemin trouvé). Deux résultats possibles, et le code de l'étape 3 ne dépend que de celui-ci :
- le cache est sous `.dist/node_modules/.remotion/…` → le bon `fromDir` est le répertoire qui CONTIENT le `node_modules` où `remotion` se résout ;
- le cache est ailleurs (répertoire global) → la sonde doit viser ce répertoire, et l'étape 3 s'écrit contre le chemin mesuré.

Ne pas passer à l'étape suivante sans cette sortie écrite : c'est elle qui décide de l'implémentation.

- [ ] **Step 2: Write the failing test**

```ts
// lib/newsroom/probe.test.ts — ADD (keep every existing test)
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { remotionExecutablePath } from "./probe.ts";

// The delivered tree hoists dependencies ABOVE the skill directory (pack-skills.mjs:11-13), so
// the skill directory itself has no node_modules. A path composed from the skill directory
// points at a folder that never exists on a real install — and the two video-capable engines
// then read "missing" forever.
test("the browser path follows the node_modules that actually holds remotion", () => {
  const root = mkdtempSync(join(tmpdir(), "splash-dist-"));
  const remotionDir = join(root, "node_modules", "remotion");
  mkdirSync(remotionDir, { recursive: true });
  writeFileSync(
    join(remotionDir, "package.json"),
    JSON.stringify({ name: "remotion", version: "0.0.0", main: "index.js" }),
  );
  writeFileSync(join(remotionDir, "index.js"), "module.exports = {};\n");
  const skillDir = join(root, "skills", "chart-native");
  mkdirSync(skillDir, { recursive: true });

  const path = remotionExecutablePath(skillDir);
  expect(path).toContain(join(root, "node_modules", ".remotion"));
  expect(path).not.toContain(join(skillDir, "node_modules"));
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `bun test lib/newsroom/probe.test.ts`
Expected: FAIL — le chemin retourné contient `skills/chart-native/node_modules`.

- [ ] **Step 4: Implement, against the measurement**

Remplacer le corps de `remotionExecutablePath` (`lib/newsroom/probe.ts:86-97`) par une résolution qui suit le paquet plutôt que le répertoire appelant :

```ts
/**
 * The package root Remotion caches against: the directory that CONTAINS the node_modules where
 * `remotion` resolves from `fromDir`. On a developer checkout that is the skill directory
 * itself; on a delivered tree (pack-skills.mjs:11-13) the dependencies are hoisted one level
 * above the skills, so it is .dist/. Composing the path from `fromDir` alone pointed at a
 * node_modules that never exists on a real install — measured 2026-08-05, see
 * docs/installer/remotion-cache-measurement.md.
 *
 * Falls back to `fromDir` when `remotion` does not resolve at all: the caller is a probe, and a
 * probe answers "missing", it never throws.
 */
function remotionPackageRoot(fromDir: string): string {
  try {
    const entry = Bun.resolveSync("remotion", fromDir);
    const marker = `${sep}node_modules${sep}`;
    const at = entry.lastIndexOf(marker);
    return at === -1 ? fromDir : entry.slice(0, at);
  } catch {
    return fromDir;
  }
}

export function remotionExecutablePath(fromDir: string): string | null {
  const platformDir = remotionPlatformDir();
  if (!platformDir) return null;
  return join(
    remotionPackageRoot(fromDir),
    "node_modules",
    ".remotion",
    "chrome-headless-shell",
    platformDir,
    `chrome-headless-shell-${platformDir}`,
    remotionExecutableName(platformDir),
  );
}
```

Ajouter `sep` à l'import `node:path` en tête de fichier (`lib/newsroom/probe.ts:11`).

> Si l'étape 1 a mesuré un cache **global** au lieu de `.dist/node_modules/.remotion`, écrire à la place la composition du chemin mesuré, et adapter le test de l'étape 2 au même chemin. La règle ne change pas : la sonde vise ce que la mesure a montré.

- [ ] **Step 5: Run the tests**

Run: `bun test lib/newsroom`
Expected: PASS — y compris les cas existants (`probe.test.ts` couvre déjà le stub tronqué et l'hôte non supporté). En arbre de dev, `Bun.resolveSync("remotion", "skills/chart-native")` retourne le paquet sous `skills/chart-native/node_modules`, donc le chemin est **inchangé** et la sonde reste verte là où elle l'était.

- [ ] **Step 6: Verify by mutation**

Remettre `fromDir` à la place de `remotionPackageRoot(fromDir)`, relancer `bun test lib/newsroom/probe.test.ts` : le nouveau test DOIT rougir. Rétablir.

- [ ] **Step 7: Commit**

```bash
git add lib/newsroom/probe.ts lib/newsroom/probe.test.ts docs/installer/remotion-cache-measurement.md
git commit -m "fix(readiness): find the render browser where the dependencies actually resolve"
```

---

### Task 3: La phrase du sondage cesse d'ordonner un terminal

**Files:**
- Modify: `lib/newsroom/readiness.ts:112-133` (les deux `reason` du bloc `criticalDeps`)
- Modify: `lib/newsroom/readiness.test.ts`

**Interfaces:**
- Consumes: rien de neuf.
- Produces: rien de neuf — seules deux chaînes changent.

- [ ] **Step 1: Write the failing test**

```ts
// lib/newsroom/readiness.test.ts — ADD
// The setup page is the one screen whose promise is that there will be no terminal. Telling its
// reader to `bun install` in a directory is both impossible for them and, since the installer
// installs the dependencies itself, never their job in the first place.
it("never tells the journalist to run a command", () => {
  const missing = capabilityReadiness(
    NEWSROOM_CAPABILITIES["image-native"]!,
    state({ "image-native": { enabled: true } }),
    { env: {}, resolveDep: () => false },
  );
  expect(missing.status).toBe("missing");
  expect(missing.reason).not.toContain("bun install");
  expect(missing.reason).toContain("installer");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test lib/newsroom/readiness.test.ts`
Expected: FAIL — la raison actuelle contient `run \`bun install\` in skills/image-native`.

- [ ] **Step 3: Rewrite the two reasons**

Dans `lib/newsroom/readiness.ts`, remplacer la raison du bloc dépendances :

```ts
      return {
        ...base,
        status: "missing",
        reason:
          `${cap.label} was not installed completely (${missing.join(", ")} missing) — ` +
          `run the Splash installer again to finish it`,
      };
```

et celle de la sonde navigateur :

```ts
        return {
          ...base,
          status: "missing",
          reason:
            `${cap.label}'s video renderer is missing its browser, or it downloaded ` +
            `only halfway — run the Splash installer again to finish it`,
        };
```

- [ ] **Step 4: Run the suite**

Run: `bun test lib/newsroom`
Expected: PASS. Mettre à jour les attentes existantes qui citaient l'ancienne phrase (chercher `bun install` dans `lib/newsroom/readiness.test.ts` et `install/preflight/model.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add lib/newsroom/readiness.ts lib/newsroom/readiness.test.ts install/preflight/model.test.ts
git commit -m "fix(readiness): a failed install says re-run the installer, not run a shell command"
```

---

### Task 4: L'ordre de l'install — installer avant de configurer

**Files:**
- Modify: `install/bootstrap.sh` (déplacer le bloc `# 5` avant le bloc `# 4`, renuméroter)
- Modify: `install/bootstrap.ps1` (même déplacement)
- Modify: `docs/installer/bootstrap-sh.test.ts`
- Modify: `docs/installer/bootstrap-ps1.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: rien — un ordre d'exécution, vérifié par lecture du script.

- [ ] **Step 1: Write the failing test**

```ts
// docs/installer/bootstrap-sh.test.ts — ADD (the file already reads the shipped script into `sh`)
// The page measures the tree; the tree must therefore exist. Packaging and installing after the
// page is what made it report four healthy engines as missing on every real install.
test("packages and installs BEFORE opening the setup page", () => {
  const pack = sh.indexOf("bun run pack-skills");
  const page = sh.indexOf("bun install/configurator.ts");
  const runtime = sh.indexOf("bun install/read-runtime.ts");
  expect(pack).toBeGreaterThan(0);
  expect(page).toBeGreaterThan(pack);
  // The runtime module is chosen BY the page, so it still comes after it.
  expect(runtime).toBeGreaterThan(page);
});
```

Et son jumeau Windows dans `docs/installer/bootstrap-ps1.test.ts`, avec les commandes du script PowerShell (`pack-skills`, `configurator.ts`, `read-runtime.ts`).

- [ ] **Step 2: Run them to verify they fail**

Run: `bun test docs/installer/bootstrap-sh.test.ts docs/installer/bootstrap-ps1.test.ts`
Expected: FAIL — `page` est aujourd'hui avant `pack`.

- [ ] **Step 3: Move the block**

Dans `install/bootstrap.sh` : déplacer le bloc `# 5. Package what a host receives…` (lignes 115-140, jusqu'au `fi` du téléchargement Playwright inclus) AVANT le bloc `# 4. Local setup page…` (lignes 104-113). Renuméroter les commentaires : le packaging devient `# 4`, la page `# 5`. Le commentaire du bloc packaging dit aujourd'hui *« This must run before step 6 »* — le corriger en nommant la nouvelle raison :

```sh
# 4. Package what a host receives, then install its dependencies ONCE.
# […]
# This runs BEFORE the setup page (step 5) for two reasons: the page MEASURES this tree — a page
# opened first reports every in-house engine as missing — and a failure here must stop the install
# before anyone fills in a form for a tree that will not work. It also runs before step 6, whose
# runtime_install globs $DEST/.dist/skills/*/.
```

Appliquer le même déplacement dans `install/bootstrap.ps1`.

- [ ] **Step 4: Run the tests**

Run: `bun test docs/installer`
Expected: PASS, y compris `bootstrap.sh is valid bash` (le déplacement ne doit casser aucune structure `if/fi`).

- [ ] **Step 5: Sanity-check the script parses**

Run: `bash -n install/bootstrap.sh && echo OK`
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add install/bootstrap.sh install/bootstrap.ps1 docs/installer/bootstrap-sh.test.ts docs/installer/bootstrap-ps1.test.ts
git commit -m "fix(install): install the engines before the setup page measures them"
```

---

### Task 5: Le login est déclaré par le runtime

**Files:**
- Modify: `install/configurator-core.ts:13-33` (type + entrées `RUNTIMES`)
- Modify: `install/preflight/model.ts:84-95` et `:267` (`anthropicConfigured` → `login`)
- Modify: `install/preflight/client.ts:374-419` (`renderAssistant`)
- Modify: `install/preflight/serialize.ts:34-49` et `:95-97` (`sub.anthropic` → `sub.login`)
- Modify: `install/preflight/copy.ts:40-41`, `:99-101`, `:162-164` (les deux tables)
- Modify: `install/configurator-core.test.ts`, `install/preflight/model.test.ts`, `install/preflight/serialize.test.ts`

**Interfaces:**
- Consumes: `RUNTIMES` (`install/configurator-core.ts:13`).
- Produces:
  - `type RuntimeLogin = { name: string; label: string; help: string; optional: boolean }`
  - `RUNTIMES[id].login?: RuntimeLogin`
  - `PreflightModel.login: (RuntimeLogin & { configured: boolean }) | null` — remplace `anthropicConfigured: boolean`
  - `PreflightSubmission.login?: string` — remplace `anthropic?: string`

- [ ] **Step 1: Write the failing test**

```ts
// install/configurator-core.test.ts — ADD
import { RUNTIMES } from "./configurator-core.ts";

// An Anthropic key is written to .env for whoever picked Goose, and Codex and Gemini have no
// path for their own. The login belongs to the runtime that uses it — including the runtimes
// that need none, which own their account (the two desktop apps) or their own config (Goose).
test("each runtime declares its own login, or none", () => {
  expect(RUNTIMES.claude!.login?.name).toBe("ANTHROPIC_API_KEY");
  expect(RUNTIMES.codex!.login?.name).toBe("OPENAI_API_KEY");
  expect(RUNTIMES.gemini!.login?.name).toBe("GEMINI_API_KEY");
  for (const id of ["goose", "goose-desktop", "claude-desktop"])
    expect(RUNTIMES[id]!.login).toBeUndefined();
  // Every declared login is optional today: all three runtimes also accept a subscription or an
  // interactive sign-in at first launch.
  for (const rt of Object.values(RUNTIMES))
    if (rt.login) expect(rt.login.optional).toBe(true);
});
```

```ts
// install/preflight/serialize.test.ts — REPLACE the ANTHROPIC_API_KEY case (lines 99-105)
test("writes the login under the name the CHOSEN runtime declares", () => {
  expect(
    envUpdates(submission({ runtime: "gemini", login: "gk-X" })),
  ).toEqual({ GEMINI_API_KEY: "gk-X" });
});

// The payload arrives over a socket. A runtime that declares no login must write nothing —
// otherwise the page becomes a way to set an arbitrary environment variable.
test("writes nothing when the chosen runtime declares no login", () => {
  expect(envUpdates(submission({ runtime: "goose", login: "gk-X" }))).toEqual({});
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `bun test install/configurator-core.test.ts install/preflight/serialize.test.ts`
Expected: FAIL — `login` n'existe pas ; `envUpdates` écrit toujours `ANTHROPIC_API_KEY`.

- [ ] **Step 3: Declare the logins in the registry**

```ts
// install/configurator-core.ts
/** The assistant's own sign-in. Not a capability: it buys no format, it starts the runtime. */
export type RuntimeLogin = {
  /** The env var the runtime reads. Written to .env by the setup page. */
  name: string;
  /** Product name, shown as the field label. Not translated — it is a product. */
  label: string;
  /** Where the journalist gets it, with the link. */
  help: string;
  /** true = a subscription or an interactive sign-in also works, so blank is legitimate. */
  optional: boolean;
};

export const RUNTIMES: Record<
  string,
  { label: string; verified: boolean; login?: RuntimeLogin }
> = {
  claude: {
    label: "Claude Code",
    verified: true,
    login: {
      name: "ANTHROPIC_API_KEY",
      label: "Anthropic API key",
      help: "create one at https://console.anthropic.com/settings/keys",
      optional: true,
    },
  },
  codex: {
    label: "Codex",
    verified: true,
    login: {
      name: "OPENAI_API_KEY",
      label: "OpenAI API key",
      help: "create one at https://platform.openai.com/api-keys",
      optional: true,
    },
  },
  // … gemini keeps its existing comment, plus:
  //   login: { name: "GEMINI_API_KEY", label: "Google AI Studio key",
  //            help: "create one at https://aistudio.google.com/apikey", optional: true }
  // goose, goose-desktop and claude-desktop declare NO login: Goose carries its own provider
  // configuration, and the two apps own the account they sign into.
};
```

- [ ] **Step 4: Thread it through the model**

Dans `install/preflight/model.ts`, remplacer le champ du type (`:89`) :

```ts
  /** The runtime's own sign-in — declared by the chosen runtime, absent when it needs none. */
  login: (RuntimeLogin & { configured: boolean }) | null;
```

et le champ calculé (`:267`) :

```ts
    login: loginOf(state.runtime, env),
```

avec, à côté des autres helpers du fichier :

```ts
function loginOf(
  runtime: string,
  env: Record<string, string | undefined>,
): (RuntimeLogin & { configured: boolean }) | null {
  const login = RUNTIMES[runtime]?.login;
  return login ? { ...login, configured: isSet(env[login.name]) } : null;
}
```

- [ ] **Step 5: Render it, and re-render it when the runtime changes**

Dans `install/preflight/client.ts`, `renderAssistant` : remplacer le bloc `anthropic` (lignes 400-419) par un bloc dérivé du modèle, et **rappeler `renderAssistant(copy)` dans le `change` du radio de runtime** — sans quoi le champ affiché reste celui du runtime précédent :

```ts
    input.addEventListener("change", () => {
      form.runtime = runtime.id;
      form.login = "";
      renderAssistant(copy);
    });
```

```ts
  const login = model.runtimes.find((r) => r.id === form.runtime)?.login;
  if (!login) return; // this runtime owns its own sign-in — nothing to ask
  const field = el("div", { class: "field" });
  field.append(el("label", { for: "login" }, login.label));
  field.append(
    el(
      "p",
      { class: "field-help", id: "login-help" },
      login.optional ? copy.loginOptionalHint : login.help,
    ),
  );
  const key = el("input", {
    id: "login",
    type: "password",
    autocomplete: "off",
    "aria-describedby": "login-help",
    ...(login.configured
      ? { placeholder: `${copy.configured} — ${copy.configuredHint}` }
      : {}),
  }) as HTMLInputElement;
  key.value = form.login;
  key.addEventListener("input", () => {
    form.login = key.value;
  });
  field.append(key);
  body.append(field);
```

`model.runtimes` doit donc porter le `login` : dans `model.ts:260`, `Object.entries(RUNTIMES).map(([id, rt]) => ({ id, ...rt }))` le fait déjà par étalement — vérifier que le type exporté l'inclut (`runtimes: { id: string; label: string; verified: boolean; login?: RuntimeLogin }[]`).

Renommer `form.anthropic` en `form.login` (`client.ts:24`, `:41`).

- [ ] **Step 6: Write it to .env under the declared name**

Dans `install/preflight/serialize.ts`, remplacer le champ de la soumission (`:39`) par :

```ts
  /** The runtime's own sign-in. Blank = the subscription / interactive path. */
  login?: string;
```

et la première ligne de `envUpdates` (`:97`) par :

```ts
  // The registry decides the NAME: a payload that arrives over a socket never gets to choose
  // which environment variable it writes, and a runtime that declares no login writes nothing.
  const login = RUNTIMES[sub.runtime]?.login;
  if (login && isSet(sub.login)) updates[login.name] = sub.login!;
```

- [ ] **Step 7: Update the page copy (both tables)**

Dans `install/preflight/copy.ts`, retirer `anthropicLabel` / `anthropicHint` du type `PageCopy` et des deux tables, ajouter :

```ts
  loginOptionalHint: string;
```

EN : `"Leave blank if you have a subscription — you will sign in on first launch."`
FR : `"Laissez vide si vous avez un abonnement — vous vous connecterez au premier lancement."`

Le type force la présence dans les deux tables : `bun x tsc` échoue si l'une manque.

- [ ] **Step 8: Run the suites**

Run: `bun test install && bun x tsc --noEmit -p install/tsconfig.json`
Expected: PASS. Corriger les appels restants à `anthropicConfigured` / `sub.anthropic` que le compilateur signale.

- [ ] **Step 9: Commit**

```bash
git add install/configurator-core.ts install/configurator-core.test.ts install/preflight/
git commit -m "feat(setup-page): the assistant's login is declared by the runtime that uses it"
```

---

### Task 6: L'envie mène, l'outil reste cochable

**Files:**
- Modify: `lib/newsroom/capabilities.ts:28-43` (type) et `:60-134` (les six moteurs)
- Modify: `install/preflight/model.ts:48-80` (`PreflightCapability`) et `describe(...)`
- Modify: `install/preflight/client.ts:422-436` (`renderCapabilities`)
- Modify: `install/preflight/copy.ts` (titres de groupe, deux tables)
- Modify: `lib/newsroom/capabilities.test.ts`, `install/preflight/model.test.ts`

**Interfaces:**
- Consumes: `NEWSROOM_CAPABILITIES` (`lib/newsroom/capabilities.ts:60`).
- Produces:
  - `NewsroomCapability.want?: WantId` où `type WantId = "charts" | "maps" | "scrollys" | "photo-stories"`
  - `PreflightCapability.want?: WantId`
  - `PageCopy.wants: Record<WantId, string>`

- [ ] **Step 1: Write the failing test**

```ts
// lib/newsroom/capabilities.test.ts — ADD
// The journalist picks what he wants to be able to make; the engine is a means. Every engine
// therefore belongs to a want, and the tools that serve the same want group under one heading.
test("every engine declares the want it serves", () => {
  for (const cap of engineCapabilities()) expect(cap.want).toBeTruthy();
  const charts = engineCapabilities()
    .filter((c) => c.want === "charts")
    .map((c) => c.id)
    .sort();
  expect(charts).toEqual(["chart-native", "dw-chart"]);
  const maps = engineCapabilities()
    .filter((c) => c.want === "maps")
    .map((c) => c.id)
    .sort();
  expect(maps).toEqual(["map-dw", "map-native"]);
});

// A delivery destination is not a want: it answers "where does it go", which is its own section.
test("delivery capabilities declare no want", () => {
  for (const cap of deliveryCapabilities()) expect(cap.want).toBeUndefined();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test lib/newsroom/capabilities.test.ts`
Expected: FAIL — `want` n'existe pas.

- [ ] **Step 3: Declare the wants and re-label the tools**

Dans `lib/newsroom/capabilities.ts`, ajouter au type :

```ts
/** What the journalist wants to be able to make. The engine is how, not what. */
export type WantId = "charts" | "maps" | "scrollys" | "photo-stories";
```

et au type `NewsroomCapability` :

```ts
  /** The want this engine serves; the setup page groups the tools under it. Delivery has none. */
  want?: WantId;
```

Puis, sur les six moteurs — `want` ajouté, `label` réduit à l'OUTIL (le titre de groupe porte l'envie) :

| id | `want` | nouveau `label` |
|---|---|---|
| `dw-chart` | `charts` | `With a Datawrapper account` |
| `chart-native` | `charts` | `In-house, no account needed (includes video)` |
| `map-dw` | `maps` | `With a Datawrapper account` |
| `map-native` | `maps` | `In-house, needs a MapTiler key (includes video)` |
| `scrolly` | `scrollys` | `Scroll-driven stories` |
| `image-native` | `photo-stories` | `From the newsroom's own photographs` |

- [ ] **Step 4: Carry it to the model**

Dans `install/preflight/model.ts`, ajouter `want?: WantId` à `PreflightCapability` et le recopier dans `describe(...)` depuis `cap.want`.

- [ ] **Step 5: Group the rows in the page**

Dans `install/preflight/copy.ts`, ajouter au type et aux deux tables :

```ts
  wants: Record<WantId, string>;
```

EN : `{ charts: "Charts", maps: "Maps", scrollys: "Scrollytelling", "photo-stories": "Photo narratives" }`
FR : `{ charts: "Des graphiques", maps: "Des cartes", scrollys: "Des scrollys", "photo-stories": "Des récits photo" }`

Dans `install/preflight/client.ts`, `renderCapabilities` : émettre un titre par envie, puis ses cases, dans l'ordre de première apparition du registre.

```ts
function renderCapabilities(copy: PageCopy): void {
  const engines = section("capabilities");
  engines.name.textContent = copy.capabilitiesTitle;
  engines.hint.textContent = copy.capabilitiesHint;
  const groups = new Map<string, PreflightCapability[]>();
  for (const c of model.engines) {
    const key = c.want ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  const blocks: HTMLElement[] = [];
  for (const [want, caps] of groups) {
    const block = el("div", { class: "want" });
    if (want)
      block.append(
        el("h3", { class: "want-title" }, copy.wants[want as WantId] ?? want),
      );
    for (const c of caps) block.append(capabilityRow(c, copy, "checkbox"));
    blocks.push(block);
  }
  engines.body.replaceChildren(...blocks);

  const publishing = section("publishing");
  publishing.name.textContent = copy.publishingTitle;
  publishing.hint.textContent = copy.publishingHint;
  publishing.body.replaceChildren(
    ...model.delivery.map((c) => capabilityRow(c, copy, "radio")),
  );
}
```

Ajouter dans `install/preflight/page.css` un style minimal pour `.want-title` (même graisse que les libellés de section, marge haute), en suivant les règles voisines du fichier.

- [ ] **Step 6: Run the suites**

Run: `bun test lib/newsroom install && bun x tsc --noEmit -p install/tsconfig.json`
Expected: PASS. Les attentes qui citaient les anciens libellés (`"Charts built in-house (no account needed)"` etc.) sont à mettre à jour — chercher le texte dans `lib/` et `install/`.

- [ ] **Step 7: Commit**

```bash
git add lib/newsroom/capabilities.ts lib/newsroom/capabilities.test.ts install/preflight/
git commit -m "feat(setup-page): group the engines under what the journalist wants to make"
```

---

### Task 7: Fly.io disparaît

**Files:**
- Modify: `lib/newsroom/capabilities.ts:308-316` (suppression)
- Modify: `lib/newsroom/capabilities.test.ts:57-58`
- Modify: `lib/newsroom/readiness.test.ts:31-33`
- Modify: `lib/core/verbs/publish.test.ts:100-103`
- Modify: `lib/newsroom/migrate-decor.test.ts:106`
- Modify: `lib/core/publishers.test.ts:71-76`, `lib/delivery/routing.test.ts:57`

**Interfaces:**
- Consumes: rien.
- Produces: rien. La branche `!implemented` de `capabilityReadiness` (`lib/newsroom/readiness.ts:54-59`) **reste** — elle servira au prochain adaptateur déclaré avant d'être écrit.

- [ ] **Step 1: Write the failing test**

```ts
// lib/newsroom/capabilities.test.ts — REPLACE the "declared but unbuilt" case (lines 57-58)
// Fly.io was superseded by Cloudflare Pages and never built. A destination the page announces
// as "not available yet" is a promise nobody intends to keep.
test("every capability the page offers is actually built", () => {
  const declared = Object.values(NEWSROOM_CAPABILITIES).filter(
    (c) => !c.implemented,
  );
  expect(declared).toEqual([]);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test lib/newsroom/capabilities.test.ts`
Expected: FAIL — `embed-fly` est encore déclaré.

- [ ] **Step 3: Delete the entry and give the tests a local stub**

Supprimer les lignes 308-316 de `lib/newsroom/capabilities.ts`.

Dans `lib/newsroom/readiness.test.ts`, remplacer le cobaye importé par un stub défini sur place :

```ts
// The "declared but not built" exemplar. It used to be a REAL capability (embed-cms until L3
// built it, then embed-fly until it was dropped) — which meant a test could only exercise the
// unbuilt branch while some shipped capability happened to be unfinished. A local stub keeps
// the branch covered without holding a dead destination in the product.
const UNBUILT: NewsroomCapability = {
  id: "embed-nowhere",
  label: "A destination that is declared but not built",
  kind: "delivery",
  env: [],
  envHelp: {},
  criticalDeps: null,
  implemented: false,
};
```

Faire de même dans `lib/core/verbs/publish.test.ts:100-103` (l'identifiant `embed-fly` y est un stub d'éditeur : le renommer `embed-nowhere`), `lib/core/publishers.test.ts:71-76`, `lib/delivery/routing.test.ts:57`. Dans `lib/newsroom/migrate-decor.test.ts:106`, retirer `embed-fly` de la liste itérée.

- [ ] **Step 4: Run the suites**

Run: `bun test lib`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/
git commit -m "chore(capabilities): drop Fly.io, superseded by Cloudflare Pages and never built"
```

---

### Task 8: La preuve live, et la porte

**Files:**
- Create: `docs/installer/setup-page-proof.md`
- Modify: `docs/splash/CHANGELOG.md` (une entrée datée)
- Modify: `CLAUDE.md` (§ État courant — deux lignes)

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: la preuve que la page dit vrai sur une vraie install.

- [ ] **Step 1: Run the whole gate**

Run: `bun run check`
Expected: 23 checks verts. Ne pas continuer autrement.

- [ ] **Step 2: Stand up a real install**

Le dépôt est privé, donc l'étape de téléchargement n'est pas jouable : on pré-pose l'arbre, ce que le script gère (`install/bootstrap.sh:56`).

`DEST` est en dur à `$HOME/Splash` (`install/bootstrap.sh:10`), et `link_agents_skills` écrit dans `$HOME/.claude/skills` ou `$HOME/.agents/skills`. On **isole donc `HOME`** : l'install de preuve devient inoffensive pour le poste (elle ne peut plus écraser une install existante ni remplacer les liens de skills du développement), et le script tourne exactement tel qu'il est livré.

```bash
PROOF_HOME=~/splash-proof-home
rm -rf "$PROOF_HOME" && mkdir -p "$PROOF_HOME/Splash"
git -C ~/Sites/Professional/splash-setup archive HEAD | tar -x -C "$PROOF_HOME/Splash"
HOME="$PROOF_HOME" bash "$PROOF_HOME/Splash/install/bootstrap.sh"
```

Le terminal doit afficher, dans cet ordre : empaquetage des skills → dépendances de rendu → navigateur de rendu → ouverture de la page. Si la page s'ouvre avant, la Task 4 n'est pas en place.

- [ ] **Step 3: Read the page and record what it says**

Dans la page ouverte : cocher les quatre moteurs maison (graphiques maison, cartes maison, scrollys, récits photo), renseigner la clé MapTiler, et **capturer** l'état affiché.

Attendu : les moteurs sans compte lisent **prêt** sans qu'aucune clé soit demandée ; « Où vous en êtes » ne cite plus aucune dépendance ; aucune phrase ne contient `bun install` ; le champ d'assistant est celui du runtime choisi (et absent si c'est Goose) ; Fly.io n'apparaît nulle part.

- [ ] **Step 4: Write the proof**

`docs/installer/setup-page-proof.md` — date, commit, commandes exactes, sortie du terminal (l'ordre des phases), et l'état des six capacités tel qu'affiché. Nommer ce qui n'a PAS été prouvé : le chemin Windows (`bootstrap.ps1`) reste vérifié par lecture seulement, comme aujourd'hui.

- [ ] **Step 5: Commit**

```bash
git add docs/installer/setup-page-proof.md docs/splash/CHANGELOG.md CLAUDE.md
git commit -m "docs(proof): the setup page tells the truth on a real install"
```

---

### Task 9: L'installeur peuple ce que la sonde lit

> Née de la mesure de la Task 2. **Doit passer APRÈS la Task 4** (qui a posé l'ordre des étapes) —
> elle n'a plus de dépendance à la Task 6 depuis la décision ci-dessous.
>
> **Décision (Rémy, 2026-08-05) — on demande tout, pour l'instant.** La première version de cette
> tâche faisait de la vidéo une case à cocher (ne rien réclamer par défaut, informer, et ne
> télécharger que si le journaliste coche). Cette version est **écartée pour le moment** : l'install
> télécharge tout, sans condition. Prix assumé : ~93 Mo par moteur vidéo (deux moteurs) et le temps
> correspondant, pour une rédaction qui ne fera peut-être jamais de vidéo. L'alternative reste
> notée ici pour le jour où ce prix dérange : capacité `video-render` avec son `want`, étape
> conditionnelle APRÈS la page (comme `runtime_install`), et un `install/read-capability.ts` qui
> répond `1`/`0` au shell.

**Files:**
- Modify: `install/bootstrap.sh` (bloc d'empaquetage, après le téléchargement Playwright)
- Modify: `install/bootstrap.ps1` (miroir Windows)
- Modify: `docs/installer/bootstrap-sh.test.ts`, `docs/installer/bootstrap-ps1.test.ts`

**Interfaces:**
- Consomme : l'ordre posé par la Task 4 (`pack < chromium < page < runtime`).
- Produit : rien de nouveau à l'API ; une étape d'install et deux assertions d'ordre de plus.

**Le problème, mesuré (Task 2) :** le cache du navigateur de rendu est **par dossier de skill**
(`<skill>/node_modules/.remotion/…`) et n'est rempli que par Remotion lui-même. L'installeur
exécute `bunx playwright install chromium`, qui remplit un tout autre cache — celui de Playwright,
utilisé par les captures statiques. Donc aujourd'hui, après une install parfaitement saine, la page
lit « missing » sur `chart-native` et `map-native`, et `map-native` n'a jamais de navigateur du
tout. Ce n'est pas une question de position : c'est la mauvaise commande.

- [ ] **Step 1: Write the failing order tests**

```ts
// docs/installer/bootstrap-sh.test.ts — ADD (the file already reads the shipped script into `sh`)
// The page's readiness probe for the two video engines is a filesystem stat on a cache only
// Remotion ever writes, per skill directory (docs/installer/remotion-cache-measurement.md).
// `playwright install chromium` fills a different cache entirely, so it cannot stand in: without
// this step the page reports two healthy engines as missing on every install.
test("fetches the video renderer for BOTH video engines, before the page", () => {
  const pack = sh.indexOf("bun run pack-skills");
  const ensure = sh.indexOf("remotion browser ensure");
  const page = sh.indexOf("bun install/configurator.ts");
  expect(ensure).toBeGreaterThan(pack);
  expect(page).toBeGreaterThan(ensure);
  for (const engine of ["chart-native", "map-native"])
    expect(sh).toContain(engine);
});
```

Écrire le jumeau dans `docs/installer/bootstrap-ps1.test.ts`, avec les chaînes du script
PowerShell.

- [ ] **Step 2: Run them to verify they fail**

Run: `bun test docs/installer/bootstrap-sh.test.ts docs/installer/bootstrap-ps1.test.ts`
Expected: FAIL — `remotion browser ensure` n'apparaît dans aucun des deux scripts (`indexOf` → -1).

- [ ] **Step 3: Fetch the renderer, in the packaging block**

Dans `install/bootstrap.sh`, juste après le bloc `bunx playwright install chromium` et **dans la
même étape** (donc toujours avant la page) :

```sh
# The render browser Remotion itself uses — a DIFFERENT cache from Playwright's, written only by
# Remotion, and located per skill directory: it walks up from its cwd to the nearest package.json,
# and each packed skill keeps its own (measured: docs/installer/remotion-cache-measurement.md).
# So it is fetched once per video engine, and the setup page's probe finds it where it looks.
for engine in chart-native map-native; do
  echo "-> Downloading the video renderer for $engine…"
  if ! ( cd "$DEST/.dist/skills/$engine" && bunx remotion browser ensure ); then
    echo "The video renderer could not be downloaded for $engine — re-run this installer to resume." >&2
    exit 1
  fi
done
```

Miroir équivalent dans `install/bootstrap.ps1`, à la même place, avec l'idiome
`Push-Location`/`Pop-Location` du fichier.

- [ ] **Step 4: Run the tests**

Run: `bun test docs/installer` puis `bash -n install/bootstrap.sh`
Expected: PASS, et `bash -n` silencieux.

- [ ] **Step 5: Verify by mutation, in both scripts**

Déplacer le bloc `remotion browser ensure` après l'appel à la page, relancer
`bun test docs/installer`, constater le ROUGE ; remettre, constater le VERT. Faire les deux
scripts séparément et joindre les deux sorties au rapport.

- [ ] **Step 6: Commit**

```bash
git add install/bootstrap.sh install/bootstrap.ps1 docs/installer/
git commit -m "fix(install): fetch the render browser the readiness probe actually reads"
```

---

## Auto-revue du plan

**Couverture du spec :** §1.1 → Tasks 1, 2 et 4 (chemin, sonde navigateur, ordre) · §1.2 → Task 5 · §1.3 → Task 6 · §1.4 → Task 7 · §1.5 → hors plan par décision (c'est un run, dit au §7 du spec) · §3 (ordre) → Task 4 · §4.2 → Task 5 · §4.3 → Task 6 · §4.4 → Task 7 · §4.5 → Task 3 · §5 → Task 7 · §6 → Tasks 1 (mutation), 4 (ordre), 8 (preuve live).

**Un écart assumé :** le spec ne mentionnait pas la sonde du navigateur de rendu (Task 2). Elle a été trouvée en écrivant le plan — `remotionExecutablePath` compose `<fromDir>/node_modules`, qui n'existe pas dans l'arbre livré — et sans elle la Task 1 ne suffirait pas : les deux moteurs vidéo resteraient `missing` sur une vraie install, c'est-à-dire le défaut que ce chantier prétend fermer. La Task 2 commence donc par une **mesure**, pas par une hypothèse.

**Types :** `RuntimeLogin` (Task 5) est consommé par `model.ts`, `client.ts` et `serialize.ts` sous ce seul nom · `WantId` (Task 6) est consommé par `capabilities.ts`, `model.ts` et `copy.ts` sous ce seul nom · `resolveSkillsRoot` (Task 1) est appelé par `server.ts` et par le test d'intégration.
