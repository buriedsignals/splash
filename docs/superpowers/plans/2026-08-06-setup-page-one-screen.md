# La page de réglages devient un seul écran — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** l'adresse du site de la rédaction fabrique son profil, ce profil reste éditable, la section Langue et les cases à cocher disparaissent, et la page se termine par un constat de ce que la rédaction pourra produire.

**Architecture:** trois mouvements. (1) Une mesure — un point d'entrée serveur qui prend une URL, appelle `collectSiteSources` puis `proposeCharter` (déjà écrits, déterministes, sans LLM) et rend des valeurs **avec leurs reçus**. (2) Une écriture qui **préserve** — `NEWSROOM-PROFILE.md` cesse d'être écrit une seule fois : il est mis à jour champ par champ, corps et clés inconnues intacts. (3) Un retrait — la section Langue, les cases et leurs groupes s'en vont ; ce que la rédaction peut produire se déduit de ce qui est configuré et se lit en dernier.

**Tech Stack:** Bun, TypeScript, `bun:test`, DOM natif côté page (`install/preflight/client.ts`, bundlé par `Bun.build` en target navigateur).

**Spec:** `docs/superpowers/specs/2026-08-06-setup-page-one-screen-design.md`

## Global Constraints

- Runtime **Bun** exclusivement — jamais `npm`, jamais `node`.
- Code, commentaires, identifiants, messages de commit : **anglais**. La copie de la page a ses deux tables EN/FR ; le type `PageCopy` force la parité à la compilation.
- **Aucune mention** d'un vendeur d'IA comme auteur dans un commit ou un doc.
- **TDD**, et pour chaque garde neuve une **vérification par mutation** : remettre le défaut doit faire rougir.
- Aucun `any`. La porte reste à **20/23** — les trois rouges (`lib`, `skills/map-native`, `skills/scrolly`) sont une clé MapTiler morte, chaîne établie ; **aucun rouge de plus**.
- **La mesure n'est jamais une décision** : rien n'est écrit dans `NEWSROOM-PROFILE.md` sans un geste humain (invariant de `skills/newsroom-charter`).
- **Aucun appel réseau dans la suite de tests.** `proposeCharter` se teste sur des sources fixes ; `collectSiteSources` est le seul à toucher le réseau et n'est pas exercé par le gate.
- `install/preflight/client.ts` est bundlé pour le NAVIGATEUR : imports de types uniquement à travers cette frontière, jamais un import de valeur depuis un module qui tire `node:`.
- Worktree `../splash-screen`, branche `feat/setup-page-one-screen`.

---

### Task 1: La page sait mesurer un site

**Files:**
- Create: `install/preflight/charter-endpoint.ts`
- Create: `install/preflight/charter-endpoint.test.ts`
- Modify: `install/preflight/server.ts` (une route de plus)

**Interfaces:**
- Consomme : `normalizeSiteUrl(raw)` et `collectSiteSources(...)` — `lib/newsroom/charter-fetch.ts:88,170` · `proposeCharter(sources): CharterProposal` — `lib/newsroom/charter.ts:829`, dont `{ url?, candidates[], ground?, typography[], confidence, notes[] }`.
- Produit :
  ```ts
  export type CharterReadout = {
    /** Ranked, best first. Empty means the site declared nothing — a legitimate answer. */
    palette: { hex: string; receipt: string; confidence: string }[];
    ground?: { value: string; receipt: string };
    /** Measured, never written to frontmatter — see Task 2. */
    typefaces: { family: string; role: string; receipt: string }[];
    /** Verbatim caveats from the extractor, for the page to relay unchanged. */
    notes: string[];
  };
  export function readoutFrom(proposal: CharterProposal): CharterReadout;
  ```

**Pourquoi une couche :** `CharterProposal` porte des mesures brutes (`Measurement`, poids, signaux). La page a besoin d'une valeur **et de la phrase qui dit d'où elle vient**. Cette traduction est pure et testable ; elle ne doit pas vivre dans le rendu.

- [ ] **Step 1: Write the failing test**

