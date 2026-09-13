# L'interligne suit la police et la taille dessinées — plan d'implémentation

> **Pour les exécutants agentiques :** SOUS-SKILL REQUIS — `superpowers:subagent-driven-development`
> (recommandé) ou `superpowers:executing-plans`, tâche par tâche. Les étapes utilisent des cases
> `- [ ]` pour le suivi.

**But :** l'interligne et les écarts entre blocs de texte se calculent à partir de la hauteur
naturelle de la face réellement dessinée et de sa taille dessinée, avec un coefficient déposé par
direction — et les 40 beats statiques dirigés cessent de taper des coefficients littéraux.

**Architecture :** `shared/design-base/vertical-metrics.mjs` lit la hauteur naturelle dans le
`.ttf`. La table des registres d'une direction gagne une colonne `leading`. `registerOf` (résolution
par capitale, aujourd'hui dans le choroplèthe) remonte dans `shared/design-base/register.mjs` et
expose `leadOf(r)` / `gapOf(r, n)`. Les composants passent par là ; une garde à cliquet compte ce qui
reste à migrer et un outil compare la géométrie des SVG avant/après.

**Tech :** Bun, TypeScript/JS ESM, `bun:test`, `@resvg/resvg-js` (via `render-still.mjs`).

**Spec :** `docs/splash/2026-09-13-adaptive-leading-spec.md`

## Contraintes globales

- Runtime **Bun**, jamais npm ni node. Code, commentaires, noms, messages d'erreur et de commit en
  **anglais**.
- **Aucune attribution à un assistant IA ni à un éditeur**, nulle part (commits, code, commentaires).
- `git add <chemins>` puis `git commit <mêmes chemins>` — **pathspec explicite, jamais `-A`, jamais
  nu** : l'arbre est partagé.
- Un module du tronc modifié ou ajouté est **porté à l'octet** partout où `carried-copies.test.ts`
  l'attend ; ligne 1 = `// twin/<chemin canonique>`.
- Les directions déposées existent en **trois exemplaires identiques** :
  `docs/design-base/directions/` (canonique), `shared/design-base/directions/`,
  `skills/splash/assets/root-template/shared/design-base/directions/`.
- resvg tourne en `loadSystemFonts: false` ; ne pas affaiblir la garde qui le tient.
- **Refuser plutôt que retomber en silence sur une valeur par défaut** (spec §5.1).
- Hauteur naturelle : `OS/2` typo si `fsSelection` bit 7 (`USE_TYPO_METRICS`), `hhea` sinon ;
  jamais `win` (spec §2.1).
- `leading` dans `[0.7, 2.0]`, déposé au dix-millième (spec §4, §5.1).
- Tolérance de la preuve géométrique : **0,25 px** dans l'espace 960 × 540 (spec §5.3).
- Hors périmètre : genres web, vidéo, scrolly ; `skills/chart-web`, `skills/map-web`,
  `skills/scrolly` ne reçoivent que la copie portée de `registers.mjs` (spec §7).

---

## Fichiers

| fichier | rôle |
| --- | --- |
| `shared/design-base/vertical-metrics.mjs` (nouveau) | hauteur naturelle d'une face, lue dans son `.ttf` |
| `shared/design-base/register.mjs` (nouveau) | `capRatioOf`, `registerOf`, `leadOf`, `gapOf`, `EYEBROW_TO_DISPLAY`, `READING_TO_SOURCE` |
| `shared/design-base/read-direction.mjs` | lit la 9e colonne `leading` et `leadingSource` |
| `shared/chart-beat/registers.mjs` | `resolveRegister` renvoie `leading` |
| `docs/design-base/directions/{creme,rapport,nocturne}.md` (+ 2 copies) | colonne `leading`, `leadingSource: chosen`, section « Leading » |
| `scripts/design-base/renders-moved.mjs` (nouveau) | compare la géométrie des SVG d'un beat à `HEAD` |
| `skills/splash/test/a-line-height-is-read-off-the-face.test.ts` (nouveau) | tâche 1 |
| `skills/splash/test/a-direction-files-its-leading.test.ts` (nouveau) | tâche 2 |
| `skills/splash/test/a-register-leads-by-its-face.test.ts` (nouveau) | tâche 3 |
| `skills/splash/test/a-directed-layout-types-no-leading.test.ts` (nouveau) | tâche 4, cliquet |
| `skills/map-beat/test/a-register-is-sized-to-its-cap-height.test.ts` | importe depuis le tronc |
| `skills/splash/test/a-direction-says-which-colours-it-measured.test.ts` | fixture à 9 colonnes |
| 40 × `proof/<beat>/Directed*.tsx` | migration, tâches 5 à 8 |

---

### Tâche 0 : point de départ propre et coordination

**Files:** aucun code. Commit des re-rendus déjà produits sur la branche.

- [ ] **Étape 1 : obtenir l'accord de Rémy pour commiter le corpus re-rendu.** Les rendus des
  40 beats et le correctif du bump (`DirectedBump.tsx`, `labels-sit-on-their-rank.test.ts`) sont dans
  l'arbre, non commités. La preuve géométrique des tâches 5 à 8 compare à `HEAD` : sans ce commit,
  elle comparerait aux rendus en polices système. **Ne pas continuer sans son oui.**

- [ ] **Étape 2 : commiter, pathspec explicite.**

```bash
cd /Users/rmdms/Sites/Professional/splash/rerender
PATHS=$(ls -d proof/*/renders | while read d; do [ -f "${d%/renders}/render-directions.mjs" ] && echo "$d"; done)
git add $(echo $PATHS) proof/static-bump-emitter-rank/DirectedBump.tsx proof/static-bump-emitter-rank/labels-sit-on-their-rank.test.ts
git commit $(echo $PATHS) proof/static-bump-emitter-rank/DirectedBump.tsx proof/static-bump-emitter-rank/labels-sit-on-their-rank.test.ts \
  -m "chore(proof): the static corpus re-rendered in the Google faces, and the bump's rank labels kept on their rank"
git status --short proof | grep -v '^??' | head
```

Expected : `git status` ne liste plus aucun `renders/` modifié des 40 beats.

- [ ] **Étape 3 : prévenir l'autre session.** `ListAgents`, puis `SendMessage` à la session qui
  travaille sur `maps/sp1-plan-contract` (worktree `sp1`) :

```
Heads-up from rerender/static-corpus: I'm about to touch the shared trunk for adaptive leading
(spec docs/splash/2026-09-13-adaptive-leading-spec.md). Changes: NEW shared/design-base/vertical-metrics.mjs
and shared/design-base/register.mjs; MODIFIED shared/design-base/read-direction.mjs (9th register column
`leading`, required) and shared/chart-beat/registers.mjs (resolveRegister also returns `leading`);
the three direction records gain the column. Carried copies of registers.mjs under skills/chart-web,
skills/map-web, skills/scrolly get the byte-identical update. No web/video/scrolly component is migrated.
```

---

### Tâche 1 : la hauteur naturelle d'une face

**Files:**
- Create: `shared/design-base/vertical-metrics.mjs`
- Create: `skills/splash/assets/root-template/shared/design-base/vertical-metrics.mjs` (copie)
- Test: `skills/splash/test/a-line-height-is-read-off-the-face.test.ts`

**Interfaces:**
- Consumes: `typefaceFile(family, weight, { italic })` de `shared/design-base/typefaces.mjs` → chemin absolu d'un `.ttf`.
- Produces: `naturalLineHeightOf(family: string, weight?: number, options?: { italic?: boolean }): number` (em).

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
/**
 * A FACE DECLARES THE LINE IT SETS ON, AND THE RENDER READS IT OUT OF THE FILE IT DRAWS WITH.
 *
 * Three tables can hold that height and they disagree. Browsers read `OS/2` typo metrics when the
 * face sets USE_TYPO_METRICS and `hhea` otherwise, and never `win` — which is what CSS
 * `line-height: normal` produces, so a static and a web beat set on the same line. Measured on the
 * seventeen cached families on 2026-09-13: where the bit is set, typo equals hhea; where it is not,
 * they part — Roboto 1.050 against 1.172 — and that face is the guard.
 */
import { describe, it, expect } from "bun:test";
import { naturalLineHeightOf } from "#shared/design-base/vertical-metrics.mjs";

