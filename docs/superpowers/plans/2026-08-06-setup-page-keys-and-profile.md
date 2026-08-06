# La page demande ses clés, montre le profil, ouvre les apps de bureau — plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** les deux runtimes de bureau deviennent sélectionnables ; la section « Votre rédaction » affiche le profil que l'install possède déjà au lieu de renvoyer à un éditeur de texte ; les clés de production sont demandées d'emblée, sans attendre qu'on coche.

**Architecture:** trois leviers indépendants sur le même écran. (1) Le registre des runtimes (`install/configurator-core.ts`) et la règle qui le gouverne. (2) Le modèle servi (`install/preflight/model.ts`) gagne le profil parsé, lu par le MÊME parseur que la boucle (`parseNewsroomMarkdown`), et le client l'affiche en lecture. (3) Le rendu des champs de clés sort des capacités : les clés de production forment leur propre bloc, les cases ne gouvernent plus que ce qui est signalé.

**Tech Stack:** Bun, TypeScript, `bun:test`, DOM natif côté page (`install/preflight/client.ts`, bundlé par `Bun.build` en target navigateur).

**Spec:** `docs/superpowers/specs/2026-08-06-setup-page-keys-and-profile-design.md`

## Global Constraints

- Runtime **Bun** exclusivement — jamais `npm`, jamais `node`.
- Code, commentaires, identifiants, messages de commit : **anglais**. Le contenu de la page a deux tables EN/FR ; le type `PageCopy` force la parité à la compilation.
- **Aucune mention** d'un vendeur d'IA comme auteur dans un commit ou un doc. Un nom de produit dans un libellé est une donnée, pas une attribution.
- **TDD**, et pour chaque garde neuve une **vérification par mutation** : remettre le défaut doit faire rougir. Un test vert qui ne rougit pas ne prouve rien.
- Aucun `any`. `bun run check` reste à **23 checks verts**.
- La page **n'écrit jamais** dans un `NEWSROOM-PROFILE.md` existant : elle le lit et l'affiche. (Invariant du 2026-07-24, décision 6.)
- `install/` peut importer `lib/` ; jamais l'inverse.
- Worktree `../splash-keys`, branche `feat/setup-page-keys-and-profile`.

---

### Task 1: Les deux apps de bureau deviennent sélectionnables