```ts
// install/preflight/charter-endpoint.test.ts
import { expect, test } from "bun:test";
import { readoutFrom } from "./charter-endpoint.ts";
import { proposeCharter } from "../../lib/newsroom/charter.ts";

// A site that declares its brand: the readout carries the value AND where it was read, because a
// journalist can only disagree with a value whose origin they can see (skills/newsroom-charter).
test("turns a measured proposal into values with their receipts", () => {
  const proposal = proposeCharter({
    url: "https://example.news",
    html: '<meta name="theme-color" content="#0A5C36">',
    sheets: [],
  });
  const readout = readoutFrom(proposal);
  expect(readout.palette[0]!.hex).toBe("#0A5C36");
  expect(readout.palette[0]!.receipt).not.toBe("");
});

// A white site with black text and a raster logo declares no brand hue. That is a legitimate
// outcome and the page must be able to say so rather than pick the least-grey pixel.
test("an empty measurement stays empty and keeps the extractor's own caveats", () => {
  const readout = readoutFrom(
    proposeCharter({ url: "https://plain.news", html: "<p>hello</p>", sheets: [] }),
  );
  expect(readout.palette).toEqual([]);
  expect(Array.isArray(readout.notes)).toBe(true);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd ../splash-screen && bun test install/preflight/charter-endpoint.test.ts`
Expected: FAIL — `Cannot find module './charter-endpoint.ts'`.

- [ ] **Step 3: Write the translation**

`install/preflight/charter-endpoint.ts` : `readoutFrom` mappe `proposal.candidates` → `palette`
(en gardant l'ordre, qui est le classement de l'extracteur), `proposal.ground` → `ground`,
`proposal.typography` → `typefaces`, et recopie `proposal.notes` **verbatim**. Le reçu de chaque
valeur se construit à partir du signal que porte la mesure (`theme-color`, `masthead`,
`brand-property`, `@font-face`…) : lire `lib/newsroom/charter.ts` pour la liste réelle et écrire
une phrase courte par signal, en anglais. Ne jamais élever la confiance que l'extracteur annonce.

- [ ] **Step 4: Wire the route**

Dans `install/preflight/server.ts`, une route `POST /charter` : lit `{ url }`, passe par
`normalizeSiteUrl` (rejet propre si l'URL n'est pas une adresse), `collectSiteSources`,
`proposeCharter`, `readoutFrom`, et rend le `CharterReadout` en JSON. Toute erreur réseau devient
une réponse *« le site n'a pas répondu »* — jamais une exception : cette page doit toujours rendre.

**Ne pas tester cette route dans la suite** (elle sort sur le réseau). Le test couvre `readoutFrom` ;
la route est exercée à la main, et la Task 6 vérifie qu'elle existe.

- [ ] **Step 5: Run the tests**