describe("a face's natural line height", () => {
  it("should read the typo metrics of a face that sets USE_TYPO_METRICS", () => {
    expect(naturalLineHeightOf("Merriweather", 400)).toBeCloseTo(1.257, 3);
  });

  it("should read hhea rather than typo on a face that does not set USE_TYPO_METRICS", () => {
    expect(naturalLineHeightOf("Roboto", 400)).toBeCloseTo(1.172, 3);
  });

  it("should read the italic file when the register is italic", () => {
    expect(naturalLineHeightOf("Merriweather", 400, { italic: true })).toBeCloseTo(1.257, 3);
  });

  it("should refuse a family it has no file for", () => {
    expect(() => naturalLineHeightOf("No Such Family Anywhere", 400)).toThrow();
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec**

Run: `bun test skills/splash/test/a-line-height-is-read-off-the-face.test.ts`
Expected : FAIL — `Cannot find module '#shared/design-base/vertical-metrics.mjs'`.

- [ ] **Étape 3 : implémenter**

```js
// twin/shared/design-base/vertical-metrics.mjs
//
// THE LINE A FACE DECLARES FOR ITSELF, READ OUT OF THE FILE THE RENDER DRAWS WITH.
//
// A leading typed as `fontSize * 1.22` is the same number on every face, and faces do not share a
// line: across the design base's ladders the declared height runs from 1.149 em (Ubuntu) to
// 1.424 em (Source Sans 3). A direction files a coefficient ON this height instead, so the line
// follows the face the ladder actually picked.
//
// THE RULE IS THE BROWSERS'. `OS/2` typo metrics when `fsSelection` bit 7 (USE_TYPO_METRICS) is
// set, `hhea` otherwise, never `win`. That is what CSS `line-height: normal` resolves to, so a web
// beat that adopts this later sets on the same line without a conversion.
//
// See `docs/splash/2026-09-13-adaptive-leading-spec.md` §2.1.

import { readFileSync } from "node:fs";
import { typefaceFile } from "./typefaces.mjs";

const USE_TYPO_METRICS = 1 << 7;
const REQUIRED = ["head", "hhea", "OS/2"];
const held = new Map();

/** The sfnt table directory: tag → offset. */
function tablesOf(bytes, where) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(4);
  const offsets = {};
  for (let i = 0; i < count; i++) {
    const record = 12 + i * 16;
    offsets[String.fromCharCode(...bytes.subarray(record, record + 4))] = view.getUint32(record + 8);
  }
  const missing = REQUIRED.filter((tag) => offsets[tag] === undefined);
  if (missing.length)
    throw new Error(
      `${where} has no ${missing.join(", ")} table, so it declares no line height this render can ` +
        `read — a leading computed without one would be a guess`,
    );
  return { view, offsets };
}

/**
 * The height of one line of this face, in em, as the face itself declares it.
 *
 * @param {string} family  a Google family, e.g. `Merriweather`
 * @param {number} weight  100..1000
 * @param {{italic?: boolean}} options
 * @returns {number}
 */
export function naturalLineHeightOf(family, weight = 400, { italic = false } = {}) {
  const key = `${family}|${weight}|${italic ? "italic" : "normal"}`;
  const hit = held.get(key);
  if (hit !== undefined) return hit;

  const where = `${family} ${weight}${italic ? " italic" : ""}`;
  const { view, offsets } = tablesOf(readFileSync(typefaceFile(family, weight, { italic })), where);
  const unitsPerEm = view.getUint16(offsets.head + 18);
  const os2 = offsets["OS/2"];
  const hhea = offsets.hhea;
  const typo = (view.getUint16(os2 + 62) & USE_TYPO_METRICS) !== 0;
  const units = typo
    ? view.getInt16(os2 + 68) - view.getInt16(os2 + 70) + view.getInt16(os2 + 72)
    : view.getInt16(hhea + 4) - view.getInt16(hhea + 6) + view.getInt16(hhea + 8);
  if (!(unitsPerEm > 0) || !(units > 0))
    throw new Error(
      `${where} declares a line of ${units} units on an em of ${unitsPerEm}, which is not a line ` +
        `height — the ${typo ? "OS/2 typo" : "hhea"} metrics of this file are empty or corrupt`,
    );

  const ratio = units / unitsPerEm;
  held.set(key, ratio);
  return ratio;
}
```

- [ ] **Étape 4 : lancer, vérifier le succès**

Run: `bun test skills/splash/test/a-line-height-is-read-off-the-face.test.ts`
Expected : 4 pass, 0 fail.

- [ ] **Étape 5 : porter la copie, vérifier les copies et les voies**

```bash
cp shared/design-base/vertical-metrics.mjs skills/splash/assets/root-template/shared/design-base/vertical-metrics.mjs
bun test skills/splash/test/carried-copies.test.ts
bun run test:lanes
```

Expected : `carried-copies` vert ; `test:lanes` sort 0 (le nouveau test tombe dans la voie lourde,
parce qu'il importe `typefaces.mjs`).

- [ ] **Étape 6 : commit**

```bash
F="shared/design-base/vertical-metrics.mjs skills/splash/assets/root-template/shared/design-base/vertical-metrics.mjs skills/splash/test/a-line-height-is-read-off-the-face.test.ts"
git add $(echo $F) && git commit $(echo $F) -m "feat(design-base): a face's natural line height is read out of its own file, the browsers' way"
```

---

### Tâche 2 : une direction dépose son interligne

**Files:**
- Modify: `shared/design-base/read-direction.mjs` (lecture des registres, `readDirectionFromMarkdown`)
- Modify: `shared/chart-beat/registers.mjs` (`resolveRegister`, retour)
- Modify: `docs/design-base/directions/creme.md`, `rapport.md`, `nocturne.md`
- Copy: les 3 directions vers `shared/design-base/directions/` et `skills/splash/assets/root-template/shared/design-base/directions/`
- Copy: `read-direction.mjs` vers `skills/splash/assets/root-template/shared/design-base/`
- Copy: `registers.mjs` vers les 8 copies portées (liste à l'étape 7)
- Modify: `skills/splash/test/a-direction-says-which-colours-it-measured.test.ts:159-169` (fixture)
- Test: `skills/splash/test/a-direction-files-its-leading.test.ts`

**Interfaces:**
- Consumes: rien des tâches précédentes pour le parser ; la tâche 1 pour le calibrage (étape 1).
- Produces: `direction.registers[name].leading: number`, `direction.leadingSource: "measured" | "chosen"`, `resolveRegister(...).leading: number | null`.

- [ ] **Étape 1 : calculer le calibrage AVANT de toucher au parser** (le parser actuel lit encore
  les directions)

```bash
cat > .calibrate-leading.ts <<'EOF'
import { LADDERS } from "#shared/design-base/resolve-families.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { naturalLineHeightOf } from "#shared/design-base/vertical-metrics.mjs";
const LEGACY: Record<string, number> = { display: 1.22, eyebrow: 1.2, body: 1.45, axis: 1.2, annot: 1.4, value: 1.2 };
for (const id of ["creme", "rapport", "nocturne"]) {
  const d = readDirection(`docs/design-base/directions/${id}.md`);
  for (const [name, r] of Object.entries<any>(d.registers)) {
    const head = (LADDERS as any)[r.family][0];
    const natural = naturalLineHeightOf(head, r.weight, { italic: r.italic });
    console.log(`${id} ${name} ${head} ${(LEGACY[name] / natural).toFixed(4)}`);
  }
}
EOF
bun .calibrate-leading.ts; rm .calibrate-leading.ts
```

Expected (mesuré le 2026-09-13 ; si un nombre diffère, c'est le fichier qui fait foi) :

| registre | creme | rapport | nocturne |
| --- | ---: | ---: | ---: |
| display | 0.9706 | 0.9706 | 1.0008 |
| eyebrow | 0.8812 | 0.8812 | 0.9844 |
| body | 1.0648 | 1.1535 | 1.0648 |
| axis | 0.8812 | 0.8812 | 0.9844 |
| annot | 1.1138 | 1.0280 | 1.1485 |
| value | 0.8812 | 0.8812 | 0.9844 |

- [ ] **Étape 2 : écrire le test qui échoue**

```ts
/**
 * A DIRECTION FILES THE LINE ITS REGISTERS SET ON, AS A COEFFICIENT OF THE FACE'S OWN LINE.
 *
 * The leading used to be typed into every component as `fontSize * 1.22`, a number no direction
 * owned and no face moved. It is now a column of the register table, and a row without it is
 * refused rather than defaulted: a default would be the typed number again, hidden one level down.
 */
import { describe, it, expect } from "bun:test";
import { filedDirections } from "#shared/design-base/index.mjs";
import { readDirectionFromMarkdown } from "#shared/design-base/read-direction.mjs";
import { resolveRegister } from "#shared/chart-beat/registers.mjs";

const record = ({ row, source = "- leadingSource: chosen" }: { row: string; source?: string }) => `# probe

- name: Probe
${source}

| register | family | size | weight | italic | tracking | case | ink | leading |
| --- | --- | ---: | ---: | --- | ---: | --- | --- | ---: |
${row}
`;
const WITH = "| display | serif | 30 | 700 | no | 0 | none | ink | 0.9706 |";
const WITHOUT = "| display | serif | 30 | 700 | no | 0 | none | ink |";

describe("a direction's leading", () => {
  it("should read the leading a register row files", () => {
    expect(readDirectionFromMarkdown(record({ row: WITH }), "probe").registers.display.leading).toBe(0.9706);
  });

  it("should refuse a register row that files no leading", () => {
    expect(() => readDirectionFromMarkdown(record({ row: WITHOUT }), "probe")).toThrow(/leading/);
  });

  it("should refuse a leading outside 0.7 to 2.0", () => {
    expect(() => readDirectionFromMarkdown(record({ row: WITH.replace("0.9706", "145") }), "probe")).toThrow(/leading/);
  });

  it("should refuse a record that does not say whether its leading was measured or chosen", () => {
    expect(() => readDirectionFromMarkdown(record({ row: WITH, source: "" }), "probe")).toThrow(/leadingSource/);
  });

  it("should give every register of every filed direction a leading", () => {
    for (const direction of filedDirections())
      for (const [name, spec] of Object.entries<any>(direction.registers))
        expect([direction.id, name, typeof spec.leading]).toEqual([direction.id, name, "number"]);
  });

  it("should hand the leading through resolveRegister", () => {
    const direction = readDirectionFromMarkdown(record({ row: WITH }), "probe");
    expect(resolveRegister(direction, "display").leading).toBe(0.9706);
  });

  it("should give a derived apparatus register the leading of the voice it derives from", () => {
    const direction = {
      id: "probe",
      registers: { annot: { family: "Open Sans", size: 10, weight: 700, italic: false, tracking: 0, transform: "none", ink: "ink", leading: 1.028 } },
    };
    expect(resolveRegister(direction, "place", { family: "map" }).leading).toBe(1.028);
  });
});
```

- [ ] **Étape 3 : lancer, vérifier l'échec**

Run: `bun test skills/splash/test/a-direction-files-its-leading.test.ts`
Expected : FAIL — `leading` vaut `undefined` et les refus ne lèvent pas.

- [ ] **Étape 4 : implémenter le parser.** Dans `shared/design-base/read-direction.mjs`, ajouter
  l'import en tête (sous `import { readFileSync } from "node:fs";`) :

```js
import { CORE_REGISTERS, FAMILY_REGISTERS } from "#shared/chart-beat/registers.mjs";

/** Every register name a direction may file, core and apparatus. A table row naming one of these
 *  is a register row, and is held to the full shape; any other table in the record is prose. */
const REGISTER_NAMES = new Set([
  ...CORE_REGISTERS,
  ...Object.values(FAMILY_REGISTERS).flatMap((f) => Object.keys(f)),
]);

/** The line a register sets on, as a multiple of its face's own declared line. Outside this range
 *  the cell is a typo — `145` for `1.45` — and not a design. */
const LEADING_RANGE = Object.freeze([0.7, 2.0]);
const LEADING_SOURCES = Object.freeze(["measured", "chosen"]);
```

  Remplacer la boucle des registres de `readDirectionFromMarkdown` par :

```js
  const registers = {};
  for (const cells of tableRows(text, "register")) {
    const [name, family, size, weight, italic, tracking, transform, ink, leading] = cells;
    if (!REGISTER_NAMES.has(plain(name ?? ""))) continue;
    if (cells.length < 9 || plain(leading ?? "") === "")
      throw new Error(
        `direction ${id} files no leading for its ${name} register — the register table carries a ` +
          `ninth column, the line as a multiple of the face's own declared line height, and a row ` +
          `without it is refused rather than given a typed default`,
      );
    const line = number(leading);
    if (line < LEADING_RANGE[0] || line > LEADING_RANGE[1])
      throw new Error(
        `direction ${id} files a leading of ${leading} for its ${name} register, outside ` +
          `${LEADING_RANGE.join("..")} — a multiple of the face's own line, so 1.45 rather than 145`,
      );
    registers[name] = {
      family: plain(family),
      size: number(size),
      weight: number(weight),
      italic: yes(italic),
      tracking: number(tracking),
      transform: plain(transform),
      ink: plain(ink),
      leading: line,
    };
  }

  const leadingSource = field(text, "leadingSource");
  if (!LEADING_SOURCES.includes(leadingSource))
    throw new Error(
      `direction ${id} does not say where its leading came from — file \`- leadingSource: measured\` ` +
        `or \`- leadingSource: chosen\`. Nothing harvests a reference's line height yet, so a value ` +
        `that is not claimed is not assumed to be measured`,
    );
```

  Et dans l'objet retourné, après `accentSource`, ajouter :

```js
    leadingSource,
```

- [ ] **Étape 5 : `resolveRegister`.** Dans `shared/chart-beat/registers.mjs`, dans l'objet
  retourné par `resolveRegister`, après `ink: spec.ink,` :

```js
    /** The line this register sets on, as a multiple of its face's declared line height — null
     *  only for a direction built in code without one; `registerOf` refuses that case. A derived
     *  apparatus register inherits it from the voice it derives from, as it inherits the face. */
    leading: spec.leading ?? null,
```

  Mettre à jour la JSDoc `@returns` de `resolveRegister` : ajouter `leading: number|null`.

- [ ] **Étape 6 : les trois directions.** Dans chaque `docs/design-base/directions/<id>.md` :

  1. sous `- accentSource: chosen`, ajouter la ligne `- leadingSource: chosen` ;
  2. dans la table des registres, ajouter la colonne `leading` (en-tête `| leading |`, règle
     `| ---: |`) et, sur chaque ligne, la valeur de l'étape 1 ;
  3. sous la table (avant le paragraphe « Style route… » ou l'équivalent), ajouter :

```markdown
**The leading is CHOSEN, and calibrated rather than measured.** Nothing harvests a reference's line
height yet — it would also need the reference's own face metrics. Each value is the multiplier every
directed component used to type (`display 1.22`, `body 1.45`, `annot 1.4`, and `1.2` for the
single-line registers) divided by the natural line height of the head of the register's role
ladder, read out of its file. On the head face the page does not move; on any other face the line
follows the face. See `docs/splash/2026-09-13-adaptive-leading-spec.md` §4.
```

  Puis porter les copies :

```bash
for id in creme rapport nocturne; do
  cp docs/design-base/directions/$id.md shared/design-base/directions/$id.md
  cp docs/design-base/directions/$id.md skills/splash/assets/root-template/shared/design-base/directions/$id.md
done
```

- [ ] **Étape 7 : porter les modules**

```bash
cp shared/design-base/read-direction.mjs skills/splash/assets/root-template/shared/design-base/read-direction.mjs
for d in skills/chart-web/scripts skills/chart-beat/scripts skills/map-web/scripts skills/scrolly/scripts \
         skills/chart-video/scripts skills/map-beat/scripts skills/image-beat/scripts \
         skills/splash/assets/root-template/shared/chart-beat; do
  cp shared/chart-beat/registers.mjs $d/registers.mjs
done
```

- [ ] **Étape 8 : la fixture du test des couleurs.** Dans
  `skills/splash/test/a-direction-says-which-colours-it-measured.test.ts`, la constante `SILENT`
  devient (le test porte sur les couleurs ; il reçoit le minimum que le parser exige désormais) :

```ts
  const SILENT = `# quiet

- name: Quiet
- measuredFrom: some-reference
- ground: #FFFFFF
- accent: #123456
- leadingSource: chosen

| register | family | size | weight | italic | tracking | case | ink | leading |
| --- | --- | ---: | ---: | --- | ---: | --- | --- | ---: |
| display | sans | 24 | 700 | no | 0 | none | ink | 1.0 |
`;
```

- [ ] **Étape 9 : lancer**

```bash
bun test skills/splash/test/a-direction-files-its-leading.test.ts skills/splash/test/a-direction-says-which-colours-it-measured.test.ts skills/splash/test/carried-copies.test.ts skills/splash/test/the-design-base-is-reachable-from-the-skills.test.ts
bun run test
```

Expected : les 4 fichiers verts ; `bun run test` sans nouvel échec par rapport au point de départ
(les 3 échecs web connus et `pixel-palette` restent, rien d'autre).

- [ ] **Étape 10 : commit**

```bash
F="shared/design-base/read-direction.mjs shared/chart-beat/registers.mjs \
docs/design-base/directions shared/design-base/directions skills/splash/assets/root-template/shared/design-base/directions \
skills/splash/assets/root-template/shared/design-base/read-direction.mjs \
skills/chart-web/scripts/registers.mjs skills/chart-beat/scripts/registers.mjs skills/map-web/scripts/registers.mjs \
skills/scrolly/scripts/registers.mjs skills/chart-video/scripts/registers.mjs skills/map-beat/scripts/registers.mjs \
skills/image-beat/scripts/registers.mjs skills/splash/assets/root-template/shared/chart-beat/registers.mjs \
skills/splash/test/a-direction-files-its-leading.test.ts skills/splash/test/a-direction-says-which-colours-it-measured.test.ts"
git add $(echo $F) && git commit $(echo $F) -m "feat(design-base): a direction files its leading as a coefficient of the face's own line"
```

---

### Tâche 3 : `registerOf` remonte dans le tronc, avec `leadOf` et `gapOf`

**Files:**
- Create: `shared/design-base/register.mjs`
- Create: `skills/splash/assets/root-template/shared/design-base/register.mjs` (copie)
- Modify: `proof/static-choropleth-europe-lowcarbon/DirectedChoroplethMap.tsx:115-207` (retire `CAP_PROBE`, `capRatioOf`, `ladderHeadFor`, `registerOf` ; importe du tronc)
- Modify: `skills/map-beat/test/a-register-is-sized-to-its-cap-height.test.ts` (import)
- Test: `skills/splash/test/a-register-leads-by-its-face.test.ts`

**Interfaces:**
- Consumes: `naturalLineHeightOf` (tâche 1) ; `resolveRegister(...).leading` (tâche 2) ; `measureTextBand`, `deriveFurniture` de `#shared/chart-beat/render-still.mjs` ; `LADDERS` de `#shared/design-base/resolve-families.mjs`.
- Produces:
  - `capRatioOf(fontFamily: string, fontWeight: number): number`
  - `registerOf(direction, name): { ...resolveRegister, fontSize, filedSize, referenceFamily, letterSpacing, fill, naturalLineHeight: number, lineHeight: number }`
  - `leadOf(r: { lineHeight: number; fontSize: number }): number`
  - `gapOf(r: { lineHeight: number; fontSize: number }, n: number): number`
  - `EYEBROW_TO_DISPLAY = 0.75`, `READING_TO_SOURCE = 0.4286`

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
// LANE: heavy
/**
 * A REGISTER'S LINE IS ITS FACE'S OWN LINE, TIMES THE DIRECTION'S COEFFICIENT, AT THE SIZE IT IS
 * DRAWN.
 *
 * Calibrated so the head of every role's ladder sets exactly where the typed multipliers used to
 * (spec §4): the page does not move on the faces the corpus draws with, and the line follows any
 * other face the ladder picks.
 */
import { describe, it, expect } from "bun:test";
import { filedDirections, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { LADDERS } from "#shared/design-base/resolve-families.mjs";
import { naturalLineHeightOf } from "#shared/design-base/vertical-metrics.mjs";
import {
  EYEBROW_TO_DISPLAY,
  READING_TO_SOURCE,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

const LEGACY: Record<string, number> = { display: 1.22, eyebrow: 1.2, body: 1.45, axis: 1.2, annot: 1.4, value: 1.2 };
const TEXT = { display: "Titre", eyebrow: "Climat", body: "Texte", axis: "0", annot: "Note", value: "1,2" };

describe("a register's lead", () => {
  for (const filed of filedDirections()) {
    const direction = resolveDirectionFamilies(filed, TEXT);
    for (const name of Object.keys(LEGACY)) {
      it(`should set ${filed.id}'s ${name} where the typed multiplier did, on the head face`, () => {
        const r = registerOf(direction, name);
        // Only a head face reproduces the legacy multiplier; the ladder resolves to it for this text.
        const head = (LADDERS as Record<string, string[]>)[filed.registers[name].family][0];
        expect(r.fontFamily).toBe(head);
        expect(Math.abs(leadOf(r) - r.fontSize * LEGACY[name])).toBeLessThan(0.01);
      });
    }
  }

  it("should be the face's natural line times the leading times the drawn size", () => {
    const direction = resolveDirectionFamilies(filedDirections()[0], TEXT);
    const r = registerOf(direction, "body");
    const natural = naturalLineHeightOf(r.fontFamily, r.fontWeight, { italic: r.fontStyle === "italic" });
    expect(r.naturalLineHeight).toBe(natural);
    expect(leadOf(r)).toBeCloseTo(natural * r.leading * r.fontSize, 9);
  });

  it("should follow a copy drawn at another size", () => {
    const direction = resolveDirectionFamilies(filedDirections()[0], TEXT);
    const display = registerOf(direction, "display");
    const shrunk = { ...display, fontSize: display.fontSize * 0.9 };
    expect(leadOf(shrunk)).toBeCloseTo(leadOf(display) * 0.9, 9);
  });

  it("should express a gap as a multiple of the lead", () => {
    const direction = resolveDirectionFamilies(filedDirections()[0], TEXT);
    const eyebrow = registerOf(direction, "eyebrow");
    const annot = registerOf(direction, "annot");
    expect(gapOf(eyebrow, EYEBROW_TO_DISPLAY)).toBeCloseTo(leadOf(eyebrow) * 0.75, 9);
    // The two trunk gaps reproduce the typed ones on the head face.
    expect(Math.abs(gapOf(eyebrow, EYEBROW_TO_DISPLAY) - eyebrow.fontSize * 0.9)).toBeLessThan(0.01);
    expect(Math.abs(gapOf(annot, READING_TO_SOURCE) - annot.fontSize * 0.6)).toBeLessThan(0.01);
  });

  it("should refuse a register whose direction files no leading", () => {
    const direction = resolveDirectionFamilies(filedDirections()[0], TEXT);
    const stripped = {
      ...direction,
      registers: { ...direction.registers, body: { ...direction.registers.body, leading: undefined } },
    };
    expect(() => registerOf(stripped, "body")).toThrow(/leading/);
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec**

Run: `bun test skills/splash/test/a-register-leads-by-its-face.test.ts`
Expected : FAIL — `Cannot find module '#shared/design-base/register.mjs'`.

- [ ] **Étape 3 : créer `shared/design-base/register.mjs`.** Déplacer depuis
  `DirectedChoroplethMap.tsx` le bloc de commentaire « A FILED SIZE NAMES A CAP HEIGHT… »
  (lignes 115-142), `CAP_PROBE`, `CAP_PROBE_SIZE`, `capRatioOf`, `ladderHeadFor` et `registerOf`,
  en JS, et y ajouter l'interligne :

```js
// twin/shared/design-base/register.mjs
//
// A FILED REGISTER, RESOLVED FOR THE FACE THE RENDER DRAWS WITH: ITS SIZE BY CAP HEIGHT, ITS LINE BY
// THE FACE'S OWN DECLARED LINE.
//
// Lifted out of `proof/static-choropleth-europe-lowcarbon/DirectedChoroplethMap.tsx`, where it was
// written first and where no other beat could inherit it. See
// `docs/splash/2026-09-13-adaptive-leading-spec.md`.
//
// NOT re-exported by `index.mjs`: it measures through resvg, and `index.mjs` is read by fast tests.

import { deriveFurniture, measureTextBand } from "#shared/chart-beat/render-still.mjs";
import { resolveRegister } from "#shared/chart-beat/registers.mjs";
import { LADDERS } from "./resolve-families.mjs";
import { naturalLineHeightOf } from "./vertical-metrics.mjs";

/* …the moved comment block on cap height, verbatim… */
const CAP_PROBE = "H";
/** Measured large, then divided: resvg reports an integer-ish ink box, so a 200px probe carries
 *  more significant figures than a 10px one. The ratio is linear in size and is asserted to be. */
const CAP_PROBE_SIZE = 200;
const capRatios = new Map();

/** @param {string} fontFamily @param {number} fontWeight @returns {number} */
export function capRatioOf(fontFamily, fontWeight) {
  const key = `${fontFamily}|${fontWeight}`;
  const held = capRatios.get(key);
  if (held !== undefined) return held;
  const ratio =
    measureTextBand(CAP_PROBE, { fontSize: CAP_PROBE_SIZE, fontWeight, fontFamily }).ascent /
    CAP_PROBE_SIZE;
  if (!(ratio > 0.4 && ratio < 1))
    throw new Error(
      `the cap height of ${fontFamily} at weight ${fontWeight} measured ${ratio.toFixed(4)} of its ` +
        `nominal size, which is not a cap height — a Latin face runs about 0.69 to 0.77. The face ` +
        `was probably not handed to the rasteriser at all, in which case nothing was drawn and the ` +
        `ink box is empty.`,
    );
  capRatios.set(key, ratio);
  return ratio;
}

/** The face a register's role resolves to FIRST — the reference its filed size and its leading were
 *  read against. A direction that never went through `resolveDirectionFamilies` has no role to
 *  reference, and then the face IS its own reference. */
function ladderHeadFor(direction, name) {
  const decision = direction?.decisions?.find((d) => d.register === name);
  return decision ? (LADDERS[decision.role]?.[0] ?? null) : null;
}

/** The two block gaps that are the same in every directed component of the corpus (measured
 *  2026-09-13: 38 of 38 and 9 of 9), as multiples of the lead of the register that carries them.
 *  Every other gap is a property of its own graphic's layout and stays with it (spec §2.3). */
export const EYEBROW_TO_DISPLAY = 0.75;
export const READING_TO_SOURCE = 0.4286;

/**
 * A register, resolved against the direction, sized to its role's own cap height, set on its face's
 * own line, and given the ink its row names.
 *
 * `filedSize` travels beside `fontSize`: `fontSize` is what the glyphs are DRAWN at, `filedSize` is
 * what the direction filed, and a layout that counts a line budget on the reference face needs both.
 * The LINE is the drawn one's — `leadOf` reads `fontSize` — so a headline the ladder shrinks
 * tightens its own leading instead of keeping the block it was given.
 */
export function registerOf(direction, name) {
  const { ink, muted } = deriveFurniture(direction.ground);
  const r = resolveRegister(direction, name);
  if (typeof r.leading !== "number")
    throw new Error(
      `direction ${direction?.id ?? "(unnamed)"} files no leading for its ${name} register, and a ` +
        `register cannot be set on a line nobody chose`,
    );
  const head = ladderHeadFor(direction, name);
  const scale = head ? capRatioOf(head, r.fontWeight) / capRatioOf(r.fontFamily, r.fontWeight) : 1;
  const fontSize = Math.round(r.fontSize * scale * 100) / 100;
  const naturalLineHeight = naturalLineHeightOf(r.fontFamily, r.fontWeight, {
    italic: r.fontStyle === "italic",
  });
  return {
    ...r,
    fontSize,
    filedSize: r.fontSize,
    referenceFamily: head ?? r.fontFamily,
    letterSpacing: (Number(r.letterSpacing ?? 0) * fontSize) / r.fontSize,
    naturalLineHeight,
    lineHeight: naturalLineHeight * r.leading,
    fill: { ink, muted, accent: direction.accent }[r.ink],
  };
}

/** The distance from one baseline to the next, at the size THIS object is drawn at — a function,
 *  not a field, because a layout copies a register at another size (`{ ...display, fontSize }`) and
 *  a field computed at resolution would carry the old size into the copy. */
export const leadOf = (r) => r.lineHeight * r.fontSize;

/** A gap between blocks, as a multiple of the lead of the register that carries it. */
export const gapOf = (r, n) => n * leadOf(r);
```

  Le commentaire déplacé est recopié mot pour mot à la place de `/* …the moved comment block… */`.

- [ ] **Étape 4 : le choroplèthe importe du tronc.** Dans `DirectedChoroplethMap.tsx` :
  supprimer les lignes 115-207 (commentaire, `CAP_PROBE`, `CAP_PROBE_SIZE`, `capRatios`,
  `capRatioOf`, `ladderHeadFor`, le commentaire de `registerOf` et `registerOf`), et ajouter aux
  imports :

```tsx
import { capRatioOf, registerOf } from "#shared/design-base/register.mjs";
```

  Retirer de l'import de `render-still.mjs` et de `resolve-families.mjs` les noms qui ne servent
  plus (`LADDERS` si inutilisé, etc.) — lire le fichier pour le vérifier. Ne rien changer d'autre
  dans ce fichier à cette tâche : ses `filedSize * k` restent jusqu'à la tâche 6.

  Si d'autres modules importaient `capRatioOf` ou `registerOf` depuis ce fichier :

```bash
grep -rn "DirectedChoroplethMap.tsx" --include='*.ts' --include='*.tsx' --include='*.mjs' . --exclude-dir=node_modules | grep import
```

  Dans `skills/map-beat/test/a-register-is-sized-to-its-cap-height.test.ts`, remplacer :

```ts
import {
  capRatioOf,
  registerOf,
} from "../../../proof/static-choropleth-europe-lowcarbon/DirectedChoroplethMap.tsx";
```

  par :

```ts
import { capRatioOf, registerOf } from "#shared/design-base/register.mjs";
```

- [ ] **Étape 5 : lancer**

```bash
cp shared/design-base/register.mjs skills/splash/assets/root-template/shared/design-base/register.mjs
bun test skills/splash/test/a-register-leads-by-its-face.test.ts skills/map-beat/test/a-register-is-sized-to-its-cap-height.test.ts skills/splash/test/carried-copies.test.ts
bun proof/static-choropleth-europe-lowcarbon/render-directions.mjs
git diff --stat proof/static-choropleth-europe-lowcarbon/renders
```

Expected : les 3 tests verts. Le choroplèthe re-rendu : `git diff --stat` sur ses `renders/` est
vide — le code déplacé calcule la même chose, et ses `filedSize * k` n'ont pas encore changé.

- [ ] **Étape 6 : commit**

```bash
F="shared/design-base/register.mjs skills/splash/assets/root-template/shared/design-base/register.mjs \
proof/static-choropleth-europe-lowcarbon/DirectedChoroplethMap.tsx \
skills/map-beat/test/a-register-is-sized-to-its-cap-height.test.ts skills/splash/test/a-register-leads-by-its-face.test.ts"
git add $(echo $F) && git commit $(echo $F) -m "feat(design-base): a register is resolved in the trunk, sized by cap height and led by its face"
```

---

### Tâche 4 : l'outil de preuve et la garde à cliquet

**Files:**
- Create: `scripts/design-base/renders-moved.mjs`
- Test: `scripts/design-base/renders-moved.test.ts`
- Test: `skills/splash/test/a-directed-layout-types-no-leading.test.ts`

**Interfaces:**
- Produces: `geometryDelta(before: string, after: string): { structure: boolean; max: number }` ;
  CLI `bun scripts/design-base/renders-moved.mjs <beat dir>... [--tolerance 0.25] [--against <rev>]`
  (défaut `HEAD`) → une ligne par
  SVG (`same` / `MOVED` / `STRUCTURE` / `NEW` / `GONE`), code de sortie 1 si au moins une n'est pas
  `same`.
- Produces: constante `LITERAL_LEADING_ALLOWED` dans la garde, abaissée à chaque tâche 5 à 8.

- [ ] **Étape 1 : écrire les tests qui échouent**

`scripts/design-base/renders-moved.test.ts` :

```ts
import { describe, it, expect } from "bun:test";
import { geometryDelta } from "./renders-moved.mjs";

describe("the geometry delta between two renders", () => {
  it("should report no movement for identical SVGs", () => {
    const svg = `<svg><text x="10.5" y="20">A</text></svg>`;
    expect(geometryDelta(svg, svg)).toEqual({ structure: false, max: 0 });
  });

  it("should report the largest numeric move when the structure is the same", () => {
    const before = `<svg><text x="10.5" y="20">A</text><line y1="4"/></svg>`;
    const after = `<svg><text x="10.5" y="20.3">A</text><line y1="4.1"/></svg>`;
    const delta = geometryDelta(before, after);
    expect([delta.structure, Number(delta.max.toFixed(3))]).toEqual([false, 0.3]);
  });

  it("should report a structural change when an element or a line of text differs", () => {
    const before = `<svg><text y="20">A B</text></svg>`;
    const after = `<svg><text y="20">A</text><text y="40">B</text></svg>`;
    expect(geometryDelta(before, after).structure).toBe(true);
  });
});
```

`skills/splash/test/a-directed-layout-types-no-leading.test.ts` :

```ts
/**
 * A DIRECTED LAYOUT TYPES NO LEADING AND NO BLOCK GAP AS A MULTIPLE OF A SIZE.
 *
 * The line is the face's (spec `docs/splash/2026-09-13-adaptive-leading-spec.md` §2): `leadOf(r)`
 * and `gapOf(r, n)` from `#shared/design-base/register.mjs`. A `display.fontSize * 1.22` typed into
 * a component is the same number on every face, and it was typed forty times.
 *
 * ── THE RATCHET ────────────────────────────────────────────────────────────────────────────────
 * The migration runs in four lots. `LITERAL_LEADING_ALLOWED` is the count still standing, lowered
 * in the commit that migrates a lot, and it may only go down. When it reaches zero the count is
 * replaced by the list itself, empty.
 *
 * What it reads: every `Directed*.tsx` beside a `render-directions.mjs` under `proof/`, whitespace
 * normalised so a gap split across lines is still one expression. It is a floor — the geometry
 * comparison of `scripts/design-base/renders-moved.mjs` is what proves nothing else moved.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(ROOT, "proof");

/** MAY ONLY GO DOWN. Measured 2026-09-13 before the migration: 244. */
const LITERAL_LEADING_ALLOWED = 244;

const PATTERNS = [
  {
    what: "a lead typed as a multiple of a size",
    re: /const \w*[Ll]ead\s*=\s*\w+\.(?:fontSize|filedSize)\s*\*\s*[\d.]+/g,
  },
  {
    what: "the eyebrow gap typed as a multiple of a size",
    re: /eyebrowReg\.(?:fontSize|filedSize)\s*\*/g,
  },
  {
    what: "a gap after a text block typed as a multiple of a size",
    re: /(?:Lines\.length\s*\*\s*\w*[Ll]ead\s*[+-]|(?:readingTop|sourceTop)\s*-|annotBand\.ascent\s*-)\s*\(?\s*(?:display|body|annot)\.(?:fontSize|filedSize)\s*\*\s*[\d.]+/g,
  },
];

const directed = readdirSync(PROOF, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(PROOF, e.name, "render-directions.mjs")))
  .flatMap((e) =>
    readdirSync(join(PROOF, e.name))
      .filter((f) => /^Directed.*\.tsx$/.test(f))
      .map((f) => join(PROOF, e.name, f)),
  );

const offences = directed.flatMap((file) => {
  const text = readFileSync(file, "utf8").replace(/\s+/g, " ");
  return PATTERNS.flatMap(({ what, re }) =>
    [...text.matchAll(re)].map((m) => `${relative(ROOT, file)}: ${what}: ${m[0]}`),
  );
});

describe("a directed layout's leading", () => {
  it("should find the directed components (premise)", () => {
    expect(directed.length).toBeGreaterThanOrEqual(40);
  });

  it("should type no more literal leading than the ratchet allows", () => {
    expect([offences.length <= LITERAL_LEADING_ALLOWED, offences.length]).toEqual([
      true,
      LITERAL_LEADING_ALLOWED,
    ]);
  });
});
```

- [ ] **Étape 2 : lancer, vérifier**

Run: `bun test scripts/design-base/renders-moved.test.ts skills/splash/test/a-directed-layout-types-no-leading.test.ts`
Expected : `renders-moved.test.ts` FAIL (module absent) ; la garde **PASS** à 244 — elle mesure
l'état présent, c'est le cliquet. Si elle affiche un autre nombre que 244, mettre la constante à
ce nombre (l'arbre a bougé depuis la mesure) et le noter dans le message de commit.

- [ ] **Étape 3 : implémenter `scripts/design-base/renders-moved.mjs`**

```js
// twin/scripts/design-base/renders-moved.mjs
//
// WHAT MOVED IN A BEAT'S DIRECTED RENDERS SINCE THE LAST COMMIT, READ OFF THE SVG ITSELF.
//
// A refactor that must not move the page is proved on the geometry, not on the pixels: two SVGs
// with the same elements and the same text are compared number by number, and the largest move is
// reported. A changed element or a re-wrapped line is a STRUCTURE change, reported as such.
//
// Usage:  bun scripts/design-base/renders-moved.mjs proof/<beat> [proof/<beat>…] [--tolerance 0.25]

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const NUMBER = /-?\d+(?:\.\d+)?(?:e-?\d+)?/g;

/** @returns {{structure: boolean, max: number}} */
export function geometryDelta(before, after) {
  const skeleton = (svg) => svg.replace(NUMBER, "#");
  if (skeleton(before) !== skeleton(after)) return { structure: true, max: Infinity };
  const a = before.match(NUMBER) ?? [];
  const b = after.match(NUMBER) ?? [];
  let max = 0;
  for (let i = 0; i < a.length; i++) max = Math.max(max, Math.abs(Number(a[i]) - Number(b[i])));
  return { structure: false, max };
}

function atRevision(revision, path) {
  const shown = spawnSync("git", ["show", `${revision}:${path}`], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  return shown.status === 0 ? shown.stdout : null;
}

/** `--name value` pairs, and everything else as positional arguments. */
function parseArgs(argv) {
  const options = { tolerance: 0.25, against: "HEAD" };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--tolerance") options.tolerance = Number(argv[++i]);
    else if (argv[i] === "--against") options.against = argv[++i];
    else positional.push(argv[i]);
  }
  if (!(options.tolerance >= 0)) throw new Error(`--tolerance takes a number of pixels`);
  if (!/^[\w./~^-]+$/.test(options.against ?? ""))
    throw new Error(`--against takes a git revision, not ${options.against}`);
  return { ...options, beats: positional };
}

if (import.meta.main) {
  const { tolerance, against, beats } = parseArgs(process.argv.slice(2));
  if (!beats.length) throw new Error("name at least one beat directory, e.g. proof/static-bump-emitter-rank");

  let moved = 0;
  for (const beat of beats) {
    const dir = join(resolve(beat), "renders");
    const here = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".svg")).sort() : [];
    for (const name of here) {
      const path = relative(ROOT, join(dir, name));
      const before = atRevision(against, path);
      if (before === null) {
        console.log(`NEW        ${path}`);
        moved++;
        continue;
      }
      const delta = geometryDelta(before, readFileSync(join(dir, name), "utf8"));
      const verdict = delta.structure ? "STRUCTURE" : delta.max > tolerance ? "MOVED" : "same";
      if (verdict !== "same") moved++;
      console.log(`${verdict.padEnd(10)} ${path}${delta.structure ? "" : `  max ${delta.max.toFixed(3)}px`}`);
    }
    const listed = spawnSync("git", ["ls-tree", "--name-only", against, `${relative(ROOT, dir)}/`], {
      cwd: ROOT,
      encoding: "utf8",
    });
    for (const path of listed.stdout.split("\n").filter((p) => p.endsWith(".svg")))
      if (!existsSync(join(ROOT, path))) {
        console.log(`GONE       ${path}`);
        moved++;
      }
  }
  process.exit(moved ? 1 : 0);
}
```

- [ ] **Étape 4 : lancer**

```bash
bun test scripts/design-base/renders-moved.test.ts skills/splash/test/a-directed-layout-types-no-leading.test.ts
bun scripts/design-base/renders-moved.mjs proof/static-bump-emitter-rank
bun run test:lanes
```

Expected : 3 + 2 pass ; l'outil affiche `same` pour les 3 SVG du bump et sort 0 ; `test:lanes`
sort 0.

- [ ] **Étape 5 : commit**

```bash
F="scripts/design-base/renders-moved.mjs scripts/design-base/renders-moved.test.ts skills/splash/test/a-directed-layout-types-no-leading.test.ts"
git add $(echo $F) && git commit $(echo $F) -m "test(design-base): a ratchet on typed leading, and a geometry diff that proves a render did not move"
```

---

## Tâches 5 à 8 : la migration, par lots de dix

Les quatre tâches suivent **la même procédure** sur des fichiers différents. Elle est écrite ici en
entier ; chaque tâche la reprend avec sa liste.

### Procédure de migration d'un composant

**A. Le registre.** Remplacer la fonction locale `reg` :

```tsx
  const reg = (name: RegisterName) => {
    const r = resolveRegister(direction, name);
    return { ...r, fill: inkOf[r.ink] };
  };
```

par :

```tsx
  const reg = (name: RegisterName) => registerOf(direction, name);
```

et ajouter l'import :

```tsx
import {
  EYEBROW_TO_DISPLAY,
  READING_TO_SOURCE,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";
```

(ne garder que les noms utilisés). Si la fonction `reg` du composant fait plus que ça (autre
`fill`, retouche de taille, graisse forcée), garder ce surplus appliqué au résultat de
`registerOf`. Retirer `resolveRegister` et `inkOf` des imports / déclarations s'ils ne servent plus.
Si le composant déclare déjà un `const registerOf = new Map(…)` local (`DirectedLine`,
`DirectedBoxplot`, `DirectedColumns`, `DirectedDivergingBar`, `DirectedWaterfall`,
`DirectedGroupedBar`, `DirectedPyramid`), le renommer `registerById` et renommer ses usages.

**B. Les interlignes → `leadOf`.**

| aujourd'hui | devient |
| --- | --- |
| `const titleLead = display.fontSize * 1.22;` | `const titleLead = leadOf(display);` |
| `const bodyLead = body.fontSize * 1.45;` | `const bodyLead = leadOf(body);` |
| `const annotLead = annot.fontSize * 1.4;` | `const annotLead = leadOf(annot);` |
| `const lead = display.fontSize * 1.25;` (co2-suisse) | `const lead = leadOf(display);` — **bouge, écart connu** |
| `const bodyLead = body.fontSize * 1.5;` (co2-suisse) | `const bodyLead = leadOf(body);` — **bouge, écart connu** |
| `const nameLead = annot.fontSize * 1.5;` (boxplot) | `const nameLead = leadOf(annot);` — **bouge, écart connu** |
| `const nameLead = annot.fontSize * 1.2;` (bar-top) | `const nameLead = leadOf(annot);` — **bouge, écart connu** |
| `const eyebrowLead = eyebrowReg.fontSize * 0.9;` (waterfall — c'est un écart) | `const eyebrowLead = gapOf(eyebrowReg, EYEBROW_TO_DISPLAY);` |

Les interlignes posés sur une bande d'encre (`axisBand.ascent + axisBand.descent + 2`,
`annotBand.ascent + annotBand.descent`, `chipH + 3`) **ne changent pas** (spec §4).

**C. Les écarts uniformes → constantes du tronc.**

| aujourd'hui | devient |
| --- | --- |
| `eyebrowReg.fontSize * 0.9` | `gapOf(eyebrowReg, EYEBROW_TO_DISPLAY)` |
| `readingLines.length * bodyLead - annot.fontSize * 0.6` (et la forme `(readingLines.length ? annot.fontSize * 0.6 : 0)`) | `… - gapOf(annot, READING_TO_SOURCE)` / `(readingLines.length ? gapOf(annot, READING_TO_SOURCE) : 0)` |

**D. Les autres écarts sur `display` / `body` / `annot` → `gapOf(r, n)` avec `n = k ÷ m`.**
C'est un écart quand l'expression pose le **haut ou le bas d'un bloc** (`…Top`, `…Bottom`,
`top:` / `bottom:` d'une mise en page de tracé, `plotTop`, `plotBottom`) à la suite d'un bloc de
texte. `m` = 1.45 pour `body`, 1.4 pour `annot`, 1.22 pour `display`. Valeurs, à quatre décimales :

| `body.fontSize * k` | `gapOf(body, n)` | `annot.fontSize * k` | `gapOf(annot, n)` |
| ---: | ---: | ---: | ---: |
| 0.4 | 0.2759 | 0.35 | 0.25 |
| 0.5 | 0.3448 | 0.4 | 0.2857 |
| 0.6 | 0.4138 | 0.7 | 0.5 |
| 0.7 | 0.4828 | 0.8 | 0.5714 |
| 0.8 | 0.5517 | 0.9 | 0.6429 |
| 1.2 | 0.8276 | 1.0 | 0.7143 |
| 1.4 | 0.9655 | 1.1 | 0.7857 |
| 1.6 | 1.1034 | 1.2 | 0.8571 |
| 1.8 | 1.2414 | 1.3 | 0.9286 |
| | | 1.4 | 1 |
| | | 1.5 | 1.0714 |
| | | 1.6 | 1.1429 |
| | | 2 | 1.4286 |
| | | 2.2 | 1.5714 |
| | | 2.4 | 1.7143 |
| | | 2.6 | 1.8571 |
| | | 3 | 2.1429 |
| | | 3.2 | 2.2857 |

Pour `annot.fontSize * 0.6` hors lecture → source : `gapOf(annot, 0.4286)`.

**E. Ce qui ne change pas.** Tout ce qui est sur `axis` ou `value` ; tout ce qui positionne une
étiquette isolée par rapport à une marque, une graduation ou un bord de tracé — attributs JSX
(`y=`, `y1=`), requêtes et cadres de l'arbitre (`at:`, `frame:`, et les `top:` / `bottom:` à
l'intérieur d'un `frame:`) ; le `+ display.fontSize` qui pose la ligne de base du titre ;
`eyebrowBaseline = PAD + eyebrowReg.fontSize` ; `bodyLead * 1.2` (déjà en interlignes).

**F. Exemple travaillé — `proof/static-bump-emitter-rank/DirectedBump.tsx`.**

Avant :

```tsx
  const reg = (name: RegisterName) => {
    const r = resolveRegister(direction, name);
    return { ...r, fill: inkOf[r.ink] };
  };
  // …
  const titleLead = display.fontSize * 1.22;
  const limitLines = wrap(set(limits, body), column, body);
  const bodyLead = body.fontSize * 1.45;
  // …
  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + eyebrowReg.fontSize * 0.9 + display.fontSize;
  const limitsTop =
    titleTop + titleLines.length * titleLead + body.fontSize * 0.6;
  // …
  const plot = {
    left: PAD + widestEdge + 16,
    right: width - PAD - widestEdge - 16,
    top: limitsTop + limitLines.length * bodyLead + annot.fontSize * 2,
    bottom: sourceTop - body.fontSize * 1.6 - axis.fontSize * 2.4,
  };
  // …
            y={plot.bottom + axis.fontSize * 1.8}
```

Après :

```tsx
  const reg = (name: RegisterName) => registerOf(direction, name);
  // …
  const titleLead = leadOf(display);
  const limitLines = wrap(set(limits, body), column, body);
  const bodyLead = leadOf(body);
  // …
  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const limitsTop =
    titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
  // …
  const plot = {
    left: PAD + widestEdge + 16,
    right: width - PAD - widestEdge - 16,
    top: limitsTop + limitLines.length * bodyLead + gapOf(annot, 1.4286),
    bottom: sourceTop - gapOf(body, 1.1034) - axis.fontSize * 2.4,
  };
  // …
            y={plot.bottom + axis.fontSize * 1.8}
```

`inkOf` et l'import de `resolveRegister` disparaissent s'ils ne servent plus ; `axis.fontSize * 2.4`
et `axis.fontSize * 1.8` restent (règle E).

**G. Inventaire d'un fichier avant de le migrer.**

```bash
grep -nE "[A-Za-z_]+\.(fontSize|filedSize) \* [0-9.]+|const [A-Za-z]*Lead\b" <fichier>
```

Chaque ligne listée est classée B, C, D ou E avant la moindre modification.

### Procédure de vérification d'un lot

```bash
for b in <beats du lot>; do bun proof/$b/render-directions.mjs > /dev/null || echo "RENDER FAILED: $b"; done
bun scripts/design-base/renders-moved.mjs $(for b in <beats du lot>; do echo proof/$b; done)
bun test skills/splash/test/a-directed-layout-types-no-leading.test.ts
```

- Tout SVG `MOVED` / `STRUCTURE` / `GONE` / `NEW` **hors écart connu** est une erreur de
  classement : relire les lignes du fichier, corriger, re-rendre. Ne pas élargir la tolérance.
- Un SVG de l'écart connu (co2-suisse, boxplot, bar-top) ou du choroplèthe qui bouge : **ouvrir
  le PNG** (outil Read) et vérifier la liste de la spec §5.3 (copie dans son panneau, titre au même
  rung, rien de coupé, pas de chevauchement). Le noter pour le rapport de la tâche 9.
- La garde échoue en affichant le nouveau compte reçu : mettre `LITERAL_LEADING_ALLOWED` à ce
  nombre (il doit être plus petit).

---

### Tâche 5 : lot 1

**Files (Modify) :**
- `proof/co2-suisse/DirectedLine.tsx`
- `proof/more-boxplot-france-co2-decades/DirectedBoxplot.tsx`
- `proof/more-dumbbell-life-expectancy-gains/DirectedDumbbell.tsx`
- `proof/static-area-swiss-co2/DirectedArea.tsx`
- `proof/static-bar-top-emitters-2024/DirectedColumns.tsx`
- `proof/static-beeswarm-co2-per-person/DirectedBeeswarm.tsx`
- `proof/static-bullet-low-carbon-share/DirectedBullet.tsx`
- `proof/static-bump-emitter-rank/DirectedBump.tsx`
- `proof/static-calendar-heatmap-geneva/DirectedCalendarHeatmap.tsx`
- `proof/static-carbon-footprint-spread/DirectedHistogram.tsx`
- Modify: `skills/splash/test/a-directed-layout-types-no-leading.test.ts` (cliquet)
- Les `renders/` de ces dix beats (re-rendus)

**Interfaces:** Consumes `registerOf`, `leadOf`, `gapOf`, `EYEBROW_TO_DISPLAY`, `READING_TO_SOURCE` (tâche 3).

- [ ] **Étape 1 :** pour chaque fichier, inventaire (G) puis migration (A–E).
- [ ] **Étape 2 :** vérification du lot (procédure ci-dessus). Attendu : `same` partout sauf
  `co2-suisse`, `more-boxplot-france-co2-decades`, `static-bar-top-emitters-2024` (écart connu),
  regardés.
- [ ] **Étape 3 :** cliquet abaissé ; `bun test skills/splash/test/a-directed-layout-types-no-leading.test.ts skills/splash/test/claims-grounded-in-data.test.ts proof/static-bump-emitter-rank/labels-sit-on-their-rank.test.ts` vert.
- [ ] **Étape 4 : commit**

```bash
BEATS="co2-suisse more-boxplot-france-co2-decades more-dumbbell-life-expectancy-gains static-area-swiss-co2 static-bar-top-emitters-2024 static-beeswarm-co2-per-person static-bullet-low-carbon-share static-bump-emitter-rank static-calendar-heatmap-geneva static-carbon-footprint-spread"
F="skills/splash/test/a-directed-layout-types-no-leading.test.ts $(for b in $(echo $BEATS); do echo proof/$b/Directed*.tsx proof/$b/renders; done)"
git add $(echo $F) && git commit $(echo $F) -m "refactor(proof): ten directed layouts lead by their face, lot 1 of 4"
```

---

### Tâche 6 : lot 2

**Files (Modify) :**
- `proof/static-cartogram-europe-lowcarbon/DirectedTileCartogram.tsx`
- `proof/static-choropleth-europe-lowcarbon/DirectedChoroplethMap.tsx`
- `proof/static-connected-scatter-lowcarbon/DirectedConnectedScatter.tsx`
- `proof/static-contour-europe-distance/DirectedContourField.tsx`
- `proof/static-diverging-bar-eu-per-capita/DirectedDivergingBar.tsx`
- `proof/static-diverging-stacked-electricity/DirectedDivergingStack.tsx`
- `proof/static-donut-world-co2-share/DirectedDonuts.tsx`
- `proof/static-dot-density-europe-stations/DirectedDotDensity.tsx`
- `proof/static-dot-strip-lowcarbon-spread/DirectedDotStrips.tsx`
- `proof/static-flow-map-ukraine-protection/DirectedFlowMap.tsx`
- Modify: `skills/splash/test/a-directed-layout-types-no-leading.test.ts` (cliquet)
- Les `renders/` de ces dix beats

**Interfaces:** Consumes la tâche 3.

**Le choroplèthe, en particulier.** Il utilise déjà `registerOf` (tâche 3) ; ses interlignes et
écarts sont écrits sur `filedSize`, et la spec renverse ce choix (§2.1) :

- `const titleLead = display.filedSize * 1.22;` disparaît du niveau composant ; **dans la fonction
  de mise en page qui reçoit `dsp`**, le titre est mené par `leadOf(dsp)`, pour qu'un titre rétréci
  resserre son interligne ;
- `bodyLead` → `leadOf(body)`, `annotLead` → `leadOf(annot)` ;
- `eyebrowReg.filedSize * 0.9` → `gapOf(eyebrowReg, EYEBROW_TO_DISPLAY)` ; `+ display.filedSize` qui
  pose la ligne de base reste ;
- `body.filedSize * 0.8` → `gapOf(body, 0.5517)` ; `annot.filedSize * 0.7` → `gapOf(annot, 0.5)` ;
  `annot.filedSize * 1.0` → `gapOf(annot, 0.7143)` ;
- le bloc de commentaire « EVERY LEAD AND EVERY GAP IS THE FILED SIZE'S, NEVER THE DRAWN ONE » est
  remplacé par une phrase qui renvoie à `register.mjs` et à la spec §2.1 ;
- le budget de lignes du titre (`referenceDisplay`, `displayFloorFor`) ne change pas.

Attendu à la vérification : le choroplèthe **peut** bouger là où `fontSize ≠ filedSize` (titre
rétréci) ; il est regardé dans les trois directions.

- [ ] **Étape 1 :** inventaire (G) puis migration (A–E) des dix fichiers, choroplèthe selon la note.
- [ ] **Étape 2 :** vérification du lot. Attendu : `same` partout sauf le choroplèthe, regardé.
- [ ] **Étape 3 :** cliquet abaissé ; `bun test skills/splash/test/a-directed-layout-types-no-leading.test.ts skills/map-beat/test/a-register-is-sized-to-its-cap-height.test.ts skills/splash/test/delivered-size-matches-the-pin.test.ts` — cette dernière garde reste dans son état de départ (échecs web connus), pas pire.
- [ ] **Étape 4 : commit**

```bash
BEATS="static-cartogram-europe-lowcarbon static-choropleth-europe-lowcarbon static-connected-scatter-lowcarbon static-contour-europe-distance static-diverging-bar-eu-per-capita static-diverging-stacked-electricity static-donut-world-co2-share static-dot-density-europe-stations static-dot-strip-lowcarbon-spread static-flow-map-ukraine-protection"
F="skills/splash/test/a-directed-layout-types-no-leading.test.ts $(for b in $(echo $BEATS); do echo proof/$b/Directed*.tsx proof/$b/renders; done)"
git add $(echo $F) && git commit $(echo $F) -m "refactor(proof): ten directed layouts lead by their face, lot 2 of 4"
```

---

### Tâche 7 : lot 3

**Files (Modify) :**
- `proof/static-gantt-top-ten-tenure/DirectedGantt.tsx`
- `proof/static-germany-electricity-bridge/DirectedWaterfall.tsx`
- `proof/static-heatmap-europe-electricity/DirectedHeatmap.tsx`
- `proof/static-hex-grid-europe-protection/DirectedHexGrid.tsx`
- `proof/static-income-life-expectancy/DirectedScatter.tsx`
- `proof/static-locator-zaporizhzhia/DirectedLocator.tsx`
- `proof/static-lollipop-co2-per-person/DirectedLollipops.tsx`
- `proof/static-marimekko-electricity-mix/DirectedMarimekko.tsx`
- `proof/static-parallel-coordinates-electricity-mix/DirectedParallelCoordinates.tsx`
- `proof/static-pictogram-europe-lowcarbon/DirectedUnitGrid.tsx`
- Modify: `skills/splash/test/a-directed-layout-types-no-leading.test.ts` (cliquet)
- Les `renders/` de ces dix beats

**Interfaces:** Consumes la tâche 3.

**Notes de classement propres au lot** (règle E, à ne pas convertir) : `DirectedScatter.tsx` —
`y: plot.top + annot.fontSize * 0.6` (requêtes de l'arbitre), `top: plot.top - annot.fontSize * 1.6`
(cadre de l'arbitre), `y={plot.top - annot.fontSize * 1.2}` ; `DirectedWaterfall.tsx` —
`at: { … y: plot.bottom + annot.fontSize * 0.6 }`, `bottom: plot.bottom + annot.fontSize * 3.2`
(cadre). `DirectedGantt.tsx` lignes « `bottom - annot.fontSize * 0.9 - bandOf(axis)…` » et
« `readingTop - annot.fontSize * 0.9 - axisBand…` » : écarts (règle D, `0.6429`).
`DirectedMarimekko.tsx` « `readingTop - annot.fontSize * 1.4 - braceRoom` » : écart (`gapOf(annot, 1)`).

- [ ] **Étape 1 :** inventaire (G) puis migration (A–E).
- [ ] **Étape 2 :** vérification du lot. Attendu : `same` partout.
- [ ] **Étape 3 :** cliquet abaissé ; la garde verte.
- [ ] **Étape 4 : commit**

```bash
BEATS="static-gantt-top-ten-tenure static-germany-electricity-bridge static-heatmap-europe-electricity static-hex-grid-europe-protection static-income-life-expectancy static-locator-zaporizhzhia static-lollipop-co2-per-person static-marimekko-electricity-mix static-parallel-coordinates-electricity-mix static-pictogram-europe-lowcarbon"
F="skills/splash/test/a-directed-layout-types-no-leading.test.ts $(for b in $(echo $BEATS); do echo proof/$b/Directed*.tsx proof/$b/renders; done)"
git add $(echo $F) && git commit $(echo $F) -m "refactor(proof): ten directed layouts lead by their face, lot 3 of 4"
```

---

### Tâche 8 : lot 4

**Files (Modify) :**
- `proof/static-proportional-symbol-europe-capacity/DirectedProportionalSymbol.tsx`
- `proof/static-radar-electricity-mix/DirectedRadar.tsx`
- `proof/static-sankey-electricity-sources/DirectedSankey.tsx`
- `proof/static-slope-europe-lowcarbon/DirectedSlope.tsx`
- `proof/static-small-multiples-lowcarbon/DirectedSmallMultiples.tsx`
- `proof/static-stacked-bar-lowcarbon-growth/DirectedStackedBar.tsx`
- `proof/static-streamgraph-swiss-electricity/DirectedStreamgraph.tsx`
- `proof/static-swiss-age-pyramid/DirectedPyramid.tsx`
- `proof/static-treemap-europe-capacity/DirectedTreemap.tsx`
- `proof/static-wind-vs-solar/DirectedGroupedBar.tsx`
- Modify: `skills/splash/test/a-directed-layout-types-no-leading.test.ts` (cliquet → liste vide)
- Les `renders/` de ces dix beats

**Interfaces:** Consumes la tâche 3.

**Notes de classement propres au lot :** `DirectedRadar.tsx` — `height - PAD - (lines.length - 1) *
bodyLead - body.fontSize * 1.4` est un écart (`gapOf(body, 0.9655)`), `body.fontSize * 1.2 +` entre
titre et chapô aussi (`gapOf(body, 0.8276)`), `annot.fontSize * 3.2` et `annot.fontSize * 1.2` /
`* 2` entre blocs aussi ; `plotBottom = sourceTop - body.fontSize * 1.8` → `gapOf(body, 1.2414)`.
`DirectedPyramid.tsx` — `top: plot.top - annot.fontSize * 3.2` (cadre), `y={b.middle +
annot.fontSize * 0.35}`, `y1={at.box.y + annot.fontSize * 1.3}` : règle E. `DirectedGroupedBar.tsx`
— `y: plot.bottom + annot.fontSize * 1.5`, `top: plot.top - annot.fontSize * 2`, `bottom:
plot.bottom + annot.fontSize * 2.2` (cadre), `y={plot.top - annot.fontSize * 2.4}` : règle E ; mais
`top: limitsTop + limitLines.length * bodyLead + annot.fontSize * 3` et `bottom: sourceTop -
body.fontSize * 1.6 - annot.fontSize * 2.2` dans l'objet `plot` sont des écarts de mise en page
(règle D : `2.1429`, `1.1034`, `1.5714`).

- [ ] **Étape 1 :** inventaire (G) puis migration (A–E).
- [ ] **Étape 2 :** vérification du lot. Attendu : `same` partout.
- [ ] **Étape 3 : le cliquet devient la liste.** Le compte doit être 0. Dans la garde, remplacer
  la constante et le second test par :

```ts
describe("a directed layout's leading", () => {
  it("should find the directed components (premise)", () => {
    expect(directed.length).toBeGreaterThanOrEqual(40);
  });

  it("should type no leading and no block gap as a multiple of a size", () => {
    expect(offences).toEqual([]);
  });
});
```

  et réécrire le paragraphe « THE RATCHET » de l'en-tête au passé : la migration est faite, la
  liste doit rester vide.

- [ ] **Étape 4 :** `bun test skills/splash/test/a-directed-layout-types-no-leading.test.ts` vert.
- [ ] **Étape 5 : commit**

```bash
BEATS="static-proportional-symbol-europe-capacity static-radar-electricity-mix static-sankey-electricity-sources static-slope-europe-lowcarbon static-small-multiples-lowcarbon static-stacked-bar-lowcarbon-growth static-streamgraph-swiss-electricity static-swiss-age-pyramid static-treemap-europe-capacity static-wind-vs-solar"
F="skills/splash/test/a-directed-layout-types-no-leading.test.ts $(for b in $(echo $BEATS); do echo proof/$b/Directed*.tsx proof/$b/renders; done)"
git add $(echo $F) && git commit $(echo $F) -m "refactor(proof): the last ten directed layouts lead by their face, and the ratchet closes"
```

---

### Tâche 9 : vérification d'ensemble et rapport

**Files:**
- Modify: `docs/splash/2026-09-13-adaptive-leading-spec.md:3` (statut)

- [ ] **Étape 1 : suites complètes**

```bash
bun run test 2>&1 | grep -E "^\(fail\)|^ *[0-9]+ (pass|fail)$"
bun run test:heavy 2>&1 | grep -E "^\(fail\)|^ *[0-9]+ (pass|fail)$"
bun run test:lanes
```

Expected : aucun échec nouveau par rapport au point de départ de la tâche 0 (les 3 échecs web
connus — taille d'export, cliquet des tailles, rendus orphelins — et `pixel-palette`/`pngjs`).
Tout autre échec : corriger ; après deux tentatives, s'arrêter et rapporter l'erreur exacte.

- [ ] **Étape 2 : preuve géométrique sur tout le corpus, contre le commit de la tâche 0**

```bash
BASE=$(git log --format=%H --grep "the static corpus re-rendered in the Google faces" -1)
bun scripts/design-base/renders-moved.mjs --against "$BASE" \
  $(ls proof/*/render-directions.mjs | cut -d/ -f2 | sed 's#^#proof/#') | grep -v '^same'
```

Expected : `MOVED` / `STRUCTURE` seulement pour `co2-suisse`, `more-boxplot-france-co2-decades`,
`static-bar-top-emitters-2024`, `static-choropleth-europe-lowcarbon`. Tout autre → retour à la
tâche du lot concerné.

- [ ] **Étape 3 : regarder les rendus qui ont bougé.** Ouvrir (outil Read) le PNG de chaque SVG
  listé à l'étape 2 et son équivalent au commit de base (`git show "$BASE:<png>" > <scratchpad>`),
  vérifier la liste de la spec §5.3.

- [ ] **Étape 4 : statut de la spec.** Ligne 3 de la spec :

```markdown
**Statut :** implémentée sur `rerender/static-corpus` (plan `docs/superpowers/plans/2026-09-13-adaptive-leading.md`). Non fusionnée.
```

```bash
git add docs/splash/2026-09-13-adaptive-leading-spec.md && git commit docs/splash/2026-09-13-adaptive-leading-spec.md -m "docs(design-base): the adaptive leading spec is implemented"
```

- [ ] **Étape 5 : rapport à Rémy.** Un tableau : beat, direction, a bougé (oui/non), ce qui a bougé
  et pourquoi (écart connu / titre rétréci), verdict après regard. Ouvrir dans Aperçu les PNG des
  beats qui ont bougé. **Ne rien fusionner** sans son accord.