**Files:**
- Modify: `install/configurator-core.ts` (les deux entrées `verified`)
- Modify: `install/configurator-core.test.ts:13-21` (le test qui épingle `goose-desktop` à `false`, et son jumeau `claude-desktop` s'il existe)
- Modify: `install/runtimes/README.md` (la phrase de règle)

**Interfaces:**
- Consomme : `RUNTIMES` (`install/configurator-core.ts:13`).
- Produit : rien de neuf à l'API ; deux drapeaux et une règle écrite.

**Pourquoi :** le projet a déjà ouvert `gemini` et `goose` « by decision », Couche B en attente (`install/configurator-core.test.ts:9-10`). Les deux apps de bureau relèvent du même régime, et ce sont les seuls runtimes sans terminal — donc les seuls qui tiennent la promesse de la page d'install.

- [ ] **Step 1: Write the failing test**

```ts
// install/configurator-core.test.ts — REPLACE the "goose-desktop is registered but NOT yet
// verified" test (and its claude-desktop equivalent if present) with this pair.
import { readFileSync } from "node:fs";

// The two runtimes a journalist can use WITHOUT a terminal — installed once, launched from the
// Dock. Enabled by decision, exactly as gemini and goose were: Layer A (the app discovers the
// skills) is measured on the shipped bundle, Layer B (a visual comes OUT of the app) is not.
test("the two desktop runtimes are selectable", () => {
  expect(RUNTIMES["goose-desktop"]!.verified).toBe(true);
  expect(RUNTIMES["claude-desktop"]!.verified).toBe(true);
});

// A flag is allowed to be raised on a decision rather than a proof — that is this project's
// convention — but never in silence. The motive lives beside the flag, and this reads the source
// as text to keep it there: the same method docs/installer/bootstrap-sh.test.ts uses on the
// install scripts.
test("every raised flag says why, right where it is raised", () => {
  const src = readFileSync(
    join(import.meta.dir, "configurator-core.ts"),
    "utf8",
  );
  const lines = src.split("\n");
  for (const [i, line] of lines.entries()) {
    if (!/verified:\s*true/.test(line)) continue;
    const preamble = lines.slice(Math.max(0, i - 12), i).join("\n");
    expect(
      /proven|decision/i.test(preamble),
      `verified: true at line ${i + 1} carries no stated motive`,
    ).toBe(true);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd ../splash-keys && bun test install/configurator-core.test.ts`
Expected: FAIL — les deux drapeaux valent `false`.

- [ ] **Step 3: Raise the flags, with their motive**

Dans `install/configurator-core.ts`, pour `goose-desktop` puis `claude-desktop`, remplacer le commentaire « NOT verified » par le motif réel et passer le drapeau :

```ts
  // Enabled by decision (2026-08-06), the same regime gemini and goose already carry: Layer A is
  // MEASURED — the app auto-loads ~/.claude/skills and mounts it into its sandbox
  // (docs/installer/claude-desktop-findings.md) — and Layer B, a visual coming out of the app,
  // has not been observed. Kept selectable because these two are the only runtimes that need no
  // terminal after the install, which is the whole promise of the install page.
  "claude-desktop": { label: "Claude Desktop", verified: true },
```

(et l'équivalent pour `goose-desktop`, en pointant `docs/installer/goose-desktop-findings.md`).

- [ ] **Step 4: Make the rule agree with the code**

Dans `install/runtimes/README.md`, la phrase *« flip a runtime's `verified` to `true` only once its module exists AND the end-to-end proof passes »* est fausse depuis gemini et goose. La remplacer :

```md
`configurator-core.ts`'s `RUNTIMES` map gates which runtimes are selectable. A runtime's
`verified` goes `true` when its module exists here AND either the end-to-end proof passes, or the
project decides to ship it without one — in which case the motive is written beside the flag,
naming what IS measured and what is not. `configurator-core.test.ts` reads this file's source to
keep that true: a flag raised in silence fails the suite.
```

- [ ] **Step 5: Run the tests**

Run: `bun test install`
Expected: PASS. Corriger toute attente ailleurs qui pinnait `false` (chercher `goose-desktop` et `claude-desktop` dans `install/` et `docs/installer/`).

- [ ] **Step 6: Verify by mutation**

Retirer le mot « decision » du commentaire d'une des deux entrées, relancer `bun test install/configurator-core.test.ts` : le second test DOIT rougir. Rétablir.

- [ ] **Step 7: Commit**

```bash
git add install/configurator-core.ts install/configurator-core.test.ts install/runtimes/README.md
git commit -m "feat(setup-page): the two desktop runtimes are selectable, and the rule says why"
```

---

### Task 2: Le modèle porte le profil que l'install possède

**Files:**
- Modify: `install/preflight/model.ts` (type `PreflightModel`, type `PreflightModelInput`)
- Modify: `install/preflight/server.ts:78-90` (`renderPage`)
- Modify: `install/preflight/model.test.ts`

**Interfaces:**
- Consomme : `parseNewsroomMarkdown(md: string): BrandProfile | null` — `skills/splash/src/brand-profile.ts:248`, le parseur que `lib/newsroom/decor.ts:160` utilise déjà. **Ne pas en écrire un second.**
- Produit :
  ```ts
  export type PreflightProfile = {
    name?: string;
    url?: string;
    /** Ordered; the first is the house colour. */
    palette?: string[];
    lang?: string;
    /** "light" | "dark" | "#rrggbb" */
    theme?: string;
  };
  ```
  et `PreflightModel.profile: PreflightProfile | null` (null = aucun profil sur disque).

- [ ] **Step 1: Write the failing test**

```ts
// install/preflight/model.test.ts — ADD
// The page had the profile under its hand and showed none of it: it replaced the whole section
// with a sentence telling the journalist to open a text editor. The model carries the values so
// the page can show them.
it("carries the profile the install already has", () => {
  const m = model({
    profile: {
      name: "Heidi.news",
      url: "https://heidi.news",
      palette: ["#0A5C36", "#C8102E"],
      lang: "fr",
      theme: "dark",
    },
  });
  expect(m.profile?.name).toBe("Heidi.news");
  expect(m.profile?.palette?.[0]).toBe("#0A5C36");
  expect(m.profile?.theme).toBe("dark");
});

// A profile that declares little is not an error: no theme means a light ground, no url means a
// credit without a link. The model passes through what is there and invents nothing.
it("passes a minimal profile through without inventing fields", () => {
  const m = model({ profile: { name: "Le Temps" } });
  expect(m.profile?.name).toBe("Le Temps");
  expect(m.profile?.palette).toBeUndefined();
  expect(m.profile?.theme).toBeUndefined();
});

it("reports no profile when the install has none", () => {
  expect(model().profile).toBeNull();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test install/preflight/model.test.ts`
Expected: FAIL — `profile` n'existe pas sur le modèle.

- [ ] **Step 3: Add the field**

Dans `install/preflight/model.ts` : déclarer `PreflightProfile`, ajouter `profile: PreflightProfile | null` à `PreflightModel`, ajouter `profile?: PreflightProfile` à `PreflightModelInput`, et le renvoyer dans l'objet construit (`profile: input.profile ?? null`).

`profileExists` reste : il dit qu'un fichier est là, ce qui n'est pas la même chose que ce qu'il déclare (un profil peut exister et n'avoir qu'un nom).

- [ ] **Step 4: Fill it from the real file**

Dans `install/preflight/server.ts`, lire le profil avec le parseur existant et le passer au modèle :

```ts
// The SAME parser the loop uses (lib/newsroom/decor.ts:160 calls it) — a second parser would
// drift from the file the journalist actually edits.
function newsroomProfile(): PreflightProfile | null {
  try {
    const parsed = parseNewsroomMarkdown(
      readFileSync(join(ROOT, PROFILE_FILE), "utf8"),
    );
    if (!parsed) return null;
    return {
      ...(parsed.source?.name ? { name: parsed.source.name } : {}),
      ...(parsed.source?.url ? { url: parsed.source.url } : {}),
      ...(parsed.palette?.length ? { palette: parsed.palette } : {}),
      ...(parsed.lang ? { lang: parsed.lang } : {}),
      ...(parsed.theme ? { theme: parsed.theme } : {}),
    };
  } catch {
    return null; // no file, or a file this parser cannot read — the page then offers the form
  }
}
```

et l'ajouter à l'appel `preflightModel({ … })` (`server.ts:82-88`).

- [ ] **Step 5: Run the suites**

Run: `bun test install && bun x tsc --noEmit -p install/tsconfig.json`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add install/preflight/model.ts install/preflight/model.test.ts install/preflight/server.ts
git commit -m "feat(setup-page): the model carries the newsroom profile the install already has"
```

---

### Task 3: La section « Votre rédaction » montre le profil

**Files:**
- Modify: `install/preflight/client.ts:308-341` (`renderNewsroom`)
- Modify: `install/preflight/copy.ts` (deux tables)
- Modify: `install/preflight/page.css` (le bloc de lecture)
- Modify: `install/preflight/page.test.ts`

**Interfaces:**
- Consomme : `PreflightModel.profile` (Task 2).
- Produit : rien de neuf ; un rendu.

- [ ] **Step 1: Write the failing test**

`install/preflight/page.test.ts` teste le HTML/CSS servi par grep de texte (pas de harnais DOM dans cette suite — suivre son idiome). Ajouter :

```ts
// The read-only view of an existing profile needs a style of its own; without it the values fall
// back to the form's field spacing and read as editable, which they are not.
it("styles the profile read-out", () => {
  expect(css).toContain(".profile-readout");
});
```

Et le vrai garde de comportement au niveau du modèle→rendu appartient au seam existant : ajouter dans `install/preflight/model.test.ts` une assertion que `profileExists === true` **et** `profile !== null` coexistent sur un install qui a un fichier (le rendu lit les deux).

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test install/preflight/page.test.ts`
Expected: FAIL — `.profile-readout` n'existe pas.

- [ ] **Step 3: Render the values**

Dans `install/preflight/client.ts`, `renderNewsroom` : quand `model.profileExists`, ne plus retourner après la phrase. Émettre la phrase (elle dit que le fichier appartient à la rédaction), puis les valeurs déclarées, chacune en lecture :

```ts
  if (model.profileExists) {
    body.append(el("p", { class: "shared-note" }, copy.profileOwned));
    const p = model.profile;
    if (!p) return; // a file that declares nothing readable — the sentence is the whole answer
    const readout = el("div", { class: "profile-readout" });
    const row = (label: string, value: string) => {
      const r = el("div", { class: "profile-row" });
      r.append(el("span", { class: "profile-label" }, label));
      r.append(el("span", { class: "profile-value" }, value));
      readout.append(r);
    };
    if (p.name) row(copy.newsroomName, p.url ? `${p.name} — ${p.url}` : p.name);
    if (p.palette?.length) {
      const r = el("div", { class: "profile-row" });
      r.append(el("span", { class: "profile-label" }, copy.newsroomColor));
      const swatches = el("span", { class: "profile-value" });
      for (const hex of p.palette) {
        const dot = el("span", { class: "swatch" });
        dot.style.background = hex;
        dot.title = hex;
        swatches.append(dot);
      }
      swatches.append(el("span", { class: "swatch-hex" }, p.palette[0]!));
      r.append(swatches);
      readout.append(r);
    }
    if (p.lang) row(copy.languageContent, p.lang);
    if (p.theme) row(copy.profileGround, p.theme);
    body.append(readout);
    return;
  }
```

- [ ] **Step 4: Add the one new copy key, in both tables**

`install/preflight/copy.ts` : ajouter `profileGround: string` au type `PageCopy` — EN `"House ground"`, FR `"Fond maison"`. Le type force les deux tables ; `bun x tsc` échoue si l'une manque.

- [ ] **Step 5: Style it**

`install/preflight/page.css` : `.profile-readout`, `.profile-row`, `.profile-label`, `.profile-value`, `.swatch` (un carré de ~1rem, coins arrondis, bordure 1px du même gris que les champs voisins), `.swatch-hex` (monospace, taille de l'aide). Suivre le vocabulaire des règles voisines — pas de nouvelle idiome.

- [ ] **Step 6: Run the suites**

Run: `bun test install && bun x tsc --noEmit -p install/tsconfig.json`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add install/preflight/client.ts install/preflight/copy.ts install/preflight/page.css install/preflight/page.test.ts install/preflight/model.test.ts
git commit -m "feat(setup-page): show the newsroom profile instead of pointing at a text editor"
```

---

### Task 4: Les clés de production sont demandées d'emblée

**Files:**
- Modify: `install/preflight/model.ts` (marquer les champs de production)
- Modify: `install/preflight/client.ts` (`renderCapabilities`, et le rendu des champs sous une capacité)
- Modify: `install/preflight/copy.ts` (deux tables : le titre du bloc + la phrase réécrite)
- Modify: `install/preflight/model.test.ts`, `install/preflight/page.test.ts`

**Interfaces:**
- Consomme : `PreflightField` (`install/preflight/model.ts:34-47`), `NEWSROOM_CAPABILITIES` (`lib/newsroom/capabilities.ts`).
- Produit : `PreflightField.upfront: boolean` — vrai quand le champ sert au moins une capacité `kind: "engine"`. Les champs qui ne servent que des destinations restent conditionnés au choix.

- [ ] **Step 1: Write the failing test**

```ts
// install/preflight/model.test.ts — ADD
// Decision (2026-08-06): the production keys are asked outright. A newsroom should not have to
// tick a box to be allowed to hand over the token it already has. Publication destinations keep
// asking on choice — a newsroom that delivers a file has no S3 account to give.
it("marks the production keys as asked upfront, and only those", () => {
  const m = model();
  const upfront = m.fields.filter((f) => f.upfront).map((f) => f.name).sort();
  expect(upfront).toEqual(["DATAWRAPPER_API_TOKEN", "VITE_MAPTILER_KEY"]);
  for (const f of m.fields)
    if (f.name.startsWith("CLOUDFLARE_") || f.name.startsWith("SPLASH_S3_"))
      expect(f.upfront).toBe(false);
});

// The tick no longer gates the ASK. Nothing is enabled here and the two keys are still there.
it("asks for them with no capability ticked at all", () => {
  const m = model({ state: state({}) });
  const names = m.fields.filter((f) => f.upfront).map((f) => f.name);
  expect(names).toContain("DATAWRAPPER_API_TOKEN");
  expect(names).toContain("VITE_MAPTILER_KEY");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test install/preflight/model.test.ts`
Expected: FAIL — `upfront` n'existe pas.

- [ ] **Step 3: Mark them in the model**

Dans `install/preflight/model.ts`, ajouter `upfront: boolean` à `PreflightField` et le calculer dans `collectFields` : vrai si l'une des capacités que le champ sert est `kind === "engine"`. Dérivé du registre — jamais une liste de noms écrite à la main, sinon un moteur ajouté demain serait oublié.

- [ ] **Step 4: Render them outside the tick**

Dans `install/preflight/client.ts`, `renderCapabilities` : émettre, **au-dessus** des groupes d'envies, un bloc portant les champs `upfront` (même rendu de champ que sous une capacité : libellé, aide, « déjà configuré »). Les champs non-`upfront` continuent d'être rendus sous leur capacité, inchangés.

- [ ] **Step 5: Rewrite the sentence that would now be false**

`install/preflight/copy.ts` — `capabilitiesHint` dit aujourd'hui que ce qu'on laisse décoché n'est jamais signalé comme manquant. Ce n'est plus vrai de la DEMANDE ; ça reste vrai du SIGNALEMENT. Nouveau texte :

EN : `"The keys below are asked once, whatever you use. Tick what your newsroom will produce — anything left unticked is never reported as a blocker."`
FR : `"Les clés ci-dessous sont demandées une fois, quel que soit votre usage. Cochez ce que votre rédaction produira — ce que vous laissez décoché n'est jamais signalé comme un blocage."`

Ajouter aussi `productionKeysTitle` — EN `"Your accounts"`, FR `"Vos comptes"` — pour le bloc.

- [ ] **Step 6: Run the suites**

Run: `bun test install && bun x tsc --noEmit -p install/tsconfig.json`
Expected: PASS. Mettre à jour toute attente qui pinne l'ancienne phrase.

- [ ] **Step 7: Verify by mutation**

Re-conditionner les champs `upfront` aux cases (les rendre sous la capacité comme avant), relancer `bun test install/preflight/model.test.ts` : le test de l'étape 1 DOIT rougir. Rétablir.

- [ ] **Step 8: Commit**

```bash
git add install/preflight/
git commit -m "feat(setup-page): ask for the production keys outright, ticks govern only what is reported"
```

---

### Task 5: Ce que la page SERT, et la porte

**Files:**
- Modify: `install/preflight/server.test.ts`
- Modify: `docs/installer/setup-page-proof.md` (une section datée)

**Interfaces:**
- Consomme : tout ce qui précède.
- Produit : la preuve que les trois changements sortent du vrai serveur, pas seulement des fonctions.

- [ ] **Step 1: Write the failing test**

`install/preflight/server.test.ts` monte déjà le vrai serveur sur un ROOT temporaire et lit le modèle servi (le test du chantier précédent). Ajouter un cas qui écrit un `NEWSROOM-PROFILE.md` dans ce ROOT, demande la page, et asserte sur le modèle servi :

```ts
// The three things this branch changed, read from what the server actually serves — not from the
// functions that feed it.
it("serves the profile, the upfront keys and the six runtimes", async () => {
  // …write NEWSROOM-PROFILE.md into the temp ROOT with a palette, a source and lang: "fr"…
  const model = servedModel(await fetchPage());
  expect(model.profile?.palette?.[0]).toBe("#0A5C36");
  expect(model.runtimes.filter((r) => r.verified)).toHaveLength(6);
  const upfront = model.fields.filter((f) => f.upfront).map((f) => f.name);
  expect(upfront).toContain("DATAWRAPPER_API_TOKEN");
  expect(upfront).toContain("VITE_MAPTILER_KEY");
});
```

Suivre l'idiome du fichier pour monter le ROOT et parser le modèle (le tag `<script type="application/json" id="preflight-model">`).

- [ ] **Step 2: Run it to verify it fails, then make it pass**

Run: `bun test install/preflight/server.test.ts`
Expected: FAIL d'abord (le profil n'est pas servi tant que la Task 2 n'est pas là — si les tâches sont faites dans l'ordre, ce test passe directement ; dans ce cas le noter dans le rapport plutôt que d'inventer un échec).

- [ ] **Step 3: Run the gate**

Run: `bun run check`
Expected: **23/23**. Diagnostiquer tout échec plutôt que de l'hériter ; ne jamais affaiblir un test pour l'atteindre.

- [ ] **Step 4: Record it in the proof**

`docs/installer/setup-page-proof.md` gagne une section datée 2026-08-06 : ce que la page sert désormais (les six runtimes, le profil affiché, les clés d'emblée), avec la sortie du test à l'appui. Nommer ce qui reste non prouvé : la Couche B des deux apps de bureau — un visuel n'est toujours jamais sorti d'aucune — et le chemin Windows, toujours vérifié par lecture seule.

- [ ] **Step 5: Commit**

```bash
git add install/preflight/server.test.ts docs/installer/setup-page-proof.md
git commit -m "test(setup-page): the served page carries the profile, the upfront keys and six runtimes"
```

---

## Auto-revue du plan

**Couverture du spec :** §1.1/§2 D1/§3.1 → Task 1 · §1.2/§2 D2/§3.2 → Tasks 2 et 3 · §1.3/§2 D3/§3.3 → Task 4 · §5 (preuves) → les mutations des Tasks 1 et 4, les cas de la Task 2, et la Task 5 pour la page servie et la porte.

**Un point d'attention pour l'implémenteur :** la Task 5 étape 2 peut passer du premier coup si les tâches sont faites dans l'ordre. C'est normal, et c'est à dire dans le rapport — un test qu'on n'a pas vu rougir ne prouve rien, donc s'il passe d'emblée, le prouver par mutation (retirer le champ `profile` du modèle servi) plutôt que d'inventer une étape rouge.

**Types :** `PreflightProfile` (Task 2) est consommé par `client.ts` (Task 3) sous ce seul nom · `PreflightField.upfront` (Task 4) est lu par `client.ts` et par les tests de modèle · aucun nom introduit ici n'entre en collision avec `PreflightCapability.want` / `.choice` du chantier précédent.