Run: `bun test install && bun x tsc --noEmit -p install/tsconfig.json`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add install/preflight/charter-endpoint.ts install/preflight/charter-endpoint.test.ts install/preflight/server.ts
git commit -m "feat(setup-page): the page can measure a newsroom's site and show what it read"
```

---

### Task 2: L'écriture du profil préserve ce qu'elle ne connaît pas

**Files:**
- Modify: `lib/newsroom/profile-write.ts`
- Modify: `lib/newsroom/profile-write.test.ts`
- Modify: `install/preflight/server.ts:248-249` (la garde `!existsSync`)

**Interfaces:**
- Consomme : `profileMarkdown(facts: NewsroomFacts): string` — `lib/newsroom/profile-write.ts`.
- Produit : `updateProfileMarkdown(existing: string, facts: NewsroomFacts): string` — réécrit les champs connus du frontmatter, **laisse intacts** le corps et toute clé qu'il ne connaît pas.

**Pourquoi :** rendre la section éditable sans ça, c'est rendre le fichier écrasable — exactement ce que la décision de juillet protégeait. Le fichier reste celui de la rédaction : ses commentaires, ses notes, un champ ajouté à la main doivent survivre.

- [ ] **Step 1: Write the failing test**

```ts
// lib/newsroom/profile-write.test.ts — ADD
// The file belongs to the newsroom: Splash created it, the journalist owns it. An edit from the
// setup page rewrites the fields the page knows and touches nothing else — the comments they
// wrote, and any key a later version (or a human) added.
it("keeps the body and the keys it does not know", () => {
  const existing = [
    "---",
    'palette:',
    '  - "#000000"',
    'lang: "en"',
    'requiredSigners: ["yvan"]',
    "---",
    "",
    "# Newsroom profile",
    "",
    "Ne pas toucher : notre rouge vient de la charte 2019.",
    "",
  ].join("\n");
  const out = updateProfileMarkdown(existing, {
    palette: ["#d5121e"],
    lang: "fr",
  });
  expect(out).toContain('"#d5121e"');
  expect(out).not.toContain('"#000000"');
  expect(out).toContain('lang: "fr"');
  expect(out).toContain('requiredSigners: ["yvan"]');
  expect(out).toContain("Ne pas toucher : notre rouge vient de la charte 2019.");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test lib/newsroom/profile-write.test.ts`
Expected: FAIL — `updateProfileMarkdown` n'existe pas.

- [ ] **Step 3: Implement it**

Dans `lib/newsroom/profile-write.ts` : découper le frontmatter du corps (même expression que
`parseNewsroomMarkdown` utilise, `skills/splash/src/brand-profile.ts:249`), remplacer bloc par bloc
les clés que `NewsroomFacts` couvre, conserver toutes les autres lignes dans leur ordre, puis
recoller le corps **inchangé**. Un fichier sans frontmatter reçoit un frontmatter neuf et garde son
corps. Réutiliser `scalar()` pour l'échappement — une valeur ne doit jamais pouvoir forger un champ.

- [ ] **Step 4: Let the page write an existing profile**

`install/preflight/server.ts:248-249` conditionne l'écriture à `!existsSync(profilePath)`.
La remplacer : si le fichier existe, lire, `updateProfileMarkdown`, écrire ; sinon `profileMarkdown`
comme aujourd'hui. **La condition qui reste** : `sub.newsroom` doit être présent — c'est le geste
humain, et sans lui rien ne s'écrit.

- [ ] **Step 5: Run the tests**

Run: `bun test lib/newsroom install`
Expected: PASS.

- [ ] **Step 6: Verify by mutation**

Remplacer `updateProfileMarkdown` par `profileMarkdown` dans le chemin d'écriture (le comportement
d'avant), relancer `bun test lib/newsroom/profile-write.test.ts` : le test de l'étape 1 DOIT rougir
sur le corps perdu. Rétablir.

- [ ] **Step 7: Commit**

```bash
git add lib/newsroom/profile-write.ts lib/newsroom/profile-write.test.ts install/preflight/server.ts
git commit -m "feat(newsroom): a profile edit rewrites the known fields and preserves the rest"
```

---

### Task 3: « Votre rédaction » redevient éditable, et l'adresse la remplit

**Files:**
- Modify: `install/preflight/client.ts` (`renderNewsroom`)
- Modify: `install/preflight/copy.ts` (deux tables)
- Modify: `install/preflight/serialize.ts` (`PreflightSubmission.newsroom` porte la palette et le fond)
- Modify: `install/preflight/page.css`

**Interfaces:**
- Consomme : `CharterReadout` (Task 1), `PreflightModel.profile` (existant).
- Produit : la section rend des CHAMPS (adresse, nom, couleur primaire, fond) pré-remplis par le profil existant s'il y en a un, et remplissables par la mesure.

- [ ] **Step 1: Write the failing test**

`install/preflight/page.test.ts` grep le HTML/CSS servi (pas de harnais DOM dans cette suite —
suivre son idiome) :

```ts
it("offers the site address as the way to fill the profile", () => {
  expect(html).toContain('id="newsroom-url"');
  expect(css).toContain(".charter-receipt");
});
```

Le vrai garde de comportement est au niveau de la soumission et appartient à la Task 6.

- [ ] **Step 2: Run it, see it fail, then render**

Dans `renderNewsroom` : supprimer le retour anticipé sur `model.profileExists`. Toujours rendre les
champs, pré-remplis depuis `model.profile` quand il existe. Ajouter, sous l'adresse, une action
« lire mon site » qui appelle `POST /charter` et pré-remplit ; chaque valeur mesurée s'affiche avec
son reçu (`.charter-receipt`) et **reste modifiable**. Une palette vide affiche la phrase qui dit
que le site ne déclare rien, plus les `notes` de l'extracteur, verbatim.

Ajouter à `PageCopy`, dans les deux tables : le libellé de l'action, la phrase du site muet, et
l'intitulé du fond maison si la Task précédente ne l'a pas déjà.

- [ ] **Step 3: Carry the values back**

`install/preflight/serialize.ts` : `NewsroomFacts` porte déjà `palette`, `theme` et `notes`. Vérifier
que `PreflightSubmission.newsroom` les transporte, et que les typos mesurées partent en `notes`
(Task 4 du spec §3.1) — **jamais** en clé de frontmatter.

- [ ] **Step 4: Run the suites**

Run: `bun test install && bun x tsc --noEmit -p install/tsconfig.json`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add install/preflight/
git commit -m "feat(setup-page): the site address fills an editable newsroom profile"
```

---

### Task 4: La section Langue disparaît

**Files:**
- Modify: `install/preflight/client.ts` (`renderLanguage` retiré, appelant nettoyé)
- Modify: `install/preflight/copy.ts` (`PAGE_SECTIONS`, clés devenues mortes)
- Modify: `install/preflight/page.html` (la section)
- Modify: `install/preflight/serialize.ts` si `uiLang`/`contentLang` en dépendaient

**Interfaces:**
- Produit : `PAGE_SECTIONS` sans `"language"`.

**Attention :** `uiLang` **reste** — c'est la langue dans laquelle la page se parle, et elle est
choisie ailleurs (`resolveLanguage`). Ce qui disparaît, c'est la section qui redemandait la langue
de PUBLICATION, laquelle vit dans le profil (`lang`).

- [ ] **Step 1: Write the failing test**

```ts
// install/preflight/copy.test.ts — ADD
// The publication language is a profile field. Asking it a second time, in another vocabulary,
// produced the visible contradiction the previous branch shipped: the read-out showed `fr` while
// the selector showed "Français" — one value, two names, one screen.
it("no longer carries a section that re-asks the publication language", () => {
  expect(PAGE_SECTIONS).not.toContain("language");
});
```

- [ ] **Step 2: Run it, see it fail, then remove**

Retirer la section de `PAGE_SECTIONS`, son rendu, son markup, et les clés de copie devenues mortes
dans les DEUX tables. `bun x tsc` signale les clés orphelines : les supprimer plutôt que de les
laisser.

- [ ] **Step 3: Run the suites**

Run: `bun test install && bun x tsc --noEmit -p install/tsconfig.json`
Expected: PASS. Mettre à jour toute attente qui pinnait la section.

- [ ] **Step 4: Commit**

```bash
git add install/preflight/
git commit -m "feat(setup-page): drop the language section — the profile already carries it"
```

---

### Task 5: Les cases s'en vont, le constat arrive

**Files:**
- Modify: `install/preflight/client.ts` (`renderCapabilities` → rendu des comptes seuls ; nouveau récapitulatif)
- Modify: `install/preflight/model.ts` (les capacités restent décrites, sans état coché)
- Modify: `install/preflight/serialize.ts` (`enabled` disparaît de la soumission)
- Modify: `install/preflight/copy.ts` (titre et phrase du récapitulatif, deux tables)
- Modify: `install/preflight/group-by-want.ts` (devient inutile — supprimer avec son test)
- Modify: `lib/newsroom/readiness.ts` si la dérivation doit cesser de consulter l'état coché

**Interfaces:**
- Produit : `PreflightModel.producible: { id: string; label: string; available: boolean; opensWith?: string }[]` — ce que la rédaction pourra produire, dérivé de ce qui est configuré. `label` vient de `choice ?? label` du registre.

- [ ] **Step 1: Write the failing test**

```ts
// install/preflight/model.test.ts — ADD
// No tick decides this any more: a capability whose keys are present is available, an in-house
// engine always is, and a capability that needs a key names the key that would open it.
it("derives what the newsroom can produce from what is configured", () => {
  const m = model({ env: { DATAWRAPPER_API_TOKEN: "t" } });
  const byId = Object.fromEntries(m.producible.map((p) => [p.id, p]));
  expect(byId["chart-native"]!.available).toBe(true);   // no account needed
  expect(byId["dw-chart"]!.available).toBe(true);       // its token is set
  expect(byId["map-native"]!.available).toBe(false);    // no MapTiler key here
  expect(byId["map-native"]!.opensWith).toContain("MapTiler");
});

// The submission stops carrying a tick list at all.
it("no longer submits an enabled list", () => {
  expect(Object.keys(model())).not.toContain("engines");
});
```

- [ ] **Step 2: Run it, see it fail, then implement**

`model.ts` : remplacer `engines`/`delivery` cochables par `producible` (moteurs) et garder les
destinations de publication telles quelles — elles restent un choix. `client.ts` : plus de
`capabilityRow` pour les moteurs, plus de groupes ; les comptes gardent leur bloc, et le
récapitulatif se rend en dernier. Supprimer `group-by-want.ts` et son test — le regroupement n'a
plus d'objet. `serialize.ts` : `enabled` sort de `PreflightSubmission`, et l'état enregistré cesse
de porter des capacités cochées (vérifier `lib/newsroom/state.ts` pour ce que ça implique du décor
déjà écrit ; une migration muette vaut mieux qu'un crash sur un `newsroom.json` existant).

- [ ] **Step 3: Verify by mutation**

Reconditionner `producible` à l'état coché, relancer le test de l'étape 1 : il DOIT rougir.
Rétablir.

- [ ] **Step 4: Run the suites**

Run: `bun test lib/newsroom install && bun x tsc --noEmit -p install/tsconfig.json`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add install/preflight/ lib/newsroom/
git commit -m "feat(setup-page): what the newsroom can produce is derived, not ticked"
```

---

### Task 6: Ce que la page SERT, et la porte

**Files:**
- Modify: `install/preflight/server.test.ts`
- Modify: `docs/installer/setup-page-proof.md` (section datée)
- Modify: `docs/splash/CHANGELOG.md`, `CLAUDE.md` (français)

**Interfaces:** consomme tout ce qui précède.

- [ ] **Step 1: Write the failing test**

Le harnais existe (il monte le vrai serveur, écrit un `NEWSROOM-PROFILE.md` dans un ROOT
temporaire, récupère la page en HTTP et lit le modèle du tag `preflight-model`). Ajouter :

```ts
it("serves one screen: no ticks, a recap, and an editable profile", async () => {
  // …même montage que le test voisin, avec un profil écrit dans le ROOT…
  const model = servedModel(await fetchPage());
  expect(model.producible.length).toBeGreaterThan(0);
  expect(model).not.toHaveProperty("engines");
  expect(model.profile?.palette?.[0]).toBeTruthy();
});
```

Et le garde qui prouve que la section est redevenue **éditable** — l'inverse exact de ce que le
chantier précédent assertait : une soumission portant `newsroom` sur un profil EXISTANT doit
réécrire le fichier et **préserver son corps**. C'est le seul test qui parcourt la chaîne complète
page → serialize → disque.

- [ ] **Step 2: Run it, make it pass**

Run: `bun test install/preflight/server.test.ts`

- [ ] **Step 3: The gate**

Run: `bun run check` — **en premier plan**, jamais en arrière-plan (trois agents de ce projet y ont
perdu des heures : un sous-agent ne reçoit pas la notification de fin).
Expected: **20/23**, les trois rouges connus et aucun de plus. Diagnostiquer tout nouveau rouge
plutôt que de l'hériter ; ne jamais affaiblir un test pour l'atteindre.

- [ ] **Step 4: Record it**

Section datée dans `docs/installer/setup-page-proof.md` (fichier **anglais**) : ce que la page sert
désormais, avec les sorties de test à l'appui. Nommer ce qui n'est PAS prouvé : la route `/charter`
n'est pas exercée par la suite (elle sort sur le réseau) et n'a été essayée qu'à la main ; la Couche
B des deux apps de bureau reste non observée ; le chemin Windows reste vérifié à la lecture ; et la
clé MapTiler morte empêche tout rendu de carte.

Puis une entrée datée dans `docs/splash/CHANGELOG.md` et deux ou trois lignes dans « État courant »
de `CLAUDE.md` — ces deux fichiers sont en **français**.

- [ ] **Step 5: Commit**

```bash
git add install/preflight/server.test.ts docs/ CLAUDE.md
git commit -m "test(setup-page): the served page is one screen, and the record says what it is not"
```

---

## Auto-revue du plan

**Couverture du spec :** §1.1/§3.1 → Tasks 1, 2, 3 · §1.2/§3.2 → Task 4 · §1.3/§3.4 → Task 5 ·
§2 (les deux renversements) → Task 2 (l'écriture) et Task 5 (les cases) · §5 → les mutations des
Tasks 2 et 5, et la Task 6 pour la page servie et la porte.

**Un point d'attention :** la Task 5 touche `lib/newsroom/state.ts` par ricochet — un
`newsroom.json` déjà écrit porte des capacités cochées. Le plan demande une migration muette plutôt
qu'un crash ; si l'implémenteur trouve que ça déborde, il doit s'arrêter et le dire plutôt que
d'inventer une migration.

**Types :** `CharterReadout` (Task 1) est consommé par `client.ts` (Task 3) sous ce seul nom ·
`updateProfileMarkdown` (Task 2) par `server.ts` · `producible` (Task 5) par `client.ts` et la
Task 6 · aucun nom n'entre en collision avec `want`, `choice`, `upfront` ou `login` des chantiers
précédents, qui restent au registre.
