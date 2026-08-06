# La charte lit vraiment le site d'une rédaction — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** coller l'adresse de sa rédaction remplit vraiment le profil — la feuille de style servie par son CDN est lue, une couleur de marque est trouvée dans un CSS compilé, la typographie n'est plus tronquée, et un site qui construit ses styles en JavaScript a un second essai explicite.

**Architecture:** quatre leviers indépendants sur la même chaîne. (1) La **collecte** cesse de jeter la CSS d'une rédaction parce qu'elle vient de son CDN, et sa note d'échec cesse d'accuser le JavaScript à tort. (2) Un **signal de plus** cherche la couleur là où un CSS compilé la met, classé sous tous les signaux déclarés. (3) Un **bug d'analyse** de nom de famille. (4) Un **second collecteur**, par navigateur, offert et jamais imposé.

**Tech Stack:** Bun, TypeScript, `bun:test`, Playwright (déjà une dépendance : les preuves de rendu s'en servent).

**Spec:** `docs/superpowers/specs/2026-08-06-charter-reads-real-sites-design.md`

## Global Constraints

- Runtime **Bun** exclusivement — jamais `npm`, jamais `node`.
- Code, commentaires, identifiants, messages de commit : **anglais**. La copie de la page a ses deux tables EN/FR ; `PageCopy` force la parité à la compilation.
- **Aucune mention** d'un vendeur d'IA comme auteur dans un commit ou un doc.
- **TDD**, et pour chaque garde neuve une **vérification par mutation**.
- Aucun `any`. `bun run check` reste à **23/23**.
- **Aucun appel réseau dans la suite de tests.** Les sites réels entrent par des **fixtures capturées**, jamais par `fetch`.
- **Une mesure n'est jamais une décision** (invariant de `skills/newsroom-charter`) : rien n'est écrit sans geste humain, la confiance annoncée par l'extracteur n'est jamais élevée, et chaque valeur garde le reçu qui dit d'où elle vient.
- **Ne jamais deviner une marque que le site ne porte pas.** Un site qui ne déclare rien reste une réponse légitime.
- **★ Tout ce qui est mesuré doit rester rectifiable, et une déduction doit se voir comme telle** (Rémy, 2026-08-06). Ce chantier ajoute des couleurs **devinées** : plus la mesure est large, plus elle peut se tromper, donc plus la correction doit être évidente. Trois choses existent déjà et ne doivent pas régresser — chaque candidat est un bouton qui pose la couleur (`install/preflight/client.ts:366-380`), le champ reste saisissable à la main, et le reçu **disparaît** dès que la valeur ne correspond plus au candidat, de sorte qu'une valeur tapée ne se réclame jamais d'une origine qu'elle n'a pas. Ce que ce chantier doit ajouter : une valeur `inferred` **se présente comme une supposition à l'écran**, pas seulement dans la donnée.
- Worktree `../splash-charter`, branche `feat/charter-reads-real-sites`.

---

### Task 1: Trois vrais sites, capturés

**Files:**
- Create: `lib/newsroom/fixtures/sites/README.md`
- Create: `lib/newsroom/fixtures/sites/heidi-news.html`, `heidi-news.css`
- Create: `lib/newsroom/fixtures/sites/<js-built>.html` (+ `.css` s'il y en a une)
- Create: `lib/newsroom/fixtures/sites/<plain>.html`, `<plain>.css`
- Create: `lib/newsroom/charter-fixtures.test.ts`

**Interfaces:**
- Produit : `loadSiteFixture(name: string): SiteSources` — lit les fichiers capturés et rend la forme que `proposeCharter` attend, sans réseau.

**Pourquoi d'abord :** tout le reste se juge sur ce que la mesure tire d'un vrai site. Sans matière réelle, chaque tâche se prouverait sur une chaîne inventée qui donne raison à son auteur.

- [ ] **Step 1: Capture, by hand, once**

```bash
cd ../splash-charter
mkdir -p lib/newsroom/fixtures/sites
bun -e '
const save = async (name, url) => {
  const html = await (await fetch(url)).text();
  await Bun.write(`lib/newsroom/fixtures/sites/${name}.html`, html);
  const href = /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/i.exec(html)?.[1];
  if (href) await Bun.write(`lib/newsroom/fixtures/sites/${name}.css`, await (await fetch(new URL(href, url))).text());
  console.log(name, html.length, href ?? "no sheet");
};
await save("heidi-news", "https://www.heidi.news");
'
```

Puis deux autres, choisis pour ce qu'ils prouvent : **un site qui construit ses styles en JavaScript** (aucune feuille liée, ou une feuille vide de marque) et **un site simple** qui déclare franchement sa couleur. Les nommer d'après leur domaine.

`README.md` dans le dossier : la date de capture, l'URL exacte, la commande, et **pourquoi chacun est là**. Une fixture périmée reste une mesure datée ; une fixture sans provenance est un mensonge en devenir.

- [ ] **Step 2: Write the loader and the test that reads the ground truth**

```ts
// lib/newsroom/charter-fixtures.test.ts
import { expect, test } from "bun:test";
import { proposeCharter } from "./charter.ts";
import { loadSiteFixture } from "./fixtures/sites/load.ts";

// The measurement, on the site this whole feature was built for. This test does not assert what
// we WISH the extractor found — it pins what it finds today, so every later task can show what it
// changed. Update the numbers when a task improves them; never soften them to pass.
test("heidi.news, as captured", () => {
  const p = proposeCharter(loadSiteFixture("heidi-news"));
  expect(p.candidates.map((c) => c.value)).toContain("#d5121e");
  expect(p.typography.length).toBeGreaterThan(0);
});
```

- [ ] **Step 3: Run it**

Run: `cd ../splash-charter && bun test lib/newsroom/charter-fixtures.test.ts`
Expected: la typographie échoue tant que la Task 2 n'a pas levé le filtre — c'est normal et c'est le but. **Marquer ce test `.todo` ou l'assertion typo en attente, avec un commentaire disant quelle tâche la lèvera**, plutôt que de le supprimer.

- [ ] **Step 4: Commit**

```bash
git add lib/newsroom/fixtures/sites lib/newsroom/charter-fixtures.test.ts
git commit -m "test(charter): three real newsroom sites, captured with their provenance"
```

---

### Task 2: Une feuille que le site lie est la feuille du site

**Files:**
- Modify: `lib/newsroom/charter-fetch.ts` (`stylesheetHrefs`, et la note d'échec)
- Modify: `lib/newsroom/charter-fetch.test.ts`
- Modify: `lib/newsroom/charter-fixtures.test.ts` (l'assertion typo mise en attente en Task 1)

**Interfaces:**
- Consomme : rien de neuf.
- Produit : `stylesheetHrefs` rend aussi les feuilles d'un autre hôte.

**Le défaut, mesuré (spec §1.1)** : `heidi.news` sert sa CSS depuis `heidi-17455.kxcdn.com`. Le filtre `abs.hostname !== base.hostname` la jette — et la note affichée accuse le JavaScript, ce qui envoie la correction dans la mauvaise direction.

- [ ] **Step 1: Write the failing test**

```ts
// lib/newsroom/charter-fetch.test.ts — ADD
// A newsroom serves its assets from a CDN; that is the normal shape, not a third party. A
// <link rel="stylesheet"> in the newsroom's OWN document is the design system it chose to serve,
// whatever hostname carries the bytes. Measured 2026-08-06: heidi.news links
// heidi-17455.kxcdn.com, and the same-host rule dropped its entire stylesheet.
test("keeps a stylesheet the document links from another host", () => {
  const html = '<link rel="stylesheet" href="https://cdn.example.net/app.css">';
  expect(stylesheetHrefs(html, "https://www.example.news/")).toEqual([
    "https://cdn.example.net/app.css",
  ]);
});

// The note must say what happened, not guess why. Blaming JavaScript for a stylesheet that was
// never fetched sent a real investigation down the wrong path.
test("says no sheet was linked, without blaming JavaScript", () => {
  expect(stylesheetHrefs("<p>no link here</p>", "https://x.news/")).toEqual([]);
});
```

- [ ] **Step 2: Run it, see it fail, then lift the filter**

Retirer le test d'hôte de `stylesheetHrefs` et **réécrire son commentaire** : ce qui protège d'une marque tierce n'est pas l'hôte, c'est le **reçu** — chaque valeur dit d'où elle vient, et une feuille de polices tierce porte précisément la typographie qu'on cherche.

Puis, dans `collectSiteSources`, distinguer les trois cas dans les `notes` : aucune balise trouvée · une feuille liée qui n'a pas répondu · des feuilles lues. La phrase actuelle (« the page may build its styles in JavaScript ») ne doit subsister que pour le premier cas, et dire qu'elle est une hypothèse.

- [ ] **Step 3: Lift the pending assertion from Task 1**

L'assertion typographique de `charter-fixtures.test.ts` passe maintenant : la fixture Heidi doit rendre « Sang Bleu Kingdom ». Retirer le `.todo`.

- [ ] **Step 4: Verify by mutation**

Remettre `if (abs.hostname !== base.hostname) continue;`, relancer `bun test lib/newsroom` : le test de l'étape 1 ET l'assertion typo de la fixture DOIVENT rougir. Rétablir.

- [ ] **Step 6: Commit**

```bash
git add lib/newsroom/charter-fetch.ts lib/newsroom/charter-fetch.test.ts lib/newsroom/charter-fixtures.test.ts
git commit -m "fix(charter): a stylesheet the newsroom links is the newsroom's, whatever host serves it"
```

---

### Task 3: `Roboto)` — la parenthèse qui cachait un générique

**Files:**
- Modify: `lib/newsroom/charter.ts` (`firstFamily`, ~ligne 684)
- Modify: `lib/newsroom/charter.test.ts`

**Le défaut, mesuré** : sur la fixture Heidi, la typographie sort `Roboto)`. `firstFamily` découpe `var(--font-x, Roboto)` sur la virgule ; la première part commence par `var(` et est sautée, la seconde est `Roboto)` — dont la parenthèse finale empêche `GENERIC_FAMILY` de reconnaître « roboto ». Le générique passe donc pour la fonte maison, **déguisé par un caractère**.

- [ ] **Step 1: Write the failing test**

```ts
// lib/newsroom/charter.test.ts — ADD
// Measured on heidi.news 2026-08-06: the reported typeface was "Roboto)" — a generic wearing a
// closing parenthesis. The fallback inside a var() is still a fallback: once the paren is gone,
// GENERIC_FAMILY recognises it and it is correctly reported as no named family at all.
test("a var() fallback does not smuggle a generic past the filter", () => {
  expect(firstFamily("var(--font-x, Roboto)")).toBeNull();
  expect(firstFamily("var(--font-x, 'Sang Bleu Kingdom')")).toBe(
    "Sang Bleu Kingdom",
  );
});
```

- [ ] **Step 2: Run it, see it fail, then fix**

Retirer les parenthèses fermantes orphelines d'une part **avant** le test générique. Ne pas se contenter de `trim()` : c'est la parenthèse, pas l'espace, qui déguise le nom.

- [ ] **Step 3: Run the fixtures**

Run: `bun test lib/newsroom`
Expected: la fixture Heidi ne rapporte plus `Roboto)`. Si son assertion typographique le citait, la corriger vers ce qui est désormais vrai.

- [ ] **Step 4: Commit**

```bash
git add lib/newsroom/charter.ts lib/newsroom/charter.test.ts lib/newsroom/charter-fixtures.test.ts
git commit -m "fix(charter): a closing parenthesis no longer disguises a generic as a house typeface"
```

---

### Task 4: Une couleur de marque dans un CSS compilé

**Files:**
- Modify: `lib/newsroom/charter.ts` (`ColourSignal`, `WEIGHT`, `SIGNAL_LABEL`, le scanner)
- Modify: `lib/newsroom/charter.test.ts`, `lib/newsroom/charter-fixtures.test.ts`
- Modify: `install/preflight/copy.ts` (le libellé du nouveau signal, deux tables)

**Interfaces:**
- Consomme : `WEIGHT` (`charter.ts:449`), `MIN_CANDIDATE_SCORE = 55` (`:59`), `isNeutral` (`:309`).
- Produit : un `ColourSignal` de plus.

**Le défaut, mesuré (spec §1.2)** : 557 632 octets de CSS Heidi ne rendent **aucun** candidat. Les signaux existants cherchent des propriétés nommées (`--brand`, `--accent`), un bandeau, des liens. Un CSS compilé n'expose pas sa marque sous ces formes.

**La contrainte qui décide du poids** : `MIN_CANDIDATE_SCORE = 55`, et `control: 55` est déjà le plancher. Le nouveau signal doit être **proposable** (≥ 55) et **sous tout signal déclaré** — donc entre `control` (55) et `accent-property` (70). Il ne licencie **jamais** `declared` : `DECLARED_SIGNALS` ne le contient pas, la confiance reste `inferred`, et le reçu le dit.

- [ ] **Step 1: Write the failing test**

```ts
// lib/newsroom/charter.test.ts — ADD
// A compiled stylesheet does not name its brand in a custom property — it repeats the colour on
// the roles that carry a brand: button fills, banner backgrounds, accented borders. Repetition on
// those roles is evidence; repetition anywhere is not, which is why a neutral never qualifies.
test("finds a brand colour repeated on brand-carrying roles", () => {
  const css = Array.from({ length: 12 }, (_, i) =>
    `.btn-${i}{background:#d5121e}`,
  ).join("");
  const p = proposeCharter({ url: "https://x.news", html: "", sheets: [{ href: "a.css", css }] });
  expect(p.candidates[0]!.value).toBe("#d5121e");
  expect(p.confidence).not.toBe("declared");
});

// Never the least-grey pixel: a repeated neutral is a layout colour, not a brand.
test("a repeated neutral is not a brand colour", () => {
  const css = Array.from({ length: 20 }, (_, i) => `.x-${i}{background:#f4f4f4}`).join("");
  const p = proposeCharter({ url: "https://x.news", html: "", sheets: [{ href: "a.css", css }] });
  expect(p.candidates).toEqual([]);
});
```

- [ ] **Step 2: Run it, see it fail, then add the signal**

Ajouter le signal (nom au choix de l'implémenteur, `recurrent-role` par exemple) à `ColourSignal`, `WEIGHT` (entre 55 et 70, valeur justifiée en commentaire), `SIGNAL_LABEL` — et sa traduction dans les **deux** tables de `install/preflight/copy.ts`, puisque le chantier précédent a fait passer les reçus par `PageCopy`.

Le scanner : compter les occurrences d'une couleur non neutre sur un ensemble **fermé** de propriétés porteuses de marque, au-dessus d'un plancher de fréquence. Le plancher et la liste des rôles sont des **nombres et une liste explicites**, commentés, pas des seuils devinés.

- [ ] **Step 3: Measure the fixture, and record what changed**

Run: `bun test lib/newsroom/charter-fixtures.test.ts`
Le test Heidi doit maintenant rendre **au moins un candidat autre que `#d5121e` (theme-color)**, classé `inferred`. Mettre à jour l'assertion de la Task 1 pour épingler ce qui est désormais trouvé — et écrire dans le rapport ce que la couleur trouvée vaut : si elle n'est pas la bonne, **le dire**, c'est une mesure, pas un succès à décrocher.

- [ ] **Step 4: A guess must look like a guess, and stay correctable**

La contrainte globale ★ s'applique ici, parce que c'est cette tâche qui produit des valeurs devinées. Sur la page :

- une valeur dont la confiance est `inferred` porte, **à l'écran**, une mention qui le dit — pas seulement un champ `confidence` dans la donnée ;
- les trois acquis ne régressent pas : le candidat reste un bouton qui pose la couleur, le champ reste saisissable, et le reçu disparaît quand la valeur ne correspond plus.

Le test : un modèle servi dont le candidat de tête est `inferred` doit rendre cette mention ; le même avec `declared` ne la rend pas. Ajouter la clé dans les **deux** tables de `install/preflight/copy.ts`.

- [ ] **Step 5: Verify by mutation**

Ramener le poids du nouveau signal sous `MIN_CANDIDATE_SCORE` : le candidat disparaît, le test rougit. Rétablir. Puis retirer la mention `inferred` : le test de l'étape 4 doit rougir aussi.

- [ ] **Step 6: Commit**

```bash
git add lib/newsroom/charter.ts lib/newsroom/charter.test.ts lib/newsroom/charter-fixtures.test.ts install/preflight/copy.ts
git commit -m "feat(charter): a colour repeated on brand-carrying roles is a candidate, ranked below every declaration"
```

---

### Task 5: Le second essai, par navigateur

**Files:**
- Create: `lib/newsroom/charter-render.ts`
- Create: `lib/newsroom/charter-render.test.ts`
- Modify: `install/preflight/server.ts` (la route `/charter` accepte un mode)
- Modify: `install/preflight/client.ts`, `install/preflight/copy.ts` (l'offre, deux tables)

**Interfaces:**
- Produit : `renderSiteSources(url: string, opts?): Promise<SiteSources | { error: string }>` — même contrat de retour que `collectSiteSources`, pour que `proposeCharter` ne sache pas lequel l'a nourri.

**Pourquoi (spec §3.3)** : pour `heidi.news`, la CSS est un fichier et la Task 2 suffit. Pour un site qui **injecte** ses styles à l'exécution, aucune récupération statique ne verra rien. Playwright est déjà installé (les preuves de rendu s'en servent).

- [ ] **Step 1: Write the contract test — no browser**

```ts
// lib/newsroom/charter-render.test.ts
// The renderer is judged on its CONTRACT here: same shape as the static collector, and total —
// a browser that will not start is an answer, never an exception, because the setup page must
// always render. The browser path itself is proven by hand (Task 6): launching one in the gate
// would put a 93 MB download between a contributor and a green suite.
test("a browser that cannot start is an error value, not a throw", async () => {
  const out = await renderSiteSources("https://x.news", {
    launch: async () => {
      throw new Error("no browser here");
    },
  });
  expect("error" in out).toBe(true);
});
```

- [ ] **Step 2: Implement**

Ouvrir la page avec le navigateur déjà installé, attendre que le réseau se calme, puis lire **les feuilles effectivement appliquées** (`document.styleSheets`, texte des règles quand l'origine le permet) et, à défaut, les **styles calculés** des éléments porteurs de marque. Rendre la même forme que le collecteur statique, avec des `notes` qui disent que la lecture vient d'un rendu.

La fonction de lancement est **injectable** (`opts.launch`) — c'est ce qui rend le contrat testable sans navigateur.

- [ ] **Step 3: Offer it on the page, never impose it**

La route `/charter` accepte un mode (`static` par défaut, `rendered` sur demande). La page propose le second essai **seulement** quand le premier n'a rien trouvé, avec une phrase qui dit ce qu'il fait et qu'il prend du temps — dans les deux tables. Jamais automatique, jamais silencieux.

- [ ] **Step 4: Run the suites**

Run: `bun test lib/newsroom install && bun x tsc --noEmit -p install/tsconfig.json`
Expected: PASS, et **aucun navigateur lancé** par la suite.

- [ ] **Step 6: Commit**

```bash
git add lib/newsroom/charter-render.ts lib/newsroom/charter-render.test.ts install/preflight/
git commit -m "feat(charter): a second attempt that renders the page, offered only when the static read finds nothing"
```

---

### Task 6: La preuve, et la porte

**Files:**
- Create: `docs/installer/charter-measurement.md`
- Modify: `docs/splash/CHANGELOG.md`, `CLAUDE.md` (français)

- [ ] **Step 1: Measure the three fixtures, before and after**

Un tableau : par site, ce que la mesure rendait sur `main` et ce qu'elle rend maintenant — couleurs (avec leur signal et leur confiance), typographie, fond. **Y compris ce qui n'a pas bougé.**

- [ ] **Step 2: Run the rendered mode by hand, once**

Sur le site JS de la fixture, en vrai. Consigner : la commande, le temps que ça prend, ce que ça trouve de plus que le mode statique, et ce que ça ne trouve toujours pas.

- [ ] **Step 3: The gate**

Run: `bun run check` — **en premier plan**, jamais en arrière-plan (six agents de ce projet y ont perdu des heures : un sous-agent ne reçoit pas la notification de fin).
Expected: **23/23**. Diagnostiquer tout rouge plutôt que de l'hériter.

- [ ] **Step 4: Write it down**

`docs/installer/charter-measurement.md` (anglais) : les tableaux, la provenance des fixtures, le mode rendu à la main. Nommer ce qui n'est PAS prouvé : les fixtures datent d'un jour donné ; le mode rendu n'est pas dans la porte ; et **si la couleur trouvée sur Heidi n'est pas sa vraie couleur de marque, le dire**.

Puis une entrée datée dans `docs/splash/CHANGELOG.md` et deux ou trois lignes dans « État courant » de `CLAUDE.md` — ces deux fichiers sont en **français**.

- [ ] **Step 6: Commit**

```bash
git add docs/ CLAUDE.md
git commit -m "docs(charter): what three real newsroom sites now yield, and what they still do not"
```

---

## Auto-revue du plan

**Couverture du spec :** §1.1/§2 D1/§3.1 → Task 2 · §1.2/§2 D2/§3.2 → Task 4 · §1.3/§3.4 → Task 3 · §1.4/§2 D3/§3.3 → Task 5 · §4 → Task 1 (les fixtures) et Task 6 (la trace) · §2 D4 (le reçu, la confiance) → contrainte globale, tenue par la Task 4 qui interdit `declared` au nouveau signal.

**Le risque que ce plan ne ferme pas :** la Task 4 peut trouver **une** couleur récurrente qui n'est pas la marque. C'est pourquoi son étape 3 demande de le **dire** plutôt que d'ajuster le seuil jusqu'à ce que ça tombe juste — un seuil réglé sur une seule fixture est une heuristique qui ment sur le site suivant.

**Types :** `loadSiteFixture` (Task 1) est consommé par les tests des Tasks 2, 3, 4 · `renderSiteSources` (Task 5) rend la même forme que `collectSiteSources`, de sorte que `proposeCharter` ignore lequel l'a nourri · le nouveau `ColourSignal` (Task 4) traverse `WEIGHT`, `SIGNAL_LABEL` et les deux tables de `PageCopy`.
